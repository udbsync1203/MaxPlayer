// ========================================
// Playlists Logic
// ========================================

import {
  GetPlaylists,
  ScanAudioFiles,
  CreatePlaylist,
  DeletePlaylist,
  AddTrackToPlaylist,
  RemoveTrackFromPlaylist,
  AddToFavorites,
  RemoveFromFavorites,
  IsFavorite,
} from '../wailsjs/go/main/App.js';

import { t } from './i18n.js';
import { showModal, hideModal, getDefaultCoverSvg } from './utils.js';
import { playTrack, setCurrentTracks, getCurrentTracks } from './player.js';

// State
let currentPlaylist = null;

// DOM Elements
const playlistsGrid = document.getElementById('playlistsGrid');
const playlistTracks = document.getElementById('playlistTracks');
const currentPlaylistName = document.getElementById('currentPlaylistName');
const tracksContainer = document.getElementById('tracksContainer');
const backToPlaylistsBtn = document.getElementById('backToPlaylists');
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const refreshPlaylistsBtn = document.getElementById('refreshPlaylistsBtn');
const addTracksBtn = document.getElementById('addTracksBtn');
const deletePlaylistBtn = document.getElementById('deletePlaylistBtn');

/**
 * Initialize playlists
 */
export function initPlaylists() {
  // Back to playlists button
  if (backToPlaylistsBtn) {
    backToPlaylistsBtn.addEventListener('click', () => {
      showPlaylistsGrid();
    });
  }

  // Create playlist button
  if (createPlaylistBtn) {
    createPlaylistBtn.addEventListener('click', () => {
      showModal('createPlaylistModal');
      const input = document.getElementById('newPlaylistName');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
  }

  // Refresh playlists button
  if (refreshPlaylistsBtn) {
    refreshPlaylistsBtn.addEventListener('click', async () => {
      try {
        refreshPlaylistsBtn.disabled = true;
        await loadPlaylists();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        refreshPlaylistsBtn.disabled = false;
      }
    });
  }

  // Add tracks button
  if (addTracksBtn) {
    addTracksBtn.addEventListener('click', async () => {
      if (!currentPlaylist) {
        alert(t('choosePlaylistFirst'));
        return;
      }

      if (currentPlaylist === 'Favorites') {
        alert(t('favoritesHint'));
        return;
      }

      try {
        addTracksBtn.disabled = true;
        addTracksBtn.textContent = t('pickingFiles') || 'Выбор файлов...';

        await AddTrackToPlaylist(currentPlaylist);
        await loadPlaylistTracks(currentPlaylist);
      } catch (error) {
        console.error('Add tracks error:', error);
        alert(`${t('genericError')}: ${error}`);
      } finally {
        addTracksBtn.disabled = false;
        addTracksBtn.textContent = t('addTracks');
      }
    });
  }

  // Delete playlist button
  if (deletePlaylistBtn) {
    deletePlaylistBtn.addEventListener('click', async () => {
      if (!currentPlaylist) return;

      if (currentPlaylist === 'Favorites') {
        alert('Нельзя удалить Favorites');
        return;
      }

      const confirmMsg = `${t('deletePlaylistConfirm')} "${currentPlaylist}"?`;
      if (confirm(confirmMsg)) {
        try {
          await DeletePlaylist(currentPlaylist);
          showPlaylistsGrid();
          await loadPlaylists();
        } catch (error) {
          console.error('Delete playlist error:', error);
          alert(`${t('genericError')}: ${error}`);
        }
      }
    });
  }

  // Create playlist modal
  initCreatePlaylistModal();

  // Language change event - reload playlists to update Favorites name
  window.addEventListener('maxplayer:languagechange', () => {
    loadPlaylists();
    if (currentPlaylist) {
      showPlaylistTracksView();
    }
  });
}

/**
 * Load playlists
 */
export async function loadPlaylists() {
  if (!playlistsGrid) return;

  playlistsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-muted);">${t('loading')}</div>`;

  try {
    const playlists = await GetPlaylists();

    // Add Favorites first if not in list
    const hasFavorites = playlists.some(pl => pl.name === 'Favorites');
    const allPlaylists = hasFavorites
      ? playlists
      : [{ name: 'Favorites', path: 'Favorites' }, ...playlists];

    playlistsGrid.innerHTML = '';

    if (allPlaylists.length === 0) {
      playlistsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-muted);">${t('noPlaylists')}</div>`;
      return;
    }

    allPlaylists.forEach((pl) => {
      const card = createPlaylistCard(pl);
      playlistsGrid.appendChild(card);
    });
  } catch (error) {
    console.error('Load playlists error:', error);
    playlistsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--danger);">${t('genericError')}: ${error}</div>`;
  }
}

/**
 * Create playlist card
 */
function createPlaylistCard(playlist) {
  const card = document.createElement('div');
  card.className = 'playlist-card';

  const icon = document.createElement('div');
  icon.className = 'playlist-card-icon';
  icon.textContent = playlist.name === 'Favorites' ? '⭐' : '🎵';

  const name = document.createElement('div');
  name.className = 'playlist-card-name';
  name.textContent = playlist.name === 'Favorites' ? t('favorites') : playlist.name;

  card.appendChild(icon);
  card.appendChild(name);

  card.addEventListener('click', () => {
    selectPlaylist(playlist.name);
  });

  return card;
}

/**
 * Select playlist
 */
async function selectPlaylist(name) {
  currentPlaylist = name;
  await loadPlaylistTracks(name);
  showPlaylistTracksView();
}

/**
 * Load playlist tracks
 */
async function loadPlaylistTracks(playlistName) {
  if (!tracksContainer) return;

  tracksContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">${t('loading')}</div>`;

  try {
    const tracks = await ScanAudioFiles(playlistName);
    setCurrentTracks(tracks);
    renderTracks(tracks);
  } catch (error) {
    console.error('Load tracks error:', error);
    tracksContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--danger);">${t('genericError')}: ${error}</div>`;
  }
}

/**
 * Render tracks
 */
function renderTracks(tracks) {
  if (!tracksContainer) return;

  tracksContainer.innerHTML = '';

  if (!tracks || !tracks.length) {
    tracksContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">${t('noTracks')}</div>`;
    return;
  }

  tracks.forEach((track, index) => {
    const card = createTrackCard(track, index);
    tracksContainer.appendChild(card);
  });
}

/**
 * Create track card
 */
function createTrackCard(track, index) {
  const card = document.createElement('div');
  card.className = 'track-card';

  // Cover
  const cover = document.createElement('img');
  cover.className = 'track-cover';
  cover.src = track.coverBase64
    ? `data:image/jpeg;base64,${track.coverBase64}`
    : getDefaultCoverSvg();

  // Info
  const info = document.createElement('div');
  info.className = 'track-info';

  const title = document.createElement('div');
  title.className = 'track-title';
  title.textContent = track.title || t('noTitle');

  const artist = document.createElement('div');
  artist.className = 'track-artist';
  artist.textContent = track.artist || t('unknownArtist');

  info.appendChild(title);
  info.appendChild(artist);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'track-actions';

  // Favorite button
  const favoriteBtn = createFavoriteButton(track, card);
  actions.appendChild(favoriteBtn);

  // Delete button (not for Favorites playlist)
  if (currentPlaylist !== 'Favorites') {
    const deleteBtn = createDeleteButton(track, card);
    actions.appendChild(deleteBtn);
  }

  card.appendChild(cover);
  card.appendChild(info);
  card.appendChild(actions);

  // Click to play
  card.addEventListener('click', (e) => {
    if (e.target.closest('.track-actions')) return;
    playTrack(index);
  });

  return card;
}

/**
 * Create favorite button
 */
function createFavoriteButton(track, trackCard) {
  const btn = document.createElement('button');
  btn.className = 'track-btn track-btn-favorite';
  btn.textContent = '☆';
  btn.title = 'Добавить в избранное';

  // Check favorite status
  checkFavoriteStatus(track.path, btn);

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();

    try {
      const isFav = await IsFavorite(track.path);

      if (isFav) {
        await RemoveFromFavorites(track.path);
        btn.textContent = '☆';
        btn.classList.remove('active');
        btn.title = 'Добавить в избранное';

        // If in Favorites playlist, remove card
        if (currentPlaylist === 'Favorites') {
          trackCard.remove();
        }
      } else {
        await AddToFavorites(track.path);
        btn.textContent = '★';
        btn.classList.add('active');
        btn.title = 'Убрать из избранного';
      }
    } catch (error) {
      console.error('Favorite error:', error);
      alert('Не удалось изменить статус избранного');
    }
  });

  return btn;
}

/**
 * Check favorite status
 */
async function checkFavoriteStatus(trackPath, btnElement) {
  try {
    const isFav = await IsFavorite(trackPath);
    if (isFav) {
      btnElement.textContent = '★';
      btnElement.classList.add('active');
      btnElement.title = 'Убрать из избранного';
    } else {
      btnElement.textContent = '☆';
      btnElement.classList.remove('active');
      btnElement.title = 'Добавить в избранное';
    }
  } catch (error) {
    console.error('Check favorite error:', error);
  }
}

/**
 * Create delete button
 */
function createDeleteButton(track, trackCard) {
  const btn = document.createElement('button');
  btn.className = 'track-btn track-btn-delete';
  btn.textContent = '×';
  btn.title = 'Удалить трек (в корзину)';

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();

    // Show confirmation modal
    const modal = document.getElementById('deleteConfirmModal');
    const confirmText = document.getElementById('deleteConfirmText');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');

    confirmText.textContent = `Трек "${track.title}" будет перемещён в корзину.`;
    showModal('deleteConfirmModal');

    // Handle confirm
    const handleConfirm = async () => {
      hideModal('deleteConfirmModal');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);

      try {
        btn.textContent = '...';
        btn.disabled = true;
        const fileName = track.path.split('/').pop();
        const trackPath = `${currentPlaylist}/${fileName}`;
        await RemoveTrackFromPlaylist(currentPlaylist, trackPath);
        trackCard.remove();
      } catch (error) {
        console.error('Delete error:', error);
        alert('Ошибка удаления: ' + error);
        btn.textContent = '×';
        btn.disabled = false;
      }
    };

    // Handle cancel
    const handleCancel = () => {
      hideModal('deleteConfirmModal');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });

  return btn;
}

/**
 * Show playlists grid
 */
function showPlaylistsGrid() {
  if (playlistsGrid) playlistsGrid.style.display = 'grid';
  if (playlistTracks) playlistTracks.style.display = 'none';
  currentPlaylist = null;
}

/**
 * Show playlist tracks view
 */
function showPlaylistTracksView() {
  if (playlistsGrid) playlistsGrid.style.display = 'none';
  if (playlistTracks) playlistTracks.style.display = 'flex';
  if (currentPlaylistName) {
    currentPlaylistName.textContent = currentPlaylist === 'Favorites' ? t('favorites') : currentPlaylist;
  }

  // Show/hide buttons for Favorites
  if (addTracksBtn) {
    addTracksBtn.style.display = currentPlaylist === 'Favorites' ? 'none' : 'inline-block';
  }
  if (deletePlaylistBtn) {
    deletePlaylistBtn.style.display = currentPlaylist === 'Favorites' ? 'none' : 'inline-block';
  }
}

/**
 * Initialize create playlist modal
 */
function initCreatePlaylistModal() {
  const modal = document.getElementById('createPlaylistModal');
  const input = document.getElementById('newPlaylistName');
  const confirmBtn = document.getElementById('confirmPlaylistBtn');
  const cancelBtn = document.getElementById('cancelPlaylistBtn');

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideModal('createPlaylistModal');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal('createPlaylistModal');
      }
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const name = input?.value.trim();

      if (!name) {
        alert(t('enterPlaylistName') || 'Введите название плейлиста');
        return;
      }

      try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = t('creating') || 'Создание...';

        await CreatePlaylist(name);
        hideModal('createPlaylistModal');
        await loadPlaylists();
      } catch (error) {
        console.error('Create playlist error:', error);
        alert(`${t('genericError')}: ${error}`);
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = t('create');
      }
    });
  }
}

/**
 * Get current playlist
 */
export function getCurrentPlaylist() {
  return currentPlaylist;
}
