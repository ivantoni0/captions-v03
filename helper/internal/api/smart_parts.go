package api

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"captions/helper/internal/job"
)

const smartPartsBatchSize = 140

type smartPartsRequest struct {
	CaptionsJSONPath string `json:"captionsJsonPath"`
	Provider         string `json:"provider"`
	Model            string `json:"model"`
	MinWords         int    `json:"minWords"`
	MaxWords         int    `json:"maxWords"`
	MaxChars         int    `json:"maxChars"`
	Force            bool   `json:"force"`
}

type smartPartsResponse struct {
	OK               bool     `json:"ok"`
	CaptionsJSONPath string   `json:"captionsJsonPath"`
	SourceJSONPath   string   `json:"sourceJsonPath"`
	Provider         string   `json:"provider"`
	Model            string   `json:"model"`
	Cached           bool     `json:"cached"`
	SegmentCount     int      `json:"segmentCount"`
	WordCount        int      `json:"wordCount"`
	Warnings         []string `json:"warnings,omitempty"`
}

type captionWord struct {
	Text    string
	Start   float64
	End     float64
	Speaker string
}

type promptWord struct {
	I     int     `json:"i"`
	Text  string  `json:"text"`
	Gap   float64 `json:"gapAfter,omitempty"`
	Pause bool    `json:"pauseAfter,omitempty"`
}

type ollamaChatResponse struct {
	Message struct {
		Content string `json:"content"`
	} `json:"message"`
}

type smartGroupsPayload struct {
	Groups [][]int `json:"groups"`
}

func (s *Server) handleSmartParts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req smartPartsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "invalid json payload",
		})
		return
	}

	response, err := s.createSmartParts(req)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": err.Error(),
		})
		return
	}
	s.writeJSON(w, http.StatusOK, response)
}

func (s *Server) createSmartParts(req smartPartsRequest) (smartPartsResponse, error) {
	req.normalize()
	if req.CaptionsJSONPath == "" {
		return smartPartsResponse{}, fmt.Errorf("captionsJsonPath is required")
	}

	sourcePath, err := filepath.Abs(filepath.Clean(req.CaptionsJSONPath))
	if err != nil {
		return smartPartsResponse{}, fmt.Errorf("resolve captions json: %w", err)
	}
	sourceInfo, err := os.Stat(sourcePath)
	if err != nil || sourceInfo.IsDir() {
		return smartPartsResponse{}, fmt.Errorf("captions json not found: %s", sourcePath)
	}
	if !strings.HasSuffix(strings.ToLower(sourcePath), ".captions.json") {
		return smartPartsResponse{}, fmt.Errorf("file must be a .captions.json file")
	}

	outputPath := smartPartsOutputPath(sourcePath, req)
	if !req.Force {
		if outputInfo, statErr := os.Stat(outputPath); statErr == nil && outputInfo.ModTime().After(sourceInfo.ModTime()) {
			doc, readErr := readCaptionsDocument(outputPath)
			if readErr == nil {
				return smartPartsResponse{
					OK:               true,
					CaptionsJSONPath: outputPath,
					SourceJSONPath:   sourcePath,
					Provider:         req.Provider,
					Model:            req.Model,
					Cached:           true,
					SegmentCount:     len(doc.Segments),
					WordCount:        doc.WordCount,
				}, nil
			}
		}
	}

	doc, err := readCaptionsDocument(sourcePath)
	if err != nil {
		return smartPartsResponse{}, err
	}

	words := flattenCaptionWords(doc.Segments)
	warnings := []string{}
	var groups [][]captionWord
	if len(words) == 0 {
		groups = fallbackGroupsFromSegments(doc.Segments)
		warnings = append(warnings, "No word timings found, kept transcript phrase timing.")
	} else {
		groups = s.groupWordsWithAI(words, req, &warnings)
	}

	smartSegments := groupsToSegments(groups)
	if len(smartSegments) == 0 {
		return smartPartsResponse{}, fmt.Errorf("smart parts generated no segments")
	}

	doc.GeneratedAt = time.Now().UTC().Format(time.RFC3339)
	doc.Backend = strings.TrimSpace(doc.Backend + "+smart-parts")
	doc.SegmentCount = len(smartSegments)
	doc.WordCount = len(words)
	doc.Duration = maxSegmentEnd(smartSegments, doc.Duration)
	doc.Segments = smartSegments

	encoded, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return smartPartsResponse{}, fmt.Errorf("encode smart captions json: %w", err)
	}
	if err := os.WriteFile(outputPath, encoded, 0o644); err != nil {
		return smartPartsResponse{}, fmt.Errorf("write smart captions json: %w", err)
	}

	return smartPartsResponse{
		OK:               true,
		CaptionsJSONPath: outputPath,
		SourceJSONPath:   sourcePath,
		Provider:         req.Provider,
		Model:            req.Model,
		Cached:           false,
		SegmentCount:     len(smartSegments),
		WordCount:        len(words),
		Warnings:         warnings,
	}, nil
}

func (r *smartPartsRequest) normalize() {
	r.CaptionsJSONPath = strings.TrimSpace(r.CaptionsJSONPath)
	r.Provider = strings.TrimSpace(strings.ToLower(r.Provider))
	if r.Provider == "" {
		r.Provider = "ollama"
	}
	r.Model = strings.TrimSpace(r.Model)
	if r.MinWords < 1 {
		r.MinWords = 2
	}
	if r.MaxWords < r.MinWords {
		r.MaxWords = 5
	}
	if r.MaxWords > 12 {
		r.MaxWords = 12
	}
	if r.MaxChars < 12 {
		r.MaxChars = 34
	}
}

func readCaptionsDocument(path string) (job.CaptionsDocument, error) {
	var doc job.CaptionsDocument
	content, err := os.ReadFile(path)
	if err != nil {
		return doc, fmt.Errorf("read captions json: %w", err)
	}
	if err := json.Unmarshal(content, &doc); err != nil {
		return doc, fmt.Errorf("parse captions json: %w", err)
	}
	return doc, nil
}

func smartPartsOutputPath(sourcePath string, req smartPartsRequest) string {
	base := strings.TrimSuffix(sourcePath, ".captions.json")
	hash := sha1.Sum([]byte(req.Provider + "|" + req.Model + "|" + fmt.Sprint(req.MinWords, req.MaxWords, req.MaxChars)))
	return base + ".smart-" + hex.EncodeToString(hash[:])[:8] + ".captions.json"
}

func flattenCaptionWords(segments []job.AETranscriptPart) []captionWord {
	words := []captionWord{}
	for _, segment := range segments {
		for _, word := range segment.Words {
			text := strings.TrimSpace(word.Text)
			if text == "" {
				continue
			}
			start := word.Start
			end := word.End
			if end <= start {
				end = start + 0.04
			}
			speaker := strings.TrimSpace(word.Speaker)
			if speaker == "" {
				speaker = strings.TrimSpace(segment.Speaker)
			}
			words = append(words, captionWord{
				Text:    text,
				Start:   start,
				End:     end,
				Speaker: speaker,
			})
		}
	}
	return words
}

func (s *Server) groupWordsWithAI(words []captionWord, req smartPartsRequest, warnings *[]string) [][]captionWord {
	if req.Provider != "ollama" {
		*warnings = append(*warnings, "Unsupported AI provider, used rule fallback.")
		return deterministicSmartGroups(words, req.MinWords, req.MaxWords, req.MaxChars)
	}

	model := req.Model
	if model == "" {
		models, _ := s.listOllamaModels()
		if len(models) > 0 {
			model = models[0].ID
			req.Model = model
		}
	}
	if model == "" {
		*warnings = append(*warnings, "No Ollama model selected, used rule fallback.")
		return deterministicSmartGroups(words, req.MinWords, req.MaxWords, req.MaxChars)
	}

	allGroups := [][]captionWord{}
	for start := 0; start < len(words); start += smartPartsBatchSize {
		end := start + smartPartsBatchSize
		if end > len(words) {
			end = len(words)
		}
		batch := words[start:end]
		localGroups, err := s.askOllamaForGroups(model, batch, req.MinWords, req.MaxWords, req.MaxChars)
		if err != nil {
			if len(*warnings) < 6 {
				*warnings = append(*warnings, fmt.Sprintf("AI batch %d used rule fallback: %s", start/smartPartsBatchSize+1, err.Error()))
			}
			allGroups = append(allGroups, deterministicSmartGroups(batch, req.MinWords, req.MaxWords, req.MaxChars)...)
			continue
		}
		for _, group := range localGroups {
			chunk := make([]captionWord, 0, len(group))
			for _, index := range group {
				chunk = append(chunk, batch[index])
			}
			allGroups = append(allGroups, chunk)
		}
	}
	return allGroups
}

func (s *Server) askOllamaForGroups(model string, words []captionWord, minWords, maxWords, maxChars int) ([][]int, error) {
	prompt := buildSmartPartsPrompt(words, minWords, maxWords, maxChars)
	response, err := askOllamaHTTP(model, prompt)
	if err != nil {
		response, err = askOllamaCLI(model, prompt)
	}
	if err != nil {
		return nil, err
	}
	groups, err := parseSmartGroups(response)
	if err != nil {
		return nil, err
	}
	if !validLocalGroups(groups, len(words)) {
		return nil, fmt.Errorf("AI returned invalid word coverage")
	}
	return groups, nil
}

func buildSmartPartsPrompt(words []captionWord, minWords, maxWords, maxChars int) string {
	items := make([]promptWord, 0, len(words))
	for i, word := range words {
		gap := 0.0
		if i < len(words)-1 {
			gap = words[i+1].Start - word.End
			if gap < 0 {
				gap = 0
			}
		}
		items = append(items, promptWord{
			I:     i,
			Text:  word.Text,
			Gap:   roundSeconds(gap),
			Pause: gap >= 0.24,
		})
	}
	encoded, _ := json.Marshal(items)
	return fmt.Sprintf(`Group transcript words into short subtitle parts by meaning.
Return ONLY valid JSON with this shape: {"groups":[[0,1,2],[3,4]]}
Rules:
- Use every index from 0 to %d exactly once.
- Keep indexes in order. Never reorder, duplicate, or skip.
- Prefer %d-%d words per group.
- Max %d characters per group when possible.
- Split on punctuation, topic changes, and pauseAfter=true.
- One-word groups are allowed only for emphasis or very short words.

WORDS:
%s`, len(words)-1, minWords, maxWords, maxChars, string(encoded))
}

func askOllamaHTTP(model, prompt string) (string, error) {
	payload := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"stream": false,
		"format": "json",
		"think":  false,
		"options": map[string]any{
			"temperature": 0,
			"num_predict": 2048,
		},
	}
	encoded, _ := json.Marshal(payload)
	client := http.Client{Timeout: 180 * time.Second}
	response, err := client.Post(ollamaBaseURL()+"/api/chat", "application/json", bytes.NewReader(encoded))
	if err != nil {
		return "", err
	}
	defer response.Body.Close()
	body, _ := io.ReadAll(response.Body)
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", fmt.Errorf("ollama api status %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
	}
	var parsed ollamaChatResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", err
	}
	return parsed.Message.Content, nil
}

func askOllamaCLI(model, prompt string) (string, error) {
	path, err := exec.LookPath("ollama")
	if err != nil {
		return "", err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 180*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, path, "run", model, prompt)
	output, err := cmd.CombinedOutput()
	if ctx.Err() == context.DeadlineExceeded {
		return "", fmt.Errorf("ollama timed out")
	}
	if err != nil {
		return "", fmt.Errorf("ollama run failed: %w: %s", err, strings.TrimSpace(string(output)))
	}
	return string(output), nil
}

func parseSmartGroups(text string) ([][]int, error) {
	text = strings.TrimSpace(text)
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start < 0 || end <= start {
		return nil, fmt.Errorf("AI response did not contain JSON")
	}
	var payload smartGroupsPayload
	if err := json.Unmarshal([]byte(text[start:end+1]), &payload); err != nil {
		return nil, err
	}
	if len(payload.Groups) == 0 {
		return nil, fmt.Errorf("AI returned no groups")
	}
	return payload.Groups, nil
}

func validLocalGroups(groups [][]int, wordCount int) bool {
	expected := 0
	for _, group := range groups {
		if len(group) == 0 {
			return false
		}
		for _, index := range group {
			if index != expected {
				return false
			}
			expected++
		}
	}
	return expected == wordCount
}

func deterministicSmartGroups(words []captionWord, minWords, maxWords, maxChars int) [][]captionWord {
	groups := [][]captionWord{}
	current := []captionWord{}
	currentChars := 0
	for i, word := range words {
		current = append(current, word)
		if currentChars > 0 {
			currentChars++
		}
		currentChars += len([]rune(word.Text))

		gapAfter := 0.0
		if i < len(words)-1 {
			gapAfter = words[i+1].Start - word.End
		}
		shouldBreak := len(current) >= maxWords || currentChars >= maxChars
		if len(current) >= minWords && (hasTerminalPunctuation(word.Text) || gapAfter >= 0.24) {
			shouldBreak = true
		}
		if shouldBreak {
			groups = append(groups, current)
			current = []captionWord{}
			currentChars = 0
		}
	}
	if len(current) > 0 {
		groups = append(groups, current)
	}
	return groups
}

func fallbackGroupsFromSegments(segments []job.AETranscriptPart) [][]captionWord {
	groups := [][]captionWord{}
	for _, segment := range segments {
		text := strings.TrimSpace(segment.Text)
		if text == "" {
			continue
		}
		groups = append(groups, []captionWord{{
			Text:    text,
			Start:   segment.Start,
			End:     segment.End,
			Speaker: segment.Speaker,
		}})
	}
	return groups
}

func groupsToSegments(groups [][]captionWord) []job.AETranscriptPart {
	segments := make([]job.AETranscriptPart, 0, len(groups))
	for i, group := range groups {
		if len(group) == 0 {
			continue
		}
		words := make([]job.AEWord, 0, len(group))
		parts := make([]string, 0, len(group))
		speaker := group[0].Speaker
		sameSpeaker := speaker != ""
		for _, word := range group {
			parts = append(parts, word.Text)
			if word.Speaker != speaker {
				sameSpeaker = false
			}
			words = append(words, job.AEWord{
				Start:   word.Start,
				End:     word.End,
				Text:    word.Text,
				Speaker: word.Speaker,
			})
		}
		if !sameSpeaker {
			speaker = ""
		}
		segments = append(segments, job.AETranscriptPart{
			Index:   i,
			Start:   group[0].Start,
			End:     group[len(group)-1].End,
			Text:    strings.Join(parts, " "),
			Speaker: speaker,
			Words:   words,
		})
	}
	return segments
}

func maxSegmentEnd(segments []job.AETranscriptPart, fallback float64) float64 {
	out := fallback
	for _, segment := range segments {
		if segment.End > out {
			out = segment.End
		}
	}
	return out
}

func hasTerminalPunctuation(text string) bool {
	text = strings.TrimSpace(text)
	if text == "" {
		return false
	}
	last := text[len(text)-1]
	return last == '.' || last == ',' || last == '?' || last == '!' || last == ':' || last == ';'
}

func roundSeconds(value float64) float64 {
	return float64(int(value*1000+0.5)) / 1000
}
