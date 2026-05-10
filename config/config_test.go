package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestMigrationFromOldConfig(t *testing.T) {
	// Create temporary directory for test
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.json")

	// Create old-style config
	oldConfig := map[string]interface{}{
		"musicFolder": "/music/old",
	}

	data, err := json.MarshalIndent(oldConfig, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal old config: %v", err)
	}

	err = os.WriteFile(configPath, data, 0644)
	if err != nil {
		t.Fatalf("Failed to write old config: %v", err)
	}

	// Load config (should trigger migration)
	cfg := Load(configPath)

	// Verify migration
	if len(cfg.Profiles) != 1 {
		t.Errorf("Expected 1 profile after migration, got %d", len(cfg.Profiles))
	}

	if cfg.Profiles[0].Name != "Default" {
		t.Errorf("Expected default profile name 'Default', got '%s'", cfg.Profiles[0].Name)
	}

	if cfg.Profiles[0].MusicFolder != "/music/old" {
		t.Errorf("Expected music folder '/music/old', got '%s'", cfg.Profiles[0].MusicFolder)
	}

	if cfg.ActiveProfile != "Default" {
		t.Errorf("Expected active profile 'Default', got '%s'", cfg.ActiveProfile)
	}

	if cfg.DefaultProfile != "Default" {
		t.Errorf("Expected default profile 'Default', got '%s'", cfg.DefaultProfile)
	}

	// Verify old musicFolder field is not in saved config
	savedData, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("Failed to read saved config: %v", err)
	}

	var savedConfig Config
	err = json.Unmarshal(savedData, &savedConfig)
	if err != nil {
		t.Fatalf("Failed to unmarshal saved config: %v", err)
	}

	if len(savedConfig.Profiles) != 1 {
		t.Errorf("Expected 1 profile in saved config, got %d", len(savedConfig.Profiles))
	}
}

func TestLoadEmptyConfig(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "nonexistent.json")

	cfg := Load(configPath)

	if len(cfg.Profiles) != 0 {
		t.Errorf("Expected 0 profiles for new config, got %d", len(cfg.Profiles))
	}

	if cfg.ActiveProfile != "" {
		t.Errorf("Expected empty active profile, got '%s'", cfg.ActiveProfile)
	}

	if cfg.DefaultProfile != "" {
		t.Errorf("Expected empty default profile, got '%s'", cfg.DefaultProfile)
	}
}

func TestSaveAndLoad(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.json")

	// Create config with profiles
	cfg := Config{
		Profiles: []Profile{
			{Name: "Profile1", MusicFolder: "/music/profile1"},
			{Name: "Profile2", MusicFolder: "/music/profile2"},
		},
		ActiveProfile:  "Profile1",
		DefaultProfile: "Profile2",
	}

	// Save
	err := Save(configPath, cfg)
	if err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	// Load
	loadedCfg := Load(configPath)

	// Verify
	if len(loadedCfg.Profiles) != 2 {
		t.Errorf("Expected 2 profiles, got %d", len(loadedCfg.Profiles))
	}

	if loadedCfg.ActiveProfile != "Profile1" {
		t.Errorf("Expected active profile 'Profile1', got '%s'", loadedCfg.ActiveProfile)
	}

	if loadedCfg.DefaultProfile != "Profile2" {
		t.Errorf("Expected default profile 'Profile2', got '%s'", loadedCfg.DefaultProfile)
	}
}

func TestNormalizeMusicFolder(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"  /music/test  ", "/music/test"},
		{"/music/test/", "/music/test"},
		{"", ""},
		{"  ", ""},
		{"/music/../test", "/test"},
	}

	for _, tt := range tests {
		result := NormalizeMusicFolder(tt.input)
		if result != tt.expected {
			t.Errorf("NormalizeMusicFolder(%q) = %q, expected %q", tt.input, result, tt.expected)
		}
	}
}
