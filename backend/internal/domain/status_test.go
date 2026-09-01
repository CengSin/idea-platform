package domain

import (
	"testing"
	"time"
)

func TestEffectiveAttemptStatusStalls(t *testing.T) {
	now := time.Date(2026, 8, 26, 0, 0, 0, 0, time.UTC)
	a := Attempt{Status: "prototyping", LastActiveAt: "2026-07-01T00:00:00.000Z"}
	if got := EffectiveAttemptStatus(a, now); got != "stalled" {
		t.Fatalf("got %s", got)
	}
	a.LastActiveAt = "2026-08-20T00:00:00.000Z"
	if got := EffectiveAttemptStatus(a, now); got != "prototyping" {
		t.Fatalf("got %s", got)
	}
}

func TestRecomputeIdeaStatus(t *testing.T) {
	now := time.Now().UTC()
	idea := Idea{ID: "idea_1", Status: "published"}
	if got := RecomputeIdeaStatus(idea, nil, nil, now); got != "published" {
		t.Fatalf("got %s", got)
	}
	attempts := []Attempt{{ID: "a1", IdeaID: "idea_1", Status: "prototyping", LastActiveAt: now.Format(time.RFC3339)}}
	if got := RecomputeIdeaStatus(idea, attempts, nil, now); got != "evolving" {
		t.Fatalf("got %s", got)
	}
	works := []Work{{ID: "w1", IdeaID: "idea_1", Status: "published"}}
	if got := RecomputeIdeaStatus(idea, attempts, works, now); got != "realized" {
		t.Fatalf("got %s", got)
	}
}

func TestNormalizeIdeaPublishesHistoricalRows(t *testing.T) {
	idea := Idea{}
	NormalizeIdea(&idea)
	if idea.Status != "published" {
		t.Fatalf("historical status = %q", idea.Status)
	}
	draft := Idea{Status: "draft"}
	NormalizeIdea(&draft)
	if draft.Status != "draft" {
		t.Fatalf("draft status changed to %q", draft.Status)
	}
}
