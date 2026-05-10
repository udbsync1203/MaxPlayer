package library

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// CreatePlaylist creates a new playlist folder in the music directory
func CreatePlaylist(musicFolder, name string) error {
	if strings.TrimSpace(name) == "" {
		return fmt.Errorf("playlist name cannot be empty")
	}

	// Validate name doesn't contain invalid characters
	if strings.ContainsAny(name, `/\:*?"<>|`) {
		return fmt.Errorf("playlist name contains invalid characters")
	}

	// Prevent creating system playlist
	if name == FavoritesFolderName {
		return fmt.Errorf("cannot create playlist with reserved name '%s'", FavoritesFolderName)
	}

	playlistPath := filepath.Join(musicFolder, name)

	// Check if already exists
	if _, err := os.Stat(playlistPath); err == nil {
		return fmt.Errorf("playlist '%s' already exists", name)
	}

	return os.MkdirAll(playlistPath, 0755)
}

// DeletePlaylist moves a playlist folder to system trash
func DeletePlaylist(musicFolder, name string) error {
	if name == FavoritesFolderName {
		return fmt.Errorf("cannot delete system playlist '%s'", FavoritesFolderName)
	}

	playlistPath := filepath.Join(musicFolder, name)

	// Check if exists
	if _, err := os.Stat(playlistPath); os.IsNotExist(err) {
		return fmt.Errorf("playlist '%s' does not exist", name)
	}

	return moveToTrash(playlistPath)
}

// RenamePlaylist renames a playlist folder
func RenamePlaylist(musicFolder, oldName, newName string) error {
	if strings.TrimSpace(newName) == "" {
		return fmt.Errorf("new playlist name cannot be empty")
	}

	if strings.ContainsAny(newName, `/\:*?"<>|`) {
		return fmt.Errorf("playlist name contains invalid characters")
	}

	if oldName == FavoritesFolderName {
		return fmt.Errorf("cannot rename system playlist '%s'", FavoritesFolderName)
	}

	if newName == FavoritesFolderName {
		return fmt.Errorf("cannot use reserved name '%s'", FavoritesFolderName)
	}

	oldPath := filepath.Join(musicFolder, oldName)
	newPath := filepath.Join(musicFolder, newName)

	// Check if old exists
	if _, err := os.Stat(oldPath); os.IsNotExist(err) {
		return fmt.Errorf("playlist '%s' does not exist", oldName)
	}

	// Check if new already exists
	if _, err := os.Stat(newPath); err == nil {
		return fmt.Errorf("playlist '%s' already exists", newName)
	}

	return os.Rename(oldPath, newPath)
}

// AddExternalTrackToPlaylist copies an external audio file into a playlist
func AddExternalTrackToPlaylist(musicFolder, playlistName, externalPath string) error {
	// Check if destination playlist exists
	playlistPath := filepath.Join(musicFolder, playlistName)
	if _, err := os.Stat(playlistPath); os.IsNotExist(err) {
		return fmt.Errorf("destination playlist '%s' does not exist", playlistName)
	}

	// Check if source exists
	if _, err := os.Stat(externalPath); os.IsNotExist(err) {
		return fmt.Errorf("source file does not exist: %s", externalPath)
	}

	// Get filename from path
	fileName := filepath.Base(externalPath)
	destPath := filepath.Join(playlistPath, fileName)

	// Check if file already exists in destination
	if _, err := os.Stat(destPath); err == nil {
		return fmt.Errorf("track '%s' already exists in playlist '%s'", fileName, playlistName)
	}

	// Copy file
	return copyFile(externalPath, destPath)
}

// RemoveTrackFromPlaylist moves a track to system trash
func RemoveTrackFromPlaylist(musicFolder, playlistName, trackPath string) error {
	// trackPath format: "PlaylistName/track.mp3"
	parts := strings.SplitN(trackPath, "/", 2)
	if len(parts) != 2 {
		return fmt.Errorf("invalid track path format: %s", trackPath)
	}

	fileName := parts[1]
	filePath := filepath.Join(musicFolder, playlistName, fileName)

	// Check if exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("track does not exist: %s", trackPath)
	}

	return moveToTrash(filePath)
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	if err != nil {
		return err
	}

	return destFile.Sync()
}
