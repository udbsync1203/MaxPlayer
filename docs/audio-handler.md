# AudioHandler

`AudioHandler` — HTTP‑обработчик, который раздаёт аудиофайлы из папки музыки по пути `/audio/...`.
Фронтенду важно знать только URL‑формат и правила доступа.

## URL‑формат

- Запросы должны начинаться с `/audio/`
- Остальная часть пути — относительный путь к файлу внутри `MusicFolder`

Пример: если `MusicFolder = "/Users/you/Music"`, то файл
`/Users/you/Music/playlist/track.mp3` будет доступен по URL:

```
/audio/playlist/track.mp3
```

## Важные правила

- Если `MusicFolder` пустой или `Config` не задан — вернётся `503`.
- Попытки выйти за пределы `MusicFolder` (например, через `..`) — `403`.
- Запросы без префикса `/audio/` — `404`.

## Минимальный пример подключения

```go
app := NewApp()

err := wails.Run(&options.App{
    AssetServer: &assetserver.Options{
        Assets:  assets,
        Handler: &server.AudioHandler{Config: &app.config},
    },
})
```

## Примеры для фронта

### URL для `<audio>`

```html
<audio controls src="/audio/playlist/track.mp3"></audio>
```

### URL в JavaScript

```js
const src = `/audio/${encodeURI(pathFromBackend)}`;
audio.src = src;
```

### Как получить путь из backend

Метод `ScanAudioFiles` возвращает `AudioFile.path` — это относительный путь.
Его можно напрямую подставлять после `/audio/`.

```js
const files = await ScanAudioFiles("playlist");
const src = `/audio/${encodeURI(files[0].path)}`;
```
