package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

type Profile struct {
	Name        string `json:"name"`
	MusicFolder string `json:"musicFolder"`
}

type Config struct {
	Profiles       []Profile `json:"profiles"`
	ActiveProfile  string    `json:"activeProfile"`
	DefaultProfile string    `json:"defaultProfile"`
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
		config = Config{
			Profiles: []Profile{},
		}
		_ = Save(path, config)
		return config
	}

	_ = json.Unmarshal(data, &config)

	// Migration: check for old musicFolder field in raw JSON
	var rawConfig map[string]interface{}
	if json.Unmarshal(data, &rawConfig) == nil {
		if oldFolder, ok := rawConfig["musicFolder"].(string); ok && oldFolder != "" && len(config.Profiles) == 0 {
			config.Profiles = []Profile{
				{
					Name:        "Default",
					MusicFolder: oldFolder,
				},
			}
			config.ActiveProfile = "Default"
			config.DefaultProfile = "Default"
			_ = Save(path, config)
		}
	}

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
