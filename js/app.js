// The presenter, as far as version 0.1.0 goes: the language switch and the guide that belongs to each
// language. Play, the steps, the canvas's states and Run it live arrive with the simulation (0.2.0) and
// the live run (0.3.0); until then their controls are disabled and the panel under the canvas says so.

import { getLang, setLang, onLang } from "./i18n/index.js";

/** Shows which language is active on the switch, and only the How it works button of that language. */
function reflect(lang) {
  for (const b of document.querySelectorAll(".lang-option")) b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
  for (const b of document.querySelectorAll(".guide-open")) b.hidden = b.getAttribute("lang") !== lang;
}

export async function start() {
  for (const b of document.querySelectorAll(".lang-option")) b.addEventListener("click", () => setLang(b.dataset.lang));
  onLang(reflect);
  reflect(getLang());
}
