package service

import (
	"encoding/json"
	"idea_platform/internal/domain"
	"testing"
)

func TestWorkRevisionKeepsOriginalAndSkipsNoop(t *testing.T) {
	work := domain.Work{ID: "work", Title: "初版", Summary: "原说明", Type: "website", License: domain.License{CommercialUse: "no"}}
	if err := recordWorkRevision(&work, "first"); err != nil {
		t.Fatal(err)
	}
	work.Title = "第二版"
	if err := recordWorkRevision(&work, "second"); err != nil {
		t.Fatal(err)
	}
	if err := recordWorkRevision(&work, "unchanged"); err != nil {
		t.Fatal(err)
	}
	var revisions []workRevision
	if err := json.Unmarshal(work.Revisions, &revisions); err != nil {
		t.Fatal(err)
	}
	if len(revisions) != 2 || revisions[0].Title != "初版" || revisions[1].ID != "work:r2" {
		t.Fatalf("invalid revision history: %+v", revisions)
	}
}
