package httpapi

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestWorkPatchRejectsProtectedAndMalformedFields(t *testing.T) {
	for _, raw := range []string{
		`{"credits":[]}`, `{"attempt_id":"other"}`, `{"ideaId":"other"}`, `{"status":"archived"}`,
		`{"title":null}`, `{"summary":123}`, `{"external_url":"https://a.example","externalUrl":"https://b.example"}`,
		`{"license":null}`, `{"license":{"commercialUse":"no"}}`,
	} {
		var body map[string]json.RawMessage
		if err := json.Unmarshal([]byte(raw), &body); err != nil {
			t.Fatal(err)
		}
		if _, err := decodeWorkPatch(body); err == nil {
			t.Errorf("accepted invalid patch: %s", raw)
		}
	}
}

func TestWorkPatchPreservesOmittedFieldsAndExplicitEmptyValues(t *testing.T) {
	var body map[string]json.RawMessage
	_ = json.Unmarshal([]byte(`{"user_confirmed":true,"title":"new","repository_url":"","license":{"implementation":false,"derivatives":true,"commercialUse":"no"}}`), &body)
	in, err := decodeWorkPatch(body)
	if err != nil {
		t.Fatal(err)
	}
	if in.Title == nil || *in.Title != "new" || in.RepositoryURL == nil || *in.RepositoryURL != "" || in.Summary != nil || in.CoverURL != nil {
		t.Fatalf("lost patch semantics: %+v", in)
	}
	if in.License == nil || in.License.Implementation || !in.License.Derivatives {
		t.Fatal("lost explicit boolean values")
	}
}

func TestWorkMutationsRequireBooleanConfirmation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, body := range []string{`{}`, `null`, `[]`, `{"user_confirmed":"true"}`, `{"user_confirmed":false}`, `{`} {
		response := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(response)
		c.Request = httptest.NewRequest("DELETE", "/api/v1/works/work", strings.NewReader(body))
		c.Request.Header.Set("Content-Type", "application/json")
		if _, ok := confirmedWorkBody(c); ok {
			t.Fatalf("accepted: %s", body)
		}
		if response.Code != 400 {
			t.Errorf("status = %d", response.Code)
		}
	}
}
