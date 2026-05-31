package job

import "testing"

func TestBuildSegmentsFromWhisperUsesTenMillisecondOffsets(t *testing.T) {
	segments := buildSegmentsFromWhisper([]whisperSegment{
		{
			Text: "hello world",
			Timestamps: struct {
				From string `json:"from"`
				To   string `json:"to"`
			}{
				From: "00:00:05,000",
				To:   "00:00:06,500",
			},
			Offsets: struct {
				From int64 `json:"from"`
				To   int64 `json:"to"`
			}{
				From: 500,
				To:   650,
			},
		},
	})

	if len(segments) != 1 {
		t.Fatalf("expected 1 segment, got %d", len(segments))
	}

	if segments[0].Start != 5.0 {
		t.Fatalf("expected start 5.0, got %v", segments[0].Start)
	}

	if segments[0].End != 6.5 {
		t.Fatalf("expected end 6.5, got %v", segments[0].End)
	}
}

func TestWordsFromTokensUsesTenMillisecondOffsets(t *testing.T) {
	words := wordsFromTokens(
		[]whisperToken{
			{
				Text: " hello",
				Timestamps: struct {
					From string `json:"from"`
					To   string `json:"to"`
				}{
					From: "00:00:01,230",
					To:   "00:00:01,560",
				},
				Offsets: struct {
					From int64 `json:"from"`
					To   int64 `json:"to"`
				}{
					From: 123,
					To:   156,
				},
			},
		},
		100.0,
	)

	if len(words) != 1 {
		t.Fatalf("expected 1 word, got %d", len(words))
	}

	if words[0].Start != 1.23 {
		t.Fatalf("expected start 1.23, got %v", words[0].Start)
	}

	if words[0].End != 1.56 {
		t.Fatalf("expected end 1.56, got %v", words[0].End)
	}
}

func TestBuildSegmentsFromWhisperUsesMillisecondOffsets(t *testing.T) {
	segments := buildSegmentsFromWhisper([]whisperSegment{
		{
			Text: "hello world",
			Timestamps: struct {
				From string `json:"from"`
				To   string `json:"to"`
			}{
				From: "00:00:05,000",
				To:   "00:00:06,500",
			},
			Offsets: struct {
				From int64 `json:"from"`
				To   int64 `json:"to"`
			}{
				From: 5000,
				To:   6500,
			},
		},
	})

	if len(segments) != 1 {
		t.Fatalf("expected 1 segment, got %d", len(segments))
	}

	if segments[0].Start != 5.0 {
		t.Fatalf("expected start 5.0, got %v", segments[0].Start)
	}

	if segments[0].End != 6.5 {
		t.Fatalf("expected end 6.5, got %v", segments[0].End)
	}
}
