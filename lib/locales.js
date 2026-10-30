import en from "./locale-en.js";
import fr from "./locale-fr.js";

const dictionaries = { en, fr };
const defaultLocale = "fr";

function normaliseLocale(value) {
  const language = String(value || "").toLowerCase().split("-")[0];
  return Object.hasOwn(dictionaries, language) ? language : null;
}

export function getLocale() {
  const requested = new URLSearchParams(window.location.search).get("lang");
  if (normaliseLocale(requested)) return normaliseLocale(requested);
  try {
    const saved = normaliseLocale(window.localStorage.getItem("obm-locale"));
    if (saved) return saved;
  } catch {
    // Storage may be unavailable in privacy-restricted browsing contexts.
  }
  return normaliseLocale(window.navigator.language) || defaultLocale;
}

export function t(key, locale = getLocale()) {
  return key.split(".").reduce((value, part) => value?.[part], dictionaries[locale]) ?? key;
}

export function applyLocale(locale = getLocale()) {
  const selectedLocale = normaliseLocale(locale) || defaultLocale;
  document.documentElement.lang = selectedLocale;
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n, selectedLocale);
  });
  document.querySelectorAll("[data-i18n-attr]").forEach(element => {
    element.dataset.i18nAttr.split(",").forEach(mapping => {
      const [attribute, key] = mapping.split(":").map(value => value.trim());
      if (attribute && key) element.setAttribute(attribute, t(key, selectedLocale));
    });
  });
  document.dispatchEvent(new CustomEvent("obm-locale-changed", { detail: { locale: selectedLocale } }));
  return selectedLocale;
}

export function setLocale(locale) {
  const selectedLocale = normaliseLocale(locale) || defaultLocale;
  try {
    window.localStorage.setItem("obm-locale", selectedLocale);
  } catch {
    // The selected locale still applies for the current page.
  }
  const url = new URL(window.location.href);
  if (url.searchParams.has("lang")) {
    url.searchParams.set("lang", selectedLocale);
    window.history.replaceState({}, "", url);
  }
  applyLocale(selectedLocale);
}

applyLocale();