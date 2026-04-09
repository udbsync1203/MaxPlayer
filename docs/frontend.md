# Frontend

## Технологии

- Vite
- Vanilla JS
- стили в `frontend/src/*.css`

## Структура

- `frontend/index.html` — корневой HTML
- `frontend/src/main.js` — входная точка
- `frontend/src/style.css` и `frontend/src/app.css` — стили
- `frontend/wailsjs/` — автогенерируемые биндинги Wails

## Работа с backend

Импортируйте методы так:

```js
import { GetPlaylists, ScanAudioFiles } from "../wailsjs/go/main/App";
```

`wailsjs` генерируется Wails‑ом при сборке/запуске.

## Локальный дев

```bash
cd frontend
npm install
npm run dev
```

В обычном режиме разработки Wails сам запускает dev‑сервер через `wails dev`.
