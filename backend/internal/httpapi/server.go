package httpapi

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"idea_platform/internal/config"
	"idea_platform/internal/domain"
	"idea_platform/internal/service"

	"github.com/gin-gonic/gin"
)

type Server struct {
	Cfg config.Config
	Svc *service.Service
}

func New(cfg config.Config, svc *service.Service) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	s := &Server{Cfg: cfg, Svc: svc}
	r.Use(gin.Recovery(), requestLog(), cors(), s.currentUser())

	r.GET("/health", s.health)

	v1 := r.Group("/api/v1")
	{
		v1.GET("/me", s.me)
		v1.GET("/snapshot", s.snapshot)

		v1.GET("/ideas", s.listIdeas)
		v1.POST("/ideas", s.publishIdea)
		v1.GET("/ideas/:id", s.getIdea)
		v1.GET("/ideas/:id/context", s.ideaContext)
		v1.POST("/ideas/:id/follow", s.followIdea)
		v1.DELETE("/ideas/:id/follow", s.unfollowIdea)

		v1.GET("/attempts", s.listAttempts)
		v1.POST("/attempts", s.adoptIdea)
		v1.GET("/attempts/:id", s.getAttempt)
		v1.PATCH("/attempts/:id", s.updateAttempt)

		v1.GET("/works", s.listWorks)
		v1.POST("/works", s.publishWork)
		v1.GET("/works/:id", s.getWork)

		v1.GET("/notifications", s.listNotifications)
		v1.POST("/notifications/read", s.markRead)

		v1.POST("/uploads", s.upload)
		v1.GET("/files/*key", s.getFile)
		v1.HEAD("/files/*key", s.getFile)

		v1.POST("/content/clear", s.clearContent)
	}
	return r
}

func requestLog() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		log.Printf("%s %s %d %s", c.Request.Method, c.Request.URL.Path, c.Writer.Status(), time.Since(start).Truncate(time.Millisecond))
	}
}

func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			origin = "*"
		}
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func (s *Server) currentUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		uid := strings.TrimSpace(c.GetHeader("X-User-Id"))
		if uid == "" {
			uid = s.Cfg.DefaultUserID
			if uid == "" {
				uid = domain.DefaultUserID
			}
		}
		c.Set("userId", uid)
		c.Next()
	}
}

func userID(c *gin.Context) string {
	v, _ := c.Get("userId")
	id, _ := v.(string)
	return id
}

func (s *Server) health(c *gin.Context) {
	deps := s.Svc.Store.Ping(c.Request.Context())
	ok := true
	for _, v := range deps {
		if v != "ok" {
			ok = false
		}
	}
	status := http.StatusOK
	if !ok {
		status = http.StatusServiceUnavailable
	}
	c.JSON(status, gin.H{"ok": ok, "deps": deps})
}

func writeErr(c *gin.Context, err error) {
	var api *service.APIError
	if errors.As(err, &api) {
		c.JSON(api.Status, gin.H{"error": api.Message})
		return
	}
	log.Printf("handler error: %v", err)
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}

func requireConfirmed(c *gin.Context, confirmed bool, msg string) bool {
	if confirmed {
		return true
	}
	c.JSON(http.StatusBadRequest, gin.H{"error": msg})
	return false
}

func originFrom(c *gin.Context, fallback string) string {
	if fallback != "" {
		return strings.TrimRight(fallback, "/")
	}
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	return scheme + "://" + c.Request.Host
}
