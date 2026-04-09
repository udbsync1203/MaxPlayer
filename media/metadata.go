package media

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"

	"MaxPlayer/models"
	"github.com/dhowden/tag"
)

func ReadMetadata(path string, musicFolder string) models.AudioFile {
	file, err := os.Open(path)
	if err != nil {
		return defaultAudio(path, musicFolder)
	}
	defer file.Close()
	meta, err := tag.ReadFrom(file)
	if err != nil {
		return defaultAudio(path, musicFolder)
	}
	title := meta.Title()
	if title == "" {
		title = "Без названия"
	}
	artist := meta.Artist()
	if artist == "" {
		artist = "Неизвестный автор"
	}
	cover := ""
	if pic := meta.Picture(); pic != nil {
		cover = base64.StdEncoding.EncodeToString(pic.Data)
	}

	relativePath := relativePathFromRoot(path, musicFolder)

	return models.AudioFile{
		Path:        relativePath,
		Title:       title,
		Artist:      artist,
		CoverBase64: cover,
	}
}

func defaultAudio(path string, musicFolder string) models.AudioFile {
	relativePath := relativePathFromRoot(path, musicFolder)
	return models.AudioFile{
		Path:   relativePath,
		Title:  "Без названия",
		Artist: "Неизвестный автор",
	}
}

func relativePathFromRoot(path string, musicFolder string) string {
	rel, err := filepath.Rel(musicFolder, path)
	if err != nil {
		return strings.TrimPrefix(path, musicFolder)
	}

	if rel == "." {
		return ""
	}

	return filepath.ToSlash(rel)
}
