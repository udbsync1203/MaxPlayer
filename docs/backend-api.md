# Backend API

Методы экспортируются Wails и доступны на фронте через `wailsjs/go/main/App`.

## Методы

### `Hello() string`

Тестовый метод для проверки соединения.

### `SetMusicFolder(path string)`

- нормализует путь
- валидирует, что это существующая директория
- сохраняет путь в `config.json`

Если путь невалиден, метод просто пишет в лог и не меняет конфигурацию.

### `GetMusicFolder() string`

Возвращает текущий путь к папке с музыкой из конфига.

### `GetPlaylists() ([]Playlist, error)`

Возвращает список подпапок внутри `MusicFolder`.

### `ScanAudioFiles(playlistName string) ([]AudioFile, error)`

Сканирует `<MusicFolder>/<playlistName>` и возвращает список файлов `.mp3` и `.wav`.

## Модели

```ts
type AudioFile = {
  path: string
  title: string
  artist: string
  coverBase64: string
}

type Playlist = {
  name: string
  path: string
}
```

## Пример использования (frontend)

```js
import { GetPlaylists, ScanAudioFiles } from "../wailsjs/go/main/App";

const playlists = await GetPlaylists();
const files = await ScanAudioFiles(playlists[0].name);
```
