// ========================================
// Navigation between views
// ========================================

const views = {
  playlists: document.getElementById('playlistsView'),
  search: document.getElementById('searchView'),
  settings: document.getElementById('settingsView')
};

let currentView = 'playlists';

/**
 * Switch to a different view
 */
export function switchView(viewName) {
  // Hide all views
  Object.values(views).forEach(v => v?.classList.remove('active'));

  // Show selected view
  views[viewName]?.classList.add('active');

  // Update active nav button
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === viewName) {
      btn.classList.add('active');
    }
  });

  currentView = viewName;
}

/**
 * Initialize navigation
 */
export function initNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });
}

/**
 * Get current view
 */
export function getCurrentView() {
  return currentView;
}
