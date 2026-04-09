package main

import (
	"net/http"
	"path/filepath"
	"strings"
)

type FileHandler struct {
	Config *Config
}

func (h *FileHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.URL.Path, "/audio/") {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	relativePath := strings.TrimPrefix(r.URL.Path, "/audio")
	filePath := filepath.Join(h.Config.MusicFolder, relativePath)

	if !strings.HasPrefix(filePath, h.Config.MusicFolder) {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	http.ServeFile(w, r, filePath)
}
