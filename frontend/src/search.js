// ========================================
// Search Logic
// ========================================

import { SearchTracks } from '../wailsjs/go/main/App.js';
import { t } from './i18n.js';
import { getDefaultCoverSvg } from './utils.js';
import { playTrackByPath } from './player.js';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const clearSearchBtn = document.getElementById('clearSearchBtn');

// State
let searchTimeoutId = null;

/**
 * Initialize search
 */
export function initSearch() {
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      if (searchTimeoutId) clearTimeout(searchTimeoutId);
      const query = e.target.value;
      searchTimeoutId = setTimeout(() => {
        performSearch(query);
      }, 300);
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      clearSearch();
    });
  }
}

/**
 * Perform search
 */
async function performSearch(query) {
  if (!searchResults) return;

  if (!query || query.trim() === '') {
    clearSearch();
    return;
  }

  try {
    // Show loading
    searchResults.innerHTML = `<div class="search-empty">${t('searchLoading') || 'Поиск...'}</div>`;
    if (clearSearchBtn) clearSearchBtn.style.display = 'block';

    // Execute search
    const results = await SearchTracks(query);

    if (!results || results.length === 0) {
      searchResults.innerHTML = `<div class="search-empty">🎵 ${t('searchNothing')} «${query}»</div>`;
      return;
    }

    // Render results
    renderSearchResults(results, query);
  } catch (error) {
    console.error('Search error:', error);
    searchResults.innerHTML = `<div class="search-empty" style="color: var(--danger);">❌ ${t('searchError')}: ${error}</div>`;
  }
}

/**
 * Render search results
 */
function renderSearchResults(results, query) {
  if (!searchResults) return;

  searchResults.innerHTML = '';

  if (!results || !results.length) {
    searchResults.innerHTML = `<div class="search-empty">🎵 ${t('searchNothing')} «${query}»</div>`;
    return;
  }

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid var(--purple-primary);';

  const title = document.createElement('h3');
  title.style.cssText = 'margin: 0; color: var(--text-primary); font-size: 18px;';
  title.textContent = `🔍 ${t('searchResults')} (${results.length})`;

  header.appendChild(title);
  searchResults.appendChild(header);

  // Results
  results.forEach((track) => {
    const card = createSearchResultCard(track);
    searchResults.appendChild(card);
  });
}

/**
 * Create search result card
 */
function createSearchResultCard(track) {
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

  // Play button
  const playBtn = document.createElement('button');
  playBtn.className = 'track-btn track-btn-play';
  playBtn.innerHTML = '▶';
  playBtn.title = 'Воспроизвести';

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playTrackByPath(track);
  });

  card.appendChild(cover);
  card.appendChild(info);
  card.appendChild(playBtn);

  // Click to play
  card.addEventListener('click', () => {
    playTrackByPath(track);
  });

  return card;
}

/**
 * Clear search
 */
function clearSearch() {
  if (searchInput) searchInput.value = '';
  if (searchResults) searchResults.innerHTML = '';
  if (clearSearchBtn) clearSearchBtn.style.display = 'none';
}
