package httpapi

import "idea_platform/internal/domain"

type publishIdeaBody struct {
	UserConfirmed     bool                        `json:"user_confirmed"`
	Title             string                      `json:"title"`
	Summary           string                      `json:"summary"`
	Problem           string                      `json:"problem"`
	WhyItMatters      string                      `json:"whyItMatters"`
	WhyItMattersAlt   string                      `json:"why_it_matters"`
	Constraints       []string                    `json:"constraints"`
	OpenQuestions     []string                    `json:"openQuestions"`
	OpenQuestionsAlt  []string                    `json:"open_questions"`
	DesiredOutputs    []string                    `json:"desiredOutputs"`
	DesiredOutputsAlt []string                    `json:"desired_outputs"`
	Tags              []string                    `json:"tags"`
	Visibility        string                      `json:"visibility"`
	License           domain.License              `json:"license"`
	ExistingAttempts  []domain.ExistingAttemptRef `json:"existingAttempts"`
	ExistingAlt       []domain.ExistingAttemptRef `json:"existing_attempts"`
	ViaAgent          bool                        `json:"viaAgent"`
	ViaAgentAlt       bool                        `json:"via_agent"`
	AsDraft           bool                        `json:"as_draft"`
}

type adoptIdeaBody struct {
	UserConfirmed bool   `json:"user_confirmed"`
	IdeaID        string `json:"ideaId"`
	IdeaIDAlt     string `json:"idea_id"`
	Title         string `json:"title"`
	Approach      string `json:"approach"`
	Visibility    string `json:"visibility"`
	TargetDate    string `json:"targetDate"`
	TargetDateAlt string `json:"target_date"`
	AsWatch       bool   `json:"asWatch"`
	AsWatchAlt    bool   `json:"as_watch"`
}

type updateAttemptBody struct {
	UserConfirmed   bool      `json:"user_confirmed"`
	Status          string    `json:"status"`
	ProgressNote    *string   `json:"progressNote"`
	ProgressNoteAlt *string   `json:"progress_note"`
	Blockers        *[]string `json:"blockers"`
	Visibility      string    `json:"visibility"`
	Title           string    `json:"title"`
	Approach        string    `json:"approach"`
	TargetDate      *string   `json:"targetDate"`
	TargetDateAlt   *string   `json:"target_date"`
}

type publishWorkBody struct {
	UserConfirmed    bool           `json:"user_confirmed"`
	AttemptID        string         `json:"attemptId"`
	AttemptIDAlt     string         `json:"attempt_id"`
	Title            string         `json:"title"`
	Summary          string         `json:"summary"`
	Type             string         `json:"type"`
	CoverURL         string         `json:"coverUrl"`
	CoverURLAlt      string         `json:"cover_url"`
	ExternalURL      string         `json:"externalUrl"`
	ExternalURLAlt   string         `json:"external_url"`
	RepositoryURL    string         `json:"repositoryUrl"`
	RepositoryURLAlt string         `json:"repository_url"`
	License          domain.License `json:"license"`
}

type followBody struct {
	Follow *bool `json:"follow"`
}

func pick(ss ...string) string {
	for _, s := range ss {
		if s != "" {
			return s
		}
	}
	return ""
}

func pickSlice(a, b []string) []string {
	if len(a) > 0 {
		return a
	}
	return b
}

func pickExisting(a, b []domain.ExistingAttemptRef) []domain.ExistingAttemptRef {
	if len(a) > 0 {
		return a
	}
	return b
}

func pickStrPtr(a, b *string) *string {
	if a != nil {
		return a
	}
	return b
}
