// ===============================
// main.js (полностью заменить)
// ===============================

import {
  GetMusicFolder,
  SetMusicFolder,
  GetPlaylists,
  ScanAudioFiles,
  SelectFolder,
} from "../wailsjs/go/main/App";

const folderPathEl = document.getElementById("folderPath");
const playlistsEl = document.getElementById("playlists");
const tracksEl = document.getElementById("tracks");
const btn = document.getElementById("selectFolderBtn");

// элементы плеера
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const nowPlaying = document.getElementById("nowPlaying");

let currentPlaylist = null;
let currentTracks = [];
let currentTrackIndex = -1;

const audio = new Audio();

window.addEventListener("DOMContentLoaded", async () => {
  await init();
});

// =====================
// INIT
// =====================
async function init() {
  const folder = await GetMusicFolder();
  folderPathEl.textContent = folder || "не выбрана";

  if (!folder) return;

  await loadPlaylists();
}

// =====================
// выбор папки
// =====================
btn.addEventListener("click", async () => {
  const path = await SelectFolder();

  if (!path) return;

  await SetMusicFolder(path);
  await init();
});

// =====================
// PLAYLISTS
// =====================
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
    .forEach((el) => el.classList.remove("active"));

  element.classList.add("active");

  await loadTracks(name);
}

// =====================
// TRACKS
// =====================
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
  img.className = "cover";
  img.src = track.coverBase64
    ? `data:image/jpeg;base64,${track.coverBase64}`
    : "";

  const info = document.createElement("div");

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = track.title;

  const artist = document.createElement("div");
  artist.className = "artist";
  artist.textContent = track.artist;

  info.appendChild(title);
  info.appendChild(artist);

  div.appendChild(img);
  div.appendChild(info);

  div.addEventListener("click", () => {
    playTrack(index);
  });

  return div;
}

// =====================
// PLAYER
// =====================
function playTrack(index) {
  if (index < 0 || index >= currentTracks.length) return;

  currentTrackIndex = index;

  const track = currentTracks[index];

  audio.src = track.path;
  audio.play();

  nowPlaying.textContent = `${track.title} - ${track.artist}`;
}

playBtn.addEventListener("click", () => {
  if (audio.src) {
    audio.play();
  } else if (currentTracks.length > 0) {
    playTrack(0);
  }
});

stopBtn.addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
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

// авто следующий трек
audio.addEventListener("ended", () => {
  nextTrack();
});

// progress bar

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;

  const percent = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = percent + "%";
});

// перемотка по клику
progressBar.addEventListener("click", (e) => {
  if (!audio.duration) return;

  const rect = progressBar.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percent = x / rect.width;

  audio.currentTime = percent * audio.duration;
});