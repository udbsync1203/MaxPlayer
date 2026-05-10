package config

import (
	"testing"
)

func TestCreateProfile(t *testing.T) {
	cfg := Config{Profiles: []Profile{}}

	err := cfg.CreateProfile("Test", "/music/test")
	if err != nil {
		t.Fatalf("CreateProfile failed: %v", err)
	}

	if len(cfg.Profiles) != 1 {
		t.Errorf("Expected 1 profile, got %d", len(cfg.Profiles))
	}

	if cfg.Profiles[0].Name != "Test" {
		t.Errorf("Expected profile name 'Test', got '%s'", cfg.Profiles[0].Name)
	}

	if cfg.ActiveProfile != "Test" {
		t.Errorf("Expected active profile 'Test', got '%s'", cfg.ActiveProfile)
	}

	if cfg.DefaultProfile != "Test" {
		t.Errorf("Expected default profile 'Test', got '%s'", cfg.DefaultProfile)
	}
}

func TestCreateProfileDuplicate(t *testing.T) {
	cfg := Config{Profiles: []Profile{
		{Name: "Test", MusicFolder: "/music/test"},
	}}

	err := cfg.CreateProfile("Test", "/music/test2")
	if err != ErrProfileAlreadyExists {
		t.Errorf("Expected ErrProfileAlreadyExists, got %v", err)
	}
}

func TestCreateProfileEmptyName(t *testing.T) {
	cfg := Config{Profiles: []Profile{}}

	err := cfg.CreateProfile("", "/music/test")
	if err == nil {
		t.Error("Expected error for empty profile name")
	}
}

func TestGetProfile(t *testing.T) {
	cfg := Config{Profiles: []Profile{
		{Name: "Test1", MusicFolder: "/music/test1"},
		{Name: "Test2", MusicFolder: "/music/test2"},
	}}

	profile, err := cfg.GetProfile("Test2")
	if err != nil {
		t.Fatalf("GetProfile failed: %v", err)
	}

	if profile.Name != "Test2" {
		t.Errorf("Expected profile name 'Test2', got '%s'", profile.Name)
	}

	if profile.MusicFolder != "/music/test2" {
		t.Errorf("Expected music folder '/music/test2', got '%s'", profile.MusicFolder)
	}
}

func TestGetProfileNotFound(t *testing.T) {
	cfg := Config{Profiles: []Profile{}}

	_, err := cfg.GetProfile("NonExistent")
	if err != ErrProfileNotFound {
		t.Errorf("Expected ErrProfileNotFound, got %v", err)
	}
}

func TestDeleteProfile(t *testing.T) {
	cfg := Config{
		Profiles: []Profile{
			{Name: "Test1", MusicFolder: "/music/test1"},
			{Name: "Test2", MusicFolder: "/music/test2"},
		},
		ActiveProfile:  "Test1",
		DefaultProfile: "Test2",
	}

	err := cfg.DeleteProfile("Test2")
	if err != nil {
		t.Fatalf("DeleteProfile failed: %v", err)
	}

	if len(cfg.Profiles) != 1 {
		t.Errorf("Expected 1 profile after deletion, got %d", len(cfg.Profiles))
	}

	if cfg.DefaultProfile != "" {
		t.Errorf("Expected default profile to be cleared, got '%s'", cfg.DefaultProfile)
	}
}

func TestDeleteActiveProfile(t *testing.T) {
	cfg := Config{
		Profiles: []Profile{
			{Name: "Test1", MusicFolder: "/music/test1"},
		},
		ActiveProfile: "Test1",
	}

	err := cfg.DeleteProfile("Test1")
	if err != ErrCannotDeleteActive {
		t.Errorf("Expected ErrCannotDeleteActive, got %v", err)
	}
}

func TestRenameProfile(t *testing.T) {
	cfg := Config{
		Profiles: []Profile{
			{Name: "OldName", MusicFolder: "/music/test"},
		},
		ActiveProfile:  "OldName",
		DefaultProfile: "OldName",
	}

	err := cfg.RenameProfile("OldName", "NewName")
	if err != nil {
		t.Fatalf("RenameProfile failed: %v", err)
	}

	profile, err := cfg.GetProfile("NewName")
	if err != nil {
		t.Fatalf("Profile not found after rename: %v", err)
	}

	if profile.Name != "NewName" {
		t.Errorf("Expected profile name 'NewName', got '%s'", profile.Name)
	}

	if cfg.ActiveProfile != "NewName" {
		t.Errorf("Expected active profile 'NewName', got '%s'", cfg.ActiveProfile)
	}

	if cfg.DefaultProfile != "NewName" {
		t.Errorf("Expected default profile 'NewName', got '%s'", cfg.DefaultProfile)
	}
}

func TestRenameProfileToExisting(t *testing.T) {
	cfg := Config{
		Profiles: []Profile{
			{Name: "Test1", MusicFolder: "/music/test1"},
			{Name: "Test2", MusicFolder: "/music/test2"},
		},
	}

	err := cfg.RenameProfile("Test1", "Test2")
	if err != ErrProfileAlreadyExists {
		t.Errorf("Expected ErrProfileAlreadyExists, got %v", err)
	}
}

func TestSwitchProfile(t *testing.T) {
	cfg := Config{
		Profiles: []Profile{
			{Name: "Test1", MusicFolder: "/music/test1"},
			{Name: "Test2", MusicFolder: "/music/test2"},
		},
		ActiveProfile: "Test1",
	}

	err := cfg.SwitchProfile("Test2")
	if err != nil {
		t.Fatalf("SwitchProfile failed: %v", err)
	}

	if cfg.ActiveProfile != "Test2" {
		t.Errorf("Expected active profile 'Test2', got '%s'", cfg.ActiveProfile)
	}
}

func TestSwitchProfileNotFound(t *testing.T) {
	cfg := Config{
		Profiles:      []Profile{},
		ActiveProfile: "",
	}

	err := cfg.SwitchProfile("NonExistent")
	if err != ErrProfileNotFound {
		t.Errorf("Expected ErrProfileNotFound, got %v", err)
	}
}

func TestSetDefaultProfile(t *testing.T) {
	cfg := Config{
		Profiles: []Profile{
			{Name: "Test1", MusicFolder: "/music/test1"},
			{Name: "Test2", MusicFolder: "/music/test2"},
		},
		DefaultProfile: "Test1",
	}

	err := cfg.SetDefaultProfile("Test2")
	if err != nil {
		t.Fatalf("SetDefaultProfile failed: %v", err)
	}

	if cfg.DefaultProfile != "Test2" {
		t.Errorf("Expected default profile 'Test2', got '%s'", cfg.DefaultProfile)
	}
}

func TestUpdateProfileMusicFolder(t *testing.T) {
	cfg := Config{
		Profiles: []Profile{
			{Name: "Test", MusicFolder: "/music/old"},
		},
	}

	err := cfg.UpdateProfileMusicFolder("Test", "/music/new")
	if err != nil {
		t.Fatalf("UpdateProfileMusicFolder failed: %v", err)
	}

	profile, _ := cfg.GetProfile("Test")
	if profile.MusicFolder != "/music/new" {
		t.Errorf("Expected music folder '/music/new', got '%s'", profile.MusicFolder)
	}
}

func TestListProfiles(t *testing.T) {
	cfg := Config{
		Profiles: []Profile{
			{Name: "Test1", MusicFolder: "/music/test1"},
			{Name: "Test2", MusicFolder: "/music/test2"},
		},
	}

	profiles := cfg.ListProfiles()
	if len(profiles) != 2 {
		t.Errorf("Expected 2 profiles, got %d", len(profiles))
	}

	// Verify it's a copy
	profiles[0].Name = "Modified"
	if cfg.Profiles[0].Name == "Modified" {
		t.Error("ListProfiles should return a copy, not original slice")
	}
}

func TestProfileExists(t *testing.T) {
	cfg := Config{
		Profiles: []Profile{
			{Name: "Test", MusicFolder: "/music/test"},
		},
	}

	if !cfg.ProfileExists("Test") {
		t.Error("Expected profile 'Test' to exist")
	}

	if cfg.ProfileExists("NonExistent") {
		t.Error("Expected profile 'NonExistent' to not exist")
	}
}

func TestGetProfileCount(t *testing.T) {
	cfg := Config{
		Profiles: []Profile{
			{Name: "Test1", MusicFolder: "/music/test1"},
			{Name: "Test2", MusicFolder: "/music/test2"},
		},
	}

	count := cfg.GetProfileCount()
	if count != 2 {
		t.Errorf("Expected profile count 2, got %d", count)
	}
}
