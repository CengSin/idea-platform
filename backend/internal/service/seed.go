package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"idea_platform/internal/domain"

	"gorm.io/gorm"
)

type DataDump struct {
	Version       int                    `json:"version"`
	Users         *[]domain.User         `json:"users"`
	Ideas         *[]domain.Idea         `json:"ideas"`
	Attempts      *[]domain.Attempt      `json:"attempts"`
	Works         *[]domain.Work         `json:"works"`
	Events        *[]domain.Event        `json:"events"`
	Notifications *[]domain.Notification `json:"notifications"`
	Follows       *[]domain.Follow       `json:"follows"`
	Auth          *domain.AuthDump       `json:"auth"`
}

func (s *Service) SeedIfEmpty(ctx context.Context) error {
	if strings.TrimSpace(s.Cfg.InitSource) == "" {
		return nil
	}
	var n int64
	if err := s.db().Model(&domain.User{}).Count(&n).Error; err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	dump, err := LoadInitDump(s.Cfg.InitSource, s.Cfg.InitToken)
	if err != nil {
		return err
	}
	return s.ImportDump(ctx, dump, true)
}

func (s *Service) ExportDump(ctx context.Context) (*DataDump, error) {
	dump := &DataDump{Version: 3}
	users := []domain.User{}
	ideas := []domain.Idea{}
	attempts := []domain.Attempt{}
	works := []domain.Work{}
	events := []domain.Event{}
	notifications := []domain.Notification{}
	follows := []domain.Follow{}
	auth := domain.AuthDump{Version: 1}

	if err := s.db().WithContext(ctx).Find(&users).Error; err != nil {
		return nil, err
	}
	if err := s.db().WithContext(ctx).Find(&ideas).Error; err != nil {
		return nil, err
	}
	if err := s.db().WithContext(ctx).Find(&attempts).Error; err != nil {
		return nil, err
	}
	if err := s.db().WithContext(ctx).Find(&works).Error; err != nil {
		return nil, err
	}
	if err := s.db().WithContext(ctx).Order("`at` DESC").Find(&events).Error; err != nil {
		return nil, err
	}
	if err := s.db().WithContext(ctx).Find(&notifications).Error; err != nil {
		return nil, err
	}
	if err := s.db().WithContext(ctx).Find(&follows).Error; err != nil {
		return nil, err
	}
	if err := s.db().WithContext(ctx).Find(&auth.Accounts).Error; err != nil {
		return nil, err
	}
	if err := s.db().WithContext(ctx).Find(&auth.Sessions).Error; err != nil {
		return nil, err
	}
	if err := s.db().WithContext(ctx).Find(&auth.AgentTokens).Error; err != nil {
		return nil, err
	}

	for i := range users {
		domain.NormalizeUser(&users[i])
	}
	for i := range ideas {
		domain.NormalizeIdea(&ideas[i])
	}
	for i := range attempts {
		domain.NormalizeAttempt(&attempts[i])
	}
	for i := range works {
		domain.NormalizeWork(&works[i])
	}
	if auth.Accounts == nil {
		auth.Accounts = []domain.Account{}
	}
	if auth.Sessions == nil {
		auth.Sessions = []domain.Session{}
	}
	if auth.AgentTokens == nil {
		auth.AgentTokens = []domain.AgentToken{}
	}

	dump.Users = &users
	dump.Ideas = &ideas
	dump.Attempts = &attempts
	dump.Works = &works
	dump.Events = &events
	dump.Notifications = &notifications
	dump.Follows = &follows
	dump.Auth = &auth
	return dump, nil
}

func (s *Service) ImportDump(ctx context.Context, dump *DataDump, replace bool) error {
	if dump == nil {
		return fmt.Errorf("empty dump")
	}
	return s.db().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if dump.Users != nil {
			if err := replaceAndCreate(tx, replace, &domain.User{}, *dump.Users, func() {
				for i := range *dump.Users {
					domain.NormalizeUser(&(*dump.Users)[i])
				}
			}, "users"); err != nil {
				return err
			}
		}
		if dump.Ideas != nil {
			if err := replaceAndCreate(tx, replace, &domain.Idea{}, *dump.Ideas, func() {
				for i := range *dump.Ideas {
					domain.NormalizeIdea(&(*dump.Ideas)[i])
					(*dump.Ideas)[i].AuthorUserID = (*dump.Ideas)[i].Author.UserID
				}
			}, "ideas"); err != nil {
				return err
			}
		}
		if dump.Attempts != nil {
			if err := replaceAndCreate(tx, replace, &domain.Attempt{}, *dump.Attempts, func() {
				for i := range *dump.Attempts {
					domain.NormalizeAttempt(&(*dump.Attempts)[i])
				}
			}, "attempts"); err != nil {
				return err
			}
		}
		if dump.Works != nil {
			if err := replaceAndCreate(tx, replace, &domain.Work{}, *dump.Works, func() {
				for i := range *dump.Works {
					domain.NormalizeWork(&(*dump.Works)[i])
				}
			}, "works"); err != nil {
				return err
			}
		}
		if dump.Events != nil {
			if err := replaceAndCreate(tx, replace, &domain.Event{}, *dump.Events, nil, "events"); err != nil {
				return err
			}
		}
		if dump.Notifications != nil {
			defaultUser := s.Cfg.DefaultUserID
			if err := replaceAndCreate(tx, replace, &domain.Notification{}, *dump.Notifications, func() {
				for i := range *dump.Notifications {
					if (*dump.Notifications)[i].UserID == "" {
						(*dump.Notifications)[i].UserID = defaultUser
					}
				}
			}, "notifications"); err != nil {
				return err
			}
		}
		if dump.Follows != nil {
			if err := replaceAndCreate(tx, replace, &domain.Follow{}, *dump.Follows, nil, "follows"); err != nil {
				return err
			}
		}
		if dump.Auth != nil {
			if dump.Auth.Accounts == nil {
				dump.Auth.Accounts = []domain.Account{}
			}
			if dump.Auth.Sessions == nil {
				dump.Auth.Sessions = []domain.Session{}
			}
			if dump.Auth.AgentTokens == nil {
				dump.Auth.AgentTokens = []domain.AgentToken{}
			}
			if err := replaceAndCreate(tx, replace, &domain.Account{}, dump.Auth.Accounts, nil, "accounts"); err != nil {
				return err
			}
			if err := replaceAndCreate(tx, replace, &domain.Session{}, dump.Auth.Sessions, nil, "sessions"); err != nil {
				return err
			}
			if err := replaceAndCreate(tx, replace, &domain.AgentToken{}, dump.Auth.AgentTokens, nil, "agent_tokens"); err != nil {
				return err
			}
		}
		return nil
	})
}

func replaceAndCreate[T any](tx *gorm.DB, replace bool, model any, rows []T, prepare func(), label string) error {
	if replace {
		if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(model).Error; err != nil {
			return fmt.Errorf("%s: %w", label, err)
		}
	}
	if prepare != nil {
		prepare()
	}
	if len(rows) == 0 {
		return nil
	}
	if err := tx.Create(&rows).Error; err != nil {
		return fmt.Errorf("%s: %w", label, err)
	}
	return nil
}

func LoadInitDump(source, token string) (*DataDump, error) {
	source = strings.TrimSpace(source)
	if source == "" {
		return nil, fmt.Errorf("init source is empty")
	}
	raw, err := readInitBytes(source, token)
	if err != nil {
		return nil, err
	}
	return ParseInitDump(raw)
}

func ParseInitDump(raw []byte) (*DataDump, error) {
	dump := &DataDump{}
	if err := json.Unmarshal(raw, dump); err != nil {
		return nil, fmt.Errorf("init json: %w", err)
	}
	if dump.Users == nil && dump.Auth == nil {
		return nil, fmt.Errorf("init json has no users or auth")
	}
	return dump, nil
}

func IsRemoteSource(source string) bool {
	value := strings.ToLower(strings.TrimSpace(source))
	return strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://")
}

func readInitBytes(source, token string) ([]byte, error) {
	if IsRemoteSource(source) {
		return fetchInitURL(source, token)
	}
	b, err := os.ReadFile(source)
	if err != nil {
		return nil, fmt.Errorf("init file %s: %w", source, err)
	}
	return b, nil
}

func fetchInitURL(source, token string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, source, nil)
	if err != nil {
		return nil, err
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	client := &http.Client{Timeout: 30 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("init url %s: %w", source, err)
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 32<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("init url %s: HTTP %d: %s", source, res.StatusCode, strings.TrimSpace(string(body)))
	}
	return body, nil
}
