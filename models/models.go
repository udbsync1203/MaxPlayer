package models

type AudioFile struct {
	Path        string `json:"path"`
	Title       string `json:"title"`
	Artist      string `json:"artist"`
	CoverBase64 string `json:"coverBase64"`
}

type Playlist struct {
	Name string `json:"name"`
	Path string `json:"path"`
}
