package config

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

type Config struct {
	ListenAddr         string
	AppSupportDir      string
	ModelCacheDir      string
	ModelsDir          string
	OutputsDir         string
	TempDir            string
	WhisperCLIPath     string
	FFmpegPath         string
	WhisperXPythonPath string
	WhisperXRunnerPath string
	PrecisionAvailable bool
	PrecisionStatus    string
}

func Load(listenAddr string) (*Config, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("resolve home dir: %w", err)
	}

	appSupportDir := envOr(
		"CAPTIONS_APP_SUPPORT_DIR",
		filepath.Join(home, "Library", "Application Support", "Captions"),
	)
	outputsDir := envOr("CAPTIONS_OUTPUTS_DIR", filepath.Join(appSupportDir, "outputs"))
	tempDir := envOr("CAPTIONS_TEMP_DIR", filepath.Join(appSupportDir, "tmp"))
	modelCacheDir := envOr("CAPTIONS_MODEL_CACHE_DIR", filepath.Join(appSupportDir, "model-cache"))
	modelsDir := resolveModelsDir(
		os.Getenv("CAPTIONS_MODELS_DIR"),
		filepath.Join(appSupportDir, "models"),
		filepath.Join(home, "Library", "Application Support", "Captions-Standalone", "models"),
	)

	cfg := &Config{
		ListenAddr:     listenAddr,
		AppSupportDir:  appSupportDir,
		ModelCacheDir:  modelCacheDir,
		ModelsDir:      modelsDir,
		OutputsDir:     outputsDir,
		TempDir:        tempDir,
		WhisperCLIPath: resolveBinary(os.Getenv("CAPTIONS_WHISPER_CLI"), "whisper-cli"),
		FFmpegPath:     resolveBinary(os.Getenv("CAPTIONS_FFMPEG_PATH"), "ffmpeg"),
		WhisperXPythonPath: resolveExecutablePath(
			os.Getenv("CAPTIONS_WHISPERX_PYTHON"),
			filepath.Join(appSupportDir, "whisperx-venv", "bin", "python"),
		),
		WhisperXRunnerPath: resolveReadableFile(
			os.Getenv("CAPTIONS_WHISPERX_RUNNER"),
			filepath.Join(appSupportDir, "scripts", "whisperx_runner.py"),
		),
	}

	cfg.PrecisionAvailable, cfg.PrecisionStatus = validatePrecisionBackend(cfg.WhisperXPythonPath, cfg.WhisperXRunnerPath)

	for _, dir := range []string{cfg.AppSupportDir, cfg.OutputsDir, cfg.TempDir, cfg.ModelCacheDir} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("create directory %s: %w", dir, err)
		}
	}

	return cfg, nil
}

func (c *Config) DefaultTimingMode() string {
	if c.PrecisionAvailable {
		return "precision"
	}
	return "fast"
}

func (c *Config) ValidateTools() error {
	var problems []error

	if c.WhisperCLIPath == "" {
		problems = append(problems, errors.New("whisper-cli not found"))
	}
	if c.FFmpegPath == "" {
		problems = append(problems, errors.New("ffmpeg not found"))
	}
	if c.ModelsDir == "" {
		problems = append(problems, errors.New("models directory not found"))
	} else {
		matches, err := filepath.Glob(filepath.Join(c.ModelsDir, "ggml-*.bin"))
		if err != nil || len(matches) == 0 {
			problems = append(problems, fmt.Errorf("no ggml model files found in %s", c.ModelsDir))
		}
	}

	return errors.Join(problems...)
}

func envOr(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func resolveModelsDir(candidates ...string) string {
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		info, err := os.Stat(candidate)
		if err == nil && info.IsDir() {
			return candidate
		}
	}
	if len(candidates) > 1 {
		return candidates[1]
	}
	return ""
}

func resolveBinary(explicitPath, binaryName string) string {
	if isExecutableFile(explicitPath) {
		return explicitPath
	}

	if path, err := exec.LookPath(binaryName); err == nil {
		return path
	}

	for _, candidate := range []string{
		filepath.Join("/opt/homebrew/bin", binaryName),
		filepath.Join("/usr/local/bin", binaryName),
		filepath.Join("/usr/bin", binaryName),
	} {
		if isExecutableFile(candidate) {
			return candidate
		}
	}

	return ""
}

func resolveExecutablePath(candidates ...string) string {
	for _, candidate := range candidates {
		if isExecutableFile(candidate) {
			return candidate
		}
	}
	return ""
}

func resolveReadableFile(candidates ...string) string {
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		info, err := os.Stat(candidate)
		if err == nil && !info.IsDir() {
			return candidate
		}
	}
	return ""
}

func validatePrecisionBackend(pythonPath, runnerPath string) (bool, string) {
	if pythonPath == "" {
		return false, "Precision unavailable: WhisperX Python runtime not found."
	}
	if runnerPath == "" {
		return false, "Precision unavailable: WhisperX runner script not found."
	}

	cmd := exec.Command(pythonPath, "-c", "import whisperx")
	if err := cmd.Run(); err != nil {
		return false, "Precision unavailable: WhisperX is not installed in the configured Python environment."
	}

	return true, "Precision ready: WhisperX forced alignment is available. First run may download alignment models."
}

func isExecutableFile(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return false
	}
	return info.Mode()&0o111 != 0
}
