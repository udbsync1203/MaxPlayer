import {
  GetMusicFolder,
  SetMusicFolder,
  GetPlaylists,
  ScanAudioFiles,
  SelectFolder,
  CreatePlaylist,
  DeletePlaylist,
  AddTrackToPlaylist,
  RemoveTrackFromPlaylist,
  AddToFavorites,
  RemoveFromFavorites,
  IsFavorite,
  GetFavoritesTracks,
  SearchTracks
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

// ========== ПОИСК ТРЕКОВ (ИСПРАВЛЕННЫЙ) ==========
const searchInput = document.getElementById('searchInput');
const searchResultsDiv = document.getElementById('searchResults');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const tracksContainer = document.getElementById('tracks');
let searchTimeoutId = null;

// Функция очистки поиска
function clearSearch() {
  if (searchInput) searchInput.value = '';
  if (searchResultsDiv) searchResultsDiv.innerHTML = '';
  if (clearSearchBtn) clearSearchBtn.style.display = 'none';
  if (tracksContainer) tracksContainer.style.display = 'block';
}

// Функция воспроизведения трека по пути
async function playTrackByPath(trackPath) {
  // Ищем трек в currentTracks
  let trackIndex = currentTracks.findIndex(t => t.path === trackPath);
  
  if (trackIndex !== -1) {
    playTrack(trackIndex);
  } else {
    // Если трек не в текущем плейлисте, пробуем загрузить его отдельно
    try {
      audio.src = trackPath;
      audio.play();
      const fileName = trackPath.split('/').pop();
      if (nowPlaying) nowPlaying.textContent = fileName;
      if (nowPlayingTitle) nowPlayingTitle.textContent = fileName;
    } catch (error) {
      console.error('Ошибка воспроизведения:', error);
    }
  }
}

// Функция выполнения поиска
async function performSearch(query) {
  if (!query || query.trim() === '') {
    clearSearch();
    return;
  }
  
  try {
    // Показываем индикатор загрузки
    searchResultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">🔍 Поиск...</div>';
    if (tracksContainer) tracksContainer.style.display = 'none';
    if (clearSearchBtn) clearSearchBtn.style.display = 'block';
    
    // Выполняем поиск через Wails
    const results = await SearchTracks(query);
    
    if (!results || results.length === 0) {
      searchResultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: #999;">🎵 Ничего не найдено для "${query}"</div>`;
      return;
    }
    
    // Отображаем результаты
    searchResultsDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #4caf50;">
        <h3 style="margin: 0; color: #333;">🔍 Результаты поиска (${results.length})</h3>
      </div>
    `;
    
    // Добавляем каждый трек
    results.forEach((track, idx) => {
      const trackDiv = document.createElement('div');
      trackDiv.className = 'track';
      trackDiv.style.cursor = 'pointer';
      trackDiv.style.display = 'flex';
      trackDiv.style.alignItems = 'center';
      trackDiv.style.gap = '15px';
      trackDiv.style.padding = '12px';
      trackDiv.style.background = '#fff';
      trackDiv.style.borderRadius = '12px';
      trackDiv.style.marginBottom = '10px';
      trackDiv.style.transition = '0.2s';
      
      // Обложка
      const coverImg = document.createElement('img');
      coverImg.className = 'cover';
      coverImg.style.width = '50px';
      coverImg.style.height = '50px';
      coverImg.style.borderRadius = '10px';
      coverImg.style.objectFit = 'cover';
      coverImg.src = track.coverBase64 ? `data:image/jpeg;base64,${track.coverBase64}` : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\' viewBox=\'0 0 24 24\' fill=\'%23cccccc\'%3E%3Crect width=\'24\' height=\'24\' rx=\'4\' fill=\'%23dddddd\'/%3E%3Cpath fill=\'%23999\' d=\'M12 5v14l8-7z\'/%3E%3C/svg%3E';
      
      // Информация
      const infoDiv = document.createElement('div');
      infoDiv.style.flex = '1';
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'title';
      titleDiv.style.fontWeight = 'bold';
      titleDiv.style.color = '#222';
      titleDiv.textContent = track.title || 'Без названия';
      
      const artistDiv = document.createElement('div');
      artistDiv.className = 'artist';
      artistDiv.style.color = '#666';
      artistDiv.style.fontSize = '14px';
      artistDiv.textContent = track.artist || 'Неизвестный исполнитель';
      
      infoDiv.appendChild(titleDiv);
      infoDiv.appendChild(artistDiv);
      trackDiv.appendChild(coverImg);
      trackDiv.appendChild(infoDiv);
      
      // Кнопка воспроизведения (▶)
      const playIcon = document.createElement('button');
      playIcon.innerHTML = '▶';
      playIcon.style.cssText = `
        background: #4caf50;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        color: white;
        font-size: 14px;
        cursor: pointer;
        transition: 0.2s;
      `;
      playIcon.addEventListener('mouseenter', () => playIcon.style.transform = 'scale(1.05)');
      playIcon.addEventListener('mouseleave', () => playIcon.style.transform = 'scale(1)');
      
      playIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        playTrackByPath(track.path);
      });
      
      trackDiv.appendChild(playIcon);
      
      // Клик по всему треку тоже воспроизводит
      trackDiv.addEventListener('click', () => {
        playTrackByPath(track.path);
      });
      
      trackDiv.addEventListener('mouseenter', () => {
        trackDiv.style.transform = 'translateY(-2px)';
        trackDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)';
      });
      trackDiv.addEventListener('mouseleave', () => {
        trackDiv.style.transform = 'translateY(0)';
        trackDiv.style.boxShadow = 'none';
      });
      
      searchResultsDiv.appendChild(trackDiv);
    });
    
  } catch (error) {
    console.error('Ошибка поиска:', error);
    searchResultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: #f44336;">❌ Ошибка при выполнении поиска: ${error}</div>`;
  }
}

// Обработчик ввода с debounce
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    if (searchTimeoutId) clearTimeout(searchTimeoutId);
    const query = e.target.value;
    searchTimeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);
  });
}

// Кнопка очистки
if (clearSearchBtn) {
  clearSearchBtn.addEventListener('click', () => {
    clearSearch();
    if (searchInput) searchInput.value = '';
    // Возвращаемся к текущему плейлисту
    if (currentPlaylist) {
      loadTracks(currentPlaylist);
    }
  });
}

// ========== ИМПОРТ МЕТОДОВ ДЛЯ ПЛЕЙЛИСТОВ И ИЗБРАННОГО ==========
import { 
  CreatePlaylist, 
  DeletePlaylist, 
  RenamePlaylist,
  AddTrackToPlaylist,
  RemoveTrackFromPlaylist 
} from '../wailsjs/go/main/App';

import { 
  AddToFavorites, 
  RemoveFromFavorites, 
  IsFavorite,
  GetFavoritesTracks 
} from '../wailsjs/go/main/App';

// ========== СОЗДАНИЕ ПЛЕЙЛИСТА ==========
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const createPlaylistModal = document.getElementById('createPlaylistModal');
const newPlaylistName = document.getElementById('newPlaylistName');
const cancelPlaylistBtn = document.getElementById('cancelPlaylistBtn');
const confirmPlaylistBtn = document.getElementById('confirmPlaylistBtn');

// Открыть модальное окно
if (createPlaylistBtn) {
  createPlaylistBtn.addEventListener('click', () => {
    createPlaylistModal.style.display = 'flex';
    newPlaylistName.value = '';
    newPlaylistName.focus();
  });
}

// Закрыть модальное окно
if (cancelPlaylistBtn) {
  cancelPlaylistBtn.addEventListener('click', () => {
    createPlaylistModal.style.display = 'none';
  });
}

// Закрыть по клику вне окна
if (createPlaylistModal) {
  createPlaylistModal.addEventListener('click', (e) => {
    if (e.target === createPlaylistModal) {
      createPlaylistModal.style.display = 'none';
    }
  });
}

// Создать плейлист
if (confirmPlaylistBtn) {
  confirmPlaylistBtn.addEventListener('click', async () => {
    const name = newPlaylistName.value.trim();
    
    if (!name) {
      alert('Введите название плейлиста');
      return;
    }
    
    try {
      confirmPlaylistBtn.disabled = true;
      confirmPlaylistBtn.textContent = 'Создание...';
      
      await CreatePlaylist(name);
      
      // Закрыть модальное окно
      createPlaylistModal.style.display = 'none';
      
      // Перезагрузить список плейлистов
      await loadPlaylists();
      
    } catch (error) {
      console.error('Ошибка создания плейлиста:', error);
      alert('Ошибка: ' + error);
    } finally {
      confirmPlaylistBtn.disabled = false;
      confirmPlaylistBtn.textContent = 'Создать';
    }
  });
}

// ========== ИЗБРАННОЕ ==========
const showFavoritesBtn = document.getElementById('showFavoritesBtn');
let isShowingFavorites = false;

// Показать избранные треки
if (showFavoritesBtn) {
  showFavoritesBtn.addEventListener('click', async () => {
    try {
      showFavoritesBtn.disabled = true;
      showFavoritesBtn.textContent = '⏳ Загрузка...';
      
      const favoritesTracks = await GetFavoritesTracks();
      
      if (isShowingFavorites) {
        // Если уже показываем избранное - вернуться к текущему плейлисту
        if (currentPlaylist) {
          await loadTracks(currentPlaylist);
        }
        showFavoritesBtn.textContent = '⭐ Избранное';
        showFavoritesBtn.style.background = '#ff9800';
        isShowingFavorites = false;
      } else {
        // Показать избранное
        renderTracks(favoritesTracks);
        showFavoritesBtn.textContent = '📋 Все треки';
        showFavoritesBtn.style.background = '#4caf50';
        isShowingFavorites = true;
      }
      
    } catch (error) {
      console.error('Ошибка загрузки избранного:', error);
      alert('Ошибка загрузки избранного: ' + error);
    } finally {
      showFavoritesBtn.disabled = false;
    }
  });
}

// Функция для отображения кнопки "Избранное" у каждого трека
function addFavoriteButtonToTrack(trackDiv, track, index) {
  const favoriteBtn = document.createElement('button');
  favoriteBtn.className = 'favorite-btn';
  favoriteBtn.innerHTML = '☆';
  
  // Проверить, в избранном ли трек
  checkFavoriteStatus(track.path, favoriteBtn, track);
  
  favoriteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    try {
      const isFav = await IsFavorite(track.path);
      
      if (isFav) {
        await RemoveFromFavorites(track.path);
        favoriteBtn.innerHTML = '☆';
        favoriteBtn.classList.remove('active');
        favoriteBtn.classList.add('inactive');
        
        // Если сейчас показываем избранное - удаляем трек из списка
        if (isShowingFavorites) {
          trackDiv.remove();
        }
      } else {
        await AddToFavorites(track.path);
        favoriteBtn.innerHTML = '★';
        favoriteBtn.classList.add('active');
        favoriteBtn.classList.remove('inactive');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось изменить статус избранного');
    }
  });
  
  trackDiv.appendChild(favoriteBtn);
}

// Проверка статуса избранного
async function checkFavoriteStatus(trackPath, btnElement, track) {
  try {
    const isFav = await IsFavorite(trackPath);
    if (isFav) {
      btnElement.innerHTML = '★';
      btnElement.classList.add('active');
      btnElement.classList.remove('inactive');
    } else {
      btnElement.innerHTML = '☆';
      btnElement.classList.add('inactive');
      btnElement.classList.remove('active');
    }
  } catch (error) {
    console.error('Ошибка проверки избранного:', error);
  }
}

function createTrack(track, index) {
  const div = document.createElement('div');
  div.className = 'track';

  const img = document.createElement('img');
  img.className = 'cover';
  img.src = track.coverBase64
    ? `data:image/jpeg;base64,${track.coverBase64}`
    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='%23cccccc'%3E%3Crect width='24' height='24' rx='4' fill='%23dddddd'/%3E%3Cpath fill='%23999' d='M12 5v14l8-7z'/%3E%3C/svg%3E";

  const info = document.createElement('div');
  info.style.flex = '1';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = track.title;

  const artist = document.createElement('div');
  artist.className = 'artist';
  artist.textContent = track.artist;

  info.appendChild(title);
  info.appendChild(artist);
  div.appendChild(img);
  div.appendChild(info);
  
  // Добавляем кнопку избранного (уже есть)
  addFavoriteButtonToTrack(div, track, index);

  // ========== КНОПКА УДАЛЕНИЯ ТРЕКА 🗑️ ==========
  if (currentPlaylist !== 'Favorites') {
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.style.cssText = 'background:none;border:none;font-size:18px;cursor:pointer;padding:0 8px;opacity:0.5;';
    deleteBtn.title = 'Удалить трек (в корзину)';
    
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Удалить трек "${track.title}" в корзину?`)) return;
      
      try {
        deleteBtn.innerHTML = '⏳';
        const fileName = track.path.split('/').pop();
        const trackPath = `${currentPlaylist}/${fileName}`;
        await RemoveTrackFromPlaylist(currentPlaylist, trackPath);
        div.remove();
      } catch (error) {
        alert('Ошибка удаления: ' + error);
      } finally {
        deleteBtn.innerHTML = '🗑️';
      }
    });
    
    div.appendChild(deleteBtn);
  }

  // ========== КОНЕЦ НОВОГО ==========

  div.addEventListener('click', (e) => {
    if (e.target === div.querySelector('.favorite-btn') || 
        div.querySelector('.favorite-btn')?.contains(e.target)) {
      return;
    }
    playTrack(index);
  });

  return div;
}

// Обновляем renderTracks чтобы использовать новую функцию
if (typeof renderTracks === 'function') {
  const originalRenderTracks = renderTracks;
  window.renderTracks = function(tracks) {
    const tracksContainer = document.getElementById('tracks');
    if (!tracksContainer) return;
    
    tracksContainer.innerHTML = '';
    if (!tracks.length) {
      tracksContainer.innerHTML = 'Нет треков';
      return;
    }

    tracks.forEach((track, index) => {
      const div = createTrack(track, index);
      tracksContainer.appendChild(div);
    });
  };
}

// Функция для обновления списка плейлистов (добавляем контекстное меню для удаления)
async function loadPlaylistsWithContextMenu() {
  const playlistsEl = document.getElementById('playlists');
  if (!playlistsEl) return;
  
  playlistsEl.innerHTML = 'Загрузка...';
  const playlists = await GetPlaylists();
  playlistsEl.innerHTML = '';
  
  playlists.forEach((pl, index) => {
    const el = document.createElement('div');
    el.className = 'playlist';
    el.textContent = pl.name;
    
    // ПКМ для удаления плейлиста
    el.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      if (pl.name === 'Favorites') {
        alert('Нельзя удалить системный плейлист "Favorites"');
        return;
      }
      
      const confirmDelete = confirm(`Удалить плейлист "${pl.name}"?`);
      if (confirmDelete) {
        try {
          await DeletePlaylist(pl.name);
          await loadPlaylistsWithContextMenu();
          if (currentPlaylist === pl.name) {
            // Если удалили текущий плейлист, выбираем первый доступный
            const newPlaylists = await GetPlaylists();
            if (newPlaylists.length > 0) {
              selectPlaylist(newPlaylists[0].name, document.querySelector('.playlist'));
            }
          }
        } catch (error) {
          console.error('Ошибка удаления:', error);
          alert('Ошибка удаления: ' + error);
        }
      }
    });
    
    el.addEventListener('click', () => {
      selectPlaylist(pl.name, el);
      // Сбрасываем режим избранного
      if (isShowingFavorites) {
        isShowingFavorites = false;
        const favBtn = document.getElementById('showFavoritesBtn');
        if (favBtn) {
          favBtn.textContent = '⭐ Избранное';
          favBtn.style.background = '#ff9800';
        }
      }
    });
    
    playlistsEl.appendChild(el);
    if (index === 0 && !currentPlaylist) {
      selectPlaylist(pl.name, el);
    }
  });
}

// Заменяем существующую функцию loadPlaylists на новую
async function loadPlaylistsWithContextMenu() {
  const playlistsEl = document.getElementById('playlists');
  if (!playlistsEl) return;
  
  playlistsEl.innerHTML = 'Загрузка...';
  const playlists = await GetPlaylists();
  playlistsEl.innerHTML = '';
  
  playlists.forEach((pl, index) => {
    const el = document.createElement('div');
    el.className = 'playlist';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'space-between';
    
    // Название
    const nameSpan = document.createElement('span');
    nameSpan.textContent = pl.name;
    nameSpan.style.flex = '1';
    nameSpan.style.cursor = 'pointer';
    
    // Кнопка "+" для добавления треков (кроме Favorites)
    const addBtn = document.createElement('button');
    addBtn.textContent = '➕';
    addBtn.style.cssText = 'background:none;border:none;font-size:16px;cursor:pointer;padding:0 8px;';
    addBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await AddTrackToPlaylist(pl.name);
        if (currentPlaylist === pl.name) await loadTracks(currentPlaylist);
      } catch(err) { alert('Ошибка: ' + err); }
    });
    
    // ПКМ удаление
    el.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      if (pl.name === 'Favorites') { alert('Нельзя удалить Favorites'); return; }
      if (confirm(`Удалить "${pl.name}"?`)) {
        await DeletePlaylist(pl.name);
        await loadPlaylistsWithContextMenu();
      }
    });
    
    nameSpan.addEventListener('click', () => {
      selectPlaylist(pl.name, el);
      if (isShowingFavorites) {
        isShowingFavorites = false;
        const favBtn = document.getElementById('showFavoritesBtn');
        if (favBtn) favBtn.textContent = '⭐ Избранное';
      }
    });
    
    el.appendChild(nameSpan);
    if (pl.name !== 'Favorites') el.appendChild(addBtn);
    playlistsEl.appendChild(el);
    
    if (index === 0 && !currentPlaylist) selectPlaylist(pl.name, el);
  });
}