package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"idea_platform/internal/domain"
	"idea_platform/internal/service"
)

// Decode an explicit allowlist so a patch cannot change ownership or attribution.
func decodeWorkPatch(body map[string]json.RawMessage) (service.UpdateWorkInput, error) {
	var in service.UpdateWorkInput
	seen := map[**string]bool{}
	for key, raw := range body {
		var target **string
		switch key {
		case "user_confirmed":
			continue
		case "title":
			target = &in.Title
		case "summary":
			target = &in.Summary
		case "type":
			target = &in.Type
		case "external_url", "externalUrl":
			target = &in.ExternalURL
		case "repository_url", "repositoryUrl":
			target = &in.RepositoryURL
		case "cover_url", "coverUrl":
			target = &in.CoverURL
		case "license":
			var license struct {
				Implementation *bool  `json:"implementation"`
				Derivatives    *bool  `json:"derivatives"`
				CommercialUse  string `json:"commercialUse"`
			}
			if err := json.Unmarshal(raw, &license); err != nil || license.Implementation == nil || license.Derivatives == nil {
				return in, service.Err(400, "license 必须是完整的授权对象")
			}
			in.License = &domain.License{Implementation: *license.Implementation, Derivatives: *license.Derivatives, CommercialUse: license.CommercialUse}
			continue
		default:
			return in, service.Err(400, "不支持修改字段："+key+"；来源分支、归因和署名不可修改")
		}
		var value *string
		if err := json.Unmarshal(raw, &value); err != nil || value == nil {
			return in, service.Err(400, key+" 必须是字符串")
		}
		if seen[target] && **target != *value {
			return in, service.Err(400, "字段别名不能冲突："+key)
		}
		*target = value
		seen[target] = true
	}
	return in, nil
}

func confirmedWorkBody(c *gin.Context) (map[string]json.RawMessage, bool) {
	var body map[string]json.RawMessage
	if err := c.ShouldBindJSON(&body); err != nil || body == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求体必须为 JSON 对象"})
		return nil, false
	}
	var confirmed bool
	_ = json.Unmarshal(body["user_confirmed"], &confirmed)
	if !requireConfirmed(c, confirmed, "修改或删除作品前需用户确认，并设置 user_confirmed=true。") {
		return nil, false
	}
	return body, true
}

func (s *Server) updateWork(c *gin.Context) {
	body, ok := confirmedWorkBody(c)
	if !ok {
		return
	}
	in, err := decodeWorkPatch(body)
	if err != nil {
		writeErr(c, err)
		return
	}
	out, err := s.Svc.UpdateWork(c.Request.Context(), userID(c), c.Param("id"), in)
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) deleteWork(c *gin.Context) {
	if _, ok := confirmedWorkBody(c); !ok {
		return
	}
	out, err := s.Svc.DeleteWork(c.Request.Context(), userID(c), c.Param("id"))
	if err != nil {
		writeErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}
