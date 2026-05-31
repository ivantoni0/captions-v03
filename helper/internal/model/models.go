package model

import (
	"os"
	"path/filepath"
	"sort"
)

type Info struct {
	ID           string `json:"id"`
	DisplayName  string `json:"displayName"`
	FileName     string `json:"fileName"`
	Multilingual bool   `json:"multilingual"`
	SizeBytes    int64  `json:"sizeBytes"`
	Path         string `json:"path"`
	Available    bool   `json:"available"`
}

type Registry struct {
	models map[string]Info
	order  []string
}

func NewRegistry(modelsDir string) *Registry {
	known := []Info{
		{
			ID:           "large-v3",
			DisplayName:  "Large v3",
			FileName:     "ggml-large-v3.bin",
			Multilingual: true,
			SizeBytes:    3113851289,
		},
		{
			ID:           "medium.en",
			DisplayName:  "Medium English",
			FileName:     "ggml-medium.en.bin",
			Multilingual: false,
			SizeBytes:    1533774781,
		},
	}

	registry := &Registry{
		models: make(map[string]Info, len(known)),
		order:  make([]string, 0, len(known)),
	}

	for _, entry := range known {
		entry.Path = filepath.Join(modelsDir, entry.FileName)
		entry.Available = fileExists(entry.Path)
		registry.models[entry.ID] = entry
		registry.order = append(registry.order, entry.ID)
	}

	return registry
}

func (r *Registry) List() []Info {
	out := make([]Info, 0, len(r.models))
	for _, id := range r.order {
		out = append(out, r.models[id])
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Available != out[j].Available {
			return out[i].Available
		}
		return out[i].DisplayName < out[j].DisplayName
	})

	return out
}

func (r *Registry) Default() Info {
	for _, model := range r.List() {
		if model.Available {
			return model
		}
	}
	return Info{}
}

func (r *Registry) Resolve(id string) (Info, bool) {
	if id != "" {
		if model, ok := r.models[id]; ok && model.Available {
			return model, true
		}
	}

	model := r.Default()
	if model.ID == "" {
		return Info{}, false
	}
	return model, true
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
