// A whole live run in Chromium against the stand-in (G12 of M3): Run it live puts LIVE on the tape and
// opens the Start form, which asks for a name and whose blocks take items key by key; before an agent answers, each key figure shows "…" and what it waits for; while
// an agent works, the bar names it, says what it does and counts the seconds, with Abort beside it, and
// the stepper marks the next step as working; Complete waits for the review and Adapt for the decision;
// with the same answers the canvas, panels and tiles show what the simulation shows; the run writes in
// the page's language and keeps it when the page switches, saying so; Clear everything empties the form,
// the canvas and the run and forgets the key, and stops an agent at work; the browser asks before leaving while a live result exists.
// Prints LIVE RUN OK. Usage: node tests/live-run.mjs
import { APP_ROOT, launchBrowser, serveStatic, port, context, exit } from "./lib/harness.mjs";
import { install, live } from "./lib/standin.mjs";
import EN from "../js/i18n/en.js";
import DE from "../js/i18n/de.js";

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });
const server = await serveStatic(APP_ROOT, port(9217));
const browser = await launchBrowser();
const tiles = (p) => p.evaluate(() => Object.fromEntries(["stake", "pressure", "cost"].map((k) => [k, { main: document.querySelector(`#kpi-${k} .kpi-main`).textContent.trim(), note: document.querySelector(`#kpi-${k} .kpi-note`).textContent.trim() }])));

try {
  // The simulation's figures for S1, as its Assess step shows them with the recorded run.
  const { context: sctx } = await context(browser, { width: 1920, height: 1080 });
  const sp = await sctx.newPage();
  await sp.goto(`${server.base}?guide=0&scenario=s1&step=3`);
  await sp.waitForSelector('html[data-boot="ready"]');
  const sim = await tiles(sp);
  const simTitle = await sp.$eval("#step-title", (h) => h.textContent);
  await sctx.close();

  const { context: ctx } = await context(browser, { width: 1920, height: 1080 });
  let release = null;
  const api = await install(ctx, { script: (agent) => (agent === "analyst" && !release ? new Promise((r) => { release = r; }).then(() => undefined) : undefined) });
  const p = await ctx.newPage();
  await p.goto(`${server.base}?guide=0`);
  await p.waitForSelector('html[data-boot="ready"]');
  await live.enter(p);
  const start = await p.evaluate(() => ({ tape: document.getElementById("mode-text").textContent, tip: document.getElementById("tip-mode").textContent, fictional: document.querySelector(".fictional").hidden, play: document.getElementById("play").hidden, form: !!document.getElementById("live-name"), url: location.search }));
  check(start.tape === EN["p.mode.live"] && start.tip === EN["p.mode.tip.live"] && start.fictional && start.play && start.form && !/scenario|step/.test(start.url), "Run it live puts LIVE on the tape with its own tooltip, opens the Start form, hides Play and the fictional label, and keeps the address bare", JSON.stringify(start));
  const waiting = await tiles(p);
  check(waiting.stake.main === "…" && waiting.stake.note === EN["kpi.wait.analyst"] && waiting.pressure.main === "…" && waiting.pressure.note === EN["kpi.wait.redteam"] && waiting.cost.main === "…", "before the agents answer, each tile shows … and what it waits for", JSON.stringify(waiting));

  // Without a company name the agents don't start: the field says so and takes the focus, and the note
  // goes once a name is typed.
  await p.click("#btn-cta");
  const unnamed = await p.evaluate(() => ({ dialog: document.getElementById("live-dialog").open, note: !document.getElementById("live-name-error").hidden, focus: document.activeElement?.id, invalid: document.getElementById("live-name").getAttribute("aria-invalid") }));
  await p.type("#live-name", "A");
  const named = await p.evaluate(() => ({ note: !document.getElementById("live-name-error").hidden, invalid: document.getElementById("live-name").getAttribute("aria-invalid") }));
  await p.fill("#live-name", "");
  check(!unnamed.dialog && unnamed.note && unnamed.focus === "live-name" && unnamed.invalid === "true" && !named.note && named.invalid === null, "without a company name the agents wait: the field says so and takes the focus, and the note goes once a name is typed", JSON.stringify({ unnamed, named }));

  // Entering a block key by key: nothing the person types is lost to a redraw, Enter adds the next line,
  // and closing the block with Escape keeps what was typed.
  await p.click("#blk-partners");
  await p.waitForSelector("#block-dialog[open]");
  await p.click("#edit-add");
  await p.keyboard.type("Port terminals in Hamburg", { delay: 25 });
  await p.keyboard.press("Enter");
  const next = await p.evaluate(() => document.activeElement?.id);
  await p.keyboard.type("Bunker suppliers", { delay: 25 });
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  const typed = await p.$$eval('#canvas [data-block="partners"] .vc-item__text', (els) => els.map((e) => e.textContent));
  check(next === "edit-partners-1" && typed.join("|") === "Port terminals in Hamburg|Bunker suppliers", "typing a block's items key by key keeps every key, Enter adds the next line, and Escape keeps what was typed", JSON.stringify({ next, typed }));

  await live.sample(p);
  await live.openDialog(p);
  await live.start(p);
  await live.waitFor(p, "review");
  const review = await p.evaluate(() => ({ step: window.BMC.state.step, bar: document.getElementById("bar").textContent }));
  check(review.step === 1 && review.bar.includes(EN["live.turn.complete"]), "Complete waits for the review", JSON.stringify(review));
  // Each mode comes back where it was left: the simulation at its step, the live run at its review.
  await p.click("#live"); // Back to the simulation
  const simAt = await p.evaluate(() => ({ mode: window.BMC.state.mode, step: window.BMC.state.step }));
  await p.click("#live"); // Run it live
  const liveAt = await p.evaluate(() => ({ mode: window.BMC.state.mode, step: window.BMC.state.step, status: window.BMC.state.live.status }));
  check(simAt.mode === "simulation" && simAt.step === 0 && liveAt.mode === "live" && liveAt.step === 1 && liveAt.status === "review", "Back to the simulation and Run it live again return to the review, the run kept", JSON.stringify({ simAt, liveAt }));

  await p.click("#btn-cta"); // Challenge this canvas: the Red team answers, the Analyst is held
  await p.waitForFunction(() => window.BMC.state.live.agent === "analyst", null, { timeout: 15000 });
  // The counter ticks once a second from the agent's start and rounds: after 2.6 s it reads 2 or 3 s.
  await p.waitForTimeout(2600);
  const work = await p.evaluate(() => ({ step: window.BMC.state.step, bar: document.getElementById("bar").textContent, seconds: document.getElementById("live-seconds")?.textContent, abort: document.getElementById("btn-cta")?.textContent.trim(), hint: [...document.querySelectorAll("#steps .vc-step__hint")].map((h) => h.textContent) }));
  const mid = await tiles(p);
  check(work.step === 2 && work.bar.includes(EN["live.agent.analyst"]) && /^[2-9] s$/.test(work.seconds || "") && work.abort === EN["live.abort"] && work.hint[3] === EN["live.working"],
    "while an agent works the bar names it, says what it does and counts the seconds, with Abort; the stepper marks the next step working", JSON.stringify(work));
  check(mid.pressure.main === sim.pressure.main && mid.stake.main === "…" && mid.stake.note === EN["kpi.wait.analyst"], "after the Red team the pressure tile answers, the stake tile still waits for the Analyst", JSON.stringify(mid));
  release();
  await live.waitFor(p, "decision");
  await p.click("#steps .vc-step:nth-child(4) .vc-step__button").catch(() => p.evaluate(() => document.querySelectorAll("#steps .vc-step")[3].querySelector("button").click()));
  await p.evaluate(() => document.querySelectorAll("#steps .vc-step")[3].querySelector("button").click());
  await p.waitForTimeout(200);
  const assess = await tiles(p);
  const liveTitle = await p.$eval("#step-title", (h) => h.textContent);
  check(assess.stake.main === sim.stake.main && assess.pressure.main === sim.pressure.main && liveTitle === simTitle, `with the same answers the live run shows the simulation's figures (${sim.stake.main}, ${sim.pressure.main})`, JSON.stringify({ assess, sim, liveTitle, simTitle }));

  await p.evaluate(() => document.querySelectorAll("#steps .vc-step")[4].querySelector("button").click());
  await p.click("#btn-cta"); // Apply to the canvas
  const done = await live.waitFor(p, "done");
  // The page draws a session change on the next frame: the summary's headline, once it shows.
  await p.waitForFunction(() => window.BMC.state.step === 5 && document.body.dataset.step === "summary");
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  const headline = await p.$eval("#step-title", (h) => h.textContent);
  check(done.reached === 5 && api.calls.map((c) => c.agent).join(" ") === "completer redteam analyst strategist writer", "Adapt waits for the decision; Apply runs the Writer and the summary shows", JSON.stringify(done));

  // ---- the language stays the run's --------------------------------------------------------------------------
  await p.click('.lang-option[data-lang="de"]');
  await p.waitForTimeout(300);
  const de = await p.evaluate(() => ({ step: document.querySelector("#steps .vc-step:nth-child(1) .vc-step__label")?.textContent || "", title: document.getElementById("step-title").textContent, panel: document.getElementById("panel").textContent, next: document.getElementById("btn-cta")?.textContent.trim(), tape: document.getElementById("mode-text").textContent, tip: document.getElementById("tip-mode").textContent }));
  check(de.title === headline && de.panel.includes(DE["live.lang.kept"].replace("{lang}", DE["lang.en"])) && de.next === DE["live.again"] && de.tape === DE["p.mode.live"] && de.tip === DE["p.mode.tip.live"], "switched to German, the interface changes (the tape and its tooltip too), the analysis stays in English and says so", JSON.stringify({ ...de, panel: de.panel.slice(0, 120) }));
  await p.click('.lang-option[data-lang="en"]');

  // ---- the browser asks before leaving ----------------------------------------------------------------------
  let asked = null;
  p.on("dialog", async (d) => { asked = d.type(); await d.dismiss(); });
  await p.close({ runBeforeUnload: true });
  await new Promise((r) => setTimeout(r, 500));
  check(asked === "beforeunload", "while a live result exists, the browser asks before the page is left", String(asked));
  await ctx.close();

  // ---- Clear everything --------------------------------------------------------------------------------------
  const { context: c2 } = await context(browser, { width: 1920, height: 1080 });
  await install(c2);
  const q = await c2.newPage();
  await q.goto(`${server.base}?guide=0`);
  await q.waitForSelector('html[data-boot="ready"]');
  await live.full(q);
  await q.click("#btn-cta"); // Start again
  await q.click("#live-clear");
  await q.waitForTimeout(200);
  const cleared = await q.evaluate(() => ({ name: document.getElementById("live-name").value, items: document.querySelectorAll("#canvas .vc-item").length, st: window.BMC.state.live }));
  await q.fill("#live-name", "Test company");
  await live.openDialog(q);
  const keyShown = await q.evaluate(() => !document.getElementById("live-key-row").hidden && document.getElementById("live-key-held").hidden);
  check(cleared.name === "" && cleared.items === 0 && cleared.st.status === "idle" && cleared.st.reached === 0 && cleared.st.cost.usd === 0, "Clear everything empties the form, the canvas and the run", JSON.stringify(cleared));
  check(keyShown, "Clear everything forgets the key: the dialog asks for one again");
  await c2.close();

  // ---- Clear everything while an agent works -------------------------------------------------------------
  // The agent stops, and the answer it was waiting for never lands in the emptied page.
  const { context: c3 } = await context(browser, { width: 1280, height: 720 });
  let free = null;
  const held = await install(c3, { script: (agent) => (agent === "completer" && !free ? new Promise((r) => { free = r; }).then(() => undefined) : undefined) });
  const w = await c3.newPage();
  const werrors = [];
  w.on("pageerror", (e) => werrors.push(String(e)));
  await w.goto(`${server.base}?guide=0`);
  await w.waitForSelector('html[data-boot="ready"]');
  await live.enter(w);
  await live.sample(w);
  await live.openDialog(w);
  await live.start(w);
  await w.waitForFunction(() => window.BMC.state.live.status === "working");
  await w.click("#live-clear");
  free?.();
  await w.waitForTimeout(1200);
  const emptied = await w.evaluate(() => ({ st: window.BMC.state.live, name: document.getElementById("live-name").value, items: document.querySelectorAll("#canvas .vc-item").length }));
  check(emptied.st.status === "idle" && emptied.st.reached === 0 && emptied.st.cost.requests === 0 && emptied.name === "" && emptied.items === 0 && held.calls.length === 1 && !werrors.length, "Clear everything while an agent works stops it, and its answer never fills the emptied page", JSON.stringify({ ...emptied, calls: held.calls.length, werrors }));
  await c3.close();
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} live-run checks passed`);
if (!failed) console.log("LIVE RUN OK");
exit(failed ? 1 : 0);
