package main

import (
	"context"

	"MaxPlayer/config"
	"MaxPlayer/library"
	"MaxPlayer/models"
)

// App struct
type App struct {
	ctx        context.Context
	configPath string
	config     config.Config
}

// NewApp creates a new App application struct
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

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
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

	a.config.MusicFolder = normalized
	if err := config.Save(a.configPath, a.config); err != nil {
		println("Error saving config:", err.Error())
	}
}

func (a *App) GetMusicFolder() string {
	return a.config.MusicFolder
}

func (a *App) ScanAudioFiles(playlistName string) ([]models.AudioFile, error) {
	return library.ScanAudioFiles(a.config.MusicFolder, playlistName)
}

func (a *App) GetPlaylists() ([]models.Playlist, error) {
	return library.GetPlaylists(a.config.MusicFolder)
}
