// The three key figures at the top right: At stake a year, Blocks under pressure and Session cost. They
// answer first (brief 1.2, Vici's key-figure rule): a scenario shows its figures before anything plays,
// worked out by the engine from the recording. When the decision moves a figure, the old value stays
// struck through in s.vc-stat__was before the new one, and the note says what moved it. The words come
// from js/story.js; this module only writes them into the tiles index.html holds.

import { tileWords } from "./story.js";

const TILES = { stake: "kpi-stake", pressure: "kpi-pressure", cost: "kpi-cost" };

/** Writes the tiles for the run as it stands. ctx: as js/story.js tileWords takes it. */
export function renderKpis(ctx) {
  const words = tileWords(ctx);
  for (const [key, id] of Object.entries(TILES)) {
    const tile = document.getElementById(id);
    if (!tile) continue;
    const w = words[key];
    tile.dataset.state = w.state;
    const was = tile.querySelector(".vc-stat__was");
    if (was) {
      was.textContent = w.was;
      was.hidden = !w.was;
    }
    tile.querySelector(".kpi-main").textContent = w.value;
    tile.querySelector(".kpi-note").textContent = w.note;
  }
  return words;
}
