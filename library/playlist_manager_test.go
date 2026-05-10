package library

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCreatePlaylist(t *testing.T) {
	tempDir := t.TempDir()

	err := CreatePlaylist(tempDir, "TestPlaylist")
	if err != nil {
		t.Fatalf("CreatePlaylist failed: %v", err)
	}

	playlistPath := filepath.Join(tempDir, "TestPlaylist")
	if _, err := os.Stat(playlistPath); os.IsNotExist(err) {
		t.Errorf("Playlist folder was not created")
	}
}

func TestCreatePlaylistEmptyName(t *testing.T) {
	tempDir := t.TempDir()

	err := CreatePlaylist(tempDir, "")
	if err == nil {
		t.Error("Expected error for empty playlist name")
	}
}

func TestCreatePlaylistInvalidCharacters(t *testing.T) {
	tempDir := t.TempDir()

	invalidNames := []string{"Test/Playlist", "Test\\Playlist", "Test:Playlist", "Test*Playlist"}
	for _, name := range invalidNames {
		err := CreatePlaylist(tempDir, name)
		if err == nil {
			t.Errorf("Expected error for invalid playlist name: %s", name)
		}
	}
}

func TestCreatePlaylistReservedName(t *testing.T) {
	tempDir := t.TempDir()

	err := CreatePlaylist(tempDir, FavoritesFolderName)
	if err == nil {
		t.Error("Expected error for reserved playlist name")
	}
}

func TestCreatePlaylistAlreadyExists(t *testing.T) {
	tempDir := t.TempDir()

	err := CreatePlaylist(tempDir, "TestPlaylist")
	if err != nil {
		t.Fatalf("First CreatePlaylist failed: %v", err)
	}

	err = CreatePlaylist(tempDir, "TestPlaylist")
	if err == nil {
		t.Error("Expected error when creating duplicate playlist")
	}
}

func TestRenamePlaylist(t *testing.T) {
	tempDir := t.TempDir()

	err := CreatePlaylist(tempDir, "OldName")
	if err != nil {
		t.Fatalf("CreatePlaylist failed: %v", err)
	}

	err = RenamePlaylist(tempDir, "OldName", "NewName")
	if err != nil {
		t.Fatalf("RenamePlaylist failed: %v", err)
	}

	oldPath := filepath.Join(tempDir, "OldName")
	newPath := filepath.Join(tempDir, "NewName")

	if _, err := os.Stat(oldPath); !os.IsNotExist(err) {
		t.Error("Old playlist folder still exists")
	}

	if _, err := os.Stat(newPath); os.IsNotExist(err) {
		t.Error("New playlist folder was not created")
	}
}

func TestRenamePlaylistReservedName(t *testing.T) {
	tempDir := t.TempDir()

	err := CreatePlaylist(tempDir, "TestPlaylist")
	if err != nil {
		t.Fatalf("CreatePlaylist failed: %v", err)
	}

	err = RenamePlaylist(tempDir, "TestPlaylist", FavoritesFolderName)
	if err == nil {
		t.Error("Expected error when renaming to reserved name")
	}

	err = RenamePlaylist(tempDir, FavoritesFolderName, "NewName")
	if err == nil {
		t.Error("Expected error when renaming reserved playlist")
	}
}

func TestDeletePlaylist(t *testing.T) {
	tempDir := t.TempDir()

	err := CreatePlaylist(tempDir, "TestPlaylist")
	if err != nil {
		t.Fatalf("CreatePlaylist failed: %v", err)
	}

	err = DeletePlaylist(tempDir, "TestPlaylist")
	if err != nil {
		t.Fatalf("DeletePlaylist failed: %v", err)
	}

	playlistPath := filepath.Join(tempDir, "TestPlaylist")
	if _, err := os.Stat(playlistPath); !os.IsNotExist(err) {
		t.Error("Playlist folder still exists after deletion")
	}
}

func TestDeletePlaylistReservedName(t *testing.T) {
	tempDir := t.TempDir()

	err := DeletePlaylist(tempDir, FavoritesFolderName)
	if err == nil {
		t.Error("Expected error when deleting reserved playlist")
	}
}

func TestAddExternalTrackToPlaylist(t *testing.T) {
	tempDir := t.TempDir()

	// Create destination playlist
	destPlaylist := "DestPlaylist"

	err := CreatePlaylist(tempDir, destPlaylist)
	if err != nil {
		t.Fatalf("CreatePlaylist failed: %v", err)
	}

	// Create a test audio file outside the music folder
	externalDir := filepath.Join(tempDir, "external")
	err = os.MkdirAll(externalDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create external dir: %v", err)
	}

	externalFile := filepath.Join(externalDir, "test.mp3")
	err = os.WriteFile(externalFile, []byte("test audio data"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}

	// Add external track to playlist
	err = AddExternalTrackToPlaylist(tempDir, destPlaylist, externalFile)
	if err != nil {
		t.Fatalf("AddExternalTrackToPlaylist failed: %v", err)
	}

	// Verify file was copied
	destFile := filepath.Join(tempDir, destPlaylist, "test.mp3")
	if _, err := os.Stat(destFile); os.IsNotExist(err) {
		t.Error("Track was not copied to destination playlist")
	}

	// Verify source file still exists
	if _, err := os.Stat(externalFile); os.IsNotExist(err) {
		t.Error("Source file was removed (should be copied, not moved)")
	}
}

func TestAddExternalTrackToPlaylistAlreadyExists(t *testing.T) {
	tempDir := t.TempDir()

	destPlaylist := "DestPlaylist"

	err := CreatePlaylist(tempDir, destPlaylist)
	if err != nil {
		t.Fatalf("CreatePlaylist failed: %v", err)
	}

	// Create external file
	externalDir := filepath.Join(tempDir, "external")
	err = os.MkdirAll(externalDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create external dir: %v", err)
	}

	externalFile := filepath.Join(externalDir, "test.mp3")
	err = os.WriteFile(externalFile, []byte("test audio data"), 0644)
	if err != nil {
		t.Fatalf("Failed to create external file: %v", err)
	}

	// Create file with same name in destination
	destFile := filepath.Join(tempDir, destPlaylist, "test.mp3")
	err = os.WriteFile(destFile, []byte("existing data"), 0644)
	if err != nil {
		t.Fatalf("Failed to create dest file: %v", err)
	}

	// Try to add track
	err = AddExternalTrackToPlaylist(tempDir, destPlaylist, externalFile)
	if err == nil {
		t.Error("Expected error when adding duplicate track")
	}
}

func TestRemoveTrackFromPlaylist(t *testing.T) {
	tempDir := t.TempDir()

	playlistName := "TestPlaylist"
	err := CreatePlaylist(tempDir, playlistName)
	if err != nil {
		t.Fatalf("CreatePlaylist failed: %v", err)
	}

	// Create test file
	testFile := filepath.Join(tempDir, playlistName, "test.mp3")
	err = os.WriteFile(testFile, []byte("test audio data"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}

	// Remove track
	trackPath := playlistName + "/test.mp3"
	err = RemoveTrackFromPlaylist(tempDir, playlistName, trackPath)
	if err != nil {
		t.Fatalf("RemoveTrackFromPlaylist failed: %v", err)
	}

	// Verify file was removed
	if _, err := os.Stat(testFile); !os.IsNotExist(err) {
		t.Error("Track file still exists after removal")
	}
}

func TestRemoveTrackFromPlaylistNotExists(t *testing.T) {
	tempDir := t.TempDir()

	playlistName := "TestPlaylist"
	err := CreatePlaylist(tempDir, playlistName)
	if err != nil {
		t.Fatalf("CreatePlaylist failed: %v", err)
	}

	trackPath := playlistName + "/nonexistent.mp3"
	err = RemoveTrackFromPlaylist(tempDir, playlistName, trackPath)
	if err == nil {
		t.Error("Expected error when removing non-existent track")
	}
}
