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
const stopBtn = document.getElementById("stopBtn");
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

refreshBtn.addEventListener("click", async () => {
  if (!currentPlaylist) return;
  try {
    await loadTracks(currentPlaylist);
  } catch (e) {
    console.error("Ошибка обновления:", e);
  }
});

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
    .forEach((el) => el.classList.remove("active"));

  element.classList.add("active");
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
  img.className = "cover";
  img.src = track.coverBase64
    ? `data:image/jpeg;base64,${track.coverBase64}`
    : "";

  const info = document.createElement("div");

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = track.title;

  const artist = document.createElement("div");
  artist.className = "artist";
  artist.textContent = track.artist;

  info.appendChild(title);
  info.appendChild(artist);
  div.appendChild(img);
  div.appendChild(info);

  div.addEventListener("click", () => {
    playTrack(index);
  });

  return div;
}

function playTrack(index) {
  if (index < 0 || index >= currentTracks.length) return;

  currentTrackIndex = index;

  const track = currentTracks[index];

  audio.src = track.path;
  audio.play();

  // Обновляем старую надпись (для совместимости)
  if (nowPlaying) {
    nowPlaying.textContent = `${track.title} - ${track.artist}`;
  }
  
  // Обновляем новую панель "Сейчас играет"
  updateNowPlayingPanel(track);
}

playBtn.addEventListener("click", () => {
  if (audio.src) {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  } else if (currentTracks.length > 0) {
    playTrack(0);
  }
});

stopBtn.addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
  progressFill.style.width = "0%";
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
audio.addEventListener("play", () => {
  playBtn.textContent = "⏸";
});

audio.addEventListener("pause", () => {
  playBtn.textContent = "▶";
});

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

// Поиск треков
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const tracksContainer = document.getElementById('tracks');
let searchTimeout = null;

async function performSearch(query) {
  if (!query.trim()) {
    searchResults.innerHTML = '';
    if (tracksContainer) tracksContainer.style.display = 'block';
    return;
  }
  
  try {
    searchResults.innerHTML = '<div style="text-align:center;padding:20px;">🔍 Поиск...</div>';
    if (tracksContainer) tracksContainer.style.display = 'none';
    
    const results = await window.go.main.App.SearchTracks(query);
    
    if (!results || results.length === 0) {
      searchResults.innerHTML = `<div style="text-align:center;padding:20px;color:#999;">Ничего не найдено для "${query}"</div>`;
    } else {
      searchResults.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #4caf50;">
          <h3 style="margin:0;"> Результаты (${results.length})</h3>
          <button onclick="document.getElementById('searchInput').value=''; performSearch('')" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
        </div>
      `;
      
      results.forEach(track => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
          <img class="search-result-cover" src="${track.coverBase64 ? `data:image/jpeg;base64,${track.coverBase64}` : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\' viewBox=\'0 0 24 24\' fill=\'%23cccccc\'%3E%3Crect width=\'24\' height=\'24\' rx=\'4\' fill=\'%23dddddd\'/%3E%3Cpath fill=\'%23999\' d=\'M12 5v14l8-7z\'/%3E%3C/svg%3E'}">
          <div style="flex:1;">
            <div style="font-weight:bold;">${track.title || 'Без названия'}</div>
            <div style="color:#666;font-size:12px;">${track.artist || 'Неизвестный'}</div>
          </div>
        `;
        div.addEventListener('click', () => {
          if (typeof playTrackByPath === 'function') playTrackByPath(track.path);
        });
        searchResults.appendChild(div);
      });
    }
  } catch(e) {
    console.error(e);
    searchResults.innerHTML = '<div style="text-align:center;padding:20px;color:#f44336;">Ошибка поиска</div>';
  }
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => performSearch(e.target.value), 300);
  });
}