// Every step of every scenario at the two sizes the brief names, 1280 × 720 and 1920 × 1080, in both
// themes and both languages: 144 views, and the first scenario at 1366 × 768 and 1600 × 900 in both
// languages, two common laptop screens between them (AC-14: 1920 × 1080 to 1280 × 720). In each, the page fits the window without scrolling, sideways or
// down; the header holds the name, its controls and the three key figures in one band without overlap;
// the talk bar keeps Play, Back, the six steps, Next, Run it live and the AI notice on one line, the step
// labels clear of Play and Run it live; the nine blocks keep their names and state tags whole; the
// credit and "Fictional company, illustrative figures" stand under the canvas; the bar under the story,
// with its action, is in view; no text is cut off. An item's text on the canvas is the one exception the
// brief makes (§4.3): at 1280 × 720 it shows its first line, at 1920 × 1080 two, and a click opens the
// block with every item in full. Every block but the four half-height ones shows at least one of its items
// and the selected issue's own (TECH_NOTES §9), and a planted empty block is caught. At Adapt every option of every issue, Accept included, shows in full
// above the bar; on the other steps the panel shows its title and may scroll inside, never the page.
// The guide opens inside the window. Every target is at its size (the rule in TECH_NOTES §9 and the
// measure below): 40 px; 32 px on the canvas and in the panel, 44 px there with a touch screen; Vici's guide
// as Vici draws it; a link inside a line of text keeps the line. Each view is saved as a screenshot for a
// person to look at.
// A live run against the stand-in adds fourteen views to each of the eight sizes, themes and languages
// (G13 of M3, G12 of M4): the empty and the filled Start form, a block being entered, the dialog, the
// dialog with a private-data warning, an agent at work, the review, an AI item opened for review, the
// decision, the summary with its report bar, the report dialog, the question before Start again throws
// an undownloaded run away, a run stopped at its budget cap (with the report of what is done) and a run
// stopped by an error. The same rules hold, with LIVE on the tape, the fictional label only once the
// scenario's canvas is filled in (the run is of a fictional company), and the dialogs inside the window,
// their buttons in view. With the warning, the
// dialog's body may scroll, as Vici's live-run dialog says ("the body scrolls, the footer doesn't"),
// while the warning and the footer stay in view; the report dialog's pages scroll inside it, its
// downloads in view. The simulation's report dialog is measured at S1's Summary at every size, theme
// and language.
// Usage: node tests/layout.mjs [s1 s2 s3] [--no-live]
import path from "node:path";
import { APP_ROOT, launchBrowser, serveStatic, port, context, outDir, NETWORK_NOISE, ONLY, exit } from "./lib/harness.mjs";
import { install, live, apiError, KEY } from "./lib/standin.mjs";

const SCENARIOS = ONLY.length ? ONLY : ["s1", "s2", "s3"];
const STEPS = ["start", "complete", "challenge", "assess", "adapt", "summary"];
const ADAPT = 4;
const SIZES = [[1280, 720], [1920, 1080]];
const BETWEEN = [[1600, 900], [1366, 768]];
const LIVE = !process.argv.includes("--no-live");

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });

/** Everything this suite measures in the page, at one step. */
function measure() {
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
  const q = (s) => document.querySelector(s);
  const all = (s) => [...document.querySelectorAll(s)];
  // Shown to the eye: laid out, visible, and not one of the 1 px boxes that keep a word for screen readers.
  const shows = (el) => { if (!el.getClientRects().length || getComputedStyle(el).visibility === "hidden") return false; const r = el.getBoundingClientRect(); return r.width > 1 || r.height > 1; };
  const overlap = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  const doc = document.documentElement;
  // Text cut off: a text element whose content is wider or taller than its box while it clips, or that
  // ends outside the block, panel or bar that holds it. Items' texts on the canvas are the brief's one
  // exception; the block dialog shows them in full.
  const TEXT = [
    ".brand-name", ".mode-tag", ".guide-open", ".lang-option", ".vc-stat__label", ".kpi-main", ".kpi-part", ".kpi-note", ".vc-stat__was",
    ".intro-text", ".vc-byline", ".play", ".vc-step__label", ".live", ".ai-notice", ".stage-title", ".stage-lead",
    ".block-name", ".vc-framework__state", ".block-more", ".block-question", ".credit", ".fictional",
    ".panel-title", ".panel-note", ".company-name", ".company-meta", ".issue-pick__title", ".band-tag", ".issue-detail__title",
    ".issue-tab", ".option__kind", ".option__meta", ".option__title", ".option__changes", ".option__effect", ".options__legend",
    ".summary__col h3", ".vc-callout__title", ".turn-text", ".foot-note", ".cta",
    ".live-public", ".vc-label", ".vc-help", ".live-agent", ".panel-note"
  ].join(", ");
  const cut = [];
  for (const el of all(TEXT)) {
    if (!shows(el) || el.closest("dialog")) continue;
    const cs = getComputedStyle(el);
    const clips = cs.overflow !== "visible" || cs.textOverflow === "ellipsis" || cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.webkitLineClamp !== "none";
    const label = `${el.className.split(" ")[0] || el.tagName}: "${el.textContent.trim().slice(0, 40)}"`;
    if ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && clips) cut.push(label);
    const holder = el.closest(".block, .panel, .bar-wrap, #bar");
    if (holder && holder.matches(".block")) {
      const b = holder.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (r.bottom > b.bottom - 1 || r.right > b.right + 0.5) cut.push(`${label} ends outside the block ${holder.dataset.block}`);
    }
  }
  const header = q(".app-header");
  const tiles = all(".app-header .kpi").map(box);
  // The controls themselves, not their container: a grid column can shrink under buttons that overflow it.
  const controls = all(".brand, .header-actions > *").filter(shows).map(box);
  // Play stands aside in a live run: only what shows is lined up.
  const talkItems = [q("#play"), q("#btn-back"), ...all("#steps .vc-step"), q("#btn-next"), q("#live"), q(".talk .ai-notice")].filter((el) => el && shows(el)).map(box);
  const labels = all("#steps .vc-step__label").map(box);
  const labelClearance = Math.min(Math.min(...labels.map((l) => l.left)) - box(q("#btn-back") || q("#play")).right, box(q("#btn-next") || q("#live")).left - Math.max(...labels.map((l) => l.right)));
  // Targets (AC-14; the rule in TECH_NOTES §9, Victor's "Vici decides"): every control a person can press or
  // focus, at its size. 40 px each way by default. 32 px, Vici's small control size, on the canvas and in
  // the panel under it, which share one dense screen, and 44 px there with a touch screen (Vici's
  // comfortable minimum). Vici's own guide as Vici draws it, never under WCAG 2.2's 24 px. A link inside a
  // line of text keeps the line, as WCAG 2.2 exempts it; nothing else is exempt. A radio or a checkbox is
  // measured by its label, a tooltip's trigger by its anchor, which takes the pointer. With a modal dialog
  // open only its own controls count: the page behind it is inert.
  const coarse = matchMedia("(pointer: coarse)").matches;
  const minTarget = coarse ? 44 : 32;
  const modal = q("dialog[open]");
  const nameOf = (el) => (el.getAttribute("aria-label") || el.textContent.trim() || el.id || el.className || el.tagName).toString().replace(/\s+/g, " ").slice(0, 28);
  // A radio or a checkbox takes the clicks of its label and its own box, which Vici's segmented control lets
  // reach past the label: the target is the two together.
  const targetOf = (el) => {
    if (el.matches("input[type=radio], input[type=checkbox]")) {
      const label = el.closest("label") || (el.id && q(`label[for="${CSS.escape(el.id)}"]`));
      if (!label) return el;
      const a = label.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      const union = { left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) };
      return { getBoundingClientRect: () => ({ ...union, width: union.right - union.left, height: union.bottom - union.top }), getClientRects: () => label.getClientRects(), label };
    }
    if (el.matches("[tabindex]:not(button, a, input, select, textarea, summary)") && el.closest(".vc-tooltip-anchor")) return el.closest(".vc-tooltip-anchor");
    return el;
  };
  const inLine = (el) => el.matches("a") && getComputedStyle(el).display === "inline" && el.parentElement.textContent.replace(/\s+/g, " ").trim().length > el.textContent.replace(/\s+/g, " ").trim().length + 2;
  const targets = [];
  const inline = [];
  for (const el of all("button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [tabindex]:not([tabindex='-1'])")) {
    if (el.matches(".vc-skip-link") || (modal && !modal.contains(el)) || el.closest("dialog:not([open]), [inert]")) continue;
    const t = targetOf(el);
    if (!shows(t.label || t)) continue;
    if (inLine(el)) { inline.push(nameOf(el)); continue; }
    const zone = el.closest(".vc-guide") ? "guide" : el.closest(".canvas") ? "canvas" : el.closest("#panel") ? "panel" : "page";
    const min = zone === "guide" ? 24 : zone === "page" ? 40 : minTarget;
    const r = box(t);
    if (r.width < min - 0.5 || r.height < min - 0.5) targets.push(`${zone}: ${nameOf(el)} ${Math.round(r.width)}×${Math.round(r.height)} (needs ${min})`);
  }
  const blocks = all(".canvas .block").map((el) => {
    const b = box(el);
    const head = el.querySelector(".vc-framework__head");
    const states = [...el.querySelectorAll(".vc-framework__head .vc-framework__state")].filter(shows).map(box);
    const name = box(el.querySelector(".block-name"));
    const out = [name, ...states].some((r) => r.bottom > b.bottom - 1 || r.right > b.right + 0.5 || r.left < b.left - 0.5);
    // Its items, those in view, and the selected issue's own (data-rank 2) with those of them in view.
    const lis = [...el.querySelectorAll(".vc-framework__items > li")];
    const inView = lis.filter((li) => !li.hidden && shows(li));
    return { id: el.dataset.block, ...b, headCut: out, head: head ? Math.round(head.getBoundingClientRect().height) : 0,
      items: lis.length, shown: inView.length, issueItems: lis.filter((li) => li.dataset.rank === "2").length, issueShown: inView.filter((li) => li.dataset.rank === "2").length };
  });
  const workspace = q(".workspace");
  const current = all("#steps .vc-step").findIndex((li) => li.querySelector("button")?.getAttribute("aria-current") === "step");
  const panel = q("#panel");
  const bar = q("#bar");
  const cta = q("#btn-cta");
  return {
    current,
    live: document.body.dataset.mode === "live",
    tape: q("#mode-text")?.textContent.trim(),
    scrollX: doc.scrollWidth - doc.clientWidth,
    scrollY: doc.scrollHeight - doc.clientHeight,
    workspaceScroll: workspace.scrollHeight - workspace.clientHeight,
    viewport: { width: innerWidth, height: innerHeight },
    header: box(header),
    tilesOverlapActions: tiles.some((t) => controls.some((c) => overlap(t, c))),
    tilesOverlapEachOther: tiles.some((t, i) => tiles.some((u, j) => i < j && overlap(t, u))),
    talkTops: talkItems.map((b) => Math.round(b.top + b.height / 2)),
    talkRight: Math.max(...talkItems.map((b) => b.right)),
    labelClearance,
    targets,
    inline,
    minTarget,
    blocks,
    canvas: box(q(".canvas")),
    credit: box(q(".credit")),
    fictional: q(".fictional") && shows(q(".fictional")) ? box(q(".fictional")) : null,
    panel: box(panel),
    panelScroll: panel.scrollHeight - panel.clientHeight,
    bar: bar && shows(bar) ? box(bar) : null,
    cta: cta && shows(cta) ? box(cta) : null,
    byline: box(q(".vc-byline")),
    cut
  };
}

/** At Adapt: for every issue, its option cards and where they end, inside the panel and above the bar. */
async function adaptCards(page) {
  const tabs = page.locator(".adapt .issue-tab");
  const n = await tabs.count();
  const out = [];
  for (let i = 0; i < Math.max(1, n); i++) {
    if (n) { await tabs.nth(i).click(); await page.waitForTimeout(60); }
    out.push(await page.evaluate((i) => {
      const panel = document.querySelector("#panel").getBoundingClientRect();
      const bar = document.querySelector("#bar")?.getBoundingClientRect();
      const cards = [...document.querySelectorAll(".options__cards .option")].map((c) => {
        const r = c.getBoundingClientRect();
        const inner = [...c.querySelectorAll(".option__title, .option__changes, .option__effect")].map((e) => e.getBoundingClientRect().bottom);
        return { top: r.top, bottom: Math.max(r.bottom, ...inner), kind: c.dataset.kind };
      });
      return { issue: i + 1, cards, panelTop: panel.top, panelBottom: panel.bottom, barTop: bar ? bar.top : innerHeight };
    }, i));
  }
  return out;
}

/** The open dialog, if any: inside the window, its body without scrolling, its buttons in view. */
function measureDialog() {
  const d = document.querySelector("dialog[open]:not(.vc-guide)");
  if (!d) return null;
  const r = d.getBoundingClientRect();
  const body = d.querySelector(".vc-dialog__body") || d;
  const buttons = [...d.querySelectorAll(".vc-dialog__footer button, .vc-dialog__footer .vc-tag, .vc-dialog__header button")].filter((el) => el.getClientRects().length);
  const hidden = buttons.filter((el) => { const b = el.getBoundingClientRect(); return b.top < Math.max(r.top, 0) - 0.5 || b.bottom > Math.min(r.bottom, innerHeight) + 0.5; }).map((el) => (el.textContent.trim() || el.getAttribute("aria-label") || el.className).slice(0, 24));
  const b = body.getBoundingClientRect();
  const warning = d.querySelector(".vc-live__warning:not([hidden])");
  const w = warning ? warning.getBoundingClientRect() : null;
  return { id: d.id, inside: r.top >= -0.5 && r.left >= -0.5 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5, scroll: body.scrollHeight - body.clientHeight, sideways: d.scrollWidth - d.clientWidth, buttons: buttons.length, hidden,
    warning: w ? { shown: w.top >= b.top - 0.5 && w.bottom <= b.bottom + 0.5, top: Math.round(w.top), bottom: Math.round(w.bottom), bodyBottom: Math.round(b.bottom) } : null };
}

/**
 * A live run against the stand-in, measured at each of its screens. The stand-in answers with S1's
 * recorded answers in the page's language; `scene` holds the Completer back, makes it costly enough
 * for a cap of €0.05 to stop the run, or answers it with a billing error.
 */
async function liveViews(page, ctx, { base, width, height, theme, lang, shots }) {
  const scene = { hold: null, cap: false, error: false };
  await install(ctx, {
    lang,
    script: (agent) => {
      if (scene.error && agent === "completer") return apiError(402, "billing_error", "Your credit balance is too low to access the Anthropic API.");
      if (scene.hold && agent === "completer") return scene.hold.then(() => undefined);
      return undefined;
    },
    usage: (agent) => (scene.cap && agent === "completer" ? { input_tokens: 1000, output_tokens: 110000 } : {})
  });
  const views = [];
  const shot = async (name, want = {}) => {
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(300); // a checkbox's tick fades in
    const m = await page.evaluate(measure);
    const d = await page.evaluate(measureDialog);
    await page.screenshot({ path: path.join(shots, `${width}x${height}-${theme}-${lang}-live-${String(views.length).padStart(2, "0")}-${name}.png`) });
    views.push({ name, m, d, ...want });
  };
  const closeDialog = async () => { await page.keyboard.press("Escape"); await page.waitForSelector("dialog[open]:not(.vc-guide)", { state: "detached", timeout: 3000 }).catch(() => {}); };

  await page.goto(`${base}?guide=0&lang=${lang}`);
  await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  await page.waitForSelector("#boot", { state: "detached", timeout: 5000 }).catch(() => {});
  await live.enter(page);
  await shot("start-empty", { step: 0, decides: true });
  await live.sample(page);
  await shot("start-filled", { step: 0, decides: true });
  await page.click("#blk-value"); // the block with the most items of S1's canvas
  await page.waitForSelector("#block-dialog[open]");
  await shot("block-entry", { step: 0, dialog: "block-dialog" });
  await closeDialog();
  // The dialog as most people see it: the key typed, the acknowledgement ticked. Then at its tallest,
  // with a private-data warning: Vici's body scrolls there and the footer stays, so the start button,
  // the AI notice and the warning itself must be in view.
  await live.openDialog(page);
  await page.fill("#live-key", KEY);
  await page.check("#live-ack", { force: true });
  await shot("dialog", { dialog: "live-dialog" });
  await closeDialog();
  // The address is joined here, on the reserved example.com domain: no file carries one (tests/hygiene.mjs).
  await page.fill("#live-line", `${await page.inputValue("#live-line")} Contact: ${["jane.doe", "example.com"].join("@")}`.slice(0, 140));
  await live.openDialog(page);
  await page.fill("#live-key", KEY);
  await page.check("#live-ack", { force: true });
  const warned = await page.isVisible("#live-warning");
  await shot("dialog-warning", { dialog: "live-dialog", tallest: true, warned });
  // An agent at work: the Completer is held until the view is measured.
  let release;
  scene.hold = new Promise((r) => { release = r; });
  await page.click("#live-start");
  await page.waitForFunction(() => window.BMC.state.live.status === "working" && window.BMC.state.live.agent === "completer", null, { timeout: 15000 });
  await page.waitForTimeout(1100);
  await shot("working", { step: 0, work: true });
  release();
  scene.hold = null;
  await live.waitFor(page, "review");
  await shot("review", { step: 1, decides: true });
  // An AI item opened for review: the block with the most AI items, each with its field to rewrite it.
  await page.click('#canvas .vc-item[data-source="ai"] .item-open[data-open="partners"] >> nth=0');
  await page.waitForSelector("#block-dialog[open]");
  await shot("review-dialog", { step: 1, dialog: "block-dialog" });
  await closeDialog();
  await page.click("#btn-cta");
  await live.waitFor(page, "decision", 30000);
  await shot("decision", { step: 4, decides: true, adapt: await adaptCards(page) });
  await page.click("#btn-cta");
  await live.waitFor(page, "done");
  await shot("summary", { step: 5 });
  await page.click("#btn-cta"); // Download the report
  await page.waitForSelector("#report-dialog[open] #report");
  await shot("report-dialog", { dialog: "report-dialog", document: true });
  await closeDialog();
  // Stopped at the budget cap: the Completer's answer costs more than a cap of €0.05 leaves for the Red team.
  scene.cap = true;
  await page.click("#btn-second"); // Start again, beside Download the report: the report isn't downloaded, so it asks
  await page.waitForSelector("#discard-dialog[open]");
  await shot("discard", { dialog: "discard-dialog" });
  await page.click("#discard-go");
  await live.openDialog(page);
  await page.$eval("#live-cap", (el) => { el.value = "0.05"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.check("#live-ack", { force: true });
  await page.click("#live-start");
  await live.waitFor(page, "review");
  await page.click("#btn-cta");
  const capped = await live.waitFor(page, "stopped");
  await shot("stopped-cap", { stopped: capped.stopped?.cause });
  scene.cap = false;
  // Stopped by an error the API returns: a billing error, which is never retried.
  scene.error = true;
  await page.click("#btn-second"); // Start again, beside Report of what is done
  await page.click("#discard-go");
  await live.openDialog(page);
  await page.check("#live-ack", { force: true });
  await page.click("#live-start");
  const failed = await live.waitFor(page, "stopped");
  await shot("stopped-error", { stopped: failed.stopped?.cause });
  scene.error = false;
  return views;
}

const server = await serveStatic(APP_ROOT, port(9180));
const browser = await launchBrowser();
const shots = await outDir("layout");
let views = 0;
let liveCount = 0;
try {
  // The two ends the brief names in both themes and languages with every scenario and a live run, and two
  // common laptop and office screens between them with the default scenario, light, in both languages.
  const RUNS = [];
  for (const [width, height] of SIZES) for (const theme of ["light", "dark"]) for (const lang of ["en", "de"]) RUNS.push({ width, height, theme, lang, scenarios: SCENARIOS, live: LIVE });
  for (const [width, height] of BETWEEN) for (const lang of ["en", "de"]) RUNS.push({ width, height, theme: "light", lang, scenarios: SCENARIOS.filter((s) => s === "s1"), live: false });
  for (const { width, height, theme, lang, scenarios, live: withLive } of RUNS) {
    const size = `${width} × ${height}, ${theme}, ${lang === "en" ? "English" : "German"}`;
    const { context: ctx, outside } = await context(browser, { width, height, colorScheme: theme });
    await ctx.addInitScript((t) => { try { localStorage.setItem("vc-theme", t); } catch { /* blocked storage */ } }, theme);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });

    // The guide as it opens: inside the window, nothing sideways; the loading screen's help stays hidden.
    await page.goto(`${server.base}?lang=${lang}`);
    await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
    await page.waitForSelector("dialog.vc-guide[open]", { timeout: 10000 });
    const guide = await page.evaluate(() => {
      const d = document.querySelector("dialog.vc-guide[open]");
      const r = d.getBoundingClientRect();
      return { id: d.id, inside: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5, sideways: d.scrollWidth - d.clientWidth };
    });
    const bootHelp = await page.evaluate(() => [...document.querySelectorAll("#boot .boot-help")].some((el) => getComputedStyle(el).visibility === "visible" && !el.hidden));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(shots, `${width}x${height}-${theme}-${lang}-guide.png`) });
    check(guide.id === `guide-${lang}` && guide.inside && guide.sideways <= 0, `${size}: the guide opens in its language inside the window`, JSON.stringify(guide));
    check(!bootHelp, `${size}: the loading screen's help stays hidden after a normal start`);
    const guideTargets = (await page.evaluate(measure)).targets;
    check(!guideTargets.length, `${size}: in the guide every target is at least 24 px, as Vici draws its own guide`, guideTargets.slice(0, 4).join("; "));

    const problems = { fit: [], stepper: [], header: [], talk: [], clearance: [], targets: [], blocks: [], heads: [], credit: [], bar: [], cut: [], panel: [], scrolls: [], adapt: [], items: [] };
    // The four half-height blocks may keep only their name, state and count on a short screen; every other
    // block shows at least one item, and the selected issue's own (TECH_NOTES §9).
    const HALF = new Set(["activities", "resources", "relationships", "channels"]);
    const emptied = (m) => m.blocks.filter((b) => !HALF.has(b.id) && ((b.items && !b.shown) || (b.issueItems && !b.issueShown))).map((b) => `${b.id} (${b.shown} of ${b.items} in view${b.issueItems ? `, the issue's ${b.issueShown} of ${b.issueItems}` : ""})`);
    let plantedCaught = null;
    const inlineLinks = new Set();
    let adaptChecked = 0;
    for (const sc of scenarios) for (let step = 0; step < STEPS.length; step++) {
      const at = `${sc} ${STEPS[step]}`;
      await page.goto(`${server.base}?guide=0&lang=${lang}&scenario=${sc}&step=${step}`);
      await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
      // The loading screen fades out: measured and shot once it is gone.
      await page.waitForSelector("#boot", { state: "detached", timeout: 5000 }).catch(() => {});
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(80);
      const m = await page.evaluate(measure);
      await page.screenshot({ path: path.join(shots, `${width}x${height}-${theme}-${lang}-${sc}-${step}-${STEPS[step]}.png`) });
      views += 1;
      const vh = m.viewport.height;
      if (!(m.scrollX <= 0 && m.scrollY <= 0 && m.workspaceScroll <= 1)) problems.fit.push(`${at} (x ${m.scrollX}, y ${m.scrollY}, workspace ${m.workspaceScroll})`);
      if (m.current !== step) problems.stepper.push(`${at} (the stepper marks ${m.current + 1})`);
      if (!(m.header.height <= (height <= 720 ? 112 : 120) && !m.tilesOverlapActions && !m.tilesOverlapEachOther)) problems.header.push(`${at} (${Math.round(m.header.height)} px)`);
      if (!(Math.max(...m.talkTops) - Math.min(...m.talkTops) <= 4 && m.talkRight <= m.viewport.width)) problems.talk.push(`${at} (centres ${m.talkTops.join(", ")})`);
      if (!(m.labelClearance >= 8)) problems.clearance.push(`${at} (${Math.round(m.labelClearance)} px)`);
      if (m.targets.length) problems.targets.push(`${at}: ${m.targets.slice(0, 4).join(", ")}`);
      for (const l of m.inline) inlineLinks.add(l);
      const tiny = m.blocks.filter((b) => b.width < 110 || b.height < 32);
      if (m.blocks.length !== 9 || tiny.length) problems.blocks.push(`${at}: ${tiny.map((b) => `${b.id} ${Math.round(b.width)}×${Math.round(b.height)}`).join(", ")}`);
      const heads = m.blocks.filter((b) => b.headCut);
      if (heads.length) problems.heads.push(`${at}: ${heads.map((b) => b.id).join(", ")}`);
      if (!(m.credit.bottom <= vh && m.credit.top >= m.canvas.bottom - 1 && m.fictional && m.fictional.top >= m.canvas.bottom - 1 && m.byline.bottom <= m.canvas.top)) problems.credit.push(at);
      if (!(m.bar && m.cta && m.bar.bottom <= vh + 0.5 && m.cta.bottom <= vh + 0.5 && m.bar.top >= m.panel.bottom - 1)) problems.bar.push(`${at} (bar ${m.bar ? `${Math.round(m.bar.top)}–${Math.round(m.bar.bottom)}` : "missing"}, window ${vh})`);
      if (m.cut.length) problems.cut.push(`${at}: ${m.cut.slice(0, 4).join("; ")}`);
      const empty = emptied(m);
      if (empty.length) problems.items.push(`${at}: ${empty.join(", ")}`);
      // Control, once per size: Revenue streams with every item hidden must be caught.
      if (plantedCaught === null && STEPS[step] === "challenge") {
        await page.evaluate(() => { for (const li of document.querySelectorAll('#canvas .block[data-block="revenue"] .vc-framework__items > li')) li.hidden = true; });
        const planted = await page.evaluate(measure);
        plantedCaught = emptied(planted).some((x) => x.startsWith("revenue"));
      }
      // Where the person decides (the company, the review of the AI's items, the responses) the panel
      // shows everything; elsewhere it may scroll inside, and the scroll is reported.
      if (m.panelScroll > 1) (["start", "complete", "adapt"].includes(STEPS[step]) ? problems.panel : problems.scrolls).push(`${at} (${m.panelScroll} px)`);
      if (step === ADAPT) {
        for (const a of await adaptCards(page)) {
          adaptChecked += 1;
          const bad = a.cards.filter((c) => c.top < a.panelTop - 0.5 || c.bottom > a.panelBottom + 0.5 || c.bottom > a.barTop + 0.5);
          if (a.cards.length < 2 || !a.cards.some((c) => c.kind === "accept") || bad.length) problems.adapt.push(`${at} issue ${a.issue}: ${a.cards.length} cards, ${bad.length} cut (panel ${Math.round(a.panelTop)}–${Math.round(a.panelBottom)}, bar ${Math.round(a.barTop)}, cards end ${a.cards.map((c) => Math.round(c.bottom)).join(", ")})`);
        }
      }
    }
    const n = scenarios.length * STEPS.length;
    check(!problems.fit.length, `${size}: all ${n} steps fit the window, no scrolling sideways or down`, problems.fit.slice(0, 4).join("; "));
    check(!problems.stepper.length, `${size}: the stepper marks the step shown`, problems.stepper.slice(0, 4).join("; "));
    check(!problems.header.length, `${size}: the header holds name, controls and three figures in one band on every step`, problems.header.slice(0, 4).join("; "));
    check(!problems.talk.length, `${size}: Play, Back, the six steps, Next, Run it live and the AI notice stand on one line`, problems.talk.slice(0, 4).join("; "));
    check(!problems.clearance.length, `${size}: the step labels keep clear of Back and Next`, problems.clearance.slice(0, 4).join("; "));
    check(!problems.targets.length, `${size}: on every step every target is at its size: 40 px, 32 px on the canvas and in the panel (Vici's small control size), the byline's links and the mode tag's hover area 40 px; only links inside a line of text keep the line (${[...inlineLinks].join(", ")})`, problems.targets.slice(0, 4).join("; "));
    check(!problems.blocks.length, `${size}: the nine blocks have room on every step`, problems.blocks.slice(0, 4).join("; "));
    check(!problems.heads.length, `${size}: every block keeps its name and its state tags whole`, problems.heads.slice(0, 6).join("; "));
    check(!problems.credit.length, `${size}: the byline above the canvas, the credit and the fictional label under it, on every step`, problems.credit.slice(0, 4).join("; "));
    check(!problems.bar.length, `${size}: the bar under the story and its action are in view on every step`, problems.bar.slice(0, 4).join("; "));
    check(!problems.cut.length, `${size}: no text is cut off, items' first lines on the canvas apart`, problems.cut.slice(0, 4).join(" | "));
    check(!problems.panel.length, `${size}: where the person decides (Start, Complete, Adapt) the panel shows everything without scrolling`, problems.panel.slice(0, 4).join("; "));
    check(!problems.scrolls.length, `${size}: the panels of Challenge, Assess and Summary show everything without scrolling`, problems.scrolls.slice(0, 6).join("; "));
    check(!problems.items.length && plantedCaught, `${size}: on every step every block but the four half-height ones shows at least one of its items, and the selected issue's own; a planted empty block is caught`, problems.items.slice(0, 4).join("; ") || (plantedCaught ? "" : "the planted empty Revenue streams went unnoticed"));
    // The report dialog at S1's Summary: inside the window, nothing sideways, the downloads and the
    // Ideator link in view in its footer, the pages at size scrolling inside its body.
    await page.goto(`${server.base}?guide=0&lang=${lang}&scenario=s1&step=5`);
    await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
    await page.waitForSelector("#boot", { state: "detached", timeout: 5000 }).catch(() => {});
    await page.click("#btn-cta");
    await page.waitForSelector("#report-dialog[open] #report");
    await page.waitForTimeout(300);
    const rd = await page.evaluate(measureDialog);
    const reportTargets = (await page.evaluate(measure)).targets;
    const ideator = await page.evaluate(() => { const a = document.getElementById("rp-ideator").getBoundingClientRect(); const d = document.getElementById("report-dialog").getBoundingClientRect(); return a.top >= d.top && a.bottom <= Math.min(d.bottom, innerHeight); });
    const sheet = await page.evaluate(() => Math.round(document.querySelector("#report .vc-report__page").getBoundingClientRect().width));
    await page.screenshot({ path: path.join(shots, `${width}x${height}-${theme}-${lang}-report-dialog.png`) });
    views += 1;
    check(rd && rd.id === "report-dialog" && rd.inside && rd.sideways <= 0 && rd.buttons >= 4 && !rd.hidden.length && ideator && sheet >= 600, `${size}: the report dialog sits inside the window, its downloads and the Ideator link in view, its pages ${sheet} px wide scrolling inside it`, JSON.stringify({ ...rd, ideator, sheet }));
    check(!reportTargets.length, `${size}: in the report dialog every target is at least 40 px`, reportTargets.slice(0, 4).join("; "));
    check(adaptChecked >= scenarios.length * 5 && !problems.adapt.length, `${size}: at Adapt every option of every issue, Accept included, shows in full above the bar (${adaptChecked} issues)`, problems.adapt.slice(0, 4).join("; "));
    // ---- the live run --------------------------------------------------------------------------------
    if (withLive) {
      const lv = await liveViews(page, ctx, { base: server.base, width, height, theme, lang, shots });
      liveCount += lv.length;
      views += lv.length;
      const bad = { fit: [], header: [], talk: [], tape: [], targets: [], credit: [], bar: [], cut: [], panel: [], scrolls: [], stepper: [], dialog: [], states: [] };
      for (const v of lv) {
        const { m, d } = v;
        const at = `live ${v.name}`;
        const vh = m.viewport.height;
        if (!(m.scrollX <= 0 && m.scrollY <= 0 && m.workspaceScroll <= 1)) bad.fit.push(`${at} (x ${m.scrollX}, y ${m.scrollY}, workspace ${m.workspaceScroll})`);
        if (!(m.header.height <= (height <= 720 ? 112 : 120) && !m.tilesOverlapActions && !m.tilesOverlapEachOther)) bad.header.push(`${at} (${Math.round(m.header.height)} px)`);
        if (!(Math.max(...m.talkTops) - Math.min(...m.talkTops) <= 4 && m.talkRight <= m.viewport.width && m.labelClearance >= 8)) bad.talk.push(`${at} (centres ${m.talkTops.join(", ")}, clearance ${Math.round(m.labelClearance)})`);
        // The run is of Tidewell Lines, filled in from its scenario: fictional, and the label says so, under
        // the canvas, from the moment its canvas is filled in.
        const fictional = v.name !== "start-empty";
        if (!(m.live && m.tape && (fictional ? m.fictional && m.fictional.top >= m.canvas.bottom - 1 : m.fictional === null))) bad.tape.push(`${at} (live ${m.live}, tape "${m.tape}", fictional ${m.fictional ? "shown" : "hidden"})`);
        if (m.targets.length) bad.targets.push(`${at}: ${m.targets.slice(0, 4).join(", ")}`);
        if (!(m.credit.bottom <= vh && m.credit.top >= m.canvas.bottom - 1 && m.byline.bottom <= m.canvas.top)) bad.credit.push(at);
        if (!v.dialog && !(m.bar && m.cta && m.bar.bottom <= vh + 0.5 && m.cta.bottom <= vh + 0.5 && m.bar.top >= m.panel.bottom - 1)) bad.bar.push(`${at} (bar ${m.bar ? `${Math.round(m.bar.top)}–${Math.round(m.bar.bottom)}` : "missing"}, action ${m.cta ? "shown" : "missing"}, window ${vh})`);
        if (m.cut.length) bad.cut.push(`${at}: ${m.cut.slice(0, 4).join("; ")}`);
        if (m.panelScroll > 1) (v.decides ? bad.panel : bad.scrolls).push(`${at} (${m.panelScroll} px)`);
        if (v.step !== undefined && m.current !== v.step) bad.stepper.push(`${at} (the stepper marks ${m.current + 1}, not ${v.step + 1})`);
        if (v.dialog && !(d && d.id === v.dialog && d.inside && (v.tallest || v.document || d.scroll <= 1) && d.sideways <= 0 && d.buttons > 0 && !d.hidden.length && (!v.tallest || d.warning?.shown))) bad.dialog.push(`${at}: ${JSON.stringify(d)}`);
        if (v.adapt) for (const a of v.adapt) {
          const out = a.cards.filter((c) => c.top < a.panelTop - 0.5 || c.bottom > a.panelBottom + 0.5 || c.bottom > a.barTop + 0.5);
          if (a.cards.length < 2 || out.length) bad.panel.push(`${at} issue ${a.issue}: ${a.cards.length} cards, ${out.length} cut`);
        }
      }
      const by = (n) => lv.find((v) => v.name === n) || {};
      if (!by("dialog-warning").warned) bad.states.push("the dialog showed no private-data warning");
      if (by("stopped-cap").stopped !== "cap") bad.states.push(`the cap run stopped with ${by("stopped-cap").stopped}`);
      if (by("stopped-error").stopped !== "billing") bad.states.push(`the error run stopped with ${by("stopped-error").stopped}`);
      if (!by("working").work || !by("working").m?.cta) bad.states.push("no Abort while the agent worked");
      const names = lv.map((v) => v.name).join(", ");
      check(lv.length === 14 && !bad.states.length, `${size}: the live run shows its fourteen screens (${names})`, bad.states.join("; "));
      check(!bad.fit.length, `${size}: every live screen fits the window, no scrolling sideways or down`, bad.fit.slice(0, 4).join("; "));
      check(!bad.header.length && !bad.talk.length, `${size}: on every live screen the header keeps one band and the talk bar one line`, [...bad.header, ...bad.talk].slice(0, 4).join("; "));
      check(!bad.tape.length, `${size}: every live screen says LIVE on the tape; the fictional label stands under the canvas once Tidewell Lines's canvas is filled in, and not before`, bad.tape.slice(0, 4).join("; "));
      check(!bad.targets.length, `${size}: on every live screen and in every dialog each target is at its size: 40 px, 32 px on the canvas and in the panel`, bad.targets.slice(0, 4).join("; "));
      check(!bad.credit.length, `${size}: on every live screen the byline stands above the canvas and the credit under it`, bad.credit.slice(0, 4).join("; "));
      check(!bad.bar.length, `${size}: on every live screen the bar and its action are in view`, bad.bar.slice(0, 4).join("; "));
      check(!bad.cut.length, `${size}: no text is cut off on a live screen, items' first lines on the canvas apart`, bad.cut.slice(0, 4).join(" | "));
      check(!bad.panel.length, `${size}: where the person decides in a live run (the Start form, the review, the decision) the panel shows everything without scrolling`, bad.panel.slice(0, 4).join("; "));
      check(!bad.scrolls.length, `${size}: the other live panels show everything without scrolling`, bad.scrolls.slice(0, 6).join("; "));
      check(!bad.stepper.length, `${size}: the stepper marks the live step shown`, bad.stepper.slice(0, 4).join("; "));
      check(!bad.dialog.length, `${size}: the block dialog and the live-run dialog sit inside the window without scrolling, every button in view; with a private-data warning the body may scroll, as Vici's pattern says, the warning and the footer in view; the report dialog's pages scroll inside it, its downloads in view`, bad.dialog.slice(0, 4).join("; "));
    }
    check(!errors.length && !outside.length, `${size}: no errors, no request to another site`, [...errors, ...outside].slice(0, 4).join(" | "));
    await ctx.close();
  }
  // With a coarse pointer (a touch screen) every target on the canvas and in the panel is at least 44 px,
  // Vici's comfortable minimum for touch, and every other target keeps its 40 px: every step of S2 (the
  // remove switches at Complete, the "+2" chips and the issue list at Challenge, the issue switches at
  // Assess and Adapt, the first steps at Summary). The panel may then scroll inside, as it may on a step
  // where nothing is decided.
  for (const [width, height] of SIZES) {
    const { context: ctx } = await context(browser, { width, height, hasTouch: true });
    const page = await ctx.newPage();
    const small = [];
    for (let step = 0; step < STEPS.length; step++) {
      await page.goto(`${server.base}?guide=0&scenario=s2&step=${step}`);
      await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
      await page.waitForSelector("#boot", { state: "detached", timeout: 5000 }).catch(() => {});
      const m = await page.evaluate(measure);
      if (m.minTarget !== 44) small.push("the page did not see a coarse pointer");
      small.push(...m.targets.map((s) => `${STEPS[step]}: ${s}`));
    }
    check(!small.length, `${width} × ${height} with a touch screen: every target on the canvas and in the panel is at least 44 × 44 px, every other 40 px`, small.slice(0, 4).join("; "));
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} layout checks passed on ${views} views (${liveCount} of a live run). Screenshots: ${shots}`);
if (!failed) console.log("LAYOUT OK");
exit(failed ? 1 : 0);
