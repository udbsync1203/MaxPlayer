// ========================================
// Internationalization (i18n)
// ========================================

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

export function getLanguage() {
  return localStorage.getItem(I18N_STORAGE_KEY) || "ru";
}

export function setLanguage(lang) {
  localStorage.setItem(I18N_STORAGE_KEY, lang);
  applyI18n();
  window.dispatchEvent(new CustomEvent("maxplayer:languagechange"));
}

export function t(key) {
  const primary = getLanguage() === "en" ? EN : RU;
  const fallback = getLanguage() === "en" ? RU : EN;
  const v = primary[key];
  if (v != null && v !== "") return v;
  const w = fallback[key];
  if (w != null && w !== "") return w;
  return String(key);
}

export function applyI18n() {
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
