package service

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"math/rand"
	"strings"
	"time"

	"idea_platform/internal/config"
	"idea_platform/internal/domain"
	"idea_platform/internal/idgen"
	"idea_platform/internal/store"

	"gorm.io/gorm"
)

type APIError struct {
	Status  int
	Message string
}

func (e *APIError) Error() string { return e.Message }

func Err(status int, msg string) error {
	return &APIError{Status: status, Message: msg}
}

type Service struct {
	Store *store.Store
	Cfg   config.Config
}

func New(st *store.Store, cfg config.Config) *Service {
	return &Service{Store: st, Cfg: cfg}
}

func (s *Service) now() time.Time { return time.Now().UTC() }

func (s *Service) db() *gorm.DB { return s.Store.DB }

func (s *Service) UserByID(id string) (domain.User, error) {
	var u domain.User
	if err := s.db().First(&u, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return u, Err(404, "用户不存在")
		}
		return u, err
	}
	domain.NormalizeUser(&u)
	return u, nil
}

func (s *Service) Me(ctx context.Context, userID string) (map[string]any, error) {
	u, err := s.UserByID(userID)
	if err != nil {
		return nil, err
	}
	unread, err := s.UnreadCount(ctx, userID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"user":        u,
		"unreadCount": unread,
	}, nil
}

func (s *Service) UnreadCount(ctx context.Context, userID string) (int, error) {
	if n, ok := s.Store.GetUnread(ctx, userID); ok {
		return int(n), nil
	}
	var n int64
	if err := s.db().Model(&domain.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&n).Error; err != nil {
		return 0, err
	}
	s.Store.SetUnread(ctx, userID, n)
	return int(n), nil
}

func (s *Service) Snapshot(ctx context.Context, userID string) (*domain.Snapshot, error) {
	if b, ok := s.Store.CacheGet(ctx, store.SnapshotKey(userID)); ok {
		var snap domain.Snapshot
		if json.Unmarshal(b, &snap) == nil {
			return &snap, nil
		}
	}
	me, err := s.UserByID(userID)
	if err != nil {
		return nil, err
	}
	snap := &domain.Snapshot{Me: me}
	if err := s.db().Find(&snap.Users).Error; err != nil {
		return nil, err
	}
	if err := s.db().Find(&snap.Ideas).Error; err != nil {
		return nil, err
	}
	if err := s.db().Find(&snap.Attempts).Error; err != nil {
		return nil, err
	}
	if err := s.db().Find(&snap.Works).Error; err != nil {
		return nil, err
	}
	if err := s.db().Order("`at` DESC").Find(&snap.Events).Error; err != nil {
		return nil, err
	}
	if err := s.db().Where("user_id = ?", userID).Order("`at` DESC").Find(&snap.Notifications).Error; err != nil {
		return nil, err
	}
	if err := s.db().Find(&snap.Follows).Error; err != nil {
		return nil, err
	}
	normalizeSnapshot(snap)
	scopeSnapshot(snap, userID)
	for _, n := range snap.Notifications {
		if !n.Read {
			snap.UnreadCount++
		}
	}
	if b, err := json.Marshal(snap); err == nil {
		s.Store.CacheSet(ctx, store.SnapshotKey(userID), b, 15*time.Second)
	}
	s.Store.SetUnread(ctx, userID, int64(snap.UnreadCount))
	return snap, nil
}

func canAccessIdea(idea domain.Idea, userID string) bool {
	return idea.Status != "draft" || idea.AuthorUserID == userID || idea.Author.UserID == userID
}

func attemptForUser(attempt domain.Attempt, userID string) domain.Attempt {
	if attempt.OwnerID != userID {
		attempt.Execution = nil
	}
	return attempt
}

func workForUser(work domain.Work, ownerID, userID string) domain.Work {
	if ownerID != userID {
		work.Iteration = nil
	}
	return work
}

func scopeSnapshot(snap *domain.Snapshot, userID string) {
	for i := range snap.Attempts {
		if snap.Attempts[i].OwnerID != userID {
			snap.Attempts[i].Execution = nil
		}
	}
	ideaIDs := map[string]bool{}
	ideas := make([]domain.Idea, 0, len(snap.Ideas))
	for _, idea := range snap.Ideas {
		if canAccessIdea(idea, userID) {
			ideas = append(ideas, idea)
			ideaIDs[idea.ID] = true
		}
	}
	attemptIDs := map[string]bool{}
	attemptOwners := map[string]string{}
	attempts := make([]domain.Attempt, 0, len(snap.Attempts))
	for _, attempt := range snap.Attempts {
		if ideaIDs[attempt.IdeaID] {
			attempts = append(attempts, attempt)
			attemptIDs[attempt.ID] = true
			attemptOwners[attempt.ID] = attempt.OwnerID
		}
	}
	workIDs := map[string]bool{}
	works := make([]domain.Work, 0, len(snap.Works))
	for _, work := range snap.Works {
		if ideaIDs[work.IdeaID] && attemptIDs[work.AttemptID] {
			works = append(works, workForUser(work, attemptOwners[work.AttemptID], userID))
			workIDs[work.ID] = true
		}
	}
	events := make([]domain.Event, 0, len(snap.Events))
	for _, event := range snap.Events {
		if (event.IdeaID == "" || ideaIDs[event.IdeaID]) &&
			(event.AttemptID == "" || attemptIDs[event.AttemptID]) &&
			(event.WorkID == "" || workIDs[event.WorkID]) {
			events = append(events, event)
		}
	}
	follows := make([]domain.Follow, 0, len(snap.Follows))
	for _, follow := range snap.Follows {
		if follow.UserID == userID && ideaIDs[follow.IdeaID] {
			follows = append(follows, follow)
		}
	}
	snap.Ideas, snap.Attempts, snap.Works, snap.Events, snap.Follows = ideas, attempts, works, events, follows
}

func normalizeSnapshot(snap *domain.Snapshot) {
	for i := range snap.Users {
		domain.NormalizeUser(&snap.Users[i])
	}
	for i := range snap.Ideas {
		domain.NormalizeIdea(&snap.Ideas[i])
	}
	for i := range snap.Attempts {
		domain.NormalizeAttempt(&snap.Attempts[i])
	}
	for i := range snap.Works {
		domain.NormalizeWork(&snap.Works[i])
	}
	if snap.Users == nil {
		snap.Users = []domain.User{}
	}
	if snap.Ideas == nil {
		snap.Ideas = []domain.Idea{}
	}
	if snap.Attempts == nil {
		snap.Attempts = []domain.Attempt{}
	}
	if snap.Works == nil {
		snap.Works = []domain.Work{}
	}
	if snap.Events == nil {
		snap.Events = []domain.Event{}
	}
	if snap.Notifications == nil {
		snap.Notifications = []domain.Notification{}
	}
	if snap.Follows == nil {
		snap.Follows = []domain.Follow{}
	}
}

func (s *Service) allIdeas() ([]domain.Idea, error) {
	var ideas []domain.Idea
	if err := s.db().Find(&ideas).Error; err != nil {
		return nil, err
	}
	for i := range ideas {
		domain.NormalizeIdea(&ideas[i])
	}
	return ideas, nil
}

func (s *Service) allAttempts() ([]domain.Attempt, error) {
	var attempts []domain.Attempt
	if err := s.db().Find(&attempts).Error; err != nil {
		return nil, err
	}
	for i := range attempts {
		domain.NormalizeAttempt(&attempts[i])
	}
	return attempts, nil
}

func (s *Service) allWorks() ([]domain.Work, error) {
	var works []domain.Work
	if err := s.db().Find(&works).Error; err != nil {
		return nil, err
	}
	for i := range works {
		domain.NormalizeWork(&works[i])
	}
	return works, nil
}

func (s *Service) ListIdeas(userID, q string, mine bool) ([]domain.IdeaListItem, error) {
	ideas, err := s.allIdeas()
	if err != nil {
		return nil, err
	}
	attempts, err := s.allAttempts()
	if err != nil {
		return nil, err
	}
	works, err := s.allWorks()
	if err != nil {
		return nil, err
	}
	now := s.now()
	q = strings.ToLower(strings.TrimSpace(q))
	out := make([]domain.IdeaListItem, 0)
	for _, idea := range ideas {
		if mine {
			if idea.AuthorUserID != userID && idea.Author.UserID != userID {
				continue
			}
		} else {
			if idea.Visibility != "public" || idea.Status == "draft" {
				continue
			}
		}
		if q != "" {
			blob := strings.ToLower(idea.Title + " " + idea.Summary + " " + strings.Join(idea.Tags, " "))
			if !strings.Contains(blob, q) {
				continue
			}
		}
		item := domain.IdeaListItem{Idea: idea, Metrics: domain.IdeaMetricsFrom(idea.ID, attempts, works, ideas, now)}
		out = append(out, item)
	}
	return out, nil
}

func (s *Service) GetIdea(userID, id string) (map[string]any, error) {
	var idea domain.Idea
	if err := s.db().First(&idea, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, Err(404, "not_found")
		}
		return nil, err
	}
	domain.NormalizeIdea(&idea)
	if !canAccessIdea(idea, userID) {
		return nil, Err(404, "not_found")
	}
	ideas, err := s.allIdeas()
	if err != nil {
		return nil, err
	}
	var attempts []domain.Attempt
	if err := s.db().Where("idea_id = ?", id).Order("started_at ASC").Find(&attempts).Error; err != nil {
		return nil, err
	}
	for i := range attempts {
		domain.NormalizeAttempt(&attempts[i])
		attempts[i] = attemptForUser(attempts[i], userID)
	}
	attemptOwners := map[string]string{}
	for _, attempt := range attempts {
		attemptOwners[attempt.ID] = attempt.OwnerID
	}
	var works []domain.Work
	if err := s.db().Where("idea_id = ?", id).Find(&works).Error; err != nil {
		return nil, err
	}
	published := make([]domain.Work, 0)
	for i := range works {
		domain.NormalizeWork(&works[i])
		if works[i].Status == "published" {
			published = append(published, workForUser(works[i], attemptOwners[works[i].AttemptID], userID))
		}
	}
	forks := make([]domain.Idea, 0)
	similar := make([]domain.Idea, 0)
	for _, i := range ideas {
		if i.ParentIdeaID == id && canAccessIdea(i, userID) {
			forks = append(forks, i)
		}
		if i.ID != id && i.ParentIdeaID != id && i.Status != "draft" && shareTag(i.Tags, idea.Tags) {
			similar = append(similar, i)
		}
	}
	var author domain.User
	_ = s.db().First(&author, "id = ?", idea.Author.UserID).Error
	domain.NormalizeUser(&author)
	var following int64
	s.db().Model(&domain.Follow{}).Where("user_id = ? AND idea_id = ?", userID, id).Count(&following)
	var myAttempt *domain.Attempt
	for i := range attempts {
		if attempts[i].OwnerID == userID && attempts[i].Status != "abandoned" {
			myAttempt = &attempts[i]
			break
		}
	}
	allAttempts, err := s.allAttempts()
	if err != nil {
		return nil, err
	}
	allWorks, err := s.allWorks()
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"idea":      idea,
		"metrics":   domain.IdeaMetricsFrom(id, allAttempts, allWorks, ideas, s.now()),
		"attempts":  attempts,
		"works":     published,
		"forks":     forks,
		"similar":   similar,
		"author":    author,
		"following": following > 0,
		"myAttempt": myAttempt,
	}, nil
}

func shareTag(a, b []string) bool {
	set := map[string]struct{}{}
	for _, t := range a {
		set[t] = struct{}{}
	}
	for _, t := range b {
		if _, ok := set[t]; ok {
			return true
		}
	}
	return false
}

func (s *Service) IdeaContext(userID, id, origin string) (domain.IdeaContext, error) {
	var idea domain.Idea
	if err := s.db().First(&idea, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return domain.IdeaContext{}, Err(404, "not_found")
		}
		return domain.IdeaContext{}, err
	}
	domain.NormalizeIdea(&idea)
	if !canAccessIdea(idea, userID) {
		return domain.IdeaContext{}, Err(404, "not_found")
	}
	return domain.BuildIdeaContext(idea, origin), nil
}

func (s *Service) ListAttempts(userID string, mine bool) ([]domain.AttemptListItem, error) {
	q := s.db().Order("last_active_at DESC")
	if mine {
		q = q.Where("owner_id = ?", userID)
	}
	var attempts []domain.Attempt
	if err := q.Find(&attempts).Error; err != nil {
		return nil, err
	}
	ideas, err := s.allIdeas()
	if err != nil {
		return nil, err
	}
	ideaTitle := map[string]string{}
	ideaVisible := map[string]bool{}
	for _, i := range ideas {
		ideaTitle[i.ID] = i.Title
		ideaVisible[i.ID] = canAccessIdea(i, userID)
	}
	now := s.now()
	out := make([]domain.AttemptListItem, 0, len(attempts))
	for i := range attempts {
		domain.NormalizeAttempt(&attempts[i])
		attempts[i] = attemptForUser(attempts[i], userID)
		if !mine && !ideaVisible[attempts[i].IdeaID] {
			continue
		}
		out = append(out, domain.AttemptListItem{
			Attempt:     attempts[i],
			IdeaTitle:   ideaTitle[attempts[i].IdeaID],
			GraphStatus: domain.EffectiveAttemptStatus(attempts[i], now),
		})
	}
	return out, nil
}

func (s *Service) GetAttempt(userID, id string) (map[string]any, error) {
	var attempt domain.Attempt
	if err := s.db().First(&attempt, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, Err(404, "not_found")
		}
		return nil, err
	}
	domain.NormalizeAttempt(&attempt)
	var idea domain.Idea
	if err := s.db().First(&idea, "id = ?", attempt.IdeaID).Error; err != nil {
		return nil, err
	}
	domain.NormalizeIdea(&idea)
	if !canAccessIdea(idea, userID) {
		return nil, Err(404, "not_found")
	}
	var owner domain.User
	if err := s.db().First(&owner, "id = ?", attempt.OwnerID).Error; err != nil {
		return nil, err
	}
	domain.NormalizeUser(&owner)
	var works []domain.Work
	if err := s.db().Where("attempt_id = ?", id).Find(&works).Error; err != nil {
		return nil, err
	}
	for i := range works {
		domain.NormalizeWork(&works[i])
		works[i] = workForUser(works[i], attempt.OwnerID, userID)
	}
	if works == nil {
		works = []domain.Work{}
	}
	return map[string]any{
		"attempt":      attemptForUser(attempt, userID),
		"graph_status": domain.EffectiveAttemptStatus(attempt, s.now()),
		"idea":         idea,
		"owner":        owner,
		"works":        works,
	}, nil
}

func (s *Service) ListWorks(userID string, mine bool) ([]domain.WorkListItem, error) {
	var works []domain.Work
	q := s.db().Where("status = ?", "published")
	if mine {
		var ids []string
		if err := s.db().Model(&domain.Attempt{}).Where("owner_id = ?", userID).Pluck("id", &ids).Error; err != nil {
			return nil, err
		}
		if len(ids) == 0 {
			return []domain.WorkListItem{}, nil
		}
		q = q.Where("attempt_id IN ?", ids)
	}
	if err := q.Order("published_at DESC").Find(&works).Error; err != nil {
		return nil, err
	}
	ideas, err := s.allIdeas()
	if err != nil {
		return nil, err
	}
	title := map[string]string{}
	visible := map[string]bool{}
	for _, i := range ideas {
		title[i.ID] = i.Title
		visible[i.ID] = canAccessIdea(i, userID)
	}
	attempts, err := s.allAttempts()
	if err != nil {
		return nil, err
	}
	attemptOwners := map[string]string{}
	for _, attempt := range attempts {
		attemptOwners[attempt.ID] = attempt.OwnerID
	}
	out := make([]domain.WorkListItem, 0, len(works))
	for i := range works {
		domain.NormalizeWork(&works[i])
		if !mine && !visible[works[i].IdeaID] {
			continue
		}
		works[i] = workForUser(works[i], attemptOwners[works[i].AttemptID], userID)
		out = append(out, domain.WorkListItem{Work: works[i], IdeaTitle: title[works[i].IdeaID]})
	}
	return out, nil
}

func (s *Service) GetWork(userID, id string) (map[string]any, error) {
	var work domain.Work
	if err := s.db().First(&work, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, Err(404, "not_found")
		}
		return nil, err
	}
	domain.NormalizeWork(&work)
	var idea domain.Idea
	if err := s.db().First(&idea, "id = ?", work.IdeaID).Error; err != nil {
		return nil, err
	}
	domain.NormalizeIdea(&idea)
	if !canAccessIdea(idea, userID) {
		return nil, Err(404, "not_found")
	}
	var attempt domain.Attempt
	if err := s.db().First(&attempt, "id = ?", work.AttemptID).Error; err != nil {
		return nil, err
	}
	domain.NormalizeAttempt(&attempt)
	work = workForUser(work, attempt.OwnerID, userID)
	var forks []domain.Idea
	if err := s.db().Where("source_work_id = ?", id).Find(&forks).Error; err != nil {
		return nil, err
	}
	for i := range forks {
		domain.NormalizeIdea(&forks[i])
	}
	visibleForks := make([]domain.Idea, 0, len(forks))
	for _, fork := range forks {
		if canAccessIdea(fork, userID) {
			visibleForks = append(visibleForks, fork)
		}
	}
	forks = visibleForks
	if forks == nil {
		forks = []domain.Idea{}
	}
	return map[string]any{
		"work":    work,
		"idea":    idea,
		"attempt": attemptForUser(attempt, userID),
		"forks":   forks,
		"attribution": map[string]any{
			"idea_id":       idea.ID,
			"idea_title":    idea.Title,
			"attempt_id":    attempt.ID,
			"attempt_title": attempt.Title,
			"credits":       work.Credits,
		},
	}, nil
}

func (s *Service) ListNotifications(userID string) ([]domain.Notification, error) {
	var list []domain.Notification
	if err := s.db().Where("user_id = ?", userID).Order("`at` DESC").Find(&list).Error; err != nil {
		return nil, err
	}
	if list == nil {
		list = []domain.Notification{}
	}
	return list, nil
}

func (s *Service) invalidate(ctx context.Context) {
	s.Store.CacheDel(ctx, store.SnapshotKey(s.Cfg.DefaultUserID))
	var ids []string
	s.db().Model(&domain.User{}).Pluck("id", &ids)
	s.Store.InvalidateUserCaches(ctx, ids...)
}

func randomGraphOffset(base domain.Point, radiusMin, radiusSpan float64) domain.Point {
	angle := rand.Float64() * math.Pi * 2
	radius := radiusMin + rand.Float64()*radiusSpan
	return domain.Point{
		X: base.X + math.Cos(angle)*radius,
		Y: base.Y + math.Sin(angle)*radius,
	}
}

func compactStrings(in []string) []string {
	out := make([]string, 0, len(in))
	for _, x := range in {
		x = strings.TrimSpace(x)
		if x != "" {
			out = append(out, x)
		}
	}
	return out
}

func (s *Service) recomputeIdea(tx *gorm.DB, ideaID string) error {
	var idea domain.Idea
	if err := tx.First(&idea, "id = ?", ideaID).Error; err != nil {
		return err
	}
	var attempts []domain.Attempt
	if err := tx.Where("idea_id = ?", ideaID).Find(&attempts).Error; err != nil {
		return err
	}
	var works []domain.Work
	if err := tx.Where("idea_id = ?", ideaID).Find(&works).Error; err != nil {
		return err
	}
	idea.Status = domain.RecomputeIdeaStatus(idea, attempts, works, s.now())
	idea.UpdatedAt = idgen.NowISO()
	return tx.Save(&idea).Error
}
