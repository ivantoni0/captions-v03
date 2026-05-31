package api

import (
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type aiModelInfo struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Size       string `json:"size,omitempty"`
	ModifiedAt string `json:"modifiedAt,omitempty"`
	Source     string `json:"source"`
}

type aiModelsResponse struct {
	OK        bool          `json:"ok"`
	Provider  string        `json:"provider"`
	Available bool          `json:"available"`
	Models    []aiModelInfo `json:"models"`
	Message   string        `json:"message,omitempty"`
}

type ollamaTagsResponse struct {
	Models []struct {
		Name       string    `json:"name"`
		Model      string    `json:"model"`
		Size       int64     `json:"size"`
		ModifiedAt time.Time `json:"modified_at"`
	} `json:"models"`
}

func (s *Server) handleAIModels(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	models, message := s.listOllamaModels()
	s.writeJSON(w, http.StatusOK, aiModelsResponse{
		OK:        true,
		Provider:  "ollama",
		Available: len(models) > 0,
		Models:    models,
		Message:   message,
	})
}

func (s *Server) listOllamaModels() ([]aiModelInfo, string) {
	if models, err := listOllamaModelsHTTP(); err == nil && len(models) > 0 {
		return models, "Ollama API ready."
	}

	models, err := listOllamaModelsCLI()
	if err != nil {
		return nil, "Ollama not available. Start Ollama or install models."
	}
	if len(models) == 0 {
		return nil, "No Ollama models installed."
	}
	return models, "Ollama models loaded from CLI."
}

func listOllamaModelsHTTP() ([]aiModelInfo, error) {
	client := http.Client{Timeout: 1500 * time.Millisecond}
	response, err := client.Get(ollamaBaseURL() + "/api/tags")
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, http.ErrBodyNotAllowed
	}

	var payload ollamaTagsResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, err
	}

	models := make([]aiModelInfo, 0, len(payload.Models))
	for _, model := range payload.Models {
		name := strings.TrimSpace(model.Name)
		if name == "" {
			name = strings.TrimSpace(model.Model)
		}
		if name == "" {
			continue
		}
		info := aiModelInfo{
			ID:     name,
			Name:   name,
			Size:   formatModelBytes(model.Size),
			Source: "ollama-api",
		}
		if !model.ModifiedAt.IsZero() {
			info.ModifiedAt = model.ModifiedAt.Format(time.RFC3339)
		}
		models = append(models, info)
	}
	return models, nil
}

func listOllamaModelsCLI() ([]aiModelInfo, error) {
	path, err := exec.LookPath("ollama")
	if err != nil {
		return nil, err
	}
	output, err := exec.Command(path, "list").Output()
	if err != nil {
		return nil, err
	}

	lines := strings.Split(string(output), "\n")
	models := []aiModelInfo{}
	for i, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || i == 0 && strings.HasPrefix(strings.ToUpper(line), "NAME") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) == 0 {
			continue
		}
		size := ""
		if len(fields) >= 4 {
			size = strings.Join(fields[2:4], " ")
		}
		models = append(models, aiModelInfo{
			ID:     fields[0],
			Name:   fields[0],
			Size:   size,
			Source: "ollama-cli",
		})
	}
	return models, nil
}

func ollamaBaseURL() string {
	host := strings.TrimSpace(os.Getenv("OLLAMA_HOST"))
	if host == "" {
		return "http://127.0.0.1:11434"
	}
	if strings.HasPrefix(host, "http://") || strings.HasPrefix(host, "https://") {
		return strings.TrimRight(host, "/")
	}
	return "http://" + strings.TrimRight(host, "/")
}

func formatModelBytes(size int64) string {
	if size <= 0 {
		return ""
	}
	if size >= 1024*1024*1024 {
		return strconv.FormatFloat(float64(size)/(1024*1024*1024), 'f', 1, 64) + " GB"
	}
	if size >= 1024*1024 {
		return strconv.FormatFloat(float64(size)/(1024*1024), 'f', 1, 64) + " MB"
	}
	return strconv.FormatInt(size, 10) + " B"
}
