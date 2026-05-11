// ========================================
// Player Logic
// ========================================

import { audioStreamUrl, formatTime, getDefaultCoverSvg } from './utils.js';
import { t } from './i18n.js';

// Audio element
export const audio = new Audio();

// Player state
export let currentTracks = [];
export let currentTrackIndex = -1;

// Web Audio API for equalizer
let waCtx;
let waBass;
let waMid;
let waTreble;
let waGain;
let waConnected = false;

// Volume state
let muteBackupVolume = 0.8;
let isMuted = false;

// EQ Storage
const EQ_STORAGE_KEY = "maxplayer_eq";

// DOM Elements
const playerCover = document.getElementById('playerCover');
const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');
const speedSelect = document.getElementById('playbackSpeedSelect');

/**
 * Initialize player
 */
export function initPlayer() {
  // Set initial volume
  if (volumeSlider) {
    audio.volume = 0.8;
    volumeSlider.value = 0.8;

    volumeSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      isMuted = v < 0.001;
      applyVolumeToOutput(v);
    });
  }

  // Playback speed
  if (speedSelect) {
    speedSelect.addEventListener('change', (e) => {
      audio.playbackRate = parseFloat(e.target.value);
    });
  }
  audio.playbackRate = 1;

  // Play/Pause button
  if (playBtn) {
    playBtn.addEventListener('click', async () => {
      try {
        if (!audio.src && currentTracks.length > 0) {
          playTrack(0);
          return;
        }

        if (audio.paused) {
          await ensureWebAudio();
          await audio.play();
        } else {
          audio.pause();
        }
      } catch (err) {
        console.error('Play error:', err);
      }
    });
  }

  // Previous/Next buttons
  if (prevBtn) prevBtn.addEventListener('click', () => prevTrack());
  if (nextBtn) nextBtn.addEventListener('click', () => nextTrack());

  // Progress bar click
  if (progressBar) {
    progressBar.addEventListener('click', (e) => {
      if (!audio.duration) return;
      const rect = progressBar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      audio.currentTime = percent * audio.duration;
    });
  }

  // Audio events
  audio.addEventListener('play', updatePlayButton);
  audio.addEventListener('pause', updatePlayButton);
  audio.addEventListener('ended', () => {
    updatePlayButton();
    nextTrack();
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration || !progressFill) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = percent + '%';

    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
    if (totalTimeEl) totalTimeEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('loadedmetadata', () => {
    if (currentTrackIndex >= 0 && currentTracks[currentTrackIndex]) {
      updateNowPlaying(currentTracks[currentTrackIndex]);
    }
    if (totalTimeEl) totalTimeEl.textContent = formatTime(audio.duration);
  });

  // Keyboard shortcuts
  initKeyboardShortcuts();
}

/**
 * Play track by index
 */
export function playTrack(index) {
  if (index < 0 || index >= currentTracks.length) return;

  currentTrackIndex = index;
  const track = currentTracks[index];

  const src = audioStreamUrl(track.path);
  if (!src) {
    console.error('Empty file path');
    return;
  }

  audio.src = src;
  try {
    audio.load();
  } catch {}

  ensureWebAudio()
    .then(() => audio.play())
    .then(() => {
      updatePlayButton();
    })
    .catch((err) => console.error('Playback error:', err));

  updateNowPlaying(track);
}

/**
 * Play track by path (for search results)
 */
export function playTrackByPath(track) {
  // Try to find in current tracks
  let trackIndex = currentTracks.findIndex(t => t.path === track.path);

  if (trackIndex !== -1) {
    playTrack(trackIndex);
  } else {
    // Play directly
    const src = audioStreamUrl(track.path);
    if (!src) {
      console.error('Empty file path');
      return;
    }

    audio.src = src;
    try {
      audio.load();
    } catch {}

    ensureWebAudio()
      .then(() => audio.play())
      .then(() => {
        updatePlayButton();
      })
      .catch((err) => console.error('Playback error:', err));

    updateNowPlaying(track);
  }
}

/**
 * Next track
 */
export function nextTrack() {
  if (!currentTracks.length) return;
  currentTrackIndex++;
  if (currentTrackIndex >= currentTracks.length) {
    currentTrackIndex = 0;
  }
  playTrack(currentTrackIndex);
}

/**
 * Previous track
 */
export function prevTrack() {
  if (!currentTracks.length) return;
  currentTrackIndex--;
  if (currentTrackIndex < 0) {
    currentTrackIndex = currentTracks.length - 1;
  }
  playTrack(currentTrackIndex);
}

/**
 * Update play button icon
 */
function updatePlayButton() {
  if (playBtn) playBtn.textContent = audio.paused ? '▶' : '⏸';
}

/**
 * Update now playing display
 */
function updateNowPlaying(track) {
  if (!playerTitle || !playerArtist || !playerCover) return;

  if (track && track.title) {
    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist || t('unknownArtist');

    if (track.coverBase64) {
      playerCover.src = `data:image/jpeg;base64,${track.coverBase64}`;
    } else {
      playerCover.src = getDefaultCoverSvg();
    }
  } else {
    playerTitle.textContent = t('notPlaying');
    playerArtist.textContent = '—';
    playerCover.src = getDefaultCoverSvg();
  }
}

/**
 * Set current tracks
 */
export function setCurrentTracks(tracks) {
  currentTracks = tracks;
}

/**
 * Get current tracks
 */
export function getCurrentTracks() {
  return currentTracks;
}

/**
 * Keyboard shortcuts
 */
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (audio.src) {
          if (audio.paused) {
            ensureWebAudio().then(() => audio.play()).catch(() => {});
          } else {
            audio.pause();
          }
        } else if (currentTracks.length > 0) {
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
        {
          const cur = parseFloat(volumeSlider?.value ?? String(audio.volume));
          const v = Math.min(1, cur + 0.05);
          if (volumeSlider) volumeSlider.value = String(v);
          isMuted = false;
          applyVolumeToOutput(v);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        {
          const cur = parseFloat(volumeSlider?.value ?? String(audio.volume));
          const v = Math.max(0, cur - 0.05);
          if (volumeSlider) volumeSlider.value = String(v);
          isMuted = v < 0.001;
          applyVolumeToOutput(v);
        }
        break;

      case 'KeyM':
        e.preventDefault();
        if (volumeSlider) {
          if (isMuted || parseFloat(volumeSlider.value) < 0.001) {
            isMuted = false;
            const v = muteBackupVolume > 0 ? muteBackupVolume : 0.8;
            volumeSlider.value = String(v);
            applyVolumeToOutput(v);
          } else {
            isMuted = true;
            muteBackupVolume = parseFloat(volumeSlider.value) || audio.volume || 0.8;
            volumeSlider.value = '0';
            applyVolumeToOutput(0);
          }
        }
        break;

      case 'KeyN':
        e.preventDefault();
        nextTrack();
        break;

      case 'KeyP':
        e.preventDefault();
        prevTrack();
        break;

      case 'Comma':
        e.preventDefault();
        if (audio.duration) {
          audio.currentTime = Math.max(0, audio.currentTime - 5);
        }
        break;

      case 'Period':
        e.preventDefault();
        if (audio.duration) {
          audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
        }
        break;

      case 'Home':
        e.preventDefault();
        if (audio.duration) audio.currentTime = 0;
        break;

      case 'End':
        e.preventDefault();
        if (audio.duration) audio.currentTime = Math.max(0, audio.duration - 0.25);
        break;
    }
  });
}

// ========================================
// Web Audio API & Equalizer
// ========================================

/**
 * Read EQ gains from localStorage
 */
function readEqGains() {
  try {
    const raw = localStorage.getItem(EQ_STORAGE_KEY);
    if (!raw) return { bass: 0, mid: 0, treble: 0 };
    const j = JSON.parse(raw);
    return {
      bass: Number(j.bass) || 0,
      mid: Number(j.mid) || 0,
      treble: Number(j.treble) || 0,
    };
  } catch {
    return { bass: 0, mid: 0, treble: 0 };
  }
}

/**
 * Persist EQ gains to localStorage
 */
export function persistEqGains() {
  const bass = parseFloat(document.getElementById('eqBassSlider')?.value ?? '0');
  const mid = parseFloat(document.getElementById('eqMidSlider')?.value ?? '0');
  const treble = parseFloat(document.getElementById('eqTrebleSlider')?.value ?? '0');
  localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify({ bass, mid, treble }));
}

/**
 * Apply EQ filters
 */
export function applyEqFilters() {
  if (!waBass) return;
  const bass = parseFloat(document.getElementById('eqBassSlider')?.value ?? '0');
  const mid = parseFloat(document.getElementById('eqMidSlider')?.value ?? '0');
  const treble = parseFloat(document.getElementById('eqTrebleSlider')?.value ?? '0');
  waBass.gain.value = bass;
  waMid.gain.value = mid;
  waTreble.gain.value = treble;
}

/**
 * Apply volume to output
 */
function applyVolumeToOutput(v) {
  const vol = Math.max(0, Math.min(1, v));
  if (waGain) {
    waGain.gain.value = vol;
  } else {
    audio.volume = vol;
  }
}

/**
 * Ensure Web Audio is initialized
 */
async function ensureWebAudio() {
  if (waConnected) {
    if (waCtx && waCtx.state === 'suspended') {
      await waCtx.resume().catch(() => {});
    }
    return;
  }

  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  waCtx = new AC();
  const src = waCtx.createMediaElementSource(audio);

  waBass = waCtx.createBiquadFilter();
  waBass.type = 'lowshelf';
  waBass.frequency.value = 100;

  waMid = waCtx.createBiquadFilter();
  waMid.type = 'peaking';
  waMid.frequency.value = 1000;
  waMid.Q.value = 0.9;

  waTreble = waCtx.createBiquadFilter();
  waTreble.type = 'highshelf';
  waTreble.frequency.value = 7000;

  waGain = waCtx.createGain();
  const uiVol = parseFloat(volumeSlider?.value ?? '0.8');
  waGain.gain.value = uiVol;
  audio.volume = 1;

  src.connect(waBass);
  waBass.connect(waMid);
  waMid.connect(waTreble);
  waTreble.connect(waGain);
  waGain.connect(waCtx.destination);

  waConnected = true;

  // Load saved EQ settings
  const g = readEqGains();
  const bEl = document.getElementById('eqBassSlider');
  const mEl = document.getElementById('eqMidSlider');
  const trebleEl = document.getElementById('eqTrebleSlider');
  if (bEl) bEl.value = String(g.bass);
  if (mEl) mEl.value = String(g.mid);
  if (trebleEl) trebleEl.value = String(g.treble);
  applyEqFilters();

  if (waCtx.state === 'suspended') {
    await waCtx.resume().catch(() => {});
  }
}
