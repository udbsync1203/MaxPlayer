//go:build darwin

package library

import (
	"os/exec"
)

// moveToTrash moves a file or directory to macOS Trash using osascript
func moveToTrash(path string) error {
	cmd := exec.Command("osascript", "-e", `tell application "Finder" to delete POSIX file "`+path+`"`)
	return cmd.Run()
}
