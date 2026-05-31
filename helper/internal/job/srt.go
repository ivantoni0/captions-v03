package job

import (
	"fmt"
	"strings"
)

func BuildSRT(segments []AETranscriptPart) string {
	var builder strings.Builder

	for index, segment := range segments {
		start := segment.Start
		end := segment.End
		if end <= start {
			end = start + 0.04
		}

		builder.WriteString(fmt.Sprintf("%d\n", index+1))
		builder.WriteString(formatSRTTime(start))
		builder.WriteString(" --> ")
		builder.WriteString(formatSRTTime(end))
		builder.WriteString("\n")
		builder.WriteString(strings.TrimSpace(segment.Text))
		builder.WriteString("\n\n")
	}

	return builder.String()
}

func formatSRTTime(seconds float64) string {
	if seconds < 0 {
		seconds = 0
	}

	totalMilliseconds := int(seconds * 1000.0)
	hours := totalMilliseconds / 3600000
	totalMilliseconds %= 3600000
	minutes := totalMilliseconds / 60000
	totalMilliseconds %= 60000
	secs := totalMilliseconds / 1000
	milliseconds := totalMilliseconds % 1000

	return fmt.Sprintf("%02d:%02d:%02d,%03d", hours, minutes, secs, milliseconds)
}
