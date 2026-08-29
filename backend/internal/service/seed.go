package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"idea_platform/internal/domain"

	"gorm.io/gorm"
)

type seedFile struct {
	Users         []domain.User         `json:"users"`
	Ideas         []domain.Idea         `json:"ideas"`
	Attempts      []domain.Attempt      `json:"attempts"`
	Works         []domain.Work         `json:"works"`
	Events        []domain.Event        `json:"events"`
	Notifications []domain.Notification `json:"notifications"`
	Follows       []domain.Follow       `json:"follows"`
}

func (s *Service) SeedIfEmpty(ctx context.Context) error {
	var n int64
	if err := s.db().Model(&domain.User{}).Count(&n).Error; err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	return s.Seed(ctx, false)
}

func (s *Service) Seed(ctx context.Context, reset bool) error {
	data, err := loadSeedFile(s.Cfg.SeedPath)
	if err != nil {
		return err
	}
	return s.db().Transaction(func(tx *gorm.DB) error {
		if reset {
			tables := []any{
				&domain.Follow{},
				&domain.Notification{},
				&domain.Event{},
				&domain.Work{},
				&domain.Attempt{},
				&domain.Idea{},
				&domain.User{},
			}
			for _, t := range tables {
				if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(t).Error; err != nil {
					return err
				}
			}
		}
		for i := range data.Users {
			domain.NormalizeUser(&data.Users[i])
		}
		if len(data.Users) > 0 {
			if err := tx.Create(&data.Users).Error; err != nil {
				return fmt.Errorf("users: %w", err)
			}
		}
		for i := range data.Ideas {
			domain.NormalizeIdea(&data.Ideas[i])
			data.Ideas[i].AuthorUserID = data.Ideas[i].Author.UserID
		}
		if len(data.Ideas) > 0 {
			if err := tx.Create(&data.Ideas).Error; err != nil {
				return fmt.Errorf("ideas: %w", err)
			}
		}
		for i := range data.Attempts {
			domain.NormalizeAttempt(&data.Attempts[i])
		}
		if len(data.Attempts) > 0 {
			if err := tx.Create(&data.Attempts).Error; err != nil {
				return fmt.Errorf("attempts: %w", err)
			}
		}
		for i := range data.Works {
			domain.NormalizeWork(&data.Works[i])
		}
		if len(data.Works) > 0 {
			if err := tx.Create(&data.Works).Error; err != nil {
				return fmt.Errorf("works: %w", err)
			}
		}
		if len(data.Events) > 0 {
			if err := tx.Create(&data.Events).Error; err != nil {
				return fmt.Errorf("events: %w", err)
			}
		}
		defaultUser := s.Cfg.DefaultUserID
		for i := range data.Notifications {
			if data.Notifications[i].UserID == "" {
				data.Notifications[i].UserID = defaultUser
			}
		}
		if len(data.Notifications) > 0 {
			if err := tx.Create(&data.Notifications).Error; err != nil {
				return fmt.Errorf("notifications: %w", err)
			}
		}
		if len(data.Follows) > 0 {
			if err := tx.Create(&data.Follows).Error; err != nil {
				return fmt.Errorf("follows: %w", err)
			}
		}
		return nil
	})
}

func loadSeedFile(configured string) (seedFile, error) {
	candidates := []string{configured}
	if configured != "" {
		candidates = append(candidates, filepath.Join("backend", configured))
	}
	candidates = append(candidates,
		"seed/db.json",
		"backend/seed/db.json",
		filepath.Join("..", "data", "db.json"),
		"data/db.json",
	)
	var last error
	for _, p := range candidates {
		b, err := os.ReadFile(p)
		if err != nil {
			last = err
			continue
		}
		var data seedFile
		if err := json.Unmarshal(b, &data); err != nil {
			return data, fmt.Errorf("seed json %s: %w", p, err)
		}
		return data, nil
	}
	return seedFile{}, fmt.Errorf("seed file not found: %w", last)
}
