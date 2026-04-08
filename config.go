package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Config struct {
	MusicFolder string `json:"musicFolder"`
}

func getConfigPath() (string, error) {
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

func LoadConfig(path string) Config {
	var config Config

	data, err := os.ReadFile(path)
	if err != nil {
		config = Config{}
		_ = SaveConfig(path, config)
		return config
	}

	_ = json.Unmarshal(data, &config)
	return config
}

func SaveConfig(path string, config Config) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}
