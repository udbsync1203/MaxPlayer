// ========================================
// Settings Logic
// ========================================

import {
  GetMusicFolder,
  SetMusicFolder,
  SelectFolder,
  GetProfiles,
  GetActiveProfile,
  SwitchProfile,
  CreateProfile,
} from '../wailsjs/go/main/App.js';

import { t, setLanguage, getLanguage } from './i18n.js';
import { applyEqFilters, persistEqGains } from './player.js';
import { loadPlaylists } from './playlists.js';

// DOM Elements
const profileSelect = document.getElementById('profileSelect');
const folderPath = document.getElementById('folderPath');
const pickFolderBtn = document.getElementById('pickFolderBtn');
const newProfileBtn = document.getElementById('newProfileBtn');
const interfaceLangSelect = document.getElementById('interfaceLangSelect');
const themeSelect = document.getElementById('themeSelect');
const eqBassSlider = document.getElementById('eqBassSlider');
const eqMidSlider = document.getElementById('eqMidSlider');
const eqTrebleSlider = document.getElementById('eqTrebleSlider');
const eqBassValue = document.getElementById('eqBassValue');
const eqMidValue = document.getElementById('eqMidValue');
const eqTrebleValue = document.getElementById('eqTrebleValue');
const eqResetBtn = document.getElementById('eqResetBtn');

// Theme storage key
const THEME_STORAGE_KEY = 'maxplayer_theme';

/**
 * Initialize settings
 */
export function initSettings() {
  // Profile select
  if (profileSelect) {
    profileSelect.addEventListener('change', async (e) => {
      const name = e.target.value;
      await switchToProfile(name);
    });
  }

  // Pick folder button
  if (pickFolderBtn) {
    pickFolderBtn.addEventListener('click', async () => {
      try {
        const path = await SelectFolder();
        if (!path) return;
        await SetMusicFolder(path);
        await updateFolderPath();
        await loadPlaylists();
      } catch (error) {
        console.error('Pick folder error:', error);
        alert(`${t('genericError')}: ${error}`);
      }
    });
  }

  // New profile button
  if (newProfileBtn) {
    newProfileBtn.addEventListener('click', async () => {
      const name = window.prompt(t('newProfilePrompt'));
      if (!name || !String(name).trim()) return;
      const trimmed = String(name).trim();

      try {
        await CreateProfile(trimmed, '');
        await SwitchProfile(trimmed);
        await refreshProfileSelect();
        await updateFolderPath();
        await loadPlaylists();
      } catch (error) {
        console.error('Create profile error:', error);
        alert(String(error));
      }
    });
  }

  // Language select
  if (interfaceLangSelect) {
    interfaceLangSelect.value = getLanguage();
    interfaceLangSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }

  // Theme select
  if (themeSelect) {
    themeSelect.value = getTheme();
    themeSelect.addEventListener('change', (e) => {
      setTheme(e.target.value);
    });
  }

  // Equalizer sliders
  initEqualizer();

  // Apply saved theme on init
  applyTheme();
}

/**
 * Initialize equalizer
 */
function initEqualizer() {
  const sliders = [
    { slider: eqBassSlider, value: eqBassValue },
    { slider: eqMidSlider, value: eqMidValue },
    { slider: eqTrebleSlider, value: eqTrebleValue },
  ];

  sliders.forEach(({ slider, value }) => {
    if (!slider) return;

    // Update value display
    const updateValue = () => {
      if (value) {
        const val = parseFloat(slider.value);
        value.textContent = `${val > 0 ? '+' : ''}${val.toFixed(1)} dB`;
      }
    };

    updateValue();

    slider.addEventListener('input', () => {
      updateValue();
      applyEqFilters();
      persistEqGains();
    });
  });

  // Reset button
  if (eqResetBtn) {
    eqResetBtn.addEventListener('click', () => {
      sliders.forEach(({ slider, value }) => {
        if (slider) slider.value = '0';
        if (value) value.textContent = '0.0 dB';
      });
      applyEqFilters();
      persistEqGains();
    });
  }
}

/**
 * Refresh profile select
 */
export async function refreshProfileSelect() {
  await ensureAtLeastOneProfile();

  const profiles = await GetProfiles();
  let activeName = '';

  try {
    activeName = (await GetActiveProfile()).name;
  } catch {
    if (profiles.length) {
      await SwitchProfile(profiles[0].name);
      activeName = profiles[0].name;
    }
  }

  if (profileSelect) {
    profileSelect.innerHTML = '';
    for (const p of profiles) {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      profileSelect.appendChild(opt);
    }

    if (activeName && [...profileSelect.options].some((o) => o.value === activeName)) {
      profileSelect.value = activeName;
    }
  }
}

/**
 * Ensure at least one profile exists
 */
async function ensureAtLeastOneProfile() {
  const profiles = await GetProfiles();
  if (!profiles.length) {
    await CreateProfile('Default', '');
  }
}

/**
 * Switch to profile
 */
async function switchToProfile(name) {
  let activeName = '';
  try {
    activeName = (await GetActiveProfile()).name;
  } catch {}

  if (activeName === name) return;

  await SwitchProfile(name);

  // Reset player
  const audio = document.querySelector('audio');
  if (audio) {
    audio.pause();
    audio.src = '';
    try {
      audio.load();
    } catch {}
  }

  await updateFolderPath();
  await loadPlaylists();
}

/**
 * Update folder path display
 */
export async function updateFolderPath() {
  try {
    const folder = await GetMusicFolder();
    if (folderPath) {
      folderPath.textContent = folder || t('notChosen');
    }
  } catch (error) {
    console.error('Get folder error:', error);
    if (folderPath) {
      folderPath.textContent = t('notChosen');
    }
  }
}

/**
 * Get current theme
 */
function getTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
}

/**
 * Set theme
 */
function setTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme();
}

/**
 * Apply theme to document
 */
function applyTheme() {
  const theme = getTheme();
  document.documentElement.setAttribute('data-theme', theme);
}
