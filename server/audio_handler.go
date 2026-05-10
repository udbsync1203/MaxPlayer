package server

import (
	"net/http"
	"path/filepath"
	"strings"

	"MaxPlayer/config"
)

type AudioHandler struct {
	Config *config.Config
}

func (h *AudioHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.URL.Path, "/audio/") {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	if h.Config == nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}

	// Get music folder from active profile
	profile, err := h.Config.GetActiveProfile()
	if err != nil || profile.MusicFolder == "" {
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}

	relativePath := strings.TrimPrefix(r.URL.Path, "/audio")
	relativePath = strings.TrimPrefix(relativePath, "/")
	relativePath = strings.TrimPrefix(relativePath, "\\")
	relativePath = filepath.Clean(relativePath)

	filePath := filepath.Join(profile.MusicFolder, relativePath)

	rel, err := filepath.Rel(profile.MusicFolder, filePath)
	if err != nil || rel == "." || strings.HasPrefix(rel, "..") || strings.HasPrefix(filepath.ToSlash(rel), "../") {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	http.ServeFile(w, r, filePath)
}
