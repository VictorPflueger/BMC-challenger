// Play and the presenter's controls (Vici's "Presenting step by step"; gate G6). With the page's clock in
// the test's hands: Play stays on a step for its reading time, 7 to 14 seconds, then moves on, and it
// stops wherever the person acts (the start, the review at Complete, the decision at Adapt) and on the
// last step; a dialog holds its time. Space plays and pauses; the arrow keys and PageUp or PageDown move
// a step and pause; ?scenario=s2&step=4 plays the run up to that step with the recorded choices; the
// address follows the presenter; each step change moves the focus to the step's title.
// Usage: node tests/play.mjs
import { APP_ROOT, launchBrowser, serveStatic, port, context, NETWORK_NOISE } from "./lib/harness.mjs";

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });

const server = await serveStatic(APP_ROOT, port(9420));
const browser = await launchBrowser();
try {
  const { context: ctx, outside } = await context(browser);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
  await page.clock.install();
  await page.goto(`${server.base}?scenario=s1&lang=en&guide=0`);
  await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  await page.clock.runFor(1000);
  const state = () => page.evaluate(() => ({ step: window.BMC.state.step, reached: window.BMC.state.reached, playing: window.BMC.playing, read: window.BMC.readMs(), url: location.search, focus: document.activeElement?.id || document.activeElement?.tagName }));

  // ---- Play waits where the person acts, and reads each step for its time ------------------------------
  let s = await state();
  check(s.step === 0 && !s.playing, "the run waits at Start until the person starts it");
  await page.click("#btn-cta");
  await page.clock.runFor(30000);
  s = await state();
  check(s.step === 1 && s.playing, `Start begins the run and plays; Play then waits at Complete for the review (${JSON.stringify(s)})`);
  await page.click("#btn-cta");
  await page.clock.runFor(100);
  s = await state();
  const read = s.read;
  check(s.step === 2 && s.playing && read >= 7000 && read <= 14000, `the review done, Play goes on at Challenge, which it reads for ${read} ms, within 7 to 14 seconds`);
  // The focus elsewhere, so the move to the title is Play's own.
  await page.locator(".issue-pick").nth(1).focus();
  await page.clock.runFor(read - 600);
  const early = (await state()).step;
  await page.clock.runFor(1200);
  const late = await state();
  check(early === 2 && late.step === 3 && late.focus === "step-title", `Play stays on the step for its reading time, then moves on, the focus on the new step's title (${early} → ${late.step})`);
  // A dialog holds Play's time.
  await page.click("#canvas .block-open");
  await page.clock.runFor(30000);
  const held = (await state()).step;
  await page.keyboard.press("Escape");
  check(held === 3, "an open dialog holds Play on its step");
  await page.clock.runFor(late.read + 1000);
  await page.clock.runFor(30000);
  s = await state();
  check(s.step === 4 && s.playing, `Play stops at Adapt, where the person decides (${JSON.stringify(s)})`);

  // ---- the keys -----------------------------------------------------------------------------------------
  await page.locator("#step-title").focus();
  await page.keyboard.press("Space");
  check(!(await state()).playing, "Space pauses");
  await page.keyboard.press("Space");
  check((await state()).playing, "Space plays again");
  await page.keyboard.press("ArrowLeft");
  s = await state();
  check(s.step === 3 && !s.playing && s.focus === "step-title" && /step=3/.test(s.url), `the left arrow goes back a step, pauses, moves the focus to the title and the address follows (${s.url})`);
  await page.keyboard.press("PageDown");
  s = await state();
  check(s.step === 4 && s.focus === "step-title" && /step=4/.test(s.url), "PageDown goes forward a step, the focus on its title");
  await page.keyboard.press("PageUp");
  await page.keyboard.press("ArrowRight");
  s = await state();
  check(s.step === 4, "PageUp and the right arrow move back and forward");
  await page.keyboard.press("ArrowRight");
  check((await state()).step === 4, "the keys don't pass the decision at Adapt");
  await page.click("#btn-cta");
  await page.click("#btn-next");
  s = await state();
  check(s.step === 5 && s.focus === "step-title" && /step=5/.test(s.url), `after the decision Next leads to the summary, the focus on its title (${s.url})`);
  await page.click("#play");
  await page.clock.runFor(1000);
  s = await state();
  check(s.step === 1 && s.playing, "on the summary Replay starts the run again from the review");

  // ---- a link to a later step ---------------------------------------------------------------------------
  const p2 = await ctx.newPage();
  await p2.goto(`${server.base}?scenario=s2&step=4&lang=en&guide=0`);
  await p2.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  const linked = await p2.evaluate(() => ({ step: window.BMC.state.step, reached: window.BMC.state.reached, applied: window.BMC.state.applied, id: window.BMC.state.scenarioId, title: document.getElementById("step-title").textContent }));
  check(linked.id === "s2" && linked.step === 4 && linked.reached === 4 && !linked.applied && /6 issues/.test(linked.title), `?scenario=s2&step=4 plays the run up to Adapt with the recorded choices ("${linked.title}")`);
  await p2.goto(`${server.base}?scenario=s3&step=5&lang=de&guide=0`);
  await p2.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  const end = await p2.evaluate(() => ({ step: window.BMC.state.step, applied: window.BMC.state.applied, url: location.search }));
  check(end.step === 5 && end.applied && /lang=de/.test(end.url) && /scenario=s3/.test(end.url), `?scenario=s3&step=5 opens the summary with the recorded decision applied, the language kept (${end.url})`);
  check(!outside.length && !errors.length, "no request left the site and nothing failed", [...outside, ...errors].slice(0, 3).join(" | "));
  await ctx.close();
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} play checks passed.`);
if (!failed) console.log("PLAY OK");
process.exit(failed ? 1 : 0);
