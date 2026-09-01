package store

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"idea_platform/internal/config"
	"idea_platform/internal/domain"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Store struct {
	DB     *gorm.DB
	Redis  *redis.Client
	Minio  *minio.Client
	Bucket string
	Cfg    config.Config
}

func Open(cfg config.Config) (*Store, error) {
	db, err := gorm.Open(mysql.Open(cfg.MySQLDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("mysql: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	if err := db.AutoMigrate(
		&domain.User{},
		&domain.Idea{},
		&domain.Attempt{},
		&domain.Work{},
		&domain.Event{},
		&domain.Notification{},
		&domain.Follow{},
		&domain.Account{},
		&domain.Session{},
		&domain.AgentToken{},
	); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	// AutoMigrate can add the column to historical rows without applying the
	// default on every MySQL version, so make the publication state explicit.
	if err := db.Model(&domain.Idea{}).Where("status = '' OR status IS NULL").Update("status", "published").Error; err != nil {
		return nil, fmt.Errorf("migrate historical idea status: %w", err)
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:         cfg.RedisAddr,
		Password:     cfg.RedisPassword,
		DB:           cfg.RedisDB,
		ReadTimeout:  2 * time.Second,
		WriteTimeout: 2 * time.Second,
	})

	mc, err := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("minio: %w", err)
	}

	s := &Store{DB: db, Redis: rdb, Minio: mc, Bucket: cfg.MinioBucket, Cfg: cfg}
	if err := s.ensureBucket(context.Background()); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) ensureBucket(ctx context.Context) error {
	ok, err := s.Minio.BucketExists(ctx, s.Bucket)
	if err != nil {
		return fmt.Errorf("minio bucket: %w", err)
	}
	if !ok {
		if err := s.Minio.MakeBucket(ctx, s.Bucket, minio.MakeBucketOptions{}); err != nil {
			return fmt.Errorf("minio make bucket: %w", err)
		}
	}
	policy := fmt.Sprintf(`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`, s.Bucket)
	_ = s.Minio.SetBucketPolicy(ctx, s.Bucket, policy)
	return nil
}

func (s *Store) Ping(ctx context.Context) map[string]string {
	out := map[string]string{"mysql": "ok", "redis": "ok", "minio": "ok"}
	sqlDB, err := s.DB.DB()
	if err != nil || sqlDB.PingContext(ctx) != nil {
		out["mysql"] = "down"
	}
	if err := s.Redis.Ping(ctx).Err(); err != nil {
		out["redis"] = "down"
	}
	_, err = s.Minio.BucketExists(ctx, s.Bucket)
	if err != nil {
		out["minio"] = "down"
	}
	return out
}

func (s *Store) CacheGet(ctx context.Context, key string) ([]byte, bool) {
	b, err := s.Redis.Get(ctx, key).Bytes()
	if err != nil {
		return nil, false
	}
	return b, true
}

func (s *Store) CacheSet(ctx context.Context, key string, val []byte, ttl time.Duration) {
	_ = s.Redis.Set(ctx, key, val, ttl).Err()
}

func (s *Store) CacheDel(ctx context.Context, keys ...string) {
	if len(keys) == 0 {
		return
	}
	_ = s.Redis.Del(ctx, keys...).Err()
}

func (s *Store) IncrUnread(ctx context.Context, userID string, delta int64) {
	key := unreadKey(userID)
	_ = s.Redis.IncrBy(ctx, key, delta).Err()
	_ = s.Redis.Expire(ctx, key, 7*24*time.Hour).Err()
}

func (s *Store) SetUnread(ctx context.Context, userID string, n int64) {
	_ = s.Redis.Set(ctx, unreadKey(userID), n, 7*24*time.Hour).Err()
}

func (s *Store) GetUnread(ctx context.Context, userID string) (int64, bool) {
	n, err := s.Redis.Get(ctx, unreadKey(userID)).Int64()
	if err != nil {
		return 0, false
	}
	return n, true
}

func unreadKey(userID string) string { return "unread:" + userID }

func SnapshotKey(userID string) string { return "snapshot:" + userID }

func (s *Store) InvalidateUserCaches(ctx context.Context, userIDs ...string) {
	var keys []string
	for _, id := range userIDs {
		keys = append(keys, SnapshotKey(id), unreadKey(id))
	}
	s.CacheDel(ctx, keys...)
}

func (s *Store) PutObject(ctx context.Context, key string, body []byte, contentType string) error {
	_, err := s.Minio.PutObject(ctx, s.Bucket, key, bytes.NewReader(body), int64(len(body)), minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

func (s *Store) GetObject(ctx context.Context, key string) (io.ReadCloser, string, int64, error) {
	obj, err := s.Minio.GetObject(ctx, s.Bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, "", 0, err
	}
	info, err := obj.Stat()
	if err != nil {
		_ = obj.Close()
		return nil, "", 0, err
	}
	ct := info.ContentType
	if ct == "" {
		ct = http.DetectContentType(nil)
		if ct == "application/octet-stream" {
			ct = guessContentType(key)
		}
	}
	return obj, ct, info.Size, nil
}

func guessContentType(key string) string {
	switch {
	case strings.HasSuffix(strings.ToLower(key), ".jpg"), strings.HasSuffix(strings.ToLower(key), ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(strings.ToLower(key), ".png"):
		return "image/png"
	case strings.HasSuffix(strings.ToLower(key), ".webp"):
		return "image/webp"
	case strings.HasSuffix(strings.ToLower(key), ".gif"):
		return "image/gif"
	default:
		return "application/octet-stream"
	}
}
