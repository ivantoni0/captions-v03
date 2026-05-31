package job

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"unicode"
)

type whisperJSON struct {
	Result struct {
		Language string `json:"language"`
	} `json:"result"`
	Transcription []whisperSegment `json:"transcription"`
}

type whisperSegment struct {
	Timestamps struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"timestamps"`
	Text    string `json:"text"`
	Offsets struct {
		From int64 `json:"from"`
		To   int64 `json:"to"`
	} `json:"offsets"`
	Tokens []whisperToken `json:"tokens"`
}

type whisperToken struct {
	Timestamps struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"timestamps"`
	Text    string `json:"text"`
	Offsets struct {
		From int64 `json:"from"`
		To   int64 `json:"to"`
	} `json:"offsets"`
}

func whisperOffsetToSeconds(offset int64, divisor float64) float64 {
	return float64(offset) / divisor
}

func MergeWithWhisperJSON(segments []AETranscriptPart, jsonPath string) (string, []AETranscriptPart, int, error) {
	rawData, err := os.ReadFile(jsonPath)
	if err != nil {
		return "", nil, 0, fmt.Errorf("read whisper json: %w", err)
	}

	var parsed whisperJSON
	if err := json.Unmarshal(rawData, &parsed); err != nil {
		return "", nil, 0, fmt.Errorf("parse whisper json: %w", err)
	}

	if len(segments) == 0 && len(parsed.Transcription) > 0 {
		segments = buildSegmentsFromWhisper(parsed.Transcription)
	}

	if len(parsed.Transcription) == len(segments) {
		for i := range segments {
			words := wordsFromTokens(parsed.Transcription[i].Tokens, inferWhisperOffsetDivisor(parsed.Transcription))
			if len(words) > 0 {
				segments[i].Words = words
			}
		}
	}

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

	for i := range segments {
		segments[i].Index = i + 1
	}

	return parsed.Result.Language, segments, wordCount, nil
}

func buildSegmentsFromWhisper(in []whisperSegment) []AETranscriptPart {
	offsetDivisor := inferWhisperOffsetDivisor(in)
	out := make([]AETranscriptPart, 0, len(in))
	for i, segment := range in {
		start := whisperOffsetToSeconds(segment.Offsets.From, offsetDivisor)
		end := whisperOffsetToSeconds(segment.Offsets.To, offsetDivisor)
		if end <= start {
			end = start + 0.04
		}

		text := strings.TrimSpace(segment.Text)
		words := wordsFromTokens(segment.Tokens, offsetDivisor)
		if text == "" && len(words) > 0 {
			parts := make([]string, 0, len(words))
			for _, word := range words {
				parts = append(parts, word.Text)
			}
			text = strings.Join(parts, " ")
		}

		out = append(out, AETranscriptPart{
			Index: i + 1,
			Start: start,
			End:   end,
			Text:  text,
			Words: words,
		})
	}
	return out
}

func wordsFromTokens(tokens []whisperToken, offsetDivisor float64) []AEWord {
	words := make([]AEWord, 0, len(tokens))
	var current *AEWord

	flush := func() {
		if current == nil {
			return
		}
		current.Text = strings.TrimSpace(current.Text)
		if current.Text == "" {
			current = nil
			return
		}
		if current.End < current.Start {
			current.End = current.Start
		}
		words = append(words, *current)
		current = nil
	}

	for _, token := range tokens {
		raw := token.Text
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" || isSpecialToken(trimmed) {
			continue
		}

		start := whisperOffsetToSeconds(token.Offsets.From, offsetDivisor)
		end := whisperOffsetToSeconds(token.Offsets.To, offsetDivisor)
		if end < start {
			end = start
		}

		if current == nil || startsWithWhitespace(raw) {
			flush()
			current = &AEWord{
				Start: start,
				End:   end,
				Text:  trimmed,
			}
			continue
		}

		current.Text += trimmed
		if start < current.Start {
			current.Start = start
		}
		if end > current.End {
			current.End = end
		}
	}

	flush()

	for i := range words {
		if words[i].End <= words[i].Start {
			if i+1 < len(words) && words[i+1].Start > words[i].Start {
				words[i].End = words[i+1].Start
			} else {
				words[i].End = words[i].Start + 0.04
			}
		}
	}

	return words
}

func inferWhisperOffsetDivisor(segments []whisperSegment) float64 {
	var timestampSeconds float64
	var offsetValue int64
	var ok bool

	for _, segment := range segments {
		timestampSeconds, offsetValue, ok = whisperSegmentReference(segment)
		if ok {
			return chooseWhisperOffsetDivisor(offsetValue, timestampSeconds)
		}
	}

	return 1000.0
}

func whisperSegmentReference(segment whisperSegment) (float64, int64, bool) {
	if seconds, ok := parseWhisperTimestamp(segment.Timestamps.To); ok && segment.Offsets.To > 0 {
		return seconds, segment.Offsets.To, true
	}

	for _, token := range segment.Tokens {
		if seconds, ok := parseWhisperTimestamp(token.Timestamps.To); ok && token.Offsets.To > 0 {
			return seconds, token.Offsets.To, true
		}
	}

	return 0, 0, false
}

func chooseWhisperOffsetDivisor(offset int64, seconds float64) float64 {
	if offset <= 0 || seconds <= 0 {
		return 1000.0
	}

	msDelta := absFloat((float64(offset) / 1000.0) - seconds)
	tenMsDelta := absFloat((float64(offset) / 100.0) - seconds)
	if tenMsDelta < msDelta {
		return 100.0
	}
	return 1000.0
}

func parseWhisperTimestamp(value string) (float64, bool) {
	if value == "" {
		return 0, false
	}

	var hours int
	var minutes int
	var seconds int
	var millis int
	if _, err := fmt.Sscanf(value, "%d:%d:%d,%d", &hours, &minutes, &seconds, &millis); err != nil {
		return 0, false
	}

	total := float64(hours*3600+minutes*60+seconds) + (float64(millis) / 1000.0)
	return total, true
}

func absFloat(value float64) float64 {
	if value < 0 {
		return -value
	}
	return value
}

func startsWithWhitespace(value string) bool {
	if value == "" {
		return false
	}
	for _, r := range value {
		return unicode.IsSpace(r)
	}
	return false
}

func isSpecialToken(value string) bool {
	return strings.HasPrefix(value, "[_") && strings.HasSuffix(value, "]")
}
