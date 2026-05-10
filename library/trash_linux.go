//go:build linux

package library

import (
	"os"
)

// moveToTrash on Linux - fallback to os.Remove
// TODO: implement proper XDG Trash support
func moveToTrash(path string) error {
	return os.Remove(path)
}
