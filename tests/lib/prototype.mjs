// What differs between the prototypes in the shared Vici tests (tests/tokens.mjs, tests/hexagon.mjs,
// tests/page-icon.mjs and tests/vici-files.mjs). Those four files are the same in every prototype;
// this file is the one place that is not. Everything here is the Business Model Canvas Challenger's,
// as it stands in 0.1.0: the shell. The scenarios' states join the pairs and the tour in 0.2.0.

/** The prototype's name, as on its page and on its card on Victor's website. */
export const NAME = "Business Model Canvas Challenger";

/**
 * Colour pairs only this prototype draws (the shared shell's pairs are in tests/tokens.mjs):
 * [what, foreground token, background token, kind]. kind "text" needs 4.5:1, "mark" (a line, an icon,
 * a control's border, a bar) 3:1 (WCAG 2.2, 1.4.3 and 1.4.11). Tokens are Vici's, without "--vc-".
 * Decorative outlines (the blocks' and panels' rims) carry no information and are not listed, as in the
 * shared shell's pairs. The disabled steps, Play and Run it live of 0.1.0 are inactive controls, which
 * 1.4.3 exempts; they turn active in 0.2.0 and 0.3.0.
 */
export const COLOUR_PAIRS = [
  // The header and the strip.
  ["The tool's name beside its cell", "text", "surface", "text"],
  ["The strip's sentence", "text-muted", "surface", "text"],
  ["A key figure's label and its note", "text-muted", "surface", "text"],
  ["A key figure before a run: its value, the ellipsis", "text-subtle", "surface", "text"],
  ["The language switch: the chosen language", "on-accent-soft", "accent-soft", "text"],
  ["The language switch: the chosen language's rim", "accent", "surface", "mark"],
  ["SIMULATION (a plain tag)", "neutral-text", "neutral-bg", "text"],
  // The talk bar.
  ["The current step's number", "on-accent", "accent", "text"],
  ["You are interacting with an AI system", "feature-text", "feature-bg", "text"],
  ["The AI notice's sparkle", "feature-solid", "feature-bg", "mark"],
  // The canvas on the honeycomb.
  ["The canvas's title on the honeycomb", "text", "bg-sunken", "text"],
  ["A block's name", "text", "surface", "text"],
  ["A block's question", "text-muted", "surface", "text"],
  ["The Strategyzer credit under the canvas, on the honeycomb", "text-muted", "bg-sunken", "text"],
  // The panel and the loading screen.
  ["The panel's title", "text", "surface", "text"],
  ["The panel's text", "text-muted", "surface", "text"],
  ["The loading screen's help", "text-muted", "bg", "text"]
];

/**
 * Colours that must stay apart, beyond the shared ones in tests/tokens.mjs: [what, token, token].
 * The test reports how far apart they stay under colour-vision deficiency; it does not fail on them.
 * The block states (under pressure, watch, clear) join with the simulation in 0.2.0.
 */
export const SEPARATIONS = [];

/**
 * The hexagon test's tour of the page (tests/hexagon.mjs): the guide as it opens on a new tab, its talk
 * track, the page under it, the German page and its guide. visit(name, { settle }) checks the page as
 * it is, settle ms (250) after the step.
 */
export async function hexagonTour(page, visit) {
  await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  await page.waitForSelector("dialog.vc-guide[open]", { timeout: 10000 });
  await visit("the guide as it opens");
  await page.click("dialog.vc-guide[open] .vc-guide__rail .vc-step__button >> nth=-1");
  await visit("the guide's talk track");
  await page.keyboard.press("Escape");
  await visit("the canvas");
  await page.click('.lang-option[data-lang="de"]');
  await visit("the canvas in German");
  await page.click('[data-vc-guide-open="guide-de"]');
  await page.waitForSelector("dialog#guide-de[open]", { timeout: 5000 });
  await visit("the German guide");
  await page.keyboard.press("Escape");
}

/**
 * The page icon (tests/page-icon.mjs): the icon and kind of this prototype's card on Victor's website
 * (VictorPflueger/VIP, data/prototypes.js), the colour of that kind's cell (Vici's lilac for a
 * prototype), and favicon.svg exactly: the card's cell drawn for small sizes. The card is added to the
 * website with 1.0.0.
 */
export const PAGE_ICON = {
  icon: "layout",
  kind: "prototype",
  tone: "lilac",
  favicon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 103.92">
  <!-- Business Model Canvas Challenger's page icon: Vici's layout icon in a lilac hexagon cell, as its card
       on Victor Pflüger's website will show it (icon and kind: VictorPflueger/VIP, data/prototypes.js).
       Vici's lilac 100 (#f2e9fd) and lilac 900 (#372544); the icon is drawn larger and a little bolder
       than on the card, centred on the cell, so that it still reads at 16 px. -->
  <polygon points="120,51.96 90,103.92 30,103.92 0,51.96 30,0 90,0" fill="#f2e9fd"/>
  <g transform="translate(9 0.96) scale(4.25)" fill="none" stroke="#372544" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 4.5 H20 V8 H4 Z M4 10.5 H9 V19.5 H4 Z M11.5 10.5 H20 V19.5 H11.5 Z"/>
  </g>
</svg>
`
};
