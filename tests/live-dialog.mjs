// AC-11 and the live-run dialog in Chromium against the stand-in. "Start the live run" stays disabled
// until the key looks valid and the acknowledgement, unticked at every opening, is ticked. The key field
// sits in no form, with autocomplete off and the password managers' ignore marks, shows and hides, and
// once held shows masked with Forget key, which clears it. The key is checked with GET /v1/models before
// any message: a refused key, or a key that can't reach the setting's model, stops there with its
// message. Inside a frame the dialog refuses to start. What is usually private (an e-mail address, a
// phone number, an IBAN, "confidential", "vertraulich") is listed, clean text is not, and the run can
// still start. At 1280 × 720 and 1920 × 1080, in both themes and languages, the dialog fits the window
// without scrolling, its start button and AI notice in view, and Vici's liveDialogProblems() finds
// nothing. Needs a ViciDesign checkout (VICI_DIR or ../ViciDesign). Prints LIVE DIALOG OK.
// Usage: node tests/live-dialog.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, viciDir, launchBrowser, serveStatic, port, context, outDir } from "./lib/harness.mjs";
import { install, live, apiError, KEY } from "./lib/standin.mjs";
import EN from "../js/i18n/en.js";

const dir = viciDir();
if (!dir) { console.log("FAIL  no ViciDesign checkout in VICI_DIR or ../ViciDesign: liveDialogProblems() is Vici's"); process.exit(1); }
const { liveDialogProblems } = await import(pathToFileURL(path.join(dir, "scripts", "lib", "live.mjs")).href);

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });
const server = await serveStatic(APP_ROOT, port(9213));
const browser = await launchBrowser();
const shots = await outDir("live-dialog");
async function page({ width = 1280, height = 720, theme = "light", lang = "en", ...opts } = {}) {
  const { context: ctx } = await context(browser, { width, height, colorScheme: theme });
  await ctx.addInitScript((t) => { try { localStorage.setItem("vc-theme", t); } catch { /* blocked */ } }, theme);
  const api = await install(ctx, opts);
  const p = await ctx.newPage();
  await p.goto(`${server.base}?guide=0&lang=${lang}`);
  await p.waitForSelector('html[data-boot="ready"]');
  await p.waitForSelector("#boot", { state: "detached", timeout: 5000 }).catch(() => {});
  return { ctx, p, api };
}
const disabled = (p) => p.$eval("#live-start", (b) => b.disabled);

try {
  // ---- the start button waits for a key that looks right and the tick ----------------------------------
  {
    const { ctx, p } = await page();
    await live.enter(p);
    await live.sample(p);
    await live.openDialog(p);
    const steps = [];
    steps.push(await disabled(p));
    await p.fill("#live-key", "hello");
    await p.check("#live-ack", { force: true });
    steps.push(await disabled(p));
    await p.fill("#live-key", KEY);
    await p.uncheck("#live-ack", { force: true });
    steps.push(await disabled(p));
    await p.check("#live-ack", { force: true });
    steps.push(await disabled(p));
    check(JSON.stringify(steps) === "[true,true,true,false]", "Start stays disabled without a key that looks valid or without the tick, and wakes with both", JSON.stringify(steps));
    // A pasted value that can't be a Claude key says why Start stays dimmed; a short start doesn't yet.
    await p.fill("#live-key", "sk-proj-0123456789abcdefghijklmnopqrstuvwxyz");
    const shape = await p.evaluate(() => ({ hidden: document.getElementById("live-error").hidden, text: document.getElementById("live-error").textContent }));
    await p.fill("#live-key", "sk-ant");
    const short = await p.$eval("#live-error", (e) => e.hidden);
    await p.fill("#live-key", KEY);
    const fixed = await p.$eval("#live-error", (e) => e.hidden);
    check(!shape.hidden && shape.text === EN["live.key.shape"] && short && fixed, "a pasted value that can't be a Claude key says so, and the note goes when the key looks right", JSON.stringify({ shape, short, fixed }));
    const field = await p.$eval("#live-key", (i) => ({ type: i.type, ac: i.getAttribute("autocomplete"), op: i.hasAttribute("data-1p-ignore"), lp: i.getAttribute("data-lpignore"), sc: i.getAttribute("spellcheck"), form: !!i.closest("form"), forms: document.querySelectorAll("form").length }));
    check(field.type === "password" && field.ac === "off" && field.op && field.lp === "true" && field.sc === "false" && !field.form && field.forms === 0, "the key field is a password field in no form, with autocomplete off and the ignore marks", JSON.stringify(field));
    await p.click("#live-key-show");
    const shown = await p.$eval("#live-key", (i) => [i.type, document.getElementById("live-key-show").getAttribute("aria-pressed")]);
    await p.click("#live-key-show");
    const hidden = await p.$eval("#live-key", (i) => [i.type, document.getElementById("live-key-show").getAttribute("aria-pressed")]);
    check(shown.join() === "text,true" && hidden.join() === "password,false", "Show key shows it and hides it again", JSON.stringify([shown, hidden]));
    await p.keyboard.press("Escape");
    await live.openDialog(p);
    check(!(await p.isChecked("#live-ack")) && (await disabled(p)), "the acknowledgement is unticked at every opening");
    await ctx.close();
  }

  // ---- held masked, forgotten, checked first ---------------------------------------------------------
  {
    const { ctx, p, api } = await page({ script: (agent) => (agent === "completer" ? { kind: "hold" } : undefined) });
    await live.enter(p);
    await live.sample(p);
    await live.openDialog(p);
    await live.start(p);
    await p.waitForFunction(() => window.BMC.state.live.agent === "completer");
    await p.click("#btn-cta");
    await live.waitFor(p, "stopped");
    await p.click("#btn-cta"); // Start again
    await live.openDialog(p);
    const held = await p.evaluate(() => ({ row: document.getElementById("live-key-row").hidden, shown: !document.getElementById("live-key-held").hidden, masked: document.getElementById("live-key-masked").textContent }));
    check(held.row && held.shown && held.masked === `${KEY.slice(0, 7)}…${KEY.slice(-4)}`, `a held key shows masked (${held.masked}) with Forget key`, JSON.stringify(held));
    await p.click("#live-forget");
    const forgot = await p.evaluate(() => ({ row: !document.getElementById("live-key-row").hidden, masked: document.getElementById("live-key-masked").textContent }));
    check(forgot.row && forgot.masked === "" && (await disabled(p)), "Forget key clears it, and Start waits for a new one", JSON.stringify(forgot));
    check(api.gets.length === 1 && api.gets[0].at <= api.calls[0].at, "the key was checked with GET /v1/models before the first message");
    await ctx.close();
  }
  for (const [what, models, cause] of [["a refused key", apiError(401, "authentication_error", "invalid x-api-key"), "key"], ["a key that can't reach the setting's model", ["claude-sonnet-5-5"], "model"]]) {
    const { ctx, p, api } = await page({ models });
    await live.enter(p);
    await live.sample(p);
    await live.openDialog(p);
    await live.start(p);
    await p.waitForFunction(() => !document.getElementById("live-error").hidden, null, { timeout: 10000 });
    const err = await p.evaluate(() => ({ text: document.getElementById("live-error").textContent, open: document.getElementById("live-dialog").open, focus: document.activeElement?.id }));
    const focus = cause === "key" ? "live-key" : "live-start";
    check(err.open && err.text === EN[`err.${cause}`] && api.calls.length === 0 && err.focus === focus, `${what} stops in the dialog with its message, sends no message and puts the focus on ${focus === "live-key" ? "the key field" : "the start button"}`, JSON.stringify({ err, calls: api.calls.length }));
    await ctx.close();
  }

  // ---- inside a frame ----------------------------------------------------------------------------------
  {
    const { ctx, p } = await page();
    await p.setContent(`<iframe src="${server.base}?guide=0" style="width:1200px;height:700px" title="framed"></iframe>`);
    const f = await (await p.waitForSelector("iframe")).contentFrame();
    await f.waitForSelector('html[data-boot="ready"]');
    await f.click("#live");
    await f.click("#live-sample");
    await f.click("#btn-cta");
    await f.waitForSelector("#live-dialog[open]");
    await f.fill("#live-key", KEY);
    await f.check("#live-ack", { force: true });
    const r = await f.evaluate(() => ({ note: !document.getElementById("live-frame").hidden, disabled: document.getElementById("live-start").disabled }));
    check(r.note && r.disabled, "inside a frame the dialog says why and won't start", JSON.stringify(r));
    await ctx.close();
  }

  // ---- what is usually private ---------------------------------------------------------------------------
  {
    const { ctx, p } = await page();
    await live.enter(p);
    await live.sample(p);
    await live.openDialog(p);
    const clean = await p.$eval("#live-warning", (w) => w.hidden);
    await p.keyboard.press("Escape");
    // An address on the reserved example.org domain, joined here so that no file of the repository
    // carries an e-mail address (tests/hygiene.mjs).
    await p.fill("#live-line", `Write to ${["anna.berg", "example.org"].join("@")} or call +49 30 1234 5678`);
    await p.click('#canvas [data-block="partners"] .block-open');
    await p.click("#edit-add");
    await p.fill("#edit-partners-0", "Our bank DE89 3704 0044 0532 0130 00, a confidential deal");
    await p.press("#edit-partners-0", "Tab");
    await p.click("#edit-add");
    await p.fill("#edit-partners-1", "Vertrauliche Liste der Lieferanten");
    await p.press("#edit-partners-1", "Tab");
    await p.keyboard.press("Escape");
    await live.openDialog(p);
    const found = await p.evaluate(() => ({ hidden: document.getElementById("live-warning").hidden, items: [...document.querySelectorAll("#live-warning-list li")].map((li) => li.textContent) }));
    const kinds = ["e-mail", "phone", "IBAN", "confidential", "Vertrauliche"];
    check(clean, "a clean canvas raises no warning");
    check(!found.hidden && kinds.every((k) => found.items.some((t) => t.includes(k))), "an e-mail address, a phone number, an IBAN, \"confidential\" and \"vertraulich\" are listed", JSON.stringify(found.items));
    await p.fill("#live-key", KEY);
    await p.check("#live-ack", { force: true });
    check(!(await disabled(p)), "the warning doesn't block: the run can start");
    await ctx.close();
  }

  // ---- fit, in view, and Vici's rule ---------------------------------------------------------------------
  for (const [width, height] of [[1280, 720], [1920, 1080]]) for (const theme of ["light", "dark"]) for (const lang of ["en", "de"]) {
    const { ctx, p } = await page({ width, height, theme, lang });
    await live.enter(p);
    await live.sample(p);
    await live.openDialog(p);
    await p.waitForTimeout(400);
    const m = await p.evaluate(() => {
      const d = document.getElementById("live-dialog");
      const r = d.getBoundingClientRect();
      const body = d.querySelector(".vc-dialog__body");
      const inView = (el) => { const b = el.getBoundingClientRect(); return b.top >= r.top - 0.5 && b.bottom <= Math.min(r.bottom, innerHeight) + 0.5 && b.width > 0; };
      return { top: r.top, bottom: r.bottom, h: innerHeight, scroll: body.scrollHeight - body.clientHeight, start: inView(document.getElementById("live-start")), notice: inView(d.querySelector(".vc-live__footer .vc-tag--feature")), html: d.outerHTML };
    });
    await p.screenshot({ path: path.join(shots, `${width}x${height}-${theme}-${lang}.png`) });
    const v = liveDialogProblems(m.html);
    check(m.top >= 0 && m.bottom <= m.h + 0.5 && m.scroll <= 1 && m.start && m.notice, `${width} × ${height}, ${theme}, ${lang}: the dialog fits without scrolling, start and AI notice in view`, JSON.stringify({ ...m, html: undefined }));
    check(!v.length, `${width} × ${height}, ${theme}, ${lang}: Vici's liveDialogProblems() finds nothing`, v.join("; "));
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} dialog checks passed. Screenshots: ${shots}`);
if (!failed) console.log("LIVE DIALOG OK");
process.exit(failed ? 1 : 0);
