package service

import (
	"testing"

	"idea_platform/internal/domain"
)

func TestWorkForUserKeepsIterationOnlyForOwner(t *testing.T) {
	work := domain.Work{
		ID: "work_1",
		Iteration: &domain.WorkIteration{
			Status: "open",
			Suggestions: []domain.AgentSuggestion{{
				ID:     "suggestion_1",
				Title:  "private",
				Status: "pending",
			}},
		},
	}
	if got := workForUser(work, "owner", "owner"); got.Iteration == nil {
		t.Fatal("owner should receive iteration suggestions")
	}
	if got := workForUser(work, "owner", "viewer"); got.Iteration != nil {
		t.Fatal("non-owner must not receive iteration suggestions")
	}
	if work.Iteration == nil {
		t.Fatal("sanitizing a copy must not mutate stored work")
	}
}

func TestAttemptExecutionIsPrivate(t *testing.T) {
	attempt := domain.Attempt{ID: "branch", OwnerID: "owner", Execution: []byte(`[{"id":"run","instruction":"private"}]`)}
	if got := attemptForUser(attempt, "viewer"); got.Execution != nil {
		t.Fatal("other viewers must not receive execution history")
	}
	if got := attemptForUser(attempt, "owner"); got.Execution == nil {
		t.Fatal("owner should retain execution history")
	}
}
