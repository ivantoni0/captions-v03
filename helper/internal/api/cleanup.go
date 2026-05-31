package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type cleanupRequest struct {
	OutputDir        string `json:"outputDir"`
	CaptionsJSONPath string `json:"captionsJsonPath"`
	IncludeGlobal    bool   `json:"includeGlobal"`
}

type cleanupResponse struct {
	OK           bool     `json:"ok"`
	DeletedFiles int      `json:"deletedFiles"`
	DeletedBytes int64    `json:"deletedBytes"`
	Directories  []string `json:"directories"`
	SkippedDirs  []string `json:"skippedDirs,omitempty"`
	Errors       []string `json:"errors,omitempty"`
}

func (s *Server) handleCleanup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req cleanupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "invalid json payload",
		})
		return
	}

	response := s.cleanupGeneratedFiles(req)
	status := http.StatusOK
	if len(response.Errors) > 0 && response.DeletedFiles == 0 {
		status = http.StatusBadRequest
	}
	s.writeJSON(w, status, response)
}

func (s *Server) cleanupGeneratedFiles(req cleanupRequest) cleanupResponse {
	var response cleanupResponse
	response.OK = true

	dirs := uniqueStrings(cleanupCandidateDirs(req, s.cfg.OutputsDir, s.cfg.TempDir))
	for _, dir := range dirs {
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
			if !isGeneratedCaptionArtifact(path) {
				return nil
			}

			size := int64(0)
			if info, statErr := entry.Info(); statErr == nil {
				size = info.Size()
			}
			if removeErr := os.Remove(path); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
				response.Errors = append(response.Errors, path+": "+removeErr.Error())
				return nil
			}
			response.DeletedFiles += 1
			response.DeletedBytes += size
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

func cleanupCandidateDirs(req cleanupRequest, outputsDir, tempDir string) []string {
	var dirs []string
	if req.OutputDir != "" {
		dirs = append(dirs, req.OutputDir)
	}
	if req.CaptionsJSONPath != "" {
		dirs = append(dirs, filepath.Dir(req.CaptionsJSONPath))
	}
	if req.IncludeGlobal {
		dirs = append(dirs, outputsDir, tempDir)
	}
	return dirs
}

func (s *Server) safeCleanupDir(dir string) bool {
	if filepath.Base(dir) == "_Captions" {
		return true
	}
	for _, allowed := range []string{s.cfg.OutputsDir, s.cfg.TempDir} {
		if allowed == "" {
			continue
		}
		allowedAbs, err := filepath.Abs(filepath.Clean(allowed))
		if err != nil {
			continue
		}
		if dir == allowedAbs || strings.HasPrefix(dir, allowedAbs+string(os.PathSeparator)) {
			return true
		}
	}
	return false
}

func isGeneratedCaptionArtifact(path string) bool {
	name := strings.ToLower(filepath.Base(path))
	if name == ".ds_store" {
		return true
	}
	if strings.HasSuffix(name, ".captions.json") {
		return true
	}
	for _, marker := range []string{".whisper.", ".whisperx."} {
		if strings.Contains(name, marker) &&
			(strings.HasSuffix(name, ".json") || strings.HasSuffix(name, ".srt") || strings.HasSuffix(name, ".txt")) {
			return true
		}
	}
	if strings.HasSuffix(name, "_captions.mov") {
		return true
	}
	if strings.HasSuffix(name, ".wav") || strings.HasSuffix(name, ".aif") || strings.HasSuffix(name, ".aiff") {
		return looksLikeCaptionJobArtifact(name)
	}
	return false
}

func looksLikeCaptionJobArtifact(name string) bool {
	if strings.Contains(name, "_captions") {
		return true
	}
	base := strings.TrimSuffix(name, filepath.Ext(name))
	parts := strings.Split(base, "_")
	if len(parts) < 2 {
		return false
	}
	return isShortHex(parts[len(parts)-1])
}

func isShortHex(value string) bool {
	if len(value) != 8 {
		return false
	}
	for _, char := range value {
		if !((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f')) {
			return false
		}
	}
	return true
}

func uniqueStrings(values []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	return out
}
