package main

import (
	"context"
)

// App struct
type App struct {
	ctx        context.Context
	configPath string
	config     Config
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	path, err := getConfigPath()
	if err != nil {
		panic(err)
	}

	a.configPath = path
	a.config = LoadConfig(path)
	a.ctx = ctx
}

func (a *App) Hello() string {
	return "Hello from backend"
}

func (a *App) SetMusicFolder(path string) {
	a.config.MusicFolder = path
	_ = SaveConfig(a.configPath, a.config)
}

func (a *App) GetMusicFolder() string {
	return a.config.MusicFolder
}
