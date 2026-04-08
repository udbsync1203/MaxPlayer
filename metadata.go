package main

import (
	"encoding/base64"
	"os"

	"github.com/dhowden/tag"
)

func ReadMetadata(path string) AudioFile {
	file, err := os.Open(path)
	if err != nil {
		return defaultAudio(path)
	}
	defer file.Close()

	meta, err := tag.ReadFrom(file)
	if err != nil {
		return defaultAudio(path)
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

	return AudioFile{
		Path:        path,
		Title:       title,
		Artist:      artist,
		CoverBase64: cover,
	}
}

func defaultAudio(path string) AudioFile {
	return AudioFile{
		Path:   path,
		Title:  "Без названия",
		Artist: "Неизвестный автор",
	}
}
