package httpapi

import (
	"fmt"
	"io"
	"net/http"
	"path"
	"strings"

	"idea_platform/internal/idgen"
	"idea_platform/internal/service"

	"github.com/gin-gonic/gin"
)

func (s *Server) me(c *gin.Context) {
	out, err := s.Svc.Me(c.Request.Context(), userID(c))
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) snapshot(c *gin.Context) {
	out, err := s.Svc.Snapshot(c.Request.Context(), userID(c))
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) listIdeas(c *gin.Context) {
	mine := c.Query("mine") == "1" || c.Query("mine") == "true"
	out, err := s.Svc.ListIdeas(userID(c), c.Query("q"), mine)
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ideas": out})
}

func (s *Server) publishIdea(c *gin.Context) {
	var body publishIdeaBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if !body.AsDraft && !requireConfirmed(c, body.UserConfirmed, "发布前必须向用户展示最终公开内容，并设置 user_confirmed=true。") {
		return
	}
	out, err := s.Svc.PublishIdea(c.Request.Context(), userID(c), service.PublishIdeaInput{
		Title:            body.Title,
		Summary:          body.Summary,
		Problem:          body.Problem,
		WhyItMatters:     pick(body.WhyItMatters, body.WhyItMattersAlt),
		Constraints:      body.Constraints,
		OpenQuestions:    pickSlice(body.OpenQuestions, body.OpenQuestionsAlt),
		DesiredOutputs:   pickSlice(body.DesiredOutputs, body.DesiredOutputsAlt),
		Tags:             body.Tags,
		Visibility:       body.Visibility,
		License:          body.License,
		ExistingAttempts: pickExisting(body.ExistingAttempts, body.ExistingAlt),
		ViaAgent:         body.ViaAgent || body.ViaAgentAlt,
		AsDraft:          body.AsDraft,
	})
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) getIdea(c *gin.Context) {
	out, err := s.Svc.GetIdea(userID(c), c.Param("id"))
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) ideaContext(c *gin.Context) {
	out, err := s.Svc.IdeaContext(userID(c), c.Param("id"), originFrom(c, s.Cfg.AppOrigin))
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) followIdea(c *gin.Context) {
	var body followBody
	_ = c.ShouldBindJSON(&body)
	follow := true
	if body.Follow != nil {
		follow = *body.Follow
	}
	if err := s.Svc.FollowIdea(c.Request.Context(), userID(c), c.Param("id"), follow); err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "following": follow})
}

func (s *Server) unfollowIdea(c *gin.Context) {
	if err := s.Svc.FollowIdea(c.Request.Context(), userID(c), c.Param("id"), false); err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "following": false})
}

func (s *Server) listAttempts(c *gin.Context) {
	mine := c.Query("mine") != "0" && c.Query("mine") != "false"
	if c.Query("mine") == "" && c.Query("all") == "1" {
		mine = false
	}
	if c.Query("mine") == "" && c.Query("all") == "" {
		mine = true
	}
	out, err := s.Svc.ListAttempts(userID(c), mine)
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"attempts": out})
}

func (s *Server) adoptIdea(c *gin.Context) {
	var body adoptIdeaBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if !requireConfirmed(c, body.UserConfirmed, "承接不排他。请向用户确认后设置 user_confirmed=true。") {
		return
	}
	out, err := s.Svc.AdoptIdea(c.Request.Context(), userID(c), service.AdoptIdeaInput{
		IdeaID:     pick(body.IdeaID, body.IdeaIDAlt),
		Title:      body.Title,
		Approach:   body.Approach,
		Visibility: body.Visibility,
		TargetDate: pick(body.TargetDate, body.TargetDateAlt),
		AsWatch:    body.AsWatch || body.AsWatchAlt,
	})
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) getAttempt(c *gin.Context) {
	out, err := s.Svc.GetAttempt(userID(c), c.Param("id"))
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) updateAttempt(c *gin.Context) {
	var body updateAttemptBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if !requireConfirmed(c, body.UserConfirmed, "公开进展需用户确认，请设置 user_confirmed=true。") {
		return
	}
	out, err := s.Svc.UpdateAttempt(c.Request.Context(), userID(c), c.Param("id"), service.UpdateAttemptInput{
		Status:       body.Status,
		ProgressNote: pickStrPtr(body.ProgressNote, body.ProgressNoteAlt),
		Blockers:     body.Blockers,
		Visibility:   body.Visibility,
		Title:        body.Title,
		Approach:     body.Approach,
		TargetDate:   pickStrPtr(body.TargetDate, body.TargetDateAlt),
	})
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) listWorks(c *gin.Context) {
	mine := c.Query("mine") == "1" || c.Query("mine") == "true"
	out, err := s.Svc.ListWorks(userID(c), mine)
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"works": out})
}

func (s *Server) publishWork(c *gin.Context) {
	var body publishWorkBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if !requireConfirmed(c, body.UserConfirmed, "发布作品前必须预览归因与公开信息，并设置 user_confirmed=true。") {
		return
	}
	out, err := s.Svc.PublishWork(c.Request.Context(), userID(c), service.PublishWorkInput{
		AttemptID:     pick(body.AttemptID, body.AttemptIDAlt),
		Title:         body.Title,
		Summary:       body.Summary,
		Type:          body.Type,
		CoverURL:      pick(body.CoverURL, body.CoverURLAlt),
		ExternalURL:   pick(body.ExternalURL, body.ExternalURLAlt),
		RepositoryURL: pick(body.RepositoryURL, body.RepositoryURLAlt),
		License:       body.License,
	})
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) getWork(c *gin.Context) {
	out, err := s.Svc.GetWork(userID(c), c.Param("id"))
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) listNotifications(c *gin.Context) {
	list, err := s.Svc.ListNotifications(userID(c))
	if err != nil {
		writeErr(c, err)
		return
	}
	unread := 0
	for _, n := range list {
		if !n.Read {
			unread++
		}
	}
	c.JSON(http.StatusOK, gin.H{"notifications": list, "unreadCount": unread})
}

func (s *Server) markRead(c *gin.Context) {
	if err := s.Svc.MarkNotificationsRead(c.Request.Context(), userID(c)); err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (s *Server) clearContent(c *gin.Context) {
	if err := s.Svc.ClearContent(c.Request.Context()); err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

var allowedUploadTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

func (s *Server) upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少文件字段 file"})
		return
	}
	if file.Size > 8<<20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件不能超过 8MB"})
		return
	}
	src, err := file.Open()
	if err != nil {
		writeErr(c, err)
		return
	}
	defer src.Close()
	body, err := io.ReadAll(src)
	if err != nil {
		writeErr(c, err)
		return
	}
	ct := file.Header.Get("Content-Type")
	if ct == "" || ct == "application/octet-stream" {
		ct = http.DetectContentType(body)
	}
	ext, ok := allowedUploadTypes[ct]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "仅支持 jpg/png/webp/gif"})
		return
	}
	purpose := c.PostForm("purpose")
	if purpose == "" {
		purpose = "cover"
	}
	key := fmt.Sprintf("%s/%s/%s%s", purpose, userID(c), idgen.New(""), ext)
	if err := s.Svc.Store.PutObject(c.Request.Context(), key, body, ct); err != nil {
		writeErr(c, err)
		return
	}
	url := s.Cfg.MinioPublicURL + "/api/v1/files/" + key
	c.JSON(http.StatusOK, gin.H{
		"key":         key,
		"url":         url,
		"contentType": ct,
		"size":        len(body),
	})
}

func (s *Server) exportData(c *gin.Context) {
	dump, err := s.Svc.ExportDump(c.Request.Context())
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, dump)
}

func (s *Server) importData(c *gin.Context) {
	var dump service.DataDump
	if err := c.ShouldBindJSON(&dump); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if err := s.Svc.ImportDump(c.Request.Context(), &dump, true); err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (s *Server) getFile(c *gin.Context) {
	key := strings.TrimPrefix(c.Param("key"), "/")
	key = path.Clean(key)
	if key == "." || strings.Contains(key, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid key"})
		return
	}
	obj, ct, size, err := s.Svc.Store.GetObject(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found"})
		return
	}
	defer obj.Close()
	c.Header("Content-Type", ct)
	c.Header("Cache-Control", "public, max-age=86400")
	c.Header("Content-Length", fmt.Sprintf("%d", size))
	if c.Request.Method == http.MethodHead {
		c.Status(http.StatusOK)
		return
	}
	c.DataFromReader(http.StatusOK, size, ct, obj, nil)
}
