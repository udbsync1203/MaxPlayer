// ========================================
// MaxPlayer - Main Entry Point
// ========================================

import { applyI18n } from './i18n.js';
import { initNavigation } from './navigation.js';
import { initPlayer } from './player.js';
import { initPlaylists, loadPlaylists } from './playlists.js';
import { initSearch } from './search.js';
import { initSettings, refreshProfileSelect, updateFolderPath } from './settings.js';

/**
 * Initialize application
 */
async function init() {
  // Apply localization
  applyI18n();

  // Initialize modules
  initNavigation();
  initPlayer();
  initPlaylists();
  initSearch();
  initSettings();

  // Load initial data
  await refreshProfileSelect();
  await updateFolderPath();
  await loadPlaylists();
}

// Start app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error('Initialization error:', error);
  });
});
