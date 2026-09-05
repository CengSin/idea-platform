package service

import (
	"encoding/json"
	"fmt"
	"idea_platform/internal/domain"
	"reflect"
)

type workRevision struct {
	ID            string         `json:"id"`
	Number        int            `json:"number"`
	RecordedAt    string         `json:"recordedAt"`
	Title         string         `json:"title"`
	Summary       string         `json:"summary"`
	Type          string         `json:"type"`
	CoverURL      string         `json:"coverUrl"`
	ExternalURL   string         `json:"externalUrl,omitempty"`
	RepositoryURL string         `json:"repositoryUrl,omitempty"`
	License       domain.License `json:"license"`
}

func recordWorkRevision(work *domain.Work, at string) error {
	var revisions []workRevision
	if len(work.Revisions) > 0 {
		if err := json.Unmarshal(work.Revisions, &revisions); err != nil {
			return err
		}
	}
	next := workRevision{Title: work.Title, Summary: work.Summary, Type: work.Type, CoverURL: work.CoverURL, ExternalURL: work.ExternalURL, RepositoryURL: work.RepositoryURL, License: work.License}
	if len(revisions) > 0 {
		previous := revisions[len(revisions)-1]
		previous.ID = ""
		previous.Number = 0
		previous.RecordedAt = ""
		if reflect.DeepEqual(previous, next) {
			return nil
		}
	}
	next.Number = len(revisions) + 1
	next.ID = fmt.Sprintf("%s:r%d", work.ID, next.Number)
	next.RecordedAt = at
	revisions = append(revisions, next)
	raw, err := json.Marshal(revisions)
	if err != nil {
		return err
	}
	work.Revisions = raw
	return nil
}
