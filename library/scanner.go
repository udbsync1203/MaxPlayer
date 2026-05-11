package library

import (
	"os"
	"path/filepath"
	"strings"

	"MaxPlayer/media"
	"MaxPlayer/models"
)

func ScanAudioFiles(musicFolder string, playlistName string) ([]models.AudioFile, error) {
	var result []models.AudioFile

	folder := filepath.Join(musicFolder, playlistName)
	err := filepath.WalkDir(folder, func(path string, entry os.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".mp3" && ext != ".wav" {
			return nil
		}

		audio := media.ReadMetadata(path, musicFolder)
		result = append(result, audio)

		return nil
	})

	return result, err
}

func SearchTracks(musicFolder string, query string) ([]models.AudioFile, error) {
	var result []models.AudioFile
	seen := make(map[string]bool) // Track actual file paths to avoid duplicates

	queryLower := strings.ToLower(query)

	err := filepath.WalkDir(musicFolder, func(path string, entry os.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".mp3" && ext != ".wav" {
			return nil
		}

		// Get the real path (resolve symlinks)
		realPath, err := filepath.EvalSymlinks(path)
		if err != nil {
			realPath = path // If can't resolve, use original path
		}

		// Skip if we've already added this file
		if seen[realPath] {
			return nil
		}

		audio := media.ReadMetadata(path, musicFolder)

		titleLower := strings.ToLower(audio.Title)
		artistLower := strings.ToLower(audio.Artist)

		if strings.Contains(titleLower, queryLower) || strings.Contains(artistLower, queryLower) {
			result = append(result, audio)
			seen[realPath] = true
		}

		return nil
	})

	return result, err
}
