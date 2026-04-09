package main

import (
	"os"
	"path/filepath"
	"strings"
)

func (a *App) ScanAudioFiles(playlistName string) ([]AudioFile, error) {
	var result []AudioFile

	folder := a.config.MusicFolder + string(os.PathSeparator) + playlistName
	err := filepath.Walk(folder, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".mp3" && ext != ".wav" {
			return nil
		}

		audio := ReadMetadata(path, a.config.MusicFolder)
		result = append(result, audio)

		return nil
	})

	return result, err
}

func (a *App) GetPlaylists() ([]Playlist, error) {
	var playlists []Playlist
	folder := a.config.MusicFolder
	entries, err := os.ReadDir(folder)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			playlists = append(playlists, Playlist{
				Name: entry.Name(),
				Path: folder + string(os.PathSeparator) + entry.Name(),
			})
		}
	}

	return playlists, nil
}
