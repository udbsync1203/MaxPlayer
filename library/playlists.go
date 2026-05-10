package library

import (
	"os"
	"path/filepath"

	"MaxPlayer/models"
)

func GetPlaylists(musicFolder string) ([]models.Playlist, error) {
	var playlists []models.Playlist
	entries, err := os.ReadDir(musicFolder)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if entry.IsDir() && entry.Name() != FavoritesFolderName {
			playlists = append(playlists, models.Playlist{
				Name: entry.Name(),
				Path: filepath.Join(musicFolder, entry.Name()),
			})
		}
	}

	return playlists, nil
}

func GetFavoritesPlaylist(musicFolder string) (models.Playlist, error) {
	favoritesPath := filepath.Join(musicFolder, FavoritesFolderName)

	// Check if Favorites folder exists
	if _, err := os.Stat(favoritesPath); err != nil {
		if os.IsNotExist(err) {
			return models.Playlist{}, err
		}
		return models.Playlist{}, err
	}

	return models.Playlist{
		Name: FavoritesFolderName,
		Path: favoritesPath,
	}, nil
}
