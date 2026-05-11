// ========================================
// Utility Functions
// ========================================

/**
 * Converts relative path to audio stream URL
 */
export function audioStreamUrl(relativePath) {
  if (!relativePath) return "";
  const parts = String(relativePath)
    .replace(/\\/g, "/")
    .split("/")
    .filter((seg) => seg.length > 0);
  return "/audio/" + parts.map((seg) => encodeURIComponent(seg)).join("/");
}

/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Show modal
 */
export function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("open");
}

/**
 * Hide modal
 */
export function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("open");
}

/**
 * Default cover image SVG
 */
export function getDefaultCoverSvg() {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 24 24' fill='%23252d47'%3E%3Crect width='24' height='24' rx='4' fill='%23252d47'/%3E%3Cpath fill='%2394a3b8' d='M12 5v14l8-7z'/%3E%3C/svg%3E";
}
