// The screen at the two sizes the brief names, 1280 × 720 and 1920 × 1080, in both themes and both
// languages: eight views. In each, the page fits the window without scrolling, sideways or down; the
// header holds the name, its controls and the three key figures in one band without overlap; the talk
// bar keeps Play, the six steps, Run it live and the AI notice on one line; the nine blocks show their
// names and questions whole; the credit and the panel stay on screen; no text is cut off; the guide
// opens inside the window; the step labels keep clear of Play and Run it live; the header's and the talk
// bar's controls are at least 40 px. Each view is saved as a screenshot for a person to look at.
// Usage: node tests/layout.mjs
import path from "node:path";
import { APP_ROOT, launchBrowser, serveStatic, port, context, outDir, NETWORK_NOISE } from "./lib/harness.mjs";

const VIEWS = [];
for (const [width, height] of [[1280, 720], [1920, 1080]]) for (const theme of ["light", "dark"]) for (const lang of ["en", "de"]) VIEWS.push({ width, height, theme, lang });

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });

/** Everything this suite measures, in the page. */
function measure() {
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
  const q = (s) => document.querySelector(s);
  const all = (s) => [...document.querySelectorAll(s)];
  const overlap = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  const doc = document.documentElement;
  // Text cut off: a text element whose content is wider or taller than its box while it clips.
  const TEXT = ".brand-name, .mode-tag, .guide-open, .lang-option, .vc-stat__label, .kpi-value, .kpi-note, .intro-text, .vc-byline, .play, .vc-step__label, .live, .ai-notice, .stage-title, .block-name, .block-question, .credit, .build-title, .build-text";
  const cut = [];
  for (const el of all(TEXT)) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    const clips = cs.overflow !== "visible" || cs.textOverflow === "ellipsis" || cs.overflowX !== "visible" || cs.overflowY !== "visible";
    if ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && clips) cut.push(`${el.className.split(" ")[0] || el.tagName}: "${el.textContent.trim().slice(0, 40)}"`);
    // A block clips its children: the question must end inside the block.
    const block = el.closest(".block");
    if (block && el.getBoundingClientRect().bottom > block.getBoundingClientRect().bottom - 2) cut.push(`${el.className} in ${block.dataset.block}: "${el.textContent.trim().slice(0, 40)}"`);
  }
  const header = q(".app-header");
  const tiles = all(".app-header .kpi").map(box);
  const actions = box(q(".header-actions"));
  const brand = box(q(".brand"));
  const talkItems = [q("#play"), ...all("#steps .vc-step"), q("#live"), q(".ai-notice")].map(box);
  const labels = all("#steps .vc-step__label").map(box);
  const labelClearance = Math.min(Math.min(...labels.map((l) => l.left)) - box(q("#play")).right, box(q("#live")).left - Math.max(...labels.map((l) => l.right)));
  // Targets of 40 px (brief AC-14) for the header's controls and the talk bar's; the byline's two links
  // are Vici's own component, measured with the rest of AC-14 in 1.0.0.
  const small = all(".app-header button, .talk button").filter((el) => el.getClientRects().length).map((el) => ({ el, r: box(el) }))
    .filter(({ r }) => r.width < 40 - 0.5 || r.height < 40 - 0.5).map(({ el, r }) => `${(el.textContent.trim() || el.getAttribute("aria-labelledby") || el.className).slice(0, 20)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  const blocks = all(".canvas .block").map((el) => ({ id: el.dataset.block, ...box(el) }));
  const workspace = q(".workspace");
  return {
    scrollX: doc.scrollWidth - doc.clientWidth,
    scrollY: doc.scrollHeight - doc.clientHeight,
    workspaceScroll: workspace.scrollHeight - workspace.clientHeight,
    viewport: { width: innerWidth, height: innerHeight },
    header: box(header),
    tilesOverlapActions: tiles.some((t) => overlap(t, actions)) || tiles.some((t) => overlap(t, brand)),
    tilesOverlapEachOther: tiles.some((t, i) => tiles.some((u, j) => i < j && overlap(t, u))),
    talkTops: talkItems.map((b) => Math.round(b.top + b.height / 2)),
    talkRight: Math.max(...talkItems.map((b) => b.right)),
    labelClearance,
    small,
    blocks,
    canvas: box(q(".canvas")),
    credit: box(q(".credit")),
    panel: box(q(".panel.build")),
    byline: box(q(".vc-byline")),
    cut
  };
}

const server = await serveStatic(APP_ROOT, port(9180));
const browser = await launchBrowser();
const shots = await outDir("layout");
try {
  for (const v of VIEWS) {
    const name = `${v.width} × ${v.height}, ${v.theme}, ${v.lang === "en" ? "English" : "German"}`;
    const { context: ctx, outside } = await context(browser, { width: v.width, height: v.height, colorScheme: v.theme });
    await ctx.addInitScript((t) => { try { localStorage.setItem("vc-theme", t); } catch { /* blocked storage */ } }, v.theme);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
    await page.goto(`${server.base}?lang=${v.lang}`);
    await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
    await page.waitForSelector("dialog.vc-guide[open]", { timeout: 10000 });
    // The guide as it opens: inside the window, nothing sideways.
    const guide = await page.evaluate(() => {
      const d = document.querySelector("dialog.vc-guide[open]");
      const r = d.getBoundingClientRect();
      return { id: d.id, inside: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5, sideways: d.scrollWidth - d.clientWidth };
    });
    // The loading screen fades out under the guide: neither its help nor anything else of it shows.
    const bootHelp = await page.evaluate(() => [...document.querySelectorAll("#boot .boot-help")].some((el) => getComputedStyle(el).visibility === "visible" && !el.hidden));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(shots, `${v.width}x${v.height}-${v.theme}-${v.lang}-guide.png`) });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog.vc-guide[open]"), null, { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    const m = await page.evaluate(measure);
    await page.screenshot({ path: path.join(shots, `${v.width}x${v.height}-${v.theme}-${v.lang}.png`) });

    const vh = m.viewport.height;
    check(guide.id === `guide-${v.lang}` && guide.inside && guide.sideways <= 0, `${name}: the guide opens in its language inside the window`, JSON.stringify(guide));
    check(!bootHelp, `${name}: the loading screen's help stays hidden after a normal start`);
    check(m.scrollX <= 0 && m.scrollY <= 0 && m.workspaceScroll <= 1, `${name}: the page fits the window, no scrolling sideways or down`, `x ${m.scrollX}, y ${m.scrollY}, workspace ${m.workspaceScroll}`);
    check(m.header.height <= (v.height <= 720 ? 112 : 120) && !m.tilesOverlapActions && !m.tilesOverlapEachOther, `${name}: the header holds name, controls and three figures in one band (${Math.round(m.header.height)} px)`);
    const spread = Math.max(...m.talkTops) - Math.min(...m.talkTops);
    check(spread <= 4 && m.talkRight <= m.viewport.width, `${name}: Play, the six steps, Run it live and the AI notice stand on one line`, `centres ${m.talkTops.join(", ")}`);
    const small = m.blocks.filter((b) => b.height < (v.height <= 720 ? 80 : 140) || b.width < 110);
    check(m.labelClearance >= 16, `${name}: the step labels keep 16 px from Play and Run it live (${Math.round(m.labelClearance)} px)`);
    check(!m.small.length, `${name}: every control in the header and the talk bar is at least 40 × 40 px`, m.small.join(", "));
    check(m.blocks.length === 9 && !small.length, `${name}: the nine blocks have room (the smallest ${Math.round(Math.min(...m.blocks.map((b) => b.height)))} px high)`, small.map((b) => `${b.id} ${Math.round(b.width)}×${Math.round(b.height)}`).join(", "));
    check(m.credit.bottom <= vh && m.credit.top >= m.canvas.bottom - 1 && m.panel.bottom <= vh, `${name}: the credit stands under the canvas and the panel stays on screen`, `credit ${Math.round(m.credit.top)}–${Math.round(m.credit.bottom)}, panel bottom ${Math.round(m.panel.bottom)}, window ${vh}`);
    check(m.byline.bottom <= m.canvas.top && m.byline.right <= m.viewport.width, `${name}: the byline is on screen above the canvas`);
    check(!m.cut.length, `${name}: no text is cut off`, m.cut.slice(0, 6).join("; "));
    check(!errors.length && !outside.length, `${name}: no errors, no request to another site`, [...errors, ...outside].slice(0, 4).join(" | "));
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} layout checks passed. Screenshots: ${shots}`);
if (!failed) console.log("LAYOUT OK");
process.exit(failed ? 1 : 0);
