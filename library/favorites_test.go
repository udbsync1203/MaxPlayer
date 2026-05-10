package library

import (
	"os"
	"path/filepath"
	"testing"
)

func TestEnsureFavoritesFolder(t *testing.T) {
	// Create temporary directory
	tempDir := t.TempDir()

	// Test creating Favorites folder
	err := EnsureFavoritesFolder(tempDir)
	if err != nil {
		t.Fatalf("EnsureFavoritesFolder failed: %v", err)
	}

	// Verify folder exists
	favoritesPath := filepath.Join(tempDir, FavoritesFolderName)
	info, err := os.Stat(favoritesPath)
	if err != nil {
		t.Fatalf("Favorites folder was not created: %v", err)
	}

	if !info.IsDir() {
		t.Fatal("Favorites path is not a directory")
	}

	// Test calling again (should not error)
	err = EnsureFavoritesFolder(tempDir)
	if err != nil {
		t.Fatalf("EnsureFavoritesFolder failed on second call: %v", err)
	}
}

func TestEnsureFavoritesFolderEmptyPath(t *testing.T) {
	err := EnsureFavoritesFolder("")
	if err != nil {
		t.Fatalf("EnsureFavoritesFolder should not error on empty path: %v", err)
	}
}

func TestAddToFavorites(t *testing.T) {
	tempDir := t.TempDir()
	playlistDir := filepath.Join(tempDir, "TestPlaylist")
	err := os.MkdirAll(playlistDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create playlist directory: %v", err)
	}

	audioFile := filepath.Join(playlistDir, "test.mp3")
	err = os.WriteFile(audioFile, []byte("test audio content"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test audio file: %v", err)
	}

	relativePath := "TestPlaylist/test.mp3"
	err = AddToFavorites(tempDir, relativePath)
	if err != nil {
		t.Fatalf("AddToFavorites failed: %v", err)
	}

	symlinkPath := filepath.Join(tempDir, FavoritesFolderName, "test.mp3")
	info, err := os.Lstat(symlinkPath)
	if err != nil {
		t.Fatalf("Symlink was not created: %v", err)
	}

	if info.Mode()&os.ModeSymlink == 0 {
		t.Fatal("Created file is not a symlink")
	}

	target, err := os.Readlink(symlinkPath)
	if err != nil {
		t.Fatalf("Failed to read symlink: %v", err)
	}

	absAudioFile, _ := filepath.Abs(audioFile)
	if target != absAudioFile {
		t.Fatalf("Symlink points to wrong file: expected %s, got %s", absAudioFile, target)
	}
}

func TestAddToFavoritesAlreadyExists(t *testing.T) {
	tempDir := t.TempDir()
	playlistDir := filepath.Join(tempDir, "TestPlaylist")
	err := os.MkdirAll(playlistDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create playlist directory: %v", err)
	}

	audioFile := filepath.Join(playlistDir, "test.mp3")
	err = os.WriteFile(audioFile, []byte("test audio content"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test audio file: %v", err)
	}

	relativePath := "TestPlaylist/test.mp3"
	err = AddToFavorites(tempDir, relativePath)
	if err != nil {
		t.Fatalf("AddToFavorites failed: %v", err)
	}

	err = AddToFavorites(tempDir, relativePath)
	if err == nil {
		t.Fatal("AddToFavorites should error when file already exists in favorites")
	}
}

func TestRemoveFromFavorites(t *testing.T) {
	tempDir := t.TempDir()
	playlistDir := filepath.Join(tempDir, "TestPlaylist")
	err := os.MkdirAll(playlistDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create playlist directory: %v", err)
	}

	audioFile := filepath.Join(playlistDir, "test.mp3")
	err = os.WriteFile(audioFile, []byte("test audio content"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test audio file: %v", err)
	}

	relativePath := "TestPlaylist/test.mp3"
	err = AddToFavorites(tempDir, relativePath)
	if err != nil {
		t.Fatalf("AddToFavorites failed: %v", err)
	}

	err = RemoveFromFavorites(tempDir, relativePath)
	if err != nil {
		t.Fatalf("RemoveFromFavorites failed: %v", err)
	}

	symlinkPath := filepath.Join(tempDir, FavoritesFolderName, "test.mp3")
	_, err = os.Lstat(symlinkPath)
	if !os.IsNotExist(err) {
		t.Fatal("Symlink was not removed")
	}
}

func TestRemoveFromFavoritesNotExists(t *testing.T) {
	tempDir := t.TempDir()
	relativePath := "nonexistent.mp3"

	err := RemoveFromFavorites(tempDir, relativePath)
	if err == nil {
		t.Fatal("RemoveFromFavorites should error when file is not in favorites")
	}
}

func TestIsFavorite(t *testing.T) {
	tempDir := t.TempDir()
	playlistDir := filepath.Join(tempDir, "TestPlaylist")
	err := os.MkdirAll(playlistDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create playlist directory: %v", err)
	}

	audioFile := filepath.Join(playlistDir, "test.mp3")
	err = os.WriteFile(audioFile, []byte("test audio content"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test audio file: %v", err)
	}

	relativePath := "TestPlaylist/test.mp3"
	isFav, err := IsFavorite(tempDir, relativePath)
	if err != nil {
		t.Fatalf("IsFavorite failed: %v", err)
	}
	if isFav {
		t.Fatal("File should not be in favorites yet")
	}

	err = AddToFavorites(tempDir, relativePath)
	if err != nil {
		t.Fatalf("AddToFavorites failed: %v", err)
	}

	isFav, err = IsFavorite(tempDir, relativePath)
	if err != nil {
		t.Fatalf("IsFavorite failed: %v", err)
	}
	if !isFav {
		t.Fatal("File should be in favorites")
	}

	err = RemoveFromFavorites(tempDir, relativePath)
	if err != nil {
		t.Fatalf("RemoveFromFavorites failed: %v", err)
	}

	isFav, err = IsFavorite(tempDir, relativePath)
	if err != nil {
		t.Fatalf("IsFavorite failed: %v", err)
	}
	if isFav {
		t.Fatal("File should not be in favorites after removal")
	}
}
