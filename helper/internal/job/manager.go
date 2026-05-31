package job

import (
	"crypto/rand"
	"encoding/hex"
	"sort"
	"sync"
	"time"
)

type Manager struct {
	mu        sync.RWMutex
	jobs      map[string]*JobState
	queue     chan *JobState
	processor *Processor
}

func NewManager(processor *Processor) *Manager {
	manager := &Manager{
		jobs:      make(map[string]*JobState),
		queue:     make(chan *JobState, 32),
		processor: processor,
	}

	go manager.loop()
	return manager
}

func (m *Manager) Enqueue(req TranscriptionRequest) (*JobState, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	state := &JobState{
		ID:        nextJobID(),
		Status:    StatusQueued,
		Progress:  0,
		Message:   "Queued",
		Request:   req,
		CreatedAt: time.Now().UTC(),
	}

	m.mu.Lock()
	m.jobs[state.ID] = state
	m.mu.Unlock()

	m.queue <- state
	return cloneJobState(state), nil
}

func (m *Manager) List() []*JobState {
	m.mu.RLock()
	defer m.mu.RUnlock()

	out := make([]*JobState, 0, len(m.jobs))
	for _, state := range m.jobs {
		out = append(out, cloneJobState(state))
	}

	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})

	return out
}

func (m *Manager) Get(id string) (*JobState, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	state, ok := m.jobs[id]
	if !ok {
		return nil, false
	}
	return cloneJobState(state), true
}

func (m *Manager) loop() {
	for state := range m.queue {
		startedAt := time.Now().UTC()
		m.update(state.ID, func(job *JobState) {
			job.Status = StatusRunning
			job.Progress = 1
			job.Message = "Starting"
			job.StartedAt = &startedAt
			job.Error = ""
		})

		result, err := m.processor.Process(state.ID, state.Request, func(progress int, message string) {
			m.updateProgress(state.ID, progress, message)
		})
		finishedAt := time.Now().UTC()

		m.update(state.ID, func(job *JobState) {
			job.FinishedAt = &finishedAt
			if err != nil {
				job.Status = StatusFailed
				job.Progress = 100
				job.Message = "Failed"
				job.Error = err.Error()
				job.Result = nil
				return
			}
			job.Status = StatusDone
			job.Progress = 100
			job.Message = "Done"
			job.Error = ""
			job.Result = result
		})
	}
}

func (m *Manager) updateProgress(id string, progress int, message string) {
	if progress < 0 {
		progress = 0
	}
	if progress > 100 {
		progress = 100
	}

	m.update(id, func(job *JobState) {
		if progress >= job.Progress {
			job.Progress = progress
		}
		if message != "" {
			job.Message = message
		}
	})
}

func (m *Manager) update(id string, fn func(job *JobState)) {
	m.mu.Lock()
	defer m.mu.Unlock()

	job, ok := m.jobs[id]
	if !ok {
		return
	}
	fn(job)
}

func cloneJobState(in *JobState) *JobState {
	if in == nil {
		return nil
	}

	out := *in
	if in.Result != nil {
		result := *in.Result
		out.Result = &result
	}
	if in.StartedAt != nil {
		startedAt := *in.StartedAt
		out.StartedAt = &startedAt
	}
	if in.FinishedAt != nil {
		finishedAt := *in.FinishedAt
		out.FinishedAt = &finishedAt
	}
	return &out
}

func nextJobID() string {
	randomBytes := make([]byte, 4)
	if _, err := rand.Read(randomBytes); err != nil {
		return time.Now().UTC().Format("20060102T150405.000000000")
	}
	return time.Now().UTC().Format("20060102T150405.000000000") + "-" + hex.EncodeToString(randomBytes)
}
