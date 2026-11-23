// Both languages. English opens on every first visit, whatever the browser's language; German is one
// click away (brief 5.11). The choice: ?lang=de or ?lang=en in the address wins and becomes the stored
// choice; otherwise the stored choice (localStorage "bmc.lang"); otherwise English. <html lang> follows.
// A change re-renders every view through onLang(), without a reload.
//
// Every visible string lives in en.js and de.js under the same keys. Values may hold placeholders in
// braces, "{name}", filled from t()'s second argument. index.html keeps the English texts as static
// defaults (the boot screen and the tests read them); its elements name their key in data-i18n (text)
// or data-i18n-attr ("attribute:key; attribute:key"), and applyStatic() replaces them at runtime. The
// two How it works guides are written out in index.html, one per language, as Vici's guide expects.

import { APP, STORAGE } from "../config.js";
import EN from "./en.js";
import DE from "./de.js";

export const LANGS = ["en", "de"];
const DICTS = { en: EN, de: DE };
const LOCALES = { en: "en-GB", de: "de-DE" };

let lang = "en";
const listeners = new Set();
const missing = new Set();

function readStored() {
  try { return localStorage.getItem(STORAGE.lang); } catch { return null; }
}
function store(value) {
  try { localStorage.setItem(STORAGE.lang, value); } catch { /* storage blocked: the choice lasts this page only */ }
}

/** The language at start-up: ?lang= wins and is stored, then the stored choice, then English. */
export function initLang(search = location.search) {
  const fromUrl = new URLSearchParams(search).get("lang");
  if (LANGS.includes(fromUrl)) {
    lang = fromUrl;
    store(fromUrl);
  } else {
    const stored = readStored();
    lang = LANGS.includes(stored) ? stored : "en";
  }
  document.documentElement.lang = lang === "de" ? "de" : "en-GB";
  document.documentElement.dataset.lang = lang;
  return lang;
}

export function getLang() {
  return lang;
}

/** The Intl locale of a language: en-GB or de-DE. */
export function locale(l = lang) {
  return LOCALES[l] || LOCALES.en;
}

/** Switches the whole interface, stores the choice and tells every view. No reload. */
export function setLang(next) {
  if (!LANGS.includes(next)) return;
  store(next);
  if (next === lang) return;
  lang = next;
  document.documentElement.lang = next === "de" ? "de" : "en-GB";
  document.documentElement.dataset.lang = next;
  applyStatic();
  for (const fn of [...listeners]) {
    try { fn(lang); } catch (e) { console.error(`[${APP.name}] language listener failed:`, e); }
  }
}

/** Calls fn(lang) after every language change. Returns an unsubscribe function. */
export function onLang(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The text of a key in the active language (or in `l`), with {placeholders} filled from vars. */
export function t(key, vars = null, l = lang) {
  const dict = DICTS[l] || EN;
  let text = dict[key];
  if (typeof text !== "string") {
    missing.add(key);
    text = key;
  }
  if (!vars) return text;
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (m, name) => (Object.hasOwn(vars, name) && vars[name] !== null && vars[name] !== undefined ? String(vars[name]) : m));
}

/** The plural form of a key for n: key.one or key.other, chosen by the language's plural rules. */
export function tn(key, n, vars = {}, l = lang) {
  const form = new Intl.PluralRules(locale(l)).select(Number(n)) === "one" ? "one" : "other";
  return t(`${key}.${form}`, { n, ...vars }, l);
}

/** The dictionary of a language (read-only), for the tests. */
export function dictionary(l) {
  return DICTS[l] || null;
}

/** Keys asked for that neither dictionary has; the tests require none. */
export function missingKeys() {
  return [...missing];
}

/**
 * Re-translates every element that names its key: data-i18n="key" sets its text, data-i18n-attr=
 * "aria-label:key; title:key" its attributes. The document title follows.
 */
export function applyStatic(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of el.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  }
  document.title = t("app.title");
}
