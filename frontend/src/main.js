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
const stopBtn = document.getElementById("stopBtn");
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
let isShowingFavorites = false;

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

// Выпадающий список скорости
const speedSelect = document.getElementById('playbackSpeedSelect');
if (speedSelect) {
  speedSelect.addEventListener('change', (e) => {
    audio.playbackRate = parseFloat(e.target.value);
  });
}
audio.playbackRate = 1;

// Все горячие клавиши
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
    return;
  }
  
  switch(e.code) {
    case 'Space':
      e.preventDefault();
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
      prevTrack();
      break;
      
    case 'ArrowRight':
      e.preventDefault();
      nextTrack();
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      audio.volume = Math.min(1, audio.volume + 0.05);
      if (volumeSlider) volumeSlider.value = audio.volume;
      break;
      
    case 'ArrowDown':
      e.preventDefault();
      audio.volume = Math.max(0, audio.volume - 0.05);
      if (volumeSlider) volumeSlider.value = audio.volume;
      break;
  }
});

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
    if (pl.name !== 'Favorites') {
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
      el.appendChild(addBtn);
    }
    
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
          await loadPlaylists();
          if (currentPlaylist === pl.name) {
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
    
    nameSpan.addEventListener('click', () => {
      selectPlaylist(pl.name, el);
      if (isShowingFavorites) {
        isShowingFavorites = false;
        const favBtn = document.getElementById('showFavoritesBtn');
        if (favBtn) favBtn.textContent = '⭐ Избранное';
      }
    });
    
    el.appendChild(nameSpan);
    playlistsEl.appendChild(el);
    
    if (index === 0 && !currentPlaylist) {
      selectPlaylist(pl.name, el);
    }
  });
}

async function selectPlaylist(name, element) {
  currentPlaylist = name;
  document.querySelectorAll(".playlist").forEach((el) => el.classList.remove("playlist--active"));
  if (element) element.classList.add("playlist--active");
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

// Функция для отображения кнопки "Избранное" у каждого трека
function addFavoriteButtonToTrack(trackDiv, track, index) {
  const favoriteBtn = document.createElement('button');
  favoriteBtn.className = 'favorite-btn';
  favoriteBtn.innerHTML = '☆';
  favoriteBtn.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;padding:0 8px;';
  
  // Проверить, в избранном ли трек
  (async () => {
    try {
      const isFav = await IsFavorite(track.path);
      favoriteBtn.innerHTML = isFav ? '★' : '☆';
    } catch(e) { console.error(e); }
  })();
  
  favoriteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const isFav = await IsFavorite(track.path);
      if (isFav) {
        await RemoveFromFavorites(track.path);
        favoriteBtn.innerHTML = '☆';
        if (isShowingFavorites) trackDiv.remove();
      } else {
        await AddToFavorites(track.path);
        favoriteBtn.innerHTML = '★';
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось изменить статус избранного');
    }
  });
  
  trackDiv.appendChild(favoriteBtn);
}

function createTrack(track, index) {
  const div = document.createElement('div');
  div.className = 'track';

  const img = document.createElement('img');
  img.className = 'track__cover';
  img.src = track.coverBase64
    ? `data:image/jpeg;base64,${track.coverBase64}`
    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='%23cccccc'%3E%3Crect width='24' height='24' rx='4' fill='%23dddddd'/%3E%3Cpath fill='%23999' d='M12 5v14l8-7z'/%3E%3C/svg%3E";

  const info = document.createElement('div');
  info.className = 'track__info';

  const title = document.createElement('div');
  title.className = 'track__title';
  title.textContent = track.title || 'Без названия';

  const artist = document.createElement('div');
  artist.className = 'track__artist';
  artist.textContent = track.artist || 'Неизвестный исполнитель';

  info.appendChild(title);
  info.appendChild(artist);
  div.appendChild(img);
  div.appendChild(info);
  
  // Кнопка избранного
  addFavoriteButtonToTrack(div, track, index);

  // Кнопка удаления трека (кроме Favorites)
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

  div.addEventListener('click', (e) => {
    if (e.target === div.querySelector('.favorite-btn') || 
        div.querySelector('.favorite-btn')?.contains(e.target)) {
      return;
    }
    playTrack(index);
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
  audio.play().catch((err) => console.error("Ошибка воспроизведения:", err));

  if (nowPlaying) {
    nowPlaying.textContent = `${track.title} - ${track.artist}`;
  }
  updateNowPlayingPanel(track);
  updatePlayButton();
}

function updatePlayButton() {
  if (playBtn) playBtn.textContent = audio.paused ? "▶" : "⏸";
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

if (stopBtn) {
  stopBtn.addEventListener("click", () => {
    audio.pause();
    audio.currentTime = 0;
    updatePlayButton();
  });
}

nextBtn.addEventListener("click", () => nextTrack());
prevBtn.addEventListener("click", () => prevTrack());

function nextTrack() {
  if (!currentTracks.length) return;
  currentTrackIndex = (currentTrackIndex + 1) % currentTracks.length;
  playTrack(currentTrackIndex);
}

function prevTrack() {
  if (!currentTracks.length) return;
  currentTrackIndex = (currentTrackIndex - 1 + currentTracks.length) % currentTracks.length;
  playTrack(currentTrackIndex);
}

audio.addEventListener("play", updatePlayButton);
audio.addEventListener("pause", updatePlayButton);
audio.addEventListener("ended", () => nextTrack());

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  if (progressFill) progressFill.style.width = percent + "%";
});

if (progressBar) {
  progressBar.addEventListener("click", (e) => {
    if (!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
  });
}

audio.addEventListener("loadedmetadata", () => {
  if (currentTrackIndex >= 0 && currentTracks[currentTrackIndex]) {
    updateNowPlayingPanel(currentTracks[currentTrackIndex]);
  }
});

// ========== ПОИСК ТРЕКОВ ==========
const searchInput = document.getElementById('searchInput');
const searchResultsDiv = document.getElementById('searchResults');
const clearSearchBtn = document.getElementById('clearSearchBtn');
let searchTimeoutId = null;

function clearSearch() {
  if (searchInput) searchInput.value = '';
  if (searchResultsDiv) searchResultsDiv.innerHTML = '';
  if (clearSearchBtn) clearSearchBtn.style.display = 'none';
  if (tracksEl) tracksEl.style.display = 'block';
}

async function playTrackByPath(trackPath) {
  let trackIndex = currentTracks.findIndex(t => t.path === trackPath);
  if (trackIndex !== -1) {
    playTrack(trackIndex);
  } else {
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

async function performSearch(query) {
  if (!query || query.trim() === '') {
    clearSearch();
    return;
  }
  
  try {
    searchResultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">🔍 Поиск...</div>';
    if (tracksEl) tracksEl.style.display = 'none';
    if (clearSearchBtn) clearSearchBtn.style.display = 'block';
    
    const results = await SearchTracks(query);
    
    if (!results || results.length === 0) {
      searchResultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: #999;">🎵 Ничего не найдено для "${query}"</div>`;
      return;
    }
    
    searchResultsDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #4caf50;">
        <h3 style="margin: 0; color: #333;">🔍 Результаты поиска (${results.length})</h3>
      </div>
    `;
    
    results.forEach((track) => {
      const trackDiv = document.createElement('div');
      trackDiv.className = 'track';
      trackDiv.style.cursor = 'pointer';
      
      const coverImg = document.createElement('img');
      coverImg.className = 'track__cover';
      coverImg.src = track.coverBase64 ? `data:image/jpeg;base64,${track.coverBase64}` : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='%23cccccc'%3E%3Crect width='24' height='24' rx='4' fill='%23dddddd'/%3E%3Cpath fill='%23999' d='M12 5v14l8-7z'/%3E%3C/svg%3E";
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'track__info';
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'track__title';
      titleDiv.textContent = track.title || 'Без названия';
      
      const artistDiv = document.createElement('div');
      artistDiv.className = 'track__artist';
      artistDiv.textContent = track.artist || 'Неизвестный исполнитель';
      
      infoDiv.appendChild(titleDiv);
      infoDiv.appendChild(artistDiv);
      trackDiv.appendChild(coverImg);
      trackDiv.appendChild(infoDiv);
      
      trackDiv.addEventListener('click', () => playTrackByPath(track.path));
      
      searchResultsDiv.appendChild(trackDiv);
    });
    
  } catch (error) {
    console.error('Ошибка поиска:', error);
    searchResultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: #f44336;">❌ Ошибка при выполнении поиска</div>`;
  }
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    if (searchTimeoutId) clearTimeout(searchTimeoutId);
    searchTimeoutId = setTimeout(() => performSearch(e.target.value), 300);
  });
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener('click', () => {
    clearSearch();
    if (currentPlaylist) loadTracks(currentPlaylist);
  });
}

// ========== СОЗДАНИЕ ПЛЕЙЛИСТА (МОДАЛЬНОЕ ОКНО) ==========
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const createPlaylistModal = document.getElementById('createPlaylistModal');
const newPlaylistNameInput = document.getElementById('newPlaylistName');
const cancelPlaylistBtn = document.getElementById('cancelPlaylistBtn');
const confirmPlaylistBtn = document.getElementById('confirmPlaylistBtn');

if (createPlaylistBtn) {
  createPlaylistBtn.addEventListener('click', () => {
    if (createPlaylistModal) createPlaylistModal.style.display = 'flex';
    if (newPlaylistNameInput) newPlaylistNameInput.value = '';
  });
}

if (cancelPlaylistBtn) {
  cancelPlaylistBtn.addEventListener('click', () => {
    if (createPlaylistModal) createPlaylistModal.style.display = 'none';
  });
}

if (createPlaylistModal) {
  createPlaylistModal.addEventListener('click', (e) => {
    if (e.target === createPlaylistModal) createPlaylistModal.style.display = 'none';
  });
}

if (confirmPlaylistBtn) {
  confirmPlaylistBtn.addEventListener('click', async () => {
    const name = newPlaylistNameInput?.value.trim();
    if (!name) {
      alert('Введите название плейлиста');
      return;
    }
    try {
      confirmPlaylistBtn.disabled = true;
      confirmPlaylistBtn.textContent = 'Создание...';
      await CreatePlaylist(name);
      if (createPlaylistModal) createPlaylistModal.style.display = 'none';
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

// ========== ИЗБРАННОЕ (КНОПКА ПОКАЗА) ==========
const showFavoritesBtn = document.getElementById('showFavoritesBtn');

if (showFavoritesBtn) {
  showFavoritesBtn.addEventListener('click', async () => {
    try {
      showFavoritesBtn.disabled = true;
      showFavoritesBtn.textContent = '⏳ Загрузка...';
      
      const favoritesTracks = await GetFavoritesTracks();
      
      if (isShowingFavorites) {
        if (currentPlaylist) await loadTracks(currentPlaylist);
        showFavoritesBtn.textContent = '⭐ Избранное';
        showFavoritesBtn.style.background = '#ff9800';
        isShowingFavorites = false;
      } else {
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