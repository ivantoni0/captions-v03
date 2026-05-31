package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"captions/helper/internal/api"
	"captions/helper/internal/config"
	"captions/helper/internal/job"
	"captions/helper/internal/model"
)

const version = "0.1.0"

func main() {
	listenAddr := flag.String("addr", "127.0.0.1:17777", "HTTP listen address")
	flag.Parse()

	cfg, err := config.Load(*listenAddr)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	if err := cfg.ValidateTools(); err != nil {
		log.Printf("warning: %v", err)
		log.Printf("helper will start, but jobs will fail until tools are available")
	}

	models := model.NewRegistry(cfg.ModelsDir)
	processor := job.NewProcessor(cfg, models)
	manager := job.NewManager(processor)
	server := api.NewServer(cfg, models, manager, version)

	httpServer := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           server.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("Captions helper %s listening on http://%s", version, cfg.ListenAddr)
	log.Printf("App Support: %s", cfg.AppSupportDir)
	log.Printf("Models: %s", cfg.ModelsDir)
	log.Printf("Outputs: %s", cfg.OutputsDir)

	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
}
