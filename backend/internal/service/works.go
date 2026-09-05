package service

import (
	"context"
	"database/sql"
	"errors"
	"net/url"
	"strings"
	"unicode/utf8"

	"idea_platform/internal/domain"
	"idea_platform/internal/idgen"
	"idea_platform/internal/linkpreview"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UpdateWorkInput struct {
	Title, Summary, Type, ExternalURL, RepositoryURL, CoverURL *string
	License                                                    *domain.License
}

func validateWorkURL(value *string, field string, allowPath bool) error {
	if value == nil {
		return nil
	}
	*value = strings.TrimSpace(*value)
	if *value == "" {
		return nil
	}
	if strings.ContainsFunc(*value, func(r rune) bool { return r == '\\' || r <= 32 }) {
		return Err(400, field+" 不是有效链接")
	}
	if allowPath && strings.HasPrefix(*value, "/") && !strings.HasPrefix(*value, "//") {
		return nil
	}
	u, err := url.Parse(*value)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" || u.User != nil {
		return Err(400, field+" 需为不含账号密码的 http/https 链接（封面也支持站内路径）")
	}
	return nil
}

func validateWorkUpdate(in *UpdateWorkInput) error {
	if in.Title == nil && in.Summary == nil && in.Type == nil && in.ExternalURL == nil && in.RepositoryURL == nil && in.CoverURL == nil && in.License == nil {
		return Err(400, "请提供至少一个需要修改的作品字段")
	}
	if in.Title != nil {
		*in.Title = strings.TrimSpace(*in.Title)
		if *in.Title == "" || utf8.RuneCountInString(*in.Title) > 200 {
			return Err(400, "作品名称需为 1–200 字符")
		}
	}
	if in.Summary != nil {
		*in.Summary = strings.TrimSpace(*in.Summary)
		if utf8.RuneCountInString(*in.Summary) > 10000 {
			return Err(400, "作品简介不能超过 10000 字符")
		}
	}
	if in.Type != nil {
		switch *in.Type {
		case "website", "app", "video", "article", "research", "art", "hardware", "other":
		default:
			return Err(400, "作品类型无效")
		}
	}
	for field, value := range map[string]*string{"external_url": in.ExternalURL, "repository_url": in.RepositoryURL, "cover_url": in.CoverURL} {
		if err := validateWorkURL(value, field, field == "cover_url"); err != nil {
			return err
		}
	}
	if in.License != nil {
		switch in.License.CommercialUse {
		case "yes", "with_attribution", "no":
		default:
			return Err(400, "commercialUse 无效")
		}
	}
	return nil
}

func ownedWork(tx *gorm.DB, userID, id string, lock bool) (domain.Work, domain.Attempt, error) {
	var work domain.Work
	var attempt domain.Attempt
	if err := tx.First(&work, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return work, attempt, Err(404, "作品不存在")
		}
		return work, attempt, err
	}
	query := tx
	if lock {
		query = query.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	if err := query.First(&attempt, "id = ?", work.AttemptID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return work, attempt, Err(403, "作品所属承接不存在")
		}
		return work, attempt, err
	}
	if attempt.OwnerID != userID {
		return work, attempt, Err(403, "只能管理自己承接分支的作品")
	}
	if lock {
		// Serialize changes on the branch, then reread the work under its own lock.
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&work, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return work, attempt, Err(404, "作品不存在")
			}
			return work, attempt, err
		}
	}
	return work, attempt, nil
}

func (s *Service) UpdateWork(ctx context.Context, userID, id string, in UpdateWorkInput) (map[string]any, error) {
	work, _, err := ownedWork(s.db().WithContext(ctx), userID, id, false)
	if err != nil {
		return nil, err
	}
	if err := validateWorkUpdate(&in); err != nil {
		return nil, err
	}
	externalChanged := in.ExternalURL != nil && *in.ExternalURL != work.ExternalURL
	if (in.CoverURL != nil && linkpreview.IsPlaceholderCover(*in.CoverURL)) || (externalChanged && in.CoverURL == nil) {
		externalURL := work.ExternalURL
		if in.ExternalURL != nil {
			externalURL = *in.ExternalURL
		}
		cover := "/covers/hushcity.jpg"
		if preview := linkpreview.Resolve(ctx, externalURL); preview != nil {
			cover = preview.ImageURL
		}
		in.CoverURL = &cover
	}
	return s.mutateWork(ctx, userID, id, &in)
}

func (s *Service) DeleteWork(ctx context.Context, userID, id string) (map[string]any, error) {
	return s.mutateWork(ctx, userID, id, nil)
}

func (s *Service) mutateWork(ctx context.Context, userID, id string, in *UpdateWorkInput) (map[string]any, error) {
	at := idgen.NowISO()
	result := map[string]any{"work_id": id, "updated_at": at}
	err := s.db().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		work, attempt, err := ownedWork(tx, userID, id, true)
		if err != nil {
			return err
		}
		text := "更新了作品「" + work.Title + "」"
		if in != nil {
			if err := recordWorkRevision(&work, at); err != nil {
				return err
			}
			for target, value := range map[*string]*string{&work.Title: in.Title, &work.Summary: in.Summary, &work.Type: in.Type, &work.ExternalURL: in.ExternalURL, &work.RepositoryURL: in.RepositoryURL, &work.CoverURL: in.CoverURL} {
				if value != nil {
					*target = *value
				}
			}
			if in.License != nil {
				work.License = *in.License
			}
			if err := recordWorkRevision(&work, at); err != nil {
				return err
			}
			if err := tx.Save(&work).Error; err != nil {
				return err
			}
			text = "更新了作品「" + work.Title + "」"
			result["work"] = work
		} else {
			if err := tx.Delete(&work).Error; err != nil {
				return err
			}
			var remaining []domain.Work
			if err := tx.Where("attempt_id = ?", attempt.ID).Find(&remaining).Error; err != nil {
				return err
			}
			attempt.WorkIDs = []string{}
			hasPublished := false
			for _, item := range remaining {
				attempt.WorkIDs = append(attempt.WorkIDs, item.ID)
				hasPublished = hasPublished || item.Status == "published"
			}
			if attempt.Status == "published" && !hasPublished {
				attempt.Status = "testing"
			}
			text = "删除了作品「" + work.Title + "」"
			attempt.ProgressNote = text
			if err := tx.Where("work_id = ?", id).Delete(&domain.Event{}).Error; err != nil {
				return err
			}
			if err := tx.Where("href = ?", "/works/"+id).Delete(&domain.Notification{}).Error; err != nil {
				return err
			}
			if err := tx.Model(&domain.Idea{}).Where("source_work_id = ? AND (parent_idea_id = '' OR parent_idea_id IS NULL)", id).Update("parent_idea_id", work.IdeaID).Error; err != nil {
				return err
			}
			if err := tx.Model(&domain.Idea{}).Where("source_work_id = ?", id).Update("source_work_id", "").Error; err != nil {
				return err
			}
			result["deleted"] = true
		}
		attempt.LastActiveAt = at
		if err := tx.Save(&attempt).Error; err != nil {
			return err
		}
		var me domain.User
		if err := tx.First(&me, "id = ?", userID).Error; err != nil {
			return err
		}
		event := domain.Event{ID: idgen.New("evt_"), At: at, ActorID: userID, ActorName: me.DisplayName, Text: text, IdeaID: work.IdeaID, AttemptID: attempt.ID}
		if in != nil {
			event.WorkID = id
		}
		if err := tx.Create(&event).Error; err != nil {
			return err
		}
		var idea domain.Idea
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&idea, "id = ?", work.IdeaID).Error; err != nil {
			return err
		}
		if err := s.recomputeIdea(tx, work.IdeaID); err != nil {
			return err
		}
		if err := tx.First(&idea, "id = ?", work.IdeaID).Error; err != nil {
			return err
		}
		result["attempt_id"], result["attempt_status"], result["graph_status"] = attempt.ID, attempt.Status, idea.Status
		return nil
	}, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	s.invalidate(ctx)
	return result, nil
}
