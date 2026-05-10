package main

import "github.com/wailsapp/wails/v2/pkg/runtime"

func (a *App) SelectFolder() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select a folder with audio files",
	})
}

func (a *App) SelectAudioFiles() ([]string, error) {
	return runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select audio files",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Audio Files (*.mp3, *.wav)",
				Pattern:     "*.mp3;*.wav",
			},
		},
	})
}
