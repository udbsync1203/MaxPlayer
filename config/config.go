package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	MusicFolder string `json:"musicFolder"`
}

func Path() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}

	appDir := filepath.Join(dir, "MaxPlayer")

	err = os.MkdirAll(appDir, os.ModePerm)
	if err != nil {
		return "", err
	}

	return filepath.Join(appDir, "config.json"), nil
}

func Load(path string) Config {
	var config Config

	data, err := os.ReadFile(path)
	if err != nil {
		config = Config{}
		_ = Save(path, config)
		return config
	}

	_ = json.Unmarshal(data, &config)
	return config
}

func Save(path string, config Config) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

func NormalizeMusicFolder(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}

	return filepath.Clean(trimmed)
}
