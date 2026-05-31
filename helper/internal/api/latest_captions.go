package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type latestCaptionsRequest struct {
	OutputDir     string `json:"outputDir"`
	IncludeGlobal bool   `json:"includeGlobal"`
}

type latestCaptionsResponse struct {
	OK               bool     `json:"ok"`
	Found            bool     `json:"found"`
	CaptionsJSONPath string   `json:"captionsJsonPath,omitempty"`
	ModifiedAt       string   `json:"modifiedAt,omitempty"`
	SizeBytes        int64    `json:"sizeBytes,omitempty"`
	Directories      []string `json:"directories,omitempty"`
	SkippedDirs      []string `json:"skippedDirs,omitempty"`
	Errors           []string `json:"errors,omitempty"`
}

func (s *Server) handleLatestCaptions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req latestCaptionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "invalid json payload",
		})
		return
	}

	response := s.findLatestCaptions(req)
	status := http.StatusOK
	if len(response.Errors) > 0 && !response.Found {
		status = http.StatusBadRequest
	}
	s.writeJSON(w, status, response)
}

func (s *Server) findLatestCaptions(req latestCaptionsRequest) latestCaptionsResponse {
	response := latestCaptionsResponse{OK: true}
	dirs := []string{}
	if strings.TrimSpace(req.OutputDir) != "" {
		dirs = append(dirs, req.OutputDir)
	}
	if req.IncludeGlobal {
		dirs = append(dirs, s.cfg.OutputsDir, s.cfg.TempDir)
	}

	var latestMod time.Time
	for _, dir := range uniqueStrings(dirs) {
		cleanDir, err := filepath.Abs(filepath.Clean(dir))
		if err != nil || cleanDir == "" {
			response.SkippedDirs = append(response.SkippedDirs, dir)
			continue
		}
		if !s.safeCleanupDir(cleanDir) {
			response.SkippedDirs = append(response.SkippedDirs, cleanDir)
			continue
		}

		info, err := os.Stat(cleanDir)
		if err != nil || !info.IsDir() {
			response.SkippedDirs = append(response.SkippedDirs, cleanDir)
			continue
		}

		response.Directories = append(response.Directories, cleanDir)
		err = filepath.WalkDir(cleanDir, func(path string, entry os.DirEntry, walkErr error) error {
			if walkErr != nil {
				return nil
			}
			if entry.IsDir() {
				if path != cleanDir && strings.HasPrefix(entry.Name(), ".") {
					return filepath.SkipDir
				}
				return nil
			}

			if !strings.HasSuffix(strings.ToLower(entry.Name()), ".captions.json") {
				return nil
			}
			if !hasEditableCaptionSegments(path) {
				return nil
			}

			info, statErr := entry.Info()
			if statErr != nil {
				return nil
			}
			if !response.Found || info.ModTime().After(latestMod) {
				latestMod = info.ModTime()
				response.Found = true
				response.CaptionsJSONPath = path
				response.ModifiedAt = info.ModTime().UTC().Format(time.RFC3339)
				response.SizeBytes = info.Size()
			}
			return nil
		})
		if err != nil {
			response.Errors = append(response.Errors, cleanDir+": "+err.Error())
		}
	}

	if len(response.Errors) > 0 {
		response.OK = false
	}
	return response
}

func hasEditableCaptionSegments(path string) bool {
	payload, err := os.ReadFile(path)
	if err != nil {
		return false
	}

	var doc struct {
		Segments []json.RawMessage `json:"segments"`
	}
	if err := json.Unmarshal(payload, &doc); err != nil {
		return false
	}
	return len(doc.Segments) > 0
}
