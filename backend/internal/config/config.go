package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	HTTPAddr       string
	AppOrigin      string
	DefaultUserID  string
	InitSource     string
	InitToken      string
	AdminToken     string
	MySQLDSN       string
	RedisAddr      string
	RedisPassword  string
	RedisDB        int
	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioBucket    string
	MinioUseSSL    bool
	MinioPublicURL string
}

func Load() Config {
	_ = godotenv.Load()
	return Config{
		HTTPAddr:       env("HTTP_ADDR", ":8081"),
		AppOrigin:      env("APP_ORIGIN", "http://localhost:3001"),
		DefaultUserID:  env("DEFAULT_USER_ID", "user_linshen"),
		InitSource:     firstNonEmpty(env("MYSQL_INIT_SOURCE", ""), env("SEED_PATH", "")),
		InitToken:      firstNonEmpty(env("MYSQL_INIT_TOKEN", ""), env("DATA_EXPORT_TOKEN", "")),
		AdminToken:     firstNonEmpty(env("ADMIN_TOKEN", ""), env("DATA_EXPORT_TOKEN", "")),
		MySQLDSN:       env("MYSQL_DSN", "idea:idea@tcp(127.0.0.1:3306)/idea_platform?charset=utf8mb4&parseTime=True&loc=UTC"),
		RedisAddr:      env("REDIS_ADDR", "127.0.0.1:6379"),
		RedisPassword:  env("REDIS_PASSWORD", ""),
		RedisDB:        envInt("REDIS_DB", 0),
		MinioEndpoint:  env("MINIO_ENDPOINT", "127.0.0.1:9000"),
		MinioAccessKey: env("MINIO_ACCESS_KEY", "idea"),
		MinioSecretKey: env("MINIO_SECRET_KEY", "ideaidea"),
		MinioBucket:    env("MINIO_BUCKET", "idea-platform"),
		MinioUseSSL:    envBool("MINIO_USE_SSL", false),
		MinioPublicURL: strings.TrimRight(env("MINIO_PUBLIC_URL", "http://localhost:8081"), "/"),
	}
}

func env(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		n, err := strconv.Atoi(v)
		if err == nil {
			return n
		}
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func envBool(key string, fallback bool) bool {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		b, err := strconv.ParseBool(v)
		if err == nil {
			return b
		}
	}
	return fallback
}
