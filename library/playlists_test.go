package library

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGetPlaylists_ExcludesFavorites(t *testing.T) {
	tempDir := t.TempDir()

	// Create some playlists
	playlists := []string{"Rock", "Jazz", "Classical"}
	for _, name := range playlists {
		err := os.MkdirAll(filepath.Join(tempDir, name), 0755)
		if err != nil {
			t.Fatalf("Failed to create playlist directory: %v", err)
		}
	}

	// Create Favorites folder
	err := EnsureFavoritesFolder(tempDir)
	if err != nil {
		t.Fatalf("Failed to create Favorites folder: %v", err)
	}

	// Get playlists
	result, err := GetPlaylists(tempDir)
	if err != nil {
		t.Fatalf("GetPlaylists failed: %v", err)
	}

	// Verify Favorites is not included
	if len(result) != len(playlists) {
		t.Fatalf("Expected %d playlists, got %d", len(playlists), len(result))
	}

	for _, playlist := range result {
		if playlist.Name == FavoritesFolderName {
			t.Fatal("GetPlaylists should not return Favorites folder")
		}
	}
}

func TestGetFavoritesPlaylist(t *testing.T) {
	tempDir := t.TempDir()

	// Create Favorites folder
	err := EnsureFavoritesFolder(tempDir)
	if err != nil {
		t.Fatalf("Failed to create Favorites folder: %v", err)
	}

	// Get Favorites playlist
	favorites, err := GetFavoritesPlaylist(tempDir)
	if err != nil {
		t.Fatalf("GetFavoritesPlaylist failed: %v", err)
	}

	if favorites.Name != FavoritesFolderName {
		t.Fatalf("Expected name %s, got %s", FavoritesFolderName, favorites.Name)
	}

	expectedPath := filepath.Join(tempDir, FavoritesFolderName)
	if favorites.Path != expectedPath {
		t.Fatalf("Expected path %s, got %s", expectedPath, favorites.Path)
	}
}

func TestGetFavoritesPlaylist_NotExists(t *testing.T) {
	tempDir := t.TempDir()

	// Try to get Favorites without creating it
	_, err := GetFavoritesPlaylist(tempDir)
	if err == nil {
		t.Fatal("GetFavoritesPlaylist should error when Favorites folder doesn't exist")
	}
}
