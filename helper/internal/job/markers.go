package job

import (
	"regexp"
	"strings"
)

var markerDirectivePattern = regexp.MustCompile(`(?i)^\s*(?:\[(marker|comment)(?::([^\]:]+))?(?::([^\]]+))?\]|//\s*(marker|comment)(?::([^\]:]+))?(?::([^\s]+))?)\s*:?\s*(.*)$`)

func normalizeAfterFields(segments []AETranscriptPart) []AETranscriptPart {
	for i := range segments {
		applyMarkerDetection(&segments[i])
	}
	return segments
}

func applyMarkerDetection(part *AETranscriptPart) {
	if part == nil {
		return
	}

	part.Text = strings.TrimSpace(part.Text)
	part.Comment = strings.TrimSpace(part.Comment)
	part.MarkerName = strings.TrimSpace(part.MarkerName)
	part.MarkerColor = strings.TrimSpace(part.MarkerColor)

	match := markerDirectivePattern.FindStringSubmatch(part.Text)
	if len(match) == 0 {
		return
	}

	kind := firstNonEmpty(match[1], match[4])
	name := firstNonEmpty(match[2], match[5])
	color := firstNonEmpty(match[3], match[6])
	body := strings.TrimSpace(match[7])

	if strings.EqualFold(kind, "marker") {
		part.IsMarker = true
	}
	if body != "" {
		part.Comment = body
		part.Text = body
	}
	if name != "" {
		part.MarkerName = strings.TrimSpace(name)
	}
	if color != "" {
		part.MarkerColor = strings.TrimSpace(color)
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}
