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
  SearchTracks,
  GetProfiles,
  GetActiveProfile,
  SwitchProfile,
  CreateProfile,
} from "../wailsjs/go/main/App";

const I18N_STORAGE_KEY = "maxplayer_lang";

function parseI18nRoot(id) {
  const el = document.getElementById(id);
  if (!el || !el.textContent) return {};
  try {
    return JSON.parse(el.textContent);
  } catch {
    return {};
  }
}

const RU = parseI18nRoot("maxplayer-i18n-ru");
const EN = parseI18nRoot("maxplayer-i18n-en");

function getLanguage() {
  return localStorage.getItem(I18N_STORAGE_KEY) || "ru";
}

function setLanguage(lang) {
  localStorage.setItem(I18N_STORAGE_KEY, lang);
  applyI18n();
  window.dispatchEvent(new CustomEvent("maxplayer:languagechange"));
}

function t(key) {
  const primary = getLanguage() === "en" ? EN : RU;
  const fallback = getLanguage() === "en" ? RU : EN;
  const v = primary[key];
  if (v != null && v !== "") return v;
  const w = fallback[key];
  if (w != null && w !== "") return w;
  return String(key);
}

function applyI18n() {
  const lang = getLanguage();
  document.documentElement.lang = lang === "en" ? "en" : "ru";
  document.title = t("appTitle");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (!k) return;
    if (el.hasAttribute("data-i18n-html")) {
      el.innerHTML = t(k);
    } else {
      el.textContent = t(k);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const k = el.getAttribute("data-i18n-placeholder");
    if (k && "placeholder" in el) el.placeholder = t(k);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const k = el.getAttribute("data-i18n-title");
    if (k) el.title = t(k);
  });

  document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
    const k = el.getAttribute("data-i18n-alt");
    if (k && "alt" in el) el.alt = t(k);
  });
}

const folderPathEl = document.getElementById("folderPath");
const playlistsEl = document.getElementById("playlists");
const tracksEl = document.getElementById("tracks");
const quickPickFolderBtn = document.getElementById("quickPickFolderBtn");
const refreshBtn = document.getElementById("refreshBtn");

const sidebarProfileSelect = document.getElementById("sidebarProfileSelect");
const settingsModal = document.getElementById("settingsModal");
const settingsProfileSelect = document.getElementById("settingsProfileSelect");
const settingsFolderPathEl = document.getElementById("settingsFolderPath");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsPickFolderBtn = document.getElementById("settingsPickFolderBtn");
const settingsNewProfileBtn = document.getElementById("settingsNewProfileBtn");

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

const EQ_STORAGE_KEY = "maxplayer_eq";
let waCtx;
let waBass;
let waMid;
let waTreble;
let waGain;
let waConnected = false;
let muteBackupVolume = 0.8;
let isMuted = false;

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

function persistEqGains() {
  const bass = parseFloat(document.getElementById("eqBassSlider")?.value ?? "0");
  const mid = parseFloat(document.getElementById("eqMidSlider")?.value ?? "0");
  const treble = parseFloat(document.getElementById("eqTrebleSlider")?.value ?? "0");
  localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify({ bass, mid, treble }));
}

function applyEqFilters() {
  if (!waBass) return;
  const bass = parseFloat(document.getElementById("eqBassSlider")?.value ?? "0");
  const mid = parseFloat(document.getElementById("eqMidSlider")?.value ?? "0");
  const treble = parseFloat(document.getElementById("eqTrebleSlider")?.value ?? "0");
  waBass.gain.value = bass;
  waMid.gain.value = mid;
  waTreble.gain.value = treble;
}

function applyVolumeToOutput(v) {
  const vol = Math.max(0, Math.min(1, v));
  if (waGain) {
    waGain.gain.value = vol;
  } else {
    audio.volume = vol;
  }
}

async function ensureWebAudio() {
  if (waConnected) {
    if (waCtx && waCtx.state === "suspended") {
      await waCtx.resume().catch(() => {});
    }
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  waCtx = new AC();
  const src = waCtx.createMediaElementSource(audio);
  waBass = waCtx.createBiquadFilter();
  waBass.type = "lowshelf";
  waBass.frequency.value = 100;
  waMid = waCtx.createBiquadFilter();
  waMid.type = "peaking";
  waMid.frequency.value = 1000;
  waMid.Q.value = 0.9;
  waTreble = waCtx.createBiquadFilter();
  waTreble.type = "highshelf";
  waTreble.frequency.value = 7000;
  waGain = waCtx.createGain();
  const uiVol = parseFloat(volumeSlider?.value ?? "0.8");
  waGain.gain.value = uiVol;
  audio.volume = 1;

  src.connect(waBass);
  waBass.connect(waMid);
  waMid.connect(waTreble);
  waTreble.connect(waGain);
  waGain.connect(waCtx.destination);

  waConnected = true;
  const g = readEqGains();
  const bEl = document.getElementById("eqBassSlider");
  const mEl = document.getElementById("eqMidSlider");
  const trebleEl = document.getElementById("eqTrebleSlider");
  if (bEl) bEl.value = String(g.bass);
  if (mEl) mEl.value = String(g.mid);
  if (trebleEl) trebleEl.value = String(g.treble);
  applyEqFilters();

  if (waCtx.state === "suspended") {
    await waCtx.resume().catch(() => {});
  }
}

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
  if (!nowPlayingTitle || !nowPlayingArtist || !nowPlayingCover) return;

  if (track && track.title) {
    nowPlayingTitle.textContent = track.title;
    nowPlayingArtist.textContent = track.artist || t("unknownArtist");

    if (track.coverBase64) {
      nowPlayingCover.src = `data:image/jpeg;base64,${track.coverBase64}`;
    } else {
      nowPlayingCover.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='%23cccccc'%3E%3Crect width='24' height='24' rx='4' fill='%23dddddd'/%3E%3Cpath fill='%23999' d='M12 5v14l8-7z'/%3E%3C/svg%3E";
    }
  } else {
    nowPlayingTitle.textContent = t("notPlaying");
    nowPlayingArtist.textContent = "—";
    nowPlayingCover.src =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='%23cccccc'%3E%3Crect width='24' height='24' rx='4' fill='%23dddddd'/%3E%3Cpath fill='%23999' d='M12 5v14l8-7z'/%3E%3C/svg%3E";
  }
}

// Ползунок громкости
const volumeSlider = document.getElementById("volumeSlider");
if (volumeSlider) {
  audio.volume = 0.8;
  volumeSlider.value = 0.8;

  volumeSlider.addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    isMuted = v < 0.001;
    applyVolumeToOutput(v);
  });
}

// Все горячие клавиши
window.addEventListener('keydown', (e) => {
  if (e.code === "Escape" && settingsModal?.classList.contains("settings-modal--open")) {
    closeSettings();
    return;
  }

  // Игнорируем ввод в полях ввода
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
    return;
  }
  
  switch(e.code) {
    case "Space":
      e.preventDefault();
      if (audio.src) {
        if (audio.paused) {
          ensureWebAudio()
            .then(() => audio.play())
            .catch(() => {});
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

    case "KeyM":
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
          volumeSlider.value = "0";
          applyVolumeToOutput(0);
        }
      }
      break;

    case "KeyN":
      e.preventDefault();
      nextTrack();
      break;

    case "KeyP":
      e.preventDefault();
      prevTrack();
      break;

    case "Comma":
      e.preventDefault();
      if (audio.duration) {
        audio.currentTime = Math.max(0, audio.currentTime - 5);
      }
      break;

    case "Period":
      e.preventDefault();
      if (audio.duration) {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
      }
      break;

    case "Home":
      e.preventDefault();
      if (audio.duration) audio.currentTime = 0;
      break;

    case "End":
      e.preventDefault();
      if (audio.duration) audio.currentTime = Math.max(0, audio.duration - 0.25);
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

async function ensureAtLeastOneProfile() {
  const profiles = await GetProfiles();
  if (!profiles.length) {
    await CreateProfile("Default", "");
  }
}

async function refreshProfileSelectors() {
  await ensureAtLeastOneProfile();
  const profiles = await GetProfiles();
  let activeName = "";
  try {
    activeName = (await GetActiveProfile()).name;
  } catch {
    if (profiles.length) {
      await SwitchProfile(profiles[0].name);
      activeName = profiles[0].name;
    }
  }
  for (const sel of [sidebarProfileSelect, settingsProfileSelect]) {
    if (!sel) continue;
    sel.innerHTML = "";
    for (const p of profiles) {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.name;
      sel.appendChild(opt);
    }
    if (activeName && [...sel.options].some((o) => o.value === activeName)) {
      sel.value = activeName;
    }
  }
}

async function switchToProfile(name) {
  let activeName = "";
  try {
    activeName = (await GetActiveProfile()).name;
  } catch {
    /* ignore */
  }
  if (activeName === name) return;

  await SwitchProfile(name);
  audio.pause();
  audio.src = "";
  try {
    audio.load();
  } catch {
    /* ignore */
  }
  clearSearch();
  currentTracks = [];
  currentPlaylist = null;
  currentTrackIndex = -1;
  updateNowPlayingPanel(null);
  if (progressFill) progressFill.style.width = "0%";
  updatePlayButton();
  await init();
}

async function openSettings() {
  await refreshProfileSelectors();
  const folder = await GetMusicFolder();
  if (settingsFolderPathEl) settingsFolderPathEl.textContent = folder || t("settingsNotChosen");
  const langSel = document.getElementById("interfaceLangSelect");
  if (langSel) langSel.value = getLanguage();
  if (settingsModal) settingsModal.classList.add("settings-modal--open");
}

function closeSettings() {
  if (settingsModal) settingsModal.classList.remove("settings-modal--open");
}

function wireProfileSelect(sel) {
  if (!sel) return;
  sel.addEventListener("change", async (e) => {
    const name = e.target.value;
    await switchToProfile(name);
  });
}

wireProfileSelect(sidebarProfileSelect);
wireProfileSelect(settingsProfileSelect);

if (openSettingsBtn) {
  openSettingsBtn.addEventListener("click", () => {
    openSettings().catch((err) => console.error(err));
  });
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener("click", () => closeSettings());
}

if (settingsModal) {
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettings();
  });
}

if (settingsPickFolderBtn) {
  settingsPickFolderBtn.addEventListener("click", async () => {
    const path = await SelectFolder();
    if (!path) return;
    await SetMusicFolder(path);
    await init();
  });
}

if (settingsNewProfileBtn) {
  settingsNewProfileBtn.addEventListener("click", async () => {
    const name = window.prompt(t("newProfilePrompt"));
    if (!name || !String(name).trim()) return;
    const trimmed = String(name).trim();
    try {
      await CreateProfile(trimmed, "");
      await SwitchProfile(trimmed);
      await init();
    } catch (err) {
      console.error(err);
      window.alert(String(err));
    }
  });
}

if (quickPickFolderBtn) {
  quickPickFolderBtn.addEventListener("click", async () => {
    const path = await SelectFolder();
    if (!path) return;
    await SetMusicFolder(path);
    await init();
  });
}

["eqBassSlider", "eqMidSlider", "eqTrebleSlider"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", () => {
    applyEqFilters();
    persistEqGains();
  });
});

const eqResetBtn = document.getElementById("eqResetBtn");
if (eqResetBtn) {
  eqResetBtn.addEventListener("click", () => {
    ["eqBassSlider", "eqMidSlider", "eqTrebleSlider"].forEach((sid) => {
      const s = document.getElementById(sid);
      if (s) s.value = "0";
    });
    applyEqFilters();
    persistEqGains();
  });
}

const interfaceLangSelect = document.getElementById("interfaceLangSelect");
if (interfaceLangSelect) {
  interfaceLangSelect.addEventListener("change", (e) => {
    setLanguage(e.target.value);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  applyI18n();
  if (interfaceLangSelect) interfaceLangSelect.value = getLanguage();
  await init();
});

async function init() {
  await refreshProfileSelectors();
  const folder = await GetMusicFolder();
  folderPathEl.textContent = folder || t("settingsNotChosen");
  if (settingsFolderPathEl) settingsFolderPathEl.textContent = folder || t("settingsNotChosen");
  if (!folder) {
    playlistsEl.innerHTML = "";
    tracksEl.innerHTML = `<p style="color:#666;padding:12px 0">${t("noFolderHint")}</p>`;
    return;
  }
  await loadPlaylists();
}

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
  tracksEl.innerHTML = t("loading");

  const tracks = await ScanAudioFiles(playlistName);

  currentTracks = tracks;
  renderTracks(tracks);
}

function renderTracks(tracks) {
  tracksEl.innerHTML = "";
  if (!tracks.length) {
    tracksEl.innerHTML = t("noTracks");
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
  try {
    audio.load();
  } catch {
    /* ignore */
  }
  ensureWebAudio()
    .then(() => audio.play())
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

if (playBtn) {
  playBtn.addEventListener("click", async () => {
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
      console.error("Ошибка play:", err);
    }
  });
}

if (nextBtn) nextBtn.addEventListener("click", () => nextTrack());
if (prevBtn) prevBtn.addEventListener("click", () => prevTrack());

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
  if (playBtn) playBtn.textContent = audio.paused ? "▶" : "⏸";
}

audio.addEventListener("play", updatePlayButton);
audio.addEventListener("pause", updatePlayButton);
audio.addEventListener("ended", updatePlayButton);

audio.addEventListener("ended", () => {
  nextTrack();
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration || !progressFill) return;

  const percent = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = percent + "%";
});

// Перемотка по клику
if (progressBar) progressBar.addEventListener("click", (e) => {
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
      try {
        audio.load();
      } catch {
        /* ignore */
      }
      await ensureWebAudio();
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
  if (!searchResultsDiv) return;
  if (!query || query.trim() === '') {
    clearSearch();
    return;
  }
  
  try {
    // Показываем индикатор загрузки
    searchResultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: #666;">${t("searchLoading")}</div>`;
    if (tracksContainer) tracksContainer.style.display = 'none';
    if (clearSearchBtn) clearSearchBtn.style.display = 'block';
    
    // Выполняем поиск через Wails
    const results = await SearchTracks(query);
    
    if (!results || results.length === 0) {
      searchResultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: #999;">🎵 ${t("searchNothing")} «${query}»</div>`;
      return;
    }
    
    // Отображаем результаты
    searchResultsDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #4caf50;">
        <h3 style="margin: 0; color: #333;">🔍 ${t("searchResults")} (${results.length})</h3>
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
      titleDiv.textContent = track.title || t("noTitle");
      
      const artistDiv = document.createElement('div');
      artistDiv.className = 'artist';
      artistDiv.style.color = '#666';
      artistDiv.style.fontSize = '14px';
      artistDiv.textContent = track.artist || t("unknownArtist");
      
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
    searchResultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: #f44336;">❌ ${t("searchError")}: ${error}</div>`;
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

window.addEventListener("maxplayer:languagechange", () => {
  const si = document.getElementById("searchInput");
  if (si?.value?.trim()) {
    performSearch(si.value);
  }
});

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
      alert(t("enterPlaylistName"));
      return;
    }
    
    try {
      confirmPlaylistBtn.disabled = true;
      confirmPlaylistBtn.textContent = t("creating");
      
      await CreatePlaylist(name);
      
      // Закрыть модальное окно
      createPlaylistModal.style.display = 'none';
      
      // Перезагрузить список плейлистов
      await loadPlaylists();

    } catch (error) {
      console.error('Ошибка создания плейлиста:', error);
      alert(`${t("genericError")}: ${error}`);
    } finally {
      confirmPlaylistBtn.disabled = false;
      confirmPlaylistBtn.textContent = t("create");
    }
  });
}

// ========== ДОБАВЛЕНИЕ ТРЕКОВ В ПЛЕЙЛИСТ ==========
const addTracksBtn = document.getElementById('addTracksBtn');
if (addTracksBtn) {
  addTracksBtn.addEventListener('click', async () => {
    if (!currentPlaylist) {
      alert(t("choosePlaylistFirst"));
      return;
    }

    if (currentPlaylist === 'Favorites') {
      alert(t("favoritesHint"));
      return;
    }

    try {
      addTracksBtn.disabled = true;
      addTracksBtn.textContent = t("pickingFiles");

      await AddTrackToPlaylist(currentPlaylist);

      // Перезагрузить треки текущего плейлиста
      await loadTracks(currentPlaylist);

    } catch (error) {
      console.error('Ошибка добавления треков:', error);
      alert(`${t("genericError")}: ${error}`);
    } finally {
      addTracksBtn.disabled = false;
      addTracksBtn.textContent = t("addTracks");
    }
  });
}

// ========== ОБНОВЛЕНИЕ СПИСКА ПЛЕЙЛИСТОВ ==========
const refreshPlaylistsBtn = document.getElementById('refreshPlaylistsBtn');
if (refreshPlaylistsBtn) {
  refreshPlaylistsBtn.addEventListener('click', async () => {
    try {
      refreshPlaylistsBtn.disabled = true;
      refreshPlaylistsBtn.textContent = t("refreshing");
      await loadPlaylists();
    } catch (error) {
      console.error('Ошибка обновления плейлистов:', error);
      alert(`${t("genericError")}: ${error}`);
    } finally {
      refreshPlaylistsBtn.disabled = false;
      refreshPlaylistsBtn.textContent = t("refreshPlaylists");
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
  title.textContent = track.title || t("noTitle");

  const artist = document.createElement('div');
  artist.className = 'artist';
  artist.textContent = track.artist || t("unknownArtist");

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
      tracksContainer.innerHTML = t("noTracks");
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

  playlistsEl.innerHTML = t("loading");
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