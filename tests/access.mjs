// Accessibility (AC-14), in Chromium at 1280 × 720. Adapted from the PESTEL Challenger 1.0.0's tests/access.mjs
// (907b1c7), which took its keyboard pass and its motion checks from the Data Quality Agent 2.2.0, for this
// tool's steps and dialogs:
//   keyboard   with the keyboard alone a scenario runs from the guide that opens by itself to the Summary:
//              Escape closes the guide, Space pauses Play, Tab and Enter press each step's action, Enter
//              removes an AI item at Complete, the arrow keys change a choice at Adapt, Enter applies it,
//              and the report dialog saves the PDF and the HTML and handoff files; a live run goes the
//              same way against the stand-in, from Run it live through the form (the sample canvas taken
//              with Enter, the company typed, the sector chosen by typing), a block's dialog (an item
//              typed, then removed), the live-run dialog (the key typed, the box ticked with Space), the review,
//              Adapt and Apply to its Summary, its report and the question before Start again throws it away;
//   focus      on every step of both runs and in each dialog (the guide, a block's dialog, the live-run
//              dialog, the report dialog, the question), every stop of the Tab order is a visible control
//              and shows that it has the focus: the control looks different focused than not (a pixel
//              comparison of its box, so a ring drawn by an outline, a shadow or a pseudo-element counts
//              alike), and a text field also changes its border, outline or shadow;
//   motion     with reduced motion asked for, no animation or transition runs for a millisecond or more
//              while the guide opens and closes, on any step, while Play runs, as the key figures change
//              after Apply, in a block's dialog, the live-run dialog, the agents' wait or the report dialog
//              (Vici shortens them to 0.01 ms and keeps only a spinner's slow sweep, the one cue that work
//              is happening);
//   names      on every screen, every control has a name, every id is unique, every id a label or an aria
//              attribute points to exists, every picture has its alt text and every dialog its name.
// Each rule fails first on a planted mistake.
// Usage: node tests/access.mjs
import { APP_ROOT, launchBrowser, serveStatic, port, NETWORK_NOISE, exit } from "./lib/harness.mjs";
import { install, live, KEY } from "./lib/standin.mjs";

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });
const STEPS = ["start", "complete", "challenge", "assess", "adapt", "summary"];

const server = await serveStatic(APP_ROOT, port(9470));
const base = server.base;
const browser = await launchBrowser();
const newPage = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: "en-GB", reducedMotion: "reduce", acceptDownloads: true, ...opts });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|api\.anthropic\.com)/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
  return { ctx, page, errors };
};
const ready = (page) => page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 }).then(() => page.waitForSelector("#boot", { state: "detached", timeout: 5000 }).catch(() => {}));
const stepOf = (page) => page.evaluate(() => document.body.dataset.step);
/** The selected issue's choice at Adapt: which of its cards is chosen, counted from the first. */
const choice = (page) => page.evaluate(() => [...document.querySelectorAll(".options__cards input[type=radio]")].findIndex((r) => r.checked));

// ---- helpers --------------------------------------------------------------------------------------------

/** Tab until the focus is on `selector`; the number of presses, or null. */
async function tabTo(page, selector, max = 160) {
  for (let i = 1; i <= max; i += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((sel) => !!document.activeElement?.matches(sel), selector)) return i;
  }
  return null;
}

/** The focused control: what it is, whether a person can see it, and its box. */
const focused = (page) => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return { none: true };
  const st = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  const hidden = !!e.closest("[hidden], dialog:not([open]), [inert]") || st.visibility === "hidden" || st.display === "none";
  const text = e.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select");
  const label = (e.getAttribute("aria-label") || e.textContent || e.getAttribute("title") || e.id || e.tagName).trim().replace(/\s+/g, " ").slice(0, 48);
  // Each control once: repeated controls (every item's remove switch) share their markup, so each gets a number.
  if (!e.__tabKey) e.__tabKey = (window.__tabSeq = (window.__tabSeq || 0) + 1);
  return { none: false, key: e.__tabKey, label, text, hidden, visible: r.width > 0 && r.height > 0 && !hidden,
    box: { x: r.left, y: r.top, w: r.width, h: r.height }, ring: [st.outlineStyle, st.outlineWidth, st.outlineColor, st.boxShadow, st.borderColor].join("|") };
});

/**
 * Whether the focus shows: the control's box, with 6 px around it, looks different focused than blurred, and
 * a text field changes its outline, shadow or border too (a caret alone does not count). The focus goes back
 * where it was, so the Tab order goes on from it.
 */
async function focusShows(page, f) {
  const vw = page.viewportSize();
  const x = Math.max(0, Math.floor(f.box.x - 6));
  const y = Math.max(0, Math.floor(f.box.y - 6));
  const clip = { x, y, width: Math.max(1, Math.min(vw.width - x, Math.ceil(f.box.w + 12))), height: Math.max(1, Math.min(vw.height - y, Math.ceil(f.box.h + 12))) };
  if (clip.width < 2 || clip.height < 2 || y >= vw.height || x >= vw.width) return { shows: false, why: "outside the window" };
  const on = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
  const ringOn = f.ring;
  const ringOff = await page.evaluate(() => {
    const e = document.activeElement;
    window.__refocus = e;
    e.blur();
    const st = getComputedStyle(e);
    return [st.outlineStyle, st.outlineWidth, st.outlineColor, st.boxShadow, st.borderColor].join("|");
  });
  const off = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
  await page.evaluate(() => { window.__refocus?.focus({ focusVisible: true, preventScroll: true }); window.__refocus = null; });
  let differs = !on.equals(off);
  if (!differs) {
    // Once more after a frame: a ring is sometimes painted a frame after the focus moves.
    await page.waitForTimeout(120);
    const again = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
    await page.evaluate(() => { const e = window.__refocus = document.activeElement; e.blur(); });
    const offAgain = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
    await page.evaluate(() => { window.__refocus?.focus({ focusVisible: true, preventScroll: true }); window.__refocus = null; });
    differs = !again.equals(offAgain);
  }
  if (!differs) return { shows: false, why: "looks the same focused and not" };
  if (f.text && ringOn === ringOff) return { shows: false, why: "a text field whose border, outline and shadow stay the same" };
  return { shows: true };
}

/**
 * One full round of the Tab order from where the focus is: every stop, until the first comes round again.
 * Returns the problems: a stop on something hidden, a stop whose focus does not show.
 */
async function tabRound(page, where, { max = 200 } = {}) {
  const problems = [];
  const seen = new Set();
  let stops = 0;
  let first = null;
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press("Tab");
    const f = await focused(page);
    if (f.none) continue; // the browser's own controls, between the end of the page and its start
    if (first === null) first = f.key;
    else if (f.key === first) break;
    if (seen.has(f.key)) continue;
    seen.add(f.key);
    stops += 1;
    if (!f.visible) { problems.push(`${where}: the focus lands on something hidden (${f.label})`); continue; }
    const s = await focusShows(page, f);
    if (!s.shows) problems.push(`${where}: "${f.label}" ${s.why}`);
  }
  return { stops, problems };
}

/**
 * What runs with motion: animations and transitions that play now for a millisecond or more. Vici's reduced
 * motion shortens every animation and transition to 0.01 ms, which ends within the frame, and keeps a
 * spinner's slow sweep, the only cue that work is happening; neither counts.
 */
const moving = (page) => page.evaluate(() => document.getAnimations()
  .filter((a) => a.playState === "running" || a.playState === "pending")
  .map((a) => ({ a, t: a.effect?.getComputedTiming?.() || {} }))
  .filter(({ a, t }) => (t.duration || 0) >= 1 && !a.effect?.target?.closest?.(".vc-spinner"))
  .map(({ a }) => `${a.animationName || a.transitionProperty || a.constructor.name} on ${a.effect?.target?.tagName?.toLowerCase()}.${[...(a.effect?.target?.classList || [])].slice(0, 2).join(".")}`));

/** Samples motion right after a move and a little later, since a transition may start a frame late. */
async function motionAfter(page, where, out) {
  for (const wait of [0, 40, 160]) {
    if (wait) await page.waitForTimeout(wait);
    for (const m of await moving(page)) out.add(`${where}: ${m}`);
  }
}

/** Names, ids, references, pictures and dialogs on the page as it stands: the problems, or none. */
const nameProblems = (page) => page.evaluate(() => {
  const out = [];
  const shown = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest("[hidden], dialog:not([open])"); };
  const byId = (id) => document.getElementById(id);
  const textOf = (e) => (e?.textContent || "").replace(/\s+/g, " ").trim();
  const nameOf = (e) => {
    const lb = e.getAttribute("aria-labelledby");
    if (lb) return lb.split(/\s+/).map((id) => textOf(byId(id))).join(" ").trim();
    if (e.getAttribute("aria-label")?.trim()) return e.getAttribute("aria-label").trim();
    if (e.matches("input, select, textarea")) {
      if (e.id) { const l = document.querySelector(`label[for="${CSS.escape(e.id)}"]`); if (l && textOf(l)) return textOf(l); }
      const wrap = e.closest("label"); if (wrap && textOf(wrap)) return textOf(wrap);
      return (e.getAttribute("title") || e.getAttribute("placeholder") || "").trim();
    }
    const alt = [...e.querySelectorAll("img[alt]")].map((i) => i.alt).join(" ");
    return (textOf(e) || alt || e.getAttribute("title") || "").trim();
  };
  // A print copy carries suffixed ids of its own; it is not on screen.
  const live = (e) => !e.closest("body > [data-vc-print]");
  for (const e of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex='-1']), [role=button], [role=tab], [role=radio], [role=checkbox]")) {
    if (!live(e) || !shown(e)) continue;
    if (!nameOf(e)) out.push(`a ${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}${e.className ? `.${String(e.className).split(" ")[0]}` : ""} has no name`);
  }
  const ids = new Map();
  for (const e of document.querySelectorAll("[id]")) if (live(e)) ids.set(e.id, (ids.get(e.id) || 0) + 1);
  for (const [id, n] of ids) if (n > 1) out.push(`the id "${id}" is used ${n} times`);
  for (const e of document.querySelectorAll("[aria-labelledby], [aria-describedby], [aria-controls], [aria-owns], label[for]")) {
    if (!live(e)) continue;
    for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "for"]) {
      for (const id of (e.getAttribute(attr) || "").split(/\s+/).filter(Boolean)) if (!byId(id)) out.push(`${attr}="${id}" on a ${e.tagName.toLowerCase()} points to nothing`);
    }
  }
  for (const img of document.querySelectorAll("img")) if (live(img) && !img.hasAttribute("alt")) out.push(`a picture without alt text (${img.getAttribute("src")})`);
  for (const d of document.querySelectorAll("dialog[open]")) if (!nameOf(d) && !d.getAttribute("aria-labelledby")) out.push(`an open dialog without a name (${d.id})`);
  if (!document.documentElement.lang) out.push("the page names no language");
  return out;
});
const NAMED = /has no name|is used|points to|alt text|dialog without|no language/;

/** A round of the Tab order and the names where the page stands, into the problems and the counts. */
async function survey(page, where, problems, counts) {
  const r = await tabRound(page, where);
  problems.push(...r.problems);
  counts.push(`${where} ${r.stops}`);
  problems.push(...(await nameProblems(page)).map((p) => `${where}: ${p}`));
}

try {
  // ---- controls: each rule fails on a planted mistake first --------------------------------------------------
  {
    const { ctx, page } = await newPage();
    await page.goto(`${base}?guide=0&scenario=s1`);
    await ready(page);
    // Focus: a button whose focus ring is taken away, through the CSS object model the page's policy allows.
    await page.evaluate(() => {
      const b = document.getElementById("play");
      b.style.setProperty("outline", "none", "important");
      b.style.setProperty("box-shadow", "none", "important");
    });
    const toPlay = await tabTo(page, "#play");
    const planted = toPlay ? await focusShows(page, await focused(page)) : { shows: true };
    const toCta = await tabTo(page, "#btn-cta");
    const clean = toCta ? await focusShows(page, await focused(page)) : { shows: false };
    check(toPlay && toCta && !planted.shows && clean.shows, `control: a control without its focus ring is caught (${planted.why || "missed"}), one with it passes`);
    // Names: a button without a name, a second id, a reference to nothing and a picture without alt text.
    await page.evaluate(() => {
      const extra = document.createElement("div");
      extra.id = "planted";
      const b = document.createElement("button"); b.type = "button"; b.className = "vc-button"; b.append(document.createElement("span"));
      const dup = document.createElement("span"); dup.id = "btn-cta"; dup.textContent = "x";
      const dangling = document.createElement("button"); dangling.type = "button"; dangling.textContent = "y"; dangling.setAttribute("aria-describedby", "nowhere");
      const img = document.createElement("img"); img.src = "favicon.svg"; img.width = 20; img.height = 20;
      extra.append(b, dup, dangling, img);
      document.getElementById("panel").prepend(extra);
    });
    const names = await nameProblems(page);
    const caught = ["has no name", 'id "btn-cta"', "points to nothing", "without alt text"].filter((x) => names.some((p) => p.includes(x)));
    check(caught.length === 4, `control: a nameless button, a second id, a reference to nothing and a picture without alt text are caught (${caught.length} of 4)`);
    await ctx.close();
  }
  {
    // Motion: without reduced motion, the guide's entrance and a step change do move, and are seen.
    const { ctx, page } = await newPage({ reducedMotion: "no-preference" });
    await page.goto(`${base}?scenario=s1`);
    await ready(page);
    const seen = new Set();
    await motionAfter(page, "the guide opening", seen);
    await page.keyboard.press("Escape");
    await motionAfter(page, "the guide closing", seen);
    await page.click("#btn-cta");
    await motionAfter(page, "after Start", seen);
    check(seen.size > 0, `control: without reduced motion the sampler sees what moves (${[...seen].slice(0, 2).join("; ")})`);
    await ctx.close();
  }

  // ---- keyboard and focus: a scenario from its guide to the Summary --------------------------------------
  {
    const { ctx, page, errors } = await newPage();
    await page.goto(`${base}?scenario=s1`);
    await ready(page);
    await page.waitForSelector("dialog.vc-guide[open]");
    await page.waitForTimeout(300);
    const problems = [];
    const counts = [];
    const way = [];
    // The guide that opens by itself: its own Tab round, then Escape.
    await survey(page, "the guide", problems, counts);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog[open]"));
    way.push("guide closed with Escape");
    try {
      for (let s = 0; s < STEPS.length; s += 1) {
        const step = await stepOf(page);
        if (step !== STEPS[s]) throw new Error(`expected ${STEPS[s]}, the page shows ${step}`);
        // Play runs after Start; Space on the step's title pauses it, so the Tab round sees one step.
        if (await page.evaluate(() => window.BMC.playing)) {
          await page.evaluate(() => document.getElementById("step-title").focus());
          await page.keyboard.press("Space");
          if (await page.evaluate(() => window.BMC.playing)) throw new Error(`Space did not pause Play at ${step}`);
          way.push(`${step}: Space paused Play`);
        }
        await survey(page, step, problems, counts);
        if (step === "summary") break;
        if (step === "complete") {
          // An AI item removed with Enter on its switch.
          if (await tabTo(page, "#canvas .item-toggle") === null) throw new Error("Tab never reaches an AI item's remove switch");
          await page.keyboard.press("Enter");
          await page.waitForFunction(() => window.BMC.state.removed.length === 1, null, { timeout: 3000 });
          way.push("an AI item removed with Enter");
        }
        if (step === "adapt") {
          // The first issue's choice changed with an arrow key, then applied with Enter.
          if (await tabTo(page, ".options__cards input[type=radio]") === null) throw new Error("Tab never reaches a choice at Adapt");
          const before = await choice(page);
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(150);
          const after = await choice(page);
          if (after === before) throw new Error(`the arrow key left the choice at ${before}`);
          way.push(`choice ${before} to ${after} with an arrow key`);
          if (await tabTo(page, "#btn-cta") === null) throw new Error("Tab never reaches Apply");
          await page.keyboard.press("Enter");
          await page.waitForFunction(() => window.BMC.state.applied, null, { timeout: 5000 });
          way.push("applied with Enter");
        }
        if (await tabTo(page, "#btn-cta") === null) throw new Error(`Tab never reaches the action at ${step}`);
        const label = await page.evaluate(() => document.activeElement.textContent.trim());
        way.push(`${step}: ${label}`);
        await page.keyboard.press("Enter");
        await page.waitForFunction((was) => document.body.dataset.step !== was, step, { timeout: 8000 });
      }
    } catch (e) {
      problems.push(`the scenario stopped: ${e.message.split("\n")[0]}`);
    }
    const atSummary = (await stepOf(page)) === "summary";
    const state = await page.evaluate(() => ({ applied: window.BMC.state.applied, decisions: window.BMC.state.decisions, removed: window.BMC.state.removed }));
    check(atSummary && state.applied && state.removed.length === 1 && Object.keys(state.decisions).length > 0,
      `keyboard: a scenario runs from its guide to the Summary with Escape, Space, Tab, Enter and an arrow key, an AI item removed and a choice changed (${way.join(" → ")})`, JSON.stringify(state));
    // The report: Enter on Download the report opens the dialog on Save as PDF; Enter prints, then the files.
    await page.evaluate(() => { window.__printed = null; window.print = () => { dispatchEvent(new Event("beforeprint")); window.__printed = !!document.querySelector("body > [data-vc-print] .vc-report"); dispatchEvent(new Event("afterprint")); }; });
    const toReport = await tabTo(page, "#btn-cta");
    if (toReport) await page.keyboard.press("Enter");
    await page.waitForSelector("#report-dialog[open] #report", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    const onPdf = await page.evaluate(() => document.activeElement?.id);
    await survey(page, "the report dialog", problems, counts);
    const toPdf = await tabTo(page, "#rp-pdf");
    if (toPdf) await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.__printed !== null, null, { timeout: 5000 }).catch(() => {});
    const printed = await page.evaluate(() => window.__printed);
    const files = [];
    for (const id of ["#rp-html", "#rp-json"]) {
      if (await tabTo(page, id) === null) continue;
      const [d] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }).catch(() => null), page.keyboard.press("Enter")]);
      if (d) files.push(d.suggestedFilename());
    }
    check(toReport && onPdf === "rp-pdf" && printed === true && files.length === 2 && /\.html$/.test(files[0]) && /\.json$/.test(files[1]),
      `keyboard: Enter on Download the report opens the dialog on Save as PDF (${onPdf}), Enter prints the report alone, and the files download (${files.join(", ") || "none"})`);
    const focusP = problems.filter((p) => !NAMED.test(p));
    const nameP = problems.filter((p) => NAMED.test(p));
    check(!focusP.length, `focus: every stop of the Tab order shows its focus, in the guide, on every step and in the report dialog (${counts.join(", ")})`, focusP.slice(0, 6).join("; "));
    check(!nameP.length, "names: every control has a name, every id is unique and every reference resolves, in the guide, on every step and in the report dialog", nameP.slice(0, 6).join("; "));
    check(!errors.length, "keyboard: no page error in the scenario", errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // ---- keyboard and focus: a live run against the stand-in -----------------------------------------------------
  {
    const { ctx, page, errors } = await newPage();
    await install(ctx);
    await page.goto(`${base}?guide=0`);
    await ready(page);
    const problems = [];
    const counts = [];
    const way = [];
    const typeInto = async (sel, text) => { if (await tabTo(page, sel) === null) throw new Error(`Tab never reaches ${sel}`); await page.keyboard.type(text); };
    let summary = false;
    try {
      if (await tabTo(page, "#live") === null) throw new Error("Tab never reaches Run it live");
      await page.keyboard.press("Enter");
      await page.waitForSelector("#live-name");
      await survey(page, "the live form", problems, counts);
      // The stand-in answers as the agents did for Tidewell Lines, so the run starts from its canvas: Enter on
      // the button that fills it in; then the company is typed over, and the sector chosen by typing.
      if (await tabTo(page, "#live-sample") === null) throw new Error("Tab never reaches the sample canvas");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.getElementById("live-name")?.value, null, { timeout: 3000 });
      const company = await page.inputValue("#live-name");
      if (await tabTo(page, "#live-name") === null) throw new Error("Tab never reaches the company");
      await page.keyboard.press("Control+A");
      await page.keyboard.type(company);
      if (await tabTo(page, "#live-sector") === null) throw new Error("Tab never reaches the sector");
      const sectorWas = await page.$eval("#live-sector", (s) => s.value);
      const label = await page.$eval("#live-sector", (s) => s.selectedOptions[0].textContent.trim());
      await page.keyboard.type(label.slice(0, 6));
      const sector = await page.$eval("#live-sector", (s) => s.value);
      if (sector !== sectorWas) throw new Error(`typing "${label.slice(0, 6)}" chose ${sector}, not ${sectorWas}`);
      way.push(`company typed, sector chosen by typing (${sector})`);
      // A block's dialog: an item typed and closed with Enter, then removed with its button, so the canvas
      // stays the one the stand-in answers for.
      if (await tabTo(page, "#blk-value") === null) throw new Error("Tab never reaches the Value propositions block");
      const had = await page.evaluate(() => document.querySelectorAll('#canvas .block[data-block="value"] .vc-item').length);
      await page.keyboard.press("Enter");
      await page.waitForSelector("#block-dialog[open]");
      await page.waitForTimeout(200);
      await survey(page, "a block's dialog", problems, counts);
      if (await tabTo(page, "#edit-add") === null) throw new Error("Tab never reaches Add an item");
      await page.keyboard.press("Enter");
      await page.waitForFunction((n) => document.querySelectorAll("#block-dialog .edit-list input").length === n + 1 && document.activeElement?.matches("#block-dialog .edit-list input"), had, { timeout: 3000 });
      await page.keyboard.type("A line to take out again");
      await page.keyboard.press("Tab"); // its remove button
      const remove = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || "");
      await page.keyboard.press("Enter");
      await page.waitForFunction((n) => document.querySelectorAll("#block-dialog .edit-list input").length === n, had, { timeout: 3000 });
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("#block-dialog[open]"), null, { timeout: 3000 });
      const items = await page.evaluate(() => document.querySelectorAll('#canvas .block[data-block="value"] .vc-item').length);
      if (items !== had || !/A line to take out again/.test(remove)) throw new Error(`the block holds ${items} items after the dialog, ${had} before ("${remove}")`);
      way.push(`an item typed in a block's dialog and taken out with "${remove}"`);
      // Start the agents: the live-run dialog, by keyboard.
      if (await tabTo(page, "#btn-cta") === null) throw new Error("Tab never reaches Start the agents");
      await page.keyboard.press("Enter");
      await page.waitForSelector("#live-dialog[open]");
      await page.waitForTimeout(300);
      await survey(page, "the live-run dialog", problems, counts);
      await typeInto("#live-key", KEY);
      if (await tabTo(page, "#live-ack") === null) throw new Error("Tab never reaches the box");
      await page.keyboard.press("Space");
      if (await tabTo(page, "#live-start") === null) throw new Error("Tab never reaches Start the live run");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => !document.querySelector("#live-dialog[open]"), null, { timeout: 10000 });
      way.push("dialog: key typed, box ticked with Space, started with Enter");
      // The review: an AI item removed with Enter, then the challenge.
      await live.waitFor(page, ["review", "stopped"]);
      if ((await live.status(page)).status !== "review") throw new Error(`the run stopped before the review: ${JSON.stringify((await live.status(page)).stopped)}`);
      await survey(page, "live complete", problems, counts);
      if (await tabTo(page, "#canvas .item-toggle") === null) throw new Error("Tab never reaches an AI item's remove switch");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.querySelectorAll('#canvas .item-toggle[aria-pressed="true"]').length === 1, null, { timeout: 3000 });
      if (await tabTo(page, "#btn-cta") === null) throw new Error("Tab never reaches the challenge");
      way.push(`review: an AI item removed, ${await page.evaluate(() => document.activeElement.textContent.trim())}`);
      await page.keyboard.press("Enter");
      await live.waitFor(page, ["decision", "stopped"], 30000);
      if ((await live.status(page)).status !== "decision") throw new Error(`the run stopped before the decision: ${JSON.stringify((await live.status(page)).stopped)}`);
      await survey(page, "live adapt", problems, counts);
      if (await tabTo(page, ".options__cards input[type=radio]") === null) throw new Error("Tab never reaches a choice at Adapt");
      const before = await choice(page);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(150);
      const after = await choice(page);
      if (after === before) throw new Error("the arrow key left the live choice as it was");
      if (await tabTo(page, "#btn-cta") === null) throw new Error("Tab never reaches Apply in the live run");
      way.push(`decision: choice ${before} to ${after}, ${await page.evaluate(() => document.activeElement.textContent.trim())}`);
      await page.keyboard.press("Enter");
      await live.waitFor(page, ["done", "stopped"], 30000);
      summary = (await live.status(page)).status === "done" && (await stepOf(page)) === "summary";
      await survey(page, "live summary", problems, counts);
      // The report by keyboard, then the question before Start again throws the run away.
      if (await tabTo(page, "#btn-cta") === null) throw new Error("Tab never reaches Download the report");
      await page.keyboard.press("Enter");
      await page.waitForSelector("#report-dialog[open] #report", { timeout: 8000 });
      await page.waitForTimeout(300);
      await survey(page, "the live report dialog", problems, counts);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 3000 });
      if (await tabTo(page, "#btn-second") === null) throw new Error("Tab never reaches Start again");
      await page.keyboard.press("Enter");
      await page.waitForSelector("#discard-dialog[open]", { timeout: 3000 });
      await page.waitForTimeout(200);
      const safe = await page.evaluate(() => document.activeElement?.closest("#discard-dialog") && !document.activeElement.matches("#discard-go"));
      await survey(page, "the question before Start again", problems, counts);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 3000 });
      const kept = (await live.status(page)).status === "done";
      if (!safe || !kept) throw new Error(`the question did not open on its safe choice (${safe}) or Escape did not keep the run (${kept})`);
      way.push("report opened, Start again asked first, Escape kept the run");
    } catch (e) {
      problems.push(`the live run stopped: ${e.message.split("\n")[0]}`);
    }
    const stopped = problems.find((p) => p.startsWith("the live run stopped"));
    check(summary && !stopped, `keyboard: a live run goes from Run it live through the typed form, a block's dialog and the live-run dialog to its Summary (${way.join(" → ")})`, stopped || "");
    const focusP = problems.filter((p) => !NAMED.test(p) && !p.startsWith("the live run stopped"));
    const nameP = problems.filter((p) => NAMED.test(p));
    check(!focusP.length, `focus: every stop of the Tab order shows its focus in the live run and its dialogs (${counts.join(", ")})`, focusP.slice(0, 6).join("; "));
    check(!nameP.length, "names: every control of the live run and its dialogs has a name, every id is unique and every reference resolves", nameP.slice(0, 6).join("; "));
    check(!errors.length, "keyboard: no page error in the live run", errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // ---- motion: nothing moves with reduced motion ------------------------------------------------------------
  {
    const seen = new Set();
    {
      const { ctx, page } = await newPage();
      await page.goto(`${base}?scenario=s1`);
      await ready(page);
      await motionAfter(page, "the guide opening", seen);
      await page.keyboard.press("Escape");
      await motionAfter(page, "the guide closing", seen);
      await page.click("#btn-cta"); // Start: Play runs
      await motionAfter(page, "Play at Complete", seen);
      await page.click("#play"); // pause
      for (let s = 1; s < STEPS.length - 1; s += 1) {
        const step = await stepOf(page);
        if (step === "adapt") {
          await page.evaluate(() => { const r = [...document.querySelectorAll(".options__cards input[type=radio]")].find((x) => !x.checked); r?.closest("label")?.click(); });
          await motionAfter(page, "a choice at Adapt", seen);
          await page.click("#btn-cta");
          await motionAfter(page, "the tiles after Apply", seen);
        }
        await page.click(step === "adapt" ? "#btn-next" : "#btn-cta");
        await motionAfter(page, `after ${step}`, seen);
      }
      await page.click("#blk-value");
      await motionAfter(page, "a block's dialog", seen);
      await page.keyboard.press("Escape");
      await page.click("#btn-cta"); // Download the report
      await motionAfter(page, "the report dialog", seen);
      await page.keyboard.press("Escape");
      await motionAfter(page, "the report dialog closing", seen);
      await ctx.close();
    }
    {
      // The live-run dialog and the agents' wait.
      const { ctx, page } = await newPage();
      let release;
      const hold = new Promise((r) => { release = r; });
      await install(ctx, { script: (agent) => (agent === "completer" ? hold.then(() => undefined) : undefined) });
      await page.goto(`${base}?guide=0`);
      await ready(page);
      await live.enter(page);
      await motionAfter(page, "the live form", seen);
      await live.sample(page);
      await live.openDialog(page);
      await motionAfter(page, "the live-run dialog", seen);
      await page.fill("#live-key", KEY);
      await page.check("#live-ack", { force: true });
      await page.click("#live-start");
      await page.waitForFunction(() => window.BMC.state.live.status === "working" && window.BMC.state.live.agent === "completer", null, { timeout: 15000 });
      await page.waitForTimeout(400);
      await motionAfter(page, "the agents' wait", seen);
      release();
      await live.waitFor(page, "review");
      await motionAfter(page, "the review drawn", seen);
      await ctx.close();
    }
    check(!seen.size, "motion: with reduced motion nothing moves: the guide, Play, every step, a choice and the tiles after Apply, a block's dialog, the report dialog, the live form and dialog, the agents' wait", [...seen].slice(0, 6).join("; "));
  }
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} accessibility checks passed.`);
if (!failed) console.log("ACCESS OK");
exit(failed ? 1 : 0);
