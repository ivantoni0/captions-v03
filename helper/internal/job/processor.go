package job

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"captions/helper/internal/config"
	"captions/helper/internal/model"
)

type Processor struct {
	cfg    *config.Config
	models *model.Registry
}

type ProgressFunc func(progress int, message string)

type transcriptionArtifacts struct {
	RawPath     string
	SRTPath     string
	TextPath    string
	Language    string
	Duration    float64
	WordCount   int
	Segments    []AETranscriptPart
	Backend     string
	Diarization *DiarizationInfo
}

type precisionSummary struct {
	Language    string             `json:"language"`
	Duration    float64            `json:"duration"`
	WordCount   int                `json:"wordCount"`
	Segments    []AETranscriptPart `json:"segments"`
	RawJSONPath string             `json:"rawJsonPath"`
	Backend     string             `json:"backend"`
	Diarization *DiarizationInfo   `json:"diarization,omitempty"`
}

func NewProcessor(cfg *config.Config, models *model.Registry) *Processor {
	return &Processor{
		cfg:    cfg,
		models: models,
	}
}

func (p *Processor) Process(jobID string, req TranscriptionRequest, progress ProgressFunc) (*JobResult, error) {
	progress = normalizeProgressFunc(progress)
	progress(2, "Preparing")

	if err := req.Validate(); err != nil {
		return nil, err
	}
	if req.DeleteSourceWhenDone {
		defer func() {
			_ = os.Remove(req.VideoPath)
		}()
	}

	if err := os.MkdirAll(req.OutputDir, 0o755); err != nil {
		return nil, fmt.Errorf("create output directory: %w", err)
	}
	progress(5, "Resolving model")

	modelInfo, ok := p.models.Resolve(req.Model)
	if !ok {
		return nil, fmt.Errorf("no available models found in %s", p.cfg.ModelsDir)
	}

	language := req.Language
	if !modelInfo.Multilingual && (language == "" || language == "auto") {
		language = "en"
	}

	baseName := captionBaseName(req)
	workBase := filepath.Join(req.OutputDir, fmt.Sprintf("%s_%s", baseName, shortJobID(jobID)))
	audioPath := workBase + ".wav"
	captionsJSONPath := workBase + ".captions.json"

	progress(8, "Extracting audio")
	if err := p.extractAudio(req.VideoPath, audioPath); err != nil {
		return nil, err
	}
	progress(18, "Audio ready")

	artifacts, err := p.transcribe(req, modelInfo, audioPath, workBase, language, progress)
	if err != nil {
		return nil, err
	}
	progress(92, "Building captions")

	segments := normalizeAfterFields(offsetTranscript(artifacts.Segments, req.TimelineOffset))
	duration := artifacts.Duration
	if req.TimelineOffset > 0 || duration <= 0 {
		duration = calculateDuration(segments)
	}
	wordCount := artifacts.WordCount
	if wordCount <= 0 {
		wordCount = calculateWordCount(segments)
	}
	if len(segments) == 0 || wordCount == 0 {
		return nil, fmt.Errorf("no speech detected in exported audio")
	}

	document := CaptionsDocument{
		Version:         "captions.after.v1",
		GeneratedAt:     time.Now().UTC().Format(time.RFC3339),
		SourceVideoPath: req.VideoPath,
		CompositionName: req.CompositionName,
		Language:        artifacts.Language,
		Model:           modelInfo.ID,
		TimingMode:      req.TimingMode,
		Backend:         artifacts.Backend,
		Duration:        duration,
		SegmentCount:    len(segments),
		WordCount:       wordCount,
		TimelineOffset:  req.TimelineOffset,
		Diarization:     artifacts.Diarization,
		Segments:        segments,
	}

	encoded, err := json.MarshalIndent(document, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("encode captions json: %w", err)
	}
	if err := os.WriteFile(captionsJSONPath, encoded, 0o644); err != nil {
		return nil, fmt.Errorf("write captions json: %w", err)
	}
	progress(96, "Writing outputs")

	if !fileExists(artifacts.SRTPath) {
		if err := os.WriteFile(artifacts.SRTPath, []byte(BuildSRT(segments)), 0o644); err != nil {
			return nil, fmt.Errorf("write srt: %w", err)
		}
	}
	if !fileExists(artifacts.TextPath) {
		if err := os.WriteFile(artifacts.TextPath, []byte(joinSegmentLines(segments)), 0o644); err != nil {
			return nil, fmt.Errorf("write text output: %w", err)
		}
	}
	progress(100, "Done")

	return &JobResult{
		CaptionsJSONPath: captionsJSONPath,
		WhisperJSONPath:  artifacts.RawPath,
		SRTPath:          artifacts.SRTPath,
		TextPath:         artifacts.TextPath,
		Language:         artifacts.Language,
		TimingMode:       req.TimingMode,
		Backend:          artifacts.Backend,
		Duration:         duration,
		SegmentCount:     len(segments),
		WordCount:        wordCount,
		TimelineOffset:   req.TimelineOffset,
		Diarization:      artifacts.Diarization,
	}, nil
}

func (p *Processor) extractAudio(inputPath, outputPath string) error {
	args := []string{
		"-y",
		"-i", inputPath,
		"-vn",
		"-ac", "1",
		"-ar", "16000",
		"-c:a", "pcm_s16le",
		outputPath,
	}

	if _, err := runCommand(p.cfg.FFmpegPath, args...); err != nil {
		return fmt.Errorf("audio extraction failed: %w", err)
	}
	return nil
}

func (p *Processor) transcribe(req TranscriptionRequest, modelInfo model.Info, audioPath, workBase, language string, progress ProgressFunc) (*transcriptionArtifacts, error) {
	if req.TimingMode == "precision" {
		return p.transcribePrecision(modelInfo, audioPath, workBase, language, progress)
	}
	return p.transcribeFast(modelInfo.Path, audioPath, workBase, language, progress)
}

func (p *Processor) transcribeFast(modelPath, audioPath, workBase, language string, progress ProgressFunc) (*transcriptionArtifacts, error) {
	whisperBase := workBase + ".whisper"
	whisperJSONPath := whisperBase + ".json"
	srtPath := whisperBase + ".srt"
	textPath := whisperBase + ".txt"

	progress(24, "Transcribing")
	if err := p.transcribeWhisperCLI(modelPath, audioPath, whisperBase, language); err != nil {
		return nil, err
	}
	progress(86, "Parsing transcript")

	parsedLanguage, segments, wordCount, err := MergeWithWhisperJSON(nil, whisperJSONPath)
	if err != nil {
		return nil, err
	}
	if parsedLanguage == "" {
		parsedLanguage = language
	}

	return &transcriptionArtifacts{
		RawPath:   whisperJSONPath,
		SRTPath:   srtPath,
		TextPath:  textPath,
		Language:  parsedLanguage,
		Duration:  calculateDuration(segments),
		WordCount: wordCount,
		Segments:  segments,
		Backend:   "whisper-cli",
	}, nil
}

func (p *Processor) transcribePrecision(modelInfo model.Info, audioPath, workBase, language string, progress ProgressFunc) (*transcriptionArtifacts, error) {
	if !p.cfg.PrecisionAvailable {
		return nil, fmt.Errorf(p.cfg.PrecisionStatus)
	}

	precisionBase := workBase + ".whisperx"
	summaryPath := precisionBase + ".summary.json"
	rawJSONPath := precisionBase + ".json"
	srtPath := precisionBase + ".srt"
	textPath := precisionBase + ".txt"

	args := []string{
		p.cfg.WhisperXRunnerPath,
		"--audio-path", audioPath,
		"--output-base", precisionBase,
		"--summary-path", summaryPath,
		"--model", modelInfo.ID,
		"--device", "cpu",
		"--compute-type", "int8",
		"--cache-dir", p.cfg.ModelCacheDir,
		"--vad-method", "silero",
		"--vad-onset", "0.35",
		"--vad-offset", "0.25",
		"--diarize", "auto",
	}
	if language != "" && language != "auto" {
		args = append(args, "--language", language)
	}

	progress(22, "Starting WhisperX")
	if _, err := runCommandWithProgress(p.cfg.WhisperXPythonPath, args, func(line string) {
		progressValue, message, ok := parseProgressLine(line)
		if ok {
			progress(progressValue, message)
		}
	}); err != nil {
		return nil, fmt.Errorf("precision transcription failed: %w", err)
	}
	progress(90, "Reading alignment")

	rawSummary, err := os.ReadFile(summaryPath)
	if err != nil {
		return nil, fmt.Errorf("read precision summary: %w", err)
	}

	var summary precisionSummary
	if err := json.Unmarshal(rawSummary, &summary); err != nil {
		return nil, fmt.Errorf("parse precision summary: %w", err)
	}

	if summary.RawJSONPath != "" {
		rawJSONPath = summary.RawJSONPath
	}
	if summary.Language == "" {
		summary.Language = language
	}
	if summary.Duration <= 0 {
		summary.Duration = calculateDuration(summary.Segments)
	}
	if summary.WordCount <= 0 {
		summary.WordCount = calculateWordCount(summary.Segments)
	}
	if summary.Backend == "" {
		summary.Backend = "whisperx"
	}
	if len(summary.Segments) == 0 {
		progress(90, "Precision returned no speech; retrying fast")
		fallback, err := p.transcribeFast(modelInfo.Path, audioPath, workBase, language, progress)
		if err != nil {
			return nil, fmt.Errorf("precision produced no transcript and fast fallback failed: %w", err)
		}
		if len(fallback.Segments) == 0 {
			return nil, fmt.Errorf("no speech detected in exported audio")
		}
		fallback.Backend = "whisperx-empty+whisper-cli"
		fallback.Diarization = summary.Diarization
		return fallback, nil
	}

	return &transcriptionArtifacts{
		RawPath:     rawJSONPath,
		SRTPath:     srtPath,
		TextPath:    textPath,
		Language:    summary.Language,
		Duration:    summary.Duration,
		WordCount:   summary.WordCount,
		Segments:    summary.Segments,
		Backend:     summary.Backend,
		Diarization: summary.Diarization,
	}, nil
}

func (p *Processor) transcribeWhisperCLI(modelPath, audioPath, outputBase, language string) error {
	args := []string{
		"-m", modelPath,
		"-f", audioPath,
		"-ojf",
		"-osrt",
		"-otxt",
		"-of", outputBase,
		"-np",
	}
	if language != "" {
		args = append(args, "-l", language)
	}

	if _, err := runCommand(p.cfg.WhisperCLIPath, args...); err != nil {
		return fmt.Errorf("whisper transcription failed: %w", err)
	}
	return nil
}

func calculateDuration(segments []AETranscriptPart) float64 {
	duration := 0.0
	for _, segment := range segments {
		if segment.End > duration {
			duration = segment.End
		}
	}
	return duration
}

func offsetTranscript(segments []AETranscriptPart, offset float64) []AETranscriptPart {
	if offset <= 0 {
		return segments
	}

	out := make([]AETranscriptPart, len(segments))
	for i, segment := range segments {
		segment.Start += offset
		segment.End += offset
		if len(segment.Words) > 0 {
			words := make([]AEWord, len(segment.Words))
			for j, word := range segment.Words {
				word.Start += offset
				word.End += offset
				words[j] = word
			}
			segment.Words = words
		}
		out[i] = segment
	}
	return out
}

func calculateWordCount(segments []AETranscriptPart) int {
	wordCount := 0
	for _, segment := range segments {
		if len(segment.Words) > 0 {
			wordCount += len(segment.Words)
			continue
		}
		if strings.TrimSpace(segment.Text) != "" {
			wordCount += len(strings.Fields(segment.Text))
		}
	}
	return wordCount
}

func normalizeProgressFunc(progress ProgressFunc) ProgressFunc {
	if progress != nil {
		return progress
	}
	return func(int, string) {}
}

type progressMessage struct {
	Type     string `json:"type"`
	Progress int    `json:"progress"`
	Message  string `json:"message"`
}

func parseProgressLine(line string) (int, string, bool) {
	line = strings.TrimSpace(line)
	if !strings.HasPrefix(line, "{") {
		return 0, "", false
	}

	var message progressMessage
	if err := json.Unmarshal([]byte(line), &message); err != nil {
		return 0, "", false
	}
	if message.Type != "progress" {
		return 0, "", false
	}
	return message.Progress, message.Message, true
}

type lineProgressWriter struct {
	mu     sync.Mutex
	buffer bytes.Buffer
	onLine func(string)
}

func (w *lineProgressWriter) Write(chunk []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	for _, value := range chunk {
		if value == '\n' || value == '\r' {
			w.flushLocked()
			continue
		}
		_ = w.buffer.WriteByte(value)
	}
	return len(chunk), nil
}

func (w *lineProgressWriter) flushLocked() {
	if w.buffer.Len() == 0 {
		return
	}

	line := w.buffer.String()
	w.buffer.Reset()
	if w.onLine != nil {
		w.onLine(line)
	}
}

func (w *lineProgressWriter) Flush() {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.flushLocked()
}

func runCommand(binary string, args ...string) ([]byte, error) {
	return runCommandWithProgress(binary, args, nil)
}

func runCommandWithProgress(binary string, args []string, onLine func(string)) ([]byte, error) {
	if binary == "" {
		return nil, fmt.Errorf("binary path is empty")
	}

	cmd := exec.Command(binary, args...)
	var combined bytes.Buffer
	progressWriter := &lineProgressWriter{onLine: onLine}
	writer := io.MultiWriter(&combined, progressWriter)
	cmd.Stdout = writer
	cmd.Stderr = writer

	if err := cmd.Run(); err != nil {
		progressWriter.Flush()
		output := strings.TrimSpace(combined.String())
		if output == "" {
			output = err.Error()
		}
		if strings.Contains(strings.ToLower(output), "abort trap") || strings.Contains(strings.ToLower(output), "killed: 6") {
			return nil, fmt.Errorf("%s. Run: brew reinstall ffmpeg", output)
		}
		return nil, fmt.Errorf("%s", output)
	}
	progressWriter.Flush()

	return combined.Bytes(), nil
}

func captionBaseName(req TranscriptionRequest) string {
	if req.CompositionName != "" {
		return sanitizeName(req.CompositionName)
	}

	base := strings.TrimSuffix(filepath.Base(req.VideoPath), filepath.Ext(req.VideoPath))
	base = sanitizeName(base)
	if base == "" {
		return "captions"
	}
	return base
}

func sanitizeName(name string) string {
	var builder strings.Builder
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z':
			builder.WriteRune(r)
		case r >= 'A' && r <= 'Z':
			builder.WriteRune(r)
		case r >= '0' && r <= '9':
			builder.WriteRune(r)
		case r == '-' || r == '_':
			builder.WriteRune(r)
		case r == ' ':
			builder.WriteRune('_')
		}
	}
	return strings.Trim(builder.String(), "_")
}

func shortJobID(jobID string) string {
	if len(jobID) <= 8 {
		return jobID
	}
	return jobID[len(jobID)-8:]
}

func joinSegmentLines(segments []AETranscriptPart) string {
	lines := make([]string, 0, len(segments))
	for _, segment := range segments {
		text := strings.TrimSpace(segment.Text)
		if text != "" {
			lines = append(lines, text)
		}
	}
	return strings.Join(lines, "\n")
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
