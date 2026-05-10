package main

import (
	"context"

	"MaxPlayer/config"
	"MaxPlayer/library"
	"MaxPlayer/models"
)

type App struct {
	ctx        context.Context
	configPath string
	config     config.Config
}

func NewApp() *App {
	app := &App{}

	path, err := config.Path()
	if err != nil {
		panic(err)
	}
	app.configPath = path
	app.config = config.Load(path)

	return app
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) Hello() string {
	return "Hello from backend"
}

func (a *App) SetMusicFolder(path string) {
	normalized := config.NormalizeMusicFolder(path)
	if err := library.ValidateMusicFolder(normalized); err != nil {
		println("Invalid music folder:", err.Error())
		return
	}

	profile, err := a.config.GetActiveProfile()
	if err != nil {
		println("No active profile:", err.Error())
		return
	}

	if err := a.config.UpdateProfileMusicFolder(profile.Name, normalized); err != nil {
		println("Error updating profile:", err.Error())
		return
	}

	if err := library.EnsureFavoritesFolder(normalized); err != nil {
		println("Error creating Favorites folder:", err.Error())
	}

	if err := config.Save(a.configPath, a.config); err != nil {
		println("Error saving config:", err.Error())
	}
}

func (a *App) GetMusicFolder() string {
	profile, err := a.config.GetActiveProfile()
	if err != nil {
		return ""
	}
	return profile.MusicFolder
}

func (a *App) ScanAudioFiles(playlistName string) ([]models.AudioFile, error) {
	profile, err := a.config.GetActiveProfile()
	if err != nil {
		return nil, err
	}
	return library.ScanAudioFiles(profile.MusicFolder, playlistName)
}

func (a *App) GetPlaylists() ([]models.Playlist, error) {
	profile, err := a.config.GetActiveProfile()
	if err != nil {
		return nil, err
	}
	return library.GetPlaylists(profile.MusicFolder)
}

func (a *App) GetFavoritesPlaylist() (models.Playlist, error) {
	profile, err := a.config.GetActiveProfile()
	if err != nil {
		return models.Playlist{}, err
	}
	return library.GetFavoritesPlaylist(profile.MusicFolder)
}

func (a *App) GetFavoritesTracks() ([]models.AudioFile, error) {
	profile, err := a.config.GetActiveProfile()
	if err != nil {
		return nil, err
	}
	return library.ScanAudioFiles(profile.MusicFolder, "Favorites")
}

func (a *App) GetProfiles() []config.Profile {
	return a.config.ListProfiles()
}

func (a *App) GetActiveProfile() (config.Profile, error) {
	profile, err := a.config.GetActiveProfile()
	if err != nil {
		return config.Profile{}, err
	}
	return *profile, nil
}

func (a *App) GetDefaultProfile() string {
	return a.config.DefaultProfile
}

func (a *App) CreateProfile(name, musicFolder string) error {
	normalized := config.NormalizeMusicFolder(musicFolder)
	if normalized != "" {
		if err := library.ValidateMusicFolder(normalized); err != nil {
			return err
		}
	}

	if err := a.config.CreateProfile(name, normalized); err != nil {
		return err
	}

	if normalized != "" {
		if err := library.EnsureFavoritesFolder(normalized); err != nil {
			return err
		}
	}

	return config.Save(a.configPath, a.config)
}

func (a *App) DeleteProfile(name string) error {
	if err := a.config.DeleteProfile(name); err != nil {
		return err
	}

	return config.Save(a.configPath, a.config)
}

func (a *App) RenameProfile(oldName, newName string) error {
	if err := a.config.RenameProfile(oldName, newName); err != nil {
		return err
	}

	return config.Save(a.configPath, a.config)
}

func (a *App) SwitchProfile(name string) error {
	if err := a.config.SwitchProfile(name); err != nil {
		return err
	}

	profile, err := a.config.GetActiveProfile()
	if err == nil && profile.MusicFolder != "" {
		library.EnsureFavoritesFolder(profile.MusicFolder)
	}

	return config.Save(a.configPath, a.config)
}

func (a *App) SetDefaultProfile(name string) error {
	if err := a.config.SetDefaultProfile(name); err != nil {
		return err
	}

	return config.Save(a.configPath, a.config)
}

func (a *App) UpdateProfileMusicFolder(name, musicFolder string) error {
	normalized := config.NormalizeMusicFolder(musicFolder)
	if normalized != "" {
		if err := library.ValidateMusicFolder(normalized); err != nil {
			return err
		}
	}

	if err := a.config.UpdateProfileMusicFolder(name, normalized); err != nil {
		return err
	}

	if normalized != "" {
		if err := library.EnsureFavoritesFolder(normalized); err != nil {
			return err
		}
	}

	return config.Save(a.configPath, a.config)
}

func (a *App) AddToFavorites(audioFilePath string) error {
	profile, err := a.config.GetActiveProfile()
	if err != nil {
		return err
	}

	return library.AddToFavorites(profile.MusicFolder, audioFilePath)
}

func (a *App) RemoveFromFavorites(audioFilePath string) error {
	profile, err := a.config.GetActiveProfile()
	if err != nil {
		return err
	}

	return library.RemoveFromFavorites(profile.MusicFolder, audioFilePath)
}

func (a *App) IsFavorite(audioFilePath string) (bool, error) {
	profile, err := a.config.GetActiveProfile()
	if err != nil {
		return false, err
	}

	return library.IsFavorite(profile.MusicFolder, audioFilePath)
}
