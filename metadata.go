package main

import (
	"encoding/base64"
	"os"
	"strings"

	"github.com/dhowden/tag"
)

func ReadMetadata(path string, musicFolder string) AudioFile {
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

	relativePath := strings.TrimPrefix(path, musicFolder)

	return AudioFile{
		Path:        relativePath,
		Title:       title,
		Artist:      artist,
		CoverBase64: cover,
	}
}

func defaultAudio(path string, musicFolder string) AudioFile {
	relativePath := strings.TrimPrefix(path, musicFolder)
	return AudioFile{
		Path:   relativePath,
		Title:  "Без названия",
		Artist: "Неизвестный автор",
	}
}
