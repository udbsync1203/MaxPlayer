package library

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

const FavoritesFolderName = "Favorites"

func EnsureFavoritesFolder(musicFolder string) error {
	if musicFolder == "" {
		return nil
	}

	favoritesPath := filepath.Join(musicFolder, FavoritesFolderName)

	if info, err := os.Stat(favoritesPath); err == nil {
		if !info.IsDir() {
			return fmt.Errorf("favorites path exists but is not a directory: %s", favoritesPath)
		}
		return nil
	}

	return os.MkdirAll(favoritesPath, 0755)
}

func AddToFavorites(musicFolder, relativeAudioPath string) error {
	if musicFolder == "" {
		return fmt.Errorf("music folder is not set")
	}

	if err := EnsureFavoritesFolder(musicFolder); err != nil {
		return err
	}

	audioFilePath := filepath.Join(musicFolder, relativeAudioPath)
	absAudioPath, err := filepath.Abs(audioFilePath)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %w", err)
	}

	if _, err := os.Stat(absAudioPath); err != nil {
		return fmt.Errorf("audio file does not exist: %w", err)
	}

	fileName := filepath.Base(absAudioPath)
	symlinkPath := filepath.Join(musicFolder, FavoritesFolderName, fileName)

	if _, err := os.Lstat(symlinkPath); err == nil {
		return fmt.Errorf("file already exists in favorites: %s", fileName)
	}

	// On Windows, symlinks require admin privileges, so we copy the file instead
	if runtime.GOOS == "windows" {
		if err := copyFile(absAudioPath, symlinkPath); err != nil {
			return fmt.Errorf("failed to copy file: %w", err)
		}
	} else {
		if err := os.Symlink(absAudioPath, symlinkPath); err != nil {
			return fmt.Errorf("failed to create symlink: %w", err)
		}
	}

	return nil
}

func RemoveFromFavorites(musicFolder, relativeAudioPath string) error {
	if musicFolder == "" {
		return fmt.Errorf("music folder is not set")
	}

	fileName := filepath.Base(relativeAudioPath)
	symlinkPath := filepath.Join(musicFolder, FavoritesFolderName, fileName)

	if _, err := os.Lstat(symlinkPath); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("file not found in favorites: %s", fileName)
		}
		return err
	}

	if err := os.Remove(symlinkPath); err != nil {
		return fmt.Errorf("failed to remove from favorites: %w", err)
	}

	return nil
}

func IsFavorite(musicFolder, relativeAudioPath string) (bool, error) {
	if musicFolder == "" {
		return false, fmt.Errorf("music folder is not set")
	}

	fileName := filepath.Base(relativeAudioPath)
	symlinkPath := filepath.Join(musicFolder, FavoritesFolderName, fileName)

	if _, err := os.Lstat(symlinkPath); err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}
