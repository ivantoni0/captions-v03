package job

import (
	"fmt"
	"path/filepath"
	"strings"
	"time"
)

type TranscriptionRequest struct {
	VideoPath            string  `json:"videoPath"`
	OutputDir            string  `json:"outputDir"`
	Model                string  `json:"model"`
	Language             string  `json:"language"`
	TimingMode           string  `json:"timingMode"`
	DeleteSourceWhenDone bool    `json:"deleteSourceWhenDone,omitempty"`
	Destination          string  `json:"destination"`
	CaptionMode          string  `json:"captionMode"`
	WordsPerLayer        int     `json:"wordsPerLayer"`
	CompositionName      string  `json:"compositionName"`
	TimelineOffset       float64 `json:"timelineOffset,omitempty"`
}

func (r *TranscriptionRequest) Normalize() {
	r.VideoPath = strings.TrimSpace(r.VideoPath)
	r.OutputDir = strings.TrimSpace(r.OutputDir)
	r.Model = strings.TrimSpace(r.Model)
	r.Language = strings.ToLower(strings.TrimSpace(r.Language))
	r.TimingMode = strings.ToLower(strings.TrimSpace(r.TimingMode))
	r.Destination = strings.TrimSpace(r.Destination)
	r.CaptionMode = strings.TrimSpace(r.CaptionMode)
	r.CompositionName = strings.TrimSpace(r.CompositionName)

	if r.Language == "" {
		r.Language = "auto"
	}
	if r.TimingMode == "" {
		r.TimingMode = "fast"
	}
	if r.TimingMode == "precise" {
		r.TimingMode = "precision"
	}
	if r.Destination == "" {
		r.Destination = "active-comp"
	}
	if r.CaptionMode == "" {
		r.CaptionMode = "words"
	}
	if r.WordsPerLayer < 1 {
		r.WordsPerLayer = 1
	}
	if r.WordsPerLayer > 20 {
		r.WordsPerLayer = 20
	}
	if r.TimelineOffset < 0 {
		r.TimelineOffset = 0
	}
}

func (r *TranscriptionRequest) Validate() error {
	r.Normalize()

	if r.VideoPath == "" {
		return fmt.Errorf("videoPath is required")
	}
	if !filepath.IsAbs(r.VideoPath) {
		return fmt.Errorf("videoPath must be absolute")
	}
	if r.OutputDir == "" {
		return fmt.Errorf("outputDir is required")
	}
	if !filepath.IsAbs(r.OutputDir) {
		return fmt.Errorf("outputDir must be absolute")
	}
	if r.TimingMode != "fast" && r.TimingMode != "precision" && r.TimingMode != "precise" {
		return fmt.Errorf("timingMode must be fast or precise")
	}
	if r.CaptionMode != "words" && r.CaptionMode != "phrases" {
		return fmt.Errorf("captionMode must be words or phrases")
	}

	return nil
}

type AEWord struct {
	Start   float64 `json:"start"`
	End     float64 `json:"end"`
	Text    string  `json:"text"`
	Speaker string  `json:"speaker,omitempty"`
}

type AETranscriptPart struct {
	Index       int      `json:"index"`
	Start       float64  `json:"start"`
	End         float64  `json:"end"`
	Text        string   `json:"text"`
	Comment     string   `json:"comment"`
	IsMarker    bool     `json:"isMarker"`
	MarkerName  string   `json:"markerName"`
	MarkerColor string   `json:"markerColor"`
	Speaker     string   `json:"speaker,omitempty"`
	Words       []AEWord `json:"words,omitempty"`
}

type DiarizationInfo struct {
	Enabled  bool     `json:"enabled"`
	Status   string   `json:"status"`
	Speakers []string `json:"speakers,omitempty"`
}

type CaptionsDocument struct {
	Version         string             `json:"version"`
	GeneratedAt     string             `json:"generatedAt"`
	SourceVideoPath string             `json:"sourceVideoPath"`
	CompositionName string             `json:"compositionName,omitempty"`
	Language        string             `json:"language"`
	Model           string             `json:"model"`
	TimingMode      string             `json:"timingMode,omitempty"`
	Backend         string             `json:"backend,omitempty"`
	Duration        float64            `json:"duration"`
	SegmentCount    int                `json:"segmentCount"`
	WordCount       int                `json:"wordCount"`
	TimelineOffset  float64            `json:"timelineOffset,omitempty"`
	Diarization     *DiarizationInfo   `json:"diarization,omitempty"`
	Segments        []AETranscriptPart `json:"segments"`
}

type Status string

const (
	StatusQueued  Status = "queued"
	StatusRunning Status = "running"
	StatusDone    Status = "done"
	StatusFailed  Status = "failed"
)

type JobResult struct {
	CaptionsJSONPath string           `json:"captionsJsonPath"`
	WhisperJSONPath  string           `json:"whisperJsonPath"`
	SRTPath          string           `json:"srtPath"`
	TextPath         string           `json:"textPath"`
	Language         string           `json:"language"`
	TimingMode       string           `json:"timingMode,omitempty"`
	Backend          string           `json:"backend,omitempty"`
	Duration         float64          `json:"duration"`
	SegmentCount     int              `json:"segmentCount"`
	WordCount        int              `json:"wordCount"`
	TimelineOffset   float64          `json:"timelineOffset,omitempty"`
	Diarization      *DiarizationInfo `json:"diarization,omitempty"`
}

type JobState struct {
	ID         string               `json:"id"`
	Status     Status               `json:"status"`
	Progress   int                  `json:"progress"`
	Message    string               `json:"message,omitempty"`
	Request    TranscriptionRequest `json:"request"`
	Result     *JobResult           `json:"result,omitempty"`
	Error      string               `json:"error,omitempty"`
	CreatedAt  time.Time            `json:"createdAt"`
	StartedAt  *time.Time           `json:"startedAt,omitempty"`
	FinishedAt *time.Time           `json:"finishedAt,omitempty"`
}
