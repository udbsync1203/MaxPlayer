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
		if entry.IsDir() {
			playlists = append(playlists, models.Playlist{
				Name: entry.Name(),
				Path: filepath.Join(musicFolder, entry.Name()),
			})
		}
	}

	return playlists, nil
}
