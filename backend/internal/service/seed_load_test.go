package service

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestIsRemoteSource(t *testing.T) {
	if !IsRemoteSource("https://idea-platform-delta.vercel.app/api/v1/export") {
		t.Fatal("https should be remote")
	}
	if !IsRemoteSource("http://127.0.0.1:8081/api/v1/export") {
		t.Fatal("http should be remote")
	}
	if IsRemoteSource("./data/db.json") {
		t.Fatal("path should not be remote")
	}
	if IsRemoteSource("seed/db.json") {
		t.Fatal("relative path should not be remote")
	}
}

func TestParseInitDumpFromVercelExport(t *testing.T) {
	raw := []byte(`{
		"version": 3,
		"users": [{"id":"user_1","displayName":"cengsin","initials":"CE","accent":"#66C7C0","bio":"","skills":[],"visibility":"public","createdAt":"2026-01-01T00:00:00Z"}],
		"ideas": [],
		"attempts": [],
		"works": [],
		"events": [],
		"notifications": [],
		"follows": [],
		"auth": {"version":1,"accounts":[{"userId":"user_1","email":"a@b.c","displayName":"cengsin","passwordSalt":"s","passwordHash":"h","createdAt":"2026-01-01T00:00:00Z"}],"sessions":[],"agentTokens":[]}
	}`)
	dump, err := ParseInitDump(raw)
	if err != nil {
		t.Fatal(err)
	}
	if dump.Users == nil || len(*dump.Users) != 1 {
		t.Fatalf("users: %+v", dump.Users)
	}
	if dump.Auth == nil || len(dump.Auth.Accounts) != 1 {
		t.Fatalf("auth: %+v", dump.Auth)
	}
}

func TestParseInitDumpFromDbJson(t *testing.T) {
	raw := []byte(`{"version":3,"users":[],"ideas":[{"id":"idea_1","title":"t","summary":"","problem":"","whyItMatters":"","constraints":[],"existingAttempts":[],"openQuestions":[],"desiredOutputs":[],"tags":[],"author":{"kind":"user","userId":"u","displayName":"n"},"license":{"implementation":true,"derivatives":true,"commercialUse":"with_attribution"},"visibility":"public","status":"published","graph":{"x":0,"y":0},"createdAt":"","updatedAt":""}],"attempts":[],"works":[],"events":[],"notifications":[],"follows":[]}`)
	dump, err := ParseInitDump(raw)
	if err != nil {
		t.Fatal(err)
	}
	if dump.Auth != nil {
		t.Fatal("plain db.json should not have auth")
	}
	if dump.Ideas == nil || len(*dump.Ideas) != 1 {
		t.Fatalf("ideas: %+v", dump.Ideas)
	}
}

func TestLoadInitDumpFromFileAndURL(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "db.json")
	payload := map[string]any{
		"version": 3,
		"users":   []any{map[string]any{"id": "user_file"}},
		"ideas":   []any{},
	}
	b, _ := json.Marshal(payload)
	if err := os.WriteFile(path, b, 0o644); err != nil {
		t.Fatal(err)
	}
	fromFile, err := LoadInitDump(path, "")
	if err != nil {
		t.Fatal(err)
	}
	if fromFile.Users == nil || (*fromFile.Users)[0].ID != "user_file" {
		t.Fatalf("file dump: %+v", fromFile.Users)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(b)
	}))
	defer server.Close()

	if _, err := LoadInitDump(server.URL, "wrong"); err == nil {
		t.Fatal("expected unauthorized")
	}
	fromURL, err := LoadInitDump(server.URL, "secret")
	if err != nil {
		t.Fatal(err)
	}
	if fromURL.Users == nil || (*fromURL.Users)[0].ID != "user_file" {
		t.Fatalf("url dump: %+v", fromURL.Users)
	}
}
