package service

import (
	"context"
	"math/rand"
	"net/url"
	"strings"

	"idea_platform/internal/domain"
	"idea_platform/internal/idgen"
	"idea_platform/internal/linkpreview"

	"gorm.io/gorm"
)

type PublishIdeaInput struct {
	Title            string
	Summary          string
	Problem          string
	WhyItMatters     string
	Constraints      []string
	OpenQuestions    []string
	DesiredOutputs   []string
	Tags             []string
	Visibility       string
	License          domain.License
	ExistingAttempts []domain.ExistingAttemptRef
	ViaAgent         bool
}

func (s *Service) PublishIdea(ctx context.Context, userID string, in PublishIdeaInput) (map[string]any, error) {
	if strings.TrimSpace(in.Title) == "" || strings.TrimSpace(in.Problem) == "" || strings.TrimSpace(in.WhyItMatters) == "" {
		return nil, Err(400, "标题、问题和价值为必填")
	}
	if in.Visibility == "" {
		in.Visibility = "public"
	}
	if in.License.CommercialUse == "" {
		in.License = domain.DefaultLicense()
	}
	me, err := s.UserByID(userID)
	if err != nil {
		return nil, err
	}
	id := idgen.New("idea_")
	createdAt := idgen.NowISO()
	author := domain.ActorRef{Kind: "user", UserID: me.ID, DisplayName: me.DisplayName}
	if in.ViaAgent {
		author = domain.ActorRef{
			Kind:        "agent",
			UserID:      me.ID,
			DisplayName: "Agent · " + me.DisplayName,
		}
	}
	idea := domain.Idea{
		ID:               id,
		Title:            strings.TrimSpace(in.Title),
		Summary:          strings.TrimSpace(in.Summary),
		Problem:          strings.TrimSpace(in.Problem),
		WhyItMatters:     strings.TrimSpace(in.WhyItMatters),
		Constraints:      compactStrings(in.Constraints),
		ExistingAttempts: filterExisting(in.ExistingAttempts),
		OpenQuestions:    compactStrings(in.OpenQuestions),
		DesiredOutputs:   compactStrings(in.DesiredOutputs),
		Tags:             compactStrings(in.Tags),
		Author:           author,
		AuthorUserID:     me.ID,
		License:          in.License,
		Visibility:       in.Visibility,
		Status:           "published",
		Graph: domain.Point{
			X: (rand.Float64() - 0.5) * 180,
			Y: (rand.Float64()-0.5)*180 + 40,
		},
		CreatedAt: createdAt,
		UpdatedAt: createdAt,
	}
	err = s.db().Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&idea).Error; err != nil {
			return err
		}
		return tx.Create(&domain.Event{
			ID:        idgen.New("evt_"),
			At:        createdAt,
			ActorID:   me.ID,
			ActorName: me.DisplayName,
			Text:      "发布了想法「" + idea.Title + "」",
			IdeaID:    id,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	s.invalidate(ctx)
	return map[string]any{"idea_id": id, "url": "/ideas/" + id, "review_status": "published"}, nil
}

func filterExisting(in []domain.ExistingAttemptRef) []domain.ExistingAttemptRef {
	out := make([]domain.ExistingAttemptRef, 0, len(in))
	for _, x := range in {
		if strings.TrimSpace(x.Title) == "" {
			continue
		}
		out = append(out, x)
	}
	return out
}

type AdoptIdeaInput struct {
	IdeaID     string
	Title      string
	Approach   string
	Visibility string
	TargetDate string
	AsWatch    bool
}

func (s *Service) AdoptIdea(ctx context.Context, userID string, in AdoptIdeaInput) (map[string]any, error) {
	if in.IdeaID == "" {
		return nil, Err(400, "缺少 idea_id")
	}
	if in.Visibility == "" {
		in.Visibility = "public"
	}
	me, err := s.UserByID(userID)
	if err != nil {
		return nil, err
	}
	id := idgen.New("att_")
	createdAt := idgen.NowISO()
	stage := "understanding"
	note := "已正式承接，开始理解问题。"
	if in.AsWatch {
		stage = "considering"
		note = "正在观察这个想法。"
	}
	err = s.db().Transaction(func(tx *gorm.DB) error {
		var idea domain.Idea
		if err := tx.First(&idea, "id = ?", in.IdeaID).Error; err != nil {
			return Err(404, "Idea 不存在")
		}
		var existing domain.Attempt
		if err := tx.Where("idea_id = ? AND owner_id = ? AND status <> ?", in.IdeaID, userID, "abandoned").First(&existing).Error; err == nil {
			return Err(409, "你已经有一条承接分支，可在「承接中」继续更新。")
		}
		title := strings.TrimSpace(in.Title)
		if title == "" {
			title = me.DisplayName
		}
		graph := randomGraphOffset(idea.Graph, 180, 80)
		att := domain.Attempt{
			ID:              id,
			IdeaID:          in.IdeaID,
			OwnerID:         me.ID,
			Title:           title,
			Approach:        strings.TrimSpace(in.Approach),
			Status:          stage,
			ProgressNote:    note,
			Visibility:      in.Visibility,
			Blockers:        []string{},
			StartedAt:       createdAt,
			LastActiveAt:    createdAt,
			CreatedAt:       createdAt,
			TargetDate:      strings.TrimSpace(in.TargetDate),
			WorkIDs:         []string{},
			Graph:           &graph,
			FeaturedOnGraph: true,
		}
		if err := tx.Create(&att).Error; err != nil {
			return err
		}
		text := "承接了「" + idea.Title + "」"
		if in.AsWatch {
			text = "开始关注这个想法"
		}
		if err := tx.Create(&domain.Event{
			ID:        idgen.New("evt_"),
			At:        createdAt,
			ActorID:   me.ID,
			ActorName: me.DisplayName,
			Text:      text,
			IdeaID:    idea.ID,
			AttemptID: id,
		}).Error; err != nil {
			return err
		}
		if err := tx.Create(&domain.Notification{
			ID:     idgen.New("ntf_"),
			UserID: me.ID,
			At:     createdAt,
			Title:  "承接已建立",
			Body:   "其他人仍可从不同方向实现。这条分支只属于你的执行轨道。",
			Read:   false,
			Href:   "/attempts/" + id,
			Kind:   "attempt",
		}).Error; err != nil {
			return err
		}
		return s.recomputeIdea(tx, idea.ID)
	})
	if err != nil {
		return nil, err
	}
	s.Store.IncrUnread(ctx, userID, 1)
	s.invalidate(ctx)
	return map[string]any{
		"attempt_id": id,
		"stage":      stage,
		"sync_url":   "/api/v1/attempts/" + id,
	}, nil
}

type UpdateAttemptInput struct {
	Status       string
	ProgressNote *string
	Blockers     *[]string
	Visibility   string
	Title        string
	Approach     string
	TargetDate   *string
}

func (s *Service) UpdateAttempt(ctx context.Context, userID, attemptID string, in UpdateAttemptInput) (map[string]any, error) {
	at := idgen.NowISO()
	var attempt domain.Attempt
	err := s.db().Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&attempt, "id = ?", attemptID).Error; err != nil {
			return Err(404, "承接不存在")
		}
		if attempt.OwnerID != userID {
			return Err(403, "只能更新自己的承接")
		}
		attempt.LastActiveAt = at
		if in.Status != "" {
			attempt.Status = in.Status
		}
		if in.ProgressNote != nil {
			attempt.ProgressNote = *in.ProgressNote
		}
		if in.Blockers != nil {
			attempt.Blockers = compactStrings(*in.Blockers)
		}
		if in.Visibility != "" {
			attempt.Visibility = in.Visibility
		}
		if in.Title != "" {
			attempt.Title = in.Title
		}
		if in.Approach != "" {
			attempt.Approach = in.Approach
		}
		if in.TargetDate != nil {
			attempt.TargetDate = strings.TrimSpace(*in.TargetDate)
		}
		if err := tx.Save(&attempt).Error; err != nil {
			return err
		}
		me, err := s.UserByID(userID)
		if err != nil {
			return err
		}
		text := "更新了承接进展"
		if in.ProgressNote != nil && strings.TrimSpace(*in.ProgressNote) != "" {
			text = strings.TrimSpace(*in.ProgressNote)
		}
		if err := tx.Create(&domain.Event{
			ID:        idgen.New("evt_"),
			At:        at,
			ActorID:   me.ID,
			ActorName: me.DisplayName,
			Text:      text,
			IdeaID:    attempt.IdeaID,
			AttemptID: attempt.ID,
		}).Error; err != nil {
			return err
		}
		return s.recomputeIdea(tx, attempt.IdeaID)
	})
	if err != nil {
		return nil, err
	}
	s.invalidate(ctx)
	domain.NormalizeAttempt(&attempt)
	attempt.LastActiveAt = at
	return map[string]any{
		"updated_at":   at,
		"graph_status": domain.EffectiveAttemptStatus(attempt, s.now()),
		"attempt":      attempt,
	}, nil
}

func (s *Service) FollowIdea(ctx context.Context, userID, ideaID string, follow bool) error {
	var idea domain.Idea
	if err := s.db().First(&idea, "id = ?", ideaID).Error; err != nil {
		return Err(404, "not_found")
	}
	if err := s.db().Where("user_id = ? AND idea_id = ?", userID, ideaID).Delete(&domain.Follow{}).Error; err != nil {
		return err
	}
	if follow {
		if err := s.db().Create(&domain.Follow{UserID: userID, IdeaID: ideaID}).Error; err != nil {
			return err
		}
	}
	s.invalidate(ctx)
	return nil
}

type PublishWorkInput struct {
	AttemptID     string
	Title         string
	Summary       string
	Type          string
	CoverURL      string
	ExternalURL   string
	RepositoryURL string
	License       domain.License
}

func (s *Service) PublishWork(ctx context.Context, userID string, in PublishWorkInput) (map[string]any, error) {
	if strings.TrimSpace(in.AttemptID) == "" || strings.TrimSpace(in.Title) == "" {
		return nil, Err(400, "attempt_id 与 title 为必填")
	}
	if in.Type == "" {
		in.Type = "other"
	}
	in.ExternalURL = strings.TrimSpace(in.ExternalURL)
	if in.ExternalURL != "" {
		externalURL, err := url.Parse(in.ExternalURL)
		if err != nil || (externalURL.Scheme != "http" && externalURL.Scheme != "https") || externalURL.User != nil {
			return nil, Err(400, "external_url 只支持 http 或 https 链接")
		}
	}
	coverSource := "provided"
	if in.CoverURL == "" {
		coverSource = "default"
		if preview := linkpreview.Resolve(ctx, in.ExternalURL); preview != nil {
			in.CoverURL = preview.ImageURL
			coverSource = preview.Source
		} else {
			in.CoverURL = "/covers/hushcity.jpg"
		}
	}
	if in.License.CommercialUse == "" {
		in.License = domain.DefaultLicense()
	}
	id := idgen.New("work_")
	at := idgen.NowISO()
	var ideaTitle string
	err := s.db().Transaction(func(tx *gorm.DB) error {
		var attempt domain.Attempt
		if err := tx.First(&attempt, "id = ?", in.AttemptID).Error; err != nil {
			return Err(404, "承接不存在")
		}
		if attempt.OwnerID != userID {
			return Err(403, "只能从自己的承接发布作品")
		}
		me, err := s.UserByID(userID)
		if err != nil {
			return err
		}
		credits := []domain.Credit{{UserID: me.ID, Role: "作者", Name: me.DisplayName}}
		var graph *domain.Point
		if attempt.Graph != nil {
			g := domain.Point{X: attempt.Graph.X + 180, Y: attempt.Graph.Y + 10}
			graph = &g
		}
		work := domain.Work{
			ID:            id,
			AttemptID:     attempt.ID,
			IdeaID:        attempt.IdeaID,
			Title:         strings.TrimSpace(in.Title),
			Summary:       strings.TrimSpace(in.Summary),
			Type:          in.Type,
			CoverURL:      in.CoverURL,
			ExternalURL:   strings.TrimSpace(in.ExternalURL),
			RepositoryURL: strings.TrimSpace(in.RepositoryURL),
			Status:        "published",
			Credits:       credits,
			License:       in.License,
			PublishedAt:   at,
			Graph:         graph,
		}
		if err := tx.Create(&work).Error; err != nil {
			return err
		}
		attempt.WorkIDs = append(attempt.WorkIDs, id)
		attempt.Status = "published"
		attempt.LastActiveAt = at
		attempt.ProgressNote = "发布了作品「" + work.Title + "」"
		if err := tx.Save(&attempt).Error; err != nil {
			return err
		}
		var idea domain.Idea
		_ = tx.First(&idea, "id = ?", attempt.IdeaID).Error
		ideaTitle = idea.Title
		if err := tx.Create(&domain.Event{
			ID:        idgen.New("evt_"),
			At:        at,
			ActorID:   me.ID,
			ActorName: me.DisplayName,
			Text:      "发布了作品「" + work.Title + "」",
			IdeaID:    attempt.IdeaID,
			AttemptID: attempt.ID,
			WorkID:    id,
		}).Error; err != nil {
			return err
		}
		if err := tx.Create(&domain.Notification{
			ID:     idgen.New("ntf_"),
			UserID: me.ID,
			At:     at,
			Title:  "作品已连接到来源想法",
			Body:   "「" + work.Title + "」已归因到「" + idea.Title + "」。署名不可移除。",
			Read:   false,
			Href:   "/works/" + id,
			Kind:   "work",
		}).Error; err != nil {
			return err
		}
		return s.recomputeIdea(tx, attempt.IdeaID)
	})
	if err != nil {
		return nil, err
	}
	s.Store.IncrUnread(ctx, userID, 1)
	s.invalidate(ctx)
	return map[string]any{
		"work_id": id,
		"url":     "/works/" + id,
		"preview": map[string]any{
			"cover_url": in.CoverURL,
			"source":    coverSource,
		},
		"attribution": map[string]any{
			"work_id":   id,
			"idea_url":  "",
			"ideaTitle": ideaTitle,
		},
	}, nil
}

func (s *Service) MarkNotificationsRead(ctx context.Context, userID string) error {
	if err := s.db().Model(&domain.Notification{}).Where("user_id = ?", userID).Update("is_read", true).Error; err != nil {
		return err
	}
	s.Store.SetUnread(ctx, userID, 0)
	s.invalidate(ctx)
	return nil
}

func (s *Service) ClearContent(ctx context.Context) error {
	emptyUsers := []domain.User{}
	emptyIdeas := []domain.Idea{}
	emptyAttempts := []domain.Attempt{}
	emptyWorks := []domain.Work{}
	emptyEvents := []domain.Event{}
	emptyNotifications := []domain.Notification{}
	emptyFollows := []domain.Follow{}
	if err := s.ImportDump(ctx, &DataDump{
		Users:         &emptyUsers,
		Ideas:         &emptyIdeas,
		Attempts:      &emptyAttempts,
		Works:         &emptyWorks,
		Events:        &emptyEvents,
		Notifications: &emptyNotifications,
		Follows:       &emptyFollows,
	}, true); err != nil {
		return err
	}
	s.invalidate(ctx)
	return nil
}
