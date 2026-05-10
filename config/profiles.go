package config

import (
	"errors"
	"fmt"
)

var (
	ErrProfileNotFound     = errors.New("profile not found")
	ErrProfileAlreadyExists = errors.New("profile already exists")
	ErrCannotDeleteActive  = errors.New("cannot delete active profile")
)

// GetProfile returns a profile by name
func (c *Config) GetProfile(name string) (*Profile, error) {
	for i := range c.Profiles {
		if c.Profiles[i].Name == name {
			return &c.Profiles[i], nil
		}
	}
	return nil, ErrProfileNotFound
}

// GetActiveProfile returns the currently active profile
func (c *Config) GetActiveProfile() (*Profile, error) {
	if c.ActiveProfile == "" {
		return nil, errors.New("no active profile set")
	}
	return c.GetProfile(c.ActiveProfile)
}

// CreateProfile adds a new profile
func (c *Config) CreateProfile(name, musicFolder string) error {
	if name == "" {
		return errors.New("profile name cannot be empty")
	}

	// Check if profile already exists
	if _, err := c.GetProfile(name); err == nil {
		return ErrProfileAlreadyExists
	}

	c.Profiles = append(c.Profiles, Profile{
		Name:        name,
		MusicFolder: musicFolder,
	})

	// Set as active and default if it's the first profile
	if len(c.Profiles) == 1 {
		c.ActiveProfile = name
		c.DefaultProfile = name
	}

	return nil
}

// DeleteProfile removes a profile by name
func (c *Config) DeleteProfile(name string) error {
	if name == "" {
		return errors.New("profile name cannot be empty")
	}

	// Cannot delete active profile
	if c.ActiveProfile == name {
		return ErrCannotDeleteActive
	}

	index := -1
	for i, profile := range c.Profiles {
		if profile.Name == name {
			index = i
			break
		}
	}

	if index == -1 {
		return ErrProfileNotFound
	}

	// Remove profile from slice
	c.Profiles = append(c.Profiles[:index], c.Profiles[index+1:]...)

	// If deleted profile was default, clear default
	if c.DefaultProfile == name {
		c.DefaultProfile = ""
	}

	return nil
}

// RenameProfile changes the name of an existing profile
func (c *Config) RenameProfile(oldName, newName string) error {
	if oldName == "" || newName == "" {
		return errors.New("profile names cannot be empty")
	}

	if oldName == newName {
		return nil
	}

	// Check if new name already exists
	if _, err := c.GetProfile(newName); err == nil {
		return ErrProfileAlreadyExists
	}

	// Find and rename profile
	profile, err := c.GetProfile(oldName)
	if err != nil {
		return err
	}

	profile.Name = newName

	// Update active profile reference
	if c.ActiveProfile == oldName {
		c.ActiveProfile = newName
	}

	// Update default profile reference
	if c.DefaultProfile == oldName {
		c.DefaultProfile = newName
	}

	return nil
}

// SwitchProfile changes the active profile
func (c *Config) SwitchProfile(name string) error {
	if name == "" {
		return errors.New("profile name cannot be empty")
	}

	// Verify profile exists
	if _, err := c.GetProfile(name); err != nil {
		return err
	}

	c.ActiveProfile = name
	return nil
}

// SetDefaultProfile sets the default profile to load on startup
func (c *Config) SetDefaultProfile(name string) error {
	if name == "" {
		return errors.New("profile name cannot be empty")
	}

	// Verify profile exists
	if _, err := c.GetProfile(name); err != nil {
		return err
	}

	c.DefaultProfile = name
	return nil
}

// UpdateProfileMusicFolder updates the music folder path for a profile
func (c *Config) UpdateProfileMusicFolder(name, musicFolder string) error {
	profile, err := c.GetProfile(name)
	if err != nil {
		return err
	}

	profile.MusicFolder = musicFolder
	return nil
}

// ListProfiles returns all profiles
func (c *Config) ListProfiles() []Profile {
	// Return a copy to prevent external modifications
	profiles := make([]Profile, len(c.Profiles))
	copy(profiles, c.Profiles)
	return profiles
}

// GetProfileCount returns the number of profiles
func (c *Config) GetProfileCount() int {
	return len(c.Profiles)
}

// ProfileExists checks if a profile with the given name exists
func (c *Config) ProfileExists(name string) bool {
	_, err := c.GetProfile(name)
	return err == nil
}

// String returns a string representation of a profile
func (p Profile) String() string {
	return fmt.Sprintf("Profile{Name: %s, MusicFolder: %s}", p.Name, p.MusicFolder)
}
