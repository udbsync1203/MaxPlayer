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
  // Используем новую функцию с контекстным меню
  await loadPlaylistsWithContextMenu();
}

async function selectPlaylist(name, element) {
  currentPlaylist = name;
  document
    .querySelectorAll(".playlist")
    .forEach((el) => el.classList.remove("playlist--active"));

  element.classList.add("playlist--active");
  await loadTracks(name);

  // Скрыть/показать кнопку добавления треков
  const addTracksBtn = document.getElementById('addTracksBtn');
  if (addTracksBtn) {
    addTracksBtn.style.display = name === 'Favorites' ? 'none' : 'block';
  }
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
async function playTrackByPath(track) {
  // Ищем трек в currentTracks
  let trackIndex = currentTracks.findIndex(t => t.path === track.path);

  if (trackIndex !== -1) {
    playTrack(trackIndex);
  } else {
    // Если трек не в текущем плейлисте, воспроизводим его напрямую
    try {
      const src = audioStreamUrl(track.path);
      if (!src) {
        console.error("Пустой путь к файлу");
        return;
      }
      audio.src = src;
      await audio.play();

      // Обновляем информацию о треке
      if (nowPlaying) {
        nowPlaying.textContent = `${track.title} - ${track.artist}`;
      }
      updateNowPlayingPanel(track);
      updatePlayButton();
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
        playTrackByPath(track);
      });

      trackDiv.appendChild(playIcon);

      // Клик по всему треку тоже воспроизводит
      trackDiv.addEventListener('click', () => {
        playTrackByPath(track);
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

// ========== ДОБАВЛЕНИЕ ТРЕКОВ В ПЛЕЙЛИСТ ==========
const addTracksBtn = document.getElementById('addTracksBtn');
if (addTracksBtn) {
  addTracksBtn.addEventListener('click', async () => {
    if (!currentPlaylist) {
      alert('Сначала выберите плейлист');
      return;
    }

    if (currentPlaylist === 'Favorites') {
      alert('Используйте кнопку "★" для добавления треков в избранное');
      return;
    }

    try {
      addTracksBtn.disabled = true;
      addTracksBtn.textContent = 'Выбор файлов...';

      await AddTrackToPlaylist(currentPlaylist);

      // Перезагрузить треки текущего плейлиста
      await loadTracks(currentPlaylist);

    } catch (error) {
      console.error('Ошибка добавления треков:', error);
      alert('Ошибка: ' + error);
    } finally {
      addTracksBtn.disabled = false;
      addTracksBtn.textContent = '+ Добавить треки';
    }
  });
}

// ========== ОБНОВЛЕНИЕ СПИСКА ПЛЕЙЛИСТОВ ==========
const refreshPlaylistsBtn = document.getElementById('refreshPlaylistsBtn');
if (refreshPlaylistsBtn) {
  refreshPlaylistsBtn.addEventListener('click', async () => {
    try {
      refreshPlaylistsBtn.disabled = true;
      refreshPlaylistsBtn.textContent = '⏳';
      await loadPlaylists();
    } catch (error) {
      console.error('Ошибка обновления плейлистов:', error);
      alert('Ошибка: ' + error);
    } finally {
      refreshPlaylistsBtn.disabled = false;
      refreshPlaylistsBtn.textContent = '🔄 Обновить';
    }
  });
}


// Функция для отображения кнопки "Избранное" у каждого трека
function addFavoriteButtonToTrack(trackDiv, track, index) {
  const favoriteBtn = document.createElement('button');
  favoriteBtn.className = 'favorite-btn';
  favoriteBtn.textContent = '☆';
  favoriteBtn.style.cssText = 'background:none;border:2px solid #ff9800;width:32px;height:32px;border-radius:50%;color:#ff9800;font-size:18px;cursor:pointer;padding:0;transition:0.2s;line-height:1;';
  favoriteBtn.title = 'Добавить в избранное';

  // Проверить, в избранном ли трек
  checkFavoriteStatus(track.path, favoriteBtn, track);

  favoriteBtn.addEventListener('mouseenter', () => {
    favoriteBtn.style.transform = 'scale(1.1)';
  });
  favoriteBtn.addEventListener('mouseleave', () => {
    favoriteBtn.style.transform = 'scale(1)';
  });

  favoriteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();

    try {
      const isFav = await IsFavorite(track.path);

      if (isFav) {
        await RemoveFromFavorites(track.path);
        favoriteBtn.textContent = '☆';
        favoriteBtn.style.background = 'none';
        favoriteBtn.style.border = '2px solid #ff9800';
        favoriteBtn.style.color = '#ff9800';
        favoriteBtn.title = 'Добавить в избранное';

        // Если сейчас в плейлисте Favorites - удаляем трек из списка
        if (currentPlaylist === 'Favorites') {
          trackDiv.remove();
        }
      } else {
        await AddToFavorites(track.path);
        favoriteBtn.textContent = '★';
        favoriteBtn.style.background = '#ff9800';
        favoriteBtn.style.border = '2px solid #ff9800';
        favoriteBtn.style.color = 'white';
        favoriteBtn.title = 'Убрать из избранного';
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
      btnElement.textContent = '★';
      btnElement.style.background = '#ff9800';
      btnElement.style.border = '2px solid #ff9800';
      btnElement.style.color = 'white';
      btnElement.title = 'Убрать из избранного';
    } else {
      btnElement.textContent = '☆';
      btnElement.style.background = 'none';
      btnElement.style.border = '2px solid #ff9800';
      btnElement.style.color = '#ff9800';
      btnElement.title = 'Добавить в избранное';
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

  // ========== КНОПКА УДАЛЕНИЯ ТРЕКА ==========
  if (currentPlaylist !== 'Favorites') {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.style.cssText = 'background:#f44336;border:none;width:28px;height:28px;border-radius:50%;color:white;font-size:20px;cursor:pointer;padding:0;opacity:0.7;transition:0.2s;line-height:1;';
    deleteBtn.title = 'Удалить трек (в корзину)';

    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.opacity = '1';
      deleteBtn.style.transform = 'scale(1.1)';
    });
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.opacity = '0.7';
      deleteBtn.style.transform = 'scale(1)';
    });

    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Показываем модальное окно подтверждения
      const modal = document.getElementById('deleteConfirmModal');
      const confirmText = document.getElementById('deleteConfirmText');
      const confirmBtn = document.getElementById('confirmDeleteBtn');
      const cancelBtn = document.getElementById('cancelDeleteBtn');

      confirmText.textContent = `Трек "${track.title}" будет перемещён в корзину.`;
      modal.style.display = 'flex';

      // Обработчик подтверждения
      const handleConfirm = async () => {
        modal.style.display = 'none';
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);

        try {
          deleteBtn.textContent = '...';
          deleteBtn.disabled = true;
          const fileName = track.path.split('/').pop();
          const trackPath = `${currentPlaylist}/${fileName}`;
          await RemoveTrackFromPlaylist(currentPlaylist, trackPath);
          div.remove();
        } catch (error) {
          console.error('Delete error:', error);
          alert('Ошибка удаления: ' + error);
          deleteBtn.textContent = '×';
          deleteBtn.disabled = false;
        }
      };

      // Обработчик отмены
      const handleCancel = () => {
        modal.style.display = 'none';
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);

      // Закрытие по клику вне окна
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          handleCancel();
        }
      });
    });

    div.appendChild(deleteBtn);
  }

  // ========== КОНЕЦ НОВОГО ==========

  div.addEventListener('click', (e) => {
    // Игнорируем клики по кнопкам избранного и удаления
    if (e.target.classList.contains('favorite-btn') ||
        e.target.classList.contains('delete-btn') ||
        e.target.closest('.favorite-btn') ||
        e.target.closest('.delete-btn')) {
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

  // Добавляем Favorites первым, если его еще нет в списке
  const hasFavorites = playlists.some(pl => pl.name === 'Favorites');
  const allPlaylists = hasFavorites
    ? playlists
    : [{ name: 'Favorites', path: 'Favorites' }, ...playlists];

  playlistsEl.innerHTML = '';

  allPlaylists.forEach((pl, index) => {
    const el = document.createElement('div');
    el.className = 'playlist';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'space-between';
    el.style.cursor = 'pointer';
    el.style.padding = '10px';

    // Название
    const nameSpan = document.createElement('span');
    nameSpan.textContent = pl.name;
    nameSpan.style.flex = '1';
    nameSpan.style.pointerEvents = 'none'; // Клик проходит через span к родителю

    // ПКМ удаление
    el.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      if (pl.name === 'Favorites') { alert('Нельзя удалить Favorites'); return; }
      if (confirm(`Удалить "${pl.name}"?`)) {
        await DeletePlaylist(pl.name);
        await loadPlaylistsWithContextMenu();
      }
    });

    // Клик по всему элементу
    el.addEventListener('click', () => {
      selectPlaylist(pl.name, el);
    });

    el.appendChild(nameSpan);
    playlistsEl.appendChild(el);

    if (index === 0 && !currentPlaylist) selectPlaylist(pl.name, el);
  });
}