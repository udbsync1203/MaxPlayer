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
const refreshBtn = document.getElementById("refreshBtn");

let currentPlaylist = null;

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
  try {
    const path = await SelectFolder();
    if (!path) return;
    await SetMusicFolder(path);
    await init();
  } catch (e) {
    console.error("Ошибка выбора папки:", e);
  }
});

refreshBtn.addEventListener("click", async () => {
  if (!currentPlaylist) return;
  try {
    await loadTracks(currentPlaylist);
  } catch (e) {
    console.error("Ошибка обновления:", e);
  }
});

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

async function loadTracks(playlistName) {
  tracksEl.innerHTML = "Загрузка...";
  try {
    const tracks = await ScanAudioFiles(playlistName);
    renderTracks(tracks);
  } catch (e) {
    console.error(e);
    tracksEl.innerHTML = "Ошибка загрузки";
  }
}

function renderTracks(tracks) {
  tracksEl.innerHTML = "";
  if (!tracks.length) {
    tracksEl.innerHTML = "Нет треков";
    return;
  }
  tracks.forEach((track) => {
    const el = createTrack(track);
    tracksEl.appendChild(el);
  });
}

function createTrack(track) {
  const div = document.createElement("div");
  div.className = "track";
  div.dataset.path = track.path;

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
    console.log(track.path);
  });

  return div;
}
