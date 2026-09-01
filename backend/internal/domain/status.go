package domain

import (
	"time"
)

func Contains(list []string, v string) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

func DaysBetween(iso string, now time.Time) float64 {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		t, err = time.Parse("2006-01-02T15:04:05.000Z", iso)
		if err != nil {
			return 0
		}
	}
	return now.Sub(t).Hours() / 24
}

func EffectiveAttemptStatus(attempt Attempt, now time.Time) string {
	if Contains(ActiveAttemptStatuses, attempt.Status) && DaysBetween(attempt.LastActiveAt, now) > StallAfterDays {
		return "stalled"
	}
	return attempt.Status
}

func IdeaMetricsFrom(ideaID string, attempts []Attempt, works []Work, ideas []Idea, now time.Time) IdeaMetrics {
	var related []Attempt
	for _, a := range attempts {
		if a.IdeaID == ideaID {
			related = append(related, a)
		}
	}
	m := IdeaMetrics{}
	for _, a := range related {
		st := EffectiveAttemptStatus(a, now)
		switch st {
		case "considering":
			m.WatchingCount++
		case "paused":
			m.PausedAttemptCount++
		}
		if Contains(ActiveAttemptStatuses, st) {
			m.ActiveAttemptCount++
		}
		if a.Status != "abandoned" {
			m.TotalAttemptCount++
		}
	}
	for _, w := range works {
		if w.IdeaID == ideaID && w.Status == "published" {
			m.WorkCount++
		}
	}
	for _, i := range ideas {
		if i.ParentIdeaID == ideaID && i.Status != "draft" {
			m.ForkCount++
		}
	}
	return m
}

func RecomputeIdeaStatus(idea Idea, attempts []Attempt, works []Work, now time.Time) string {
	if idea.Status == "draft" || idea.Status == "archived" {
		return idea.Status
	}
	var related []Attempt
	for _, a := range attempts {
		if a.IdeaID == idea.ID {
			related = append(related, a)
		}
	}
	hasWork := false
	for _, w := range works {
		if w.IdeaID == idea.ID && w.Status == "published" {
			hasWork = true
			break
		}
	}
	hasActive := false
	hasPublishedAttempt := false
	for _, a := range related {
		st := EffectiveAttemptStatus(a, now)
		if Contains(ActiveAttemptStatuses, st) {
			hasActive = true
		}
		if st == "published" {
			hasPublishedAttempt = true
		}
	}
	if hasWork || hasPublishedAttempt {
		return "realized"
	}
	if hasActive {
		return "evolving"
	}
	if len(related) > 0 {
		return "dormant"
	}
	return "published"
}

func BuildIdeaContext(idea Idea, origin string) IdeaContext {
	constraints := idea.Constraints
	if constraints == nil {
		constraints = []string{}
	}
	existing := idea.ExistingAttempts
	if existing == nil {
		existing = []ExistingAttemptRef{}
	}
	questions := idea.OpenQuestions
	if questions == nil {
		questions = []string{}
	}
	outputs := idea.DesiredOutputs
	if outputs == nil {
		outputs = []string{}
	}
	tags := idea.Tags
	if tags == nil {
		tags = []string{}
	}
	return IdeaContext{
		IdeaID:           idea.ID,
		Title:            idea.Title,
		Summary:          idea.Summary,
		Problem:          idea.Problem,
		WhyItMatters:     idea.WhyItMatters,
		Constraints:      constraints,
		ExistingAttempts: existing,
		OpenQuestions:    questions,
		DesiredOutputs:   outputs,
		License:          idea.License,
		Tags:             tags,
		Source: IdeaContextSource{
			URL:    origin + "/ideas/" + idea.ID,
			Author: idea.Author.DisplayName,
		},
	}
}

func NormalizeIdea(idea *Idea) {
	// Rows created before draft support are already-public historical content.
	if idea.Status == "" {
		idea.Status = "published"
	}
	if idea.Constraints == nil {
		idea.Constraints = []string{}
	}
	if idea.ExistingAttempts == nil {
		idea.ExistingAttempts = []ExistingAttemptRef{}
	}
	if idea.OpenQuestions == nil {
		idea.OpenQuestions = []string{}
	}
	if idea.DesiredOutputs == nil {
		idea.DesiredOutputs = []string{}
	}
	if idea.Tags == nil {
		idea.Tags = []string{}
	}
}

func NormalizeAttempt(a *Attempt) {
	if a.Blockers == nil {
		a.Blockers = []string{}
	}
	if a.WorkIDs == nil {
		a.WorkIDs = []string{}
	}
}

func NormalizeWork(w *Work) {
	if w.Credits == nil {
		w.Credits = []Credit{}
	}
}

func NormalizeUser(u *User) {
	if u.Skills == nil {
		u.Skills = []string{}
	}
	if u.ProjectLinks == nil {
		u.ProjectLinks = []ProjectLink{}
	}
}
