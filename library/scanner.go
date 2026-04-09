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
