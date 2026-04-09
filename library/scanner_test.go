package library

import (
	"os"
	"path/filepath"
	"testing"
)

func TestScanAudioFiles_FiltersAndBuildsRelativePaths(t *testing.T) {
	root := t.TempDir()
	playlist := "mix"
	playlistDir := filepath.Join(root, playlist)
	if err := os.MkdirAll(playlistDir, 0755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	if err := os.WriteFile(filepath.Join(playlistDir, "track.mp3"), []byte("data"), 0644); err != nil {
		t.Fatalf("write mp3: %v", err)
	}
	if err := os.WriteFile(filepath.Join(playlistDir, "notes.txt"), []byte("text"), 0644); err != nil {
		t.Fatalf("write txt: %v", err)
	}

	files, err := ScanAudioFiles(root, playlist)
	if err != nil {
		t.Fatalf("scan: %v", err)
	}

	if len(files) != 1 {
		t.Fatalf("expected 1 audio file, got %d", len(files))
	}
	if files[0].Path != "mix/track.mp3" {
		t.Fatalf("unexpected path: %q", files[0].Path)
	}
}
