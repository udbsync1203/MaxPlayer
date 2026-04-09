package server

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"MaxPlayer/config"
)

func TestAudioHandler_AllowsFileWithinRoot(t *testing.T) {
	root := t.TempDir()
	filePath := filepath.Join(root, "track.mp3")
	if err := os.WriteFile(filePath, []byte("data"), 0644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	handler := &AudioHandler{
		Config: &config.Config{MusicFolder: root},
	}

	req := httptest.NewRequest(http.MethodGet, "/audio/track.mp3", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestAudioHandler_ForbidsPathTraversal(t *testing.T) {
	root := t.TempDir()

	handler := &AudioHandler{
		Config: &config.Config{MusicFolder: root},
	}

	req := httptest.NewRequest(http.MethodGet, "/audio/../secret.txt", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}
