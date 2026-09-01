package service

import (
	"testing"

	"idea_platform/internal/domain"
)

func TestScopeSnapshotKeepsOnlyOwnedDraftTree(t *testing.T) {
	snap := &domain.Snapshot{
		Ideas: []domain.Idea{
			{ID: "mine", Status: "draft", AuthorUserID: "user-a"},
			{ID: "other", Status: "draft", AuthorUserID: "user-b"},
			{ID: "live", Status: "published", AuthorUserID: "user-b"},
		},
		Attempts: []domain.Attempt{
			{ID: "a-mine", IdeaID: "mine"},
			{ID: "a-other", IdeaID: "other"},
			{ID: "a-live", IdeaID: "live"},
		},
		Works: []domain.Work{
			{ID: "w-mine", IdeaID: "mine", AttemptID: "a-mine"},
			{ID: "w-other", IdeaID: "other", AttemptID: "a-other"},
			{ID: "w-live", IdeaID: "live", AttemptID: "a-live"},
		},
		Events: []domain.Event{
			{ID: "e-mine", IdeaID: "mine", AttemptID: "a-mine", WorkID: "w-mine"},
			{ID: "e-other", IdeaID: "other", AttemptID: "a-other", WorkID: "w-other"},
		},
		Follows: []domain.Follow{
			{UserID: "user-a", IdeaID: "mine"},
			{UserID: "user-b", IdeaID: "live"},
		},
	}
	scopeSnapshot(snap, "user-a")
	if len(snap.Ideas) != 2 || len(snap.Attempts) != 2 || len(snap.Works) != 2 || len(snap.Events) != 1 {
		t.Fatalf("unexpected scoped tree: ideas=%d attempts=%d works=%d events=%d", len(snap.Ideas), len(snap.Attempts), len(snap.Works), len(snap.Events))
	}
	if len(snap.Follows) != 1 || snap.Follows[0].UserID != "user-a" {
		t.Fatalf("unexpected follows: %+v", snap.Follows)
	}
}
