package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"captions/helper/internal/config"
	"captions/helper/internal/job"
	"captions/helper/internal/model"
)

type Server struct {
	cfg     *config.Config
	models  *model.Registry
	manager *job.Manager
	version string
	mux     *http.ServeMux
}

func NewServer(cfg *config.Config, models *model.Registry, manager *job.Manager, version string) *Server {
	server := &Server{
		cfg:     cfg,
		models:  models,
		manager: manager,
		version: version,
		mux:     http.NewServeMux(),
	}
	server.routes()
	return server
}

func (s *Server) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.applyCORS(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		s.mux.ServeHTTP(w, r)
	})
}

func (s *Server) routes() {
	s.mux.HandleFunc("/", s.handleRoot)
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/transcribe", s.handleCreateJob)
	s.mux.HandleFunc("/jobs", s.handleJobs)
	s.mux.HandleFunc("/jobs/", s.handleJobByID)
	s.mux.HandleFunc("/cleanup", s.handleCleanup)
	s.mux.HandleFunc("/latest-captions", s.handleLatestCaptions)
	s.mux.HandleFunc("/ai-models", s.handleAIModels)
	s.mux.HandleFunc("/smart-parts", s.handleSmartParts)
}

func (s *Server) handleRoot(w http.ResponseWriter, _ *http.Request) {
	s.writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"service": "captions-helper",
		"version": s.version,
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	defaultModel := s.models.Default()
	s.writeJSON(w, http.StatusOK, map[string]any{
		"ok":                 true,
		"version":            s.version,
		"listenAddr":         s.cfg.ListenAddr,
		"ffmpegPath":         s.cfg.FFmpegPath,
		"whisperCliPath":     s.cfg.WhisperCLIPath,
		"whisperxPythonPath": s.cfg.WhisperXPythonPath,
		"precisionAvailable": s.cfg.PrecisionAvailable,
		"precisionStatus":    s.cfg.PrecisionStatus,
		"defaultTimingMode":  s.cfg.DefaultTimingMode(),
		"appSupportDir":      s.cfg.AppSupportDir,
		"modelCacheDir":      s.cfg.ModelCacheDir,
		"outputsDir":         s.cfg.OutputsDir,
		"modelsDir":          s.cfg.ModelsDir,
		"defaultModel":       defaultModel.ID,
		"models":             s.models.List(),
	})
}

func (s *Server) handleJobs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.writeJSON(w, http.StatusOK, map[string]any{
			"jobs": s.manager.List(),
		})
	case http.MethodPost:
		s.handleCreateJob(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleCreateJob(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req job.TranscriptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "invalid json payload",
		})
		return
	}

	state, err := s.manager.Enqueue(req)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": err.Error(),
		})
		return
	}

	s.writeJSON(w, http.StatusAccepted, state)
}

func (s *Server) handleJobByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/jobs/")
	if id == "" {
		http.NotFound(w, r)
		return
	}

	state, ok := s.manager.Get(id)
	if !ok {
		s.writeJSON(w, http.StatusNotFound, map[string]any{
			"error": "job not found",
		})
		return
	}

	s.writeJSON(w, http.StatusOK, state)
}

func (s *Server) writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func (s *Server) applyCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
}
