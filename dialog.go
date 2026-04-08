package main

import "github.com/wailsapp/wails/v2/pkg/runtime"

func (a *App) SelectFolder() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select a folder with audio files",
	})
}
