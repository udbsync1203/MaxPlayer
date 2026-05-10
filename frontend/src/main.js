import {
  GetMusicFolder,
  SetMusicFolder,
  GetPlaylists,
  ScanAudioFiles,
  SelectFolder,
} from "../wailsjs/go/main/App";

const folderPathEl = document.getElementById("folderPath");
const playlistsEl = document.getElementById("playlists");
const tracksEl = document.getElementById("tracks");
const btn = document.getElementById("selectFolderBtn");
const refreshBtn = document.getElementById("refreshBtn");

const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const nowPlaying = document.getElementById("nowPlaying");

// Элементы панели "Сейчас играет"
const nowPlayingCover = document.getElementById("nowPlayingCover");
const nowPlayingTitle = document.getElementById("nowPlayingTitle");
const nowPlayingArtist = document.getElementById("nowPlayingArtist");

let currentPlaylist = null;
let currentTracks = [];
let currentTrackIndex = -1;

const audio = new Audio();

/** Относительный путь из ScanAudioFiles → URL, который отдаёт AudioHandler (см. /audio/...). */
function audioStreamUrl(relativePath) {
  if (!relativePath) return "";
  const parts = String(relativePath)
    .replace(/\\/g, "/")
    .split("/")
    .filter((seg) => seg.length > 0);
  return "/audio/" + parts.map((seg) => encodeURIComponent(seg)).join("/");
}

// Функция обновления панели "Сейчас играет"
function updateNowPlayingPanel(track) {
  if (track && track.title) {
    nowPlayingTitle.textContent = track.title;
    nowPlayingArtist.textContent = track.artist || "Неизвестный исполнитель";
    
    if (track.coverBase64) {
      nowPlayingCover.src = `data:image/jpeg;base64,${track.coverBase64}`;
    } else {
      nowPlayingCover.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='%23cccccc'%3E%3Crect width='24' height='24' rx='4' fill='%23dddddd'/%3E%3Cpath fill='%23999' d='M12 5v14l8-7z'/%3E%3C/svg%3E";
    }
  } else {
    nowPlayingTitle.textContent = "Ничего не играет";
    nowPlayingArtist.textContent = "—";
    nowPlayingCover.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='%23cccccc'%3E%3Crect width='24' height='24' rx='4' fill='%23dddddd'/%3E%3Cpath fill='%23999' d='M12 5v14l8-7z'/%3E%3C/svg%3E";
  }
}

// Ползунок громкости
const volumeSlider = document.getElementById('volumeSlider');
if (volumeSlider) {
  audio.volume = 0.8;
  volumeSlider.value = 0.8;
  
  volumeSlider.addEventListener('input', (e) => {
    audio.volume = parseFloat(e.target.value);
  });
}

// Все горячие клавиши
window.addEventListener('keydown', (e) => {
  // Игнорируем ввод в полях ввода
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
    return;
  }
  
  switch(e.code) {
    case 'Space':
      e.preventDefault();
      // Пауза / воспроизведение
      if (audio.src) {
        if (audio.paused) {
          audio.play();
        } else {
          audio.pause();
        }
      } else if (currentTracks && currentTracks.length > 0) {
        playTrack(0);
      }
      break;
      
    case 'ArrowLeft':
      e.preventDefault();
      // Предыдущий трек
      if (typeof prevTrack === 'function') {
        prevTrack();
      }
      break;
      
    case 'ArrowRight':
      e.preventDefault();
      // Следующий трек
      if (typeof nextTrack === 'function') {
        nextTrack();
      }
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      // Увеличить громкость
      audio.volume = Math.min(1, audio.volume + 0.05);
      if (volumeSlider) volumeSlider.value = audio.volume;
      break;
      
    case 'ArrowDown':
      e.preventDefault();
      // Уменьшить громкость
      audio.volume = Math.max(0, audio.volume - 0.05);
      if (volumeSlider) volumeSlider.value = audio.volume;
      break;
  }
});

// Выпадающий список скорости
const speedSelect = document.getElementById('playbackSpeedSelect');
if (speedSelect) {
  speedSelect.addEventListener('change', (e) => {
    audio.playbackRate = parseFloat(e.target.value);
  });
}
audio.playbackRate = 1;

window.addEventListener("DOMContentLoaded", async () => {
  await init();
});

async function init() {
  const folder = await GetMusicFolder();
  folderPathEl.textContent = folder || "не выбрана";
  if (!folder) return;
  await loadPlaylists();
}

btn.addEventListener("click", async () => {
  const path = await SelectFolder();

  if (!path) return;

  await SetMusicFolder(path);
  await init();
});

if (refreshBtn) {
  refreshBtn.addEventListener("click", async () => {
    if (!currentPlaylist) return;
    try {
      await loadTracks(currentPlaylist);
    } catch (e) {
      console.error("Ошибка обновления:", e);
    }
  });
}

async function loadPlaylists() {
  playlistsEl.innerHTML = "Загрузка...";
  const playlists = await GetPlaylists();
  playlistsEl.innerHTML = "";
  playlists.forEach((pl, index) => {
    const el = document.createElement("div");
    el.className = "playlist";
    el.textContent = pl.name;
    el.addEventListener("click", () => {
      selectPlaylist(pl.name, el);
    });
    playlistsEl.appendChild(el);
    if (index === 0) {
      selectPlaylist(pl.name, el);
    }
  });
}

async function selectPlaylist(name, element) {
  currentPlaylist = name;
  document
    .querySelectorAll(".playlist")
    .forEach((el) => el.classList.remove("playlist--active"));

  element.classList.add("playlist--active");
  await loadTracks(name);
}

async function loadTracks(playlistName) {
  tracksEl.innerHTML = "Загрузка...";

  const tracks = await ScanAudioFiles(playlistName);

  currentTracks = tracks;
  renderTracks(tracks);
}

function renderTracks(tracks) {
  tracksEl.innerHTML = "";
  if (!tracks.length) {
    tracksEl.innerHTML = "Нет треков";
    return;
  }

  tracks.forEach((track, index) => {
    const div = createTrack(track, index);
    tracksEl.appendChild(div);
  });
}

function createTrack(track, index) {
  const div = document.createElement("div");
  div.className = "track";

  const img = document.createElement("img");
  img.className = "track__cover";

  img.src = track.coverBase64
    ? `data:image/jpeg;base64,${track.coverBase64}`
    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='4' fill='%23ddd'/%3E%3Cpath fill='%23999' d='M12 5v14l8-7z'/%3E%3C/svg%3E";

  const info = document.createElement("div");
  info.className = "track__info";

  const title = document.createElement("div");
  title.className = "track__title";
  title.textContent = track.title || "Без названия";

  const artist = document.createElement("div");
  artist.className = "track__artist";
  artist.textContent = track.artist || "Неизвестный исполнитель";

  info.appendChild(title);
  info.appendChild(artist);

  div.appendChild(img);
  div.appendChild(info);

  div.addEventListener("click", async () => {
  currentTrackIndex = index;
  await playTrack(currentTrackIndex);
});

  return div;
}

function playTrack(index) {
  if (index < 0 || index >= currentTracks.length) return;

  currentTrackIndex = index;

  const track = currentTracks[index];

  const src = audioStreamUrl(track.path);
  if (!src) {
    console.error("Пустой путь к файлу");
    return;
  }
  audio.src = src;
  audio.play()
    .then(() => {
      updatePlayButton();
    })
    .catch((err) => console.error("Ошибка воспроизведения:", err));

  // Обновляем старую надпись (для совместимости)
  if (nowPlaying) {
    nowPlaying.textContent = `${track.title} - ${track.artist}`;
  }
  
  // Обновляем новую панель "Сейчас играет"
  updateNowPlayingPanel(track);
}

playBtn.addEventListener("click", async () => {
  try {
    if (!audio.src && currentTracks.length > 0) {
      playTrack(0);
      return;
    }

    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  } catch (err) {
    console.error("Ошибка play:", err);
  }
});

nextBtn.addEventListener("click", () => {
  nextTrack();
});

prevBtn.addEventListener("click", () => {
  prevTrack();
});

function nextTrack() {
  if (!currentTracks.length) return;

  currentTrackIndex++;

  if (currentTrackIndex >= currentTracks.length) {
    currentTrackIndex = 0;
  }

  playTrack(currentTrackIndex);
}

function prevTrack() {
  if (!currentTracks.length) return;

  currentTrackIndex--;

  if (currentTrackIndex < 0) {
    currentTrackIndex = currentTracks.length - 1;
  }

  playTrack(currentTrackIndex);
}

// Обновляем кнопку play/pause при событиях аудио
function updatePlayButton() {
  playBtn.textContent = audio.paused ? "▶" : "⏸";
}

audio.addEventListener("play", updatePlayButton);
audio.addEventListener("pause", updatePlayButton);
audio.addEventListener("ended", updatePlayButton);

audio.addEventListener("ended", () => {
  nextTrack();
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;

  const percent = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = percent + "%";
});

// Перемотка по клику
progressBar.addEventListener("click", (e) => {
  if (!audio.duration) return;

  const rect = progressBar.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percent = x / rect.width;

  audio.currentTime = percent * audio.duration;
});

// Обновляем панель при загрузке метаданных
audio.addEventListener("loadedmetadata", () => {
  if (currentTrackIndex >= 0 && currentTracks[currentTrackIndex]) {
    updateNowPlayingPanel(currentTracks[currentTrackIndex]);
  }
});