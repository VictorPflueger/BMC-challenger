// A whole live run in Chromium against the stand-in (G12 of M3): Run it live puts LIVE on the tape and
// opens the Start form; before an agent answers, each key figure shows "…" and what it waits for; while
// an agent works, the bar names it, says what it does and counts the seconds, with Abort beside it, and
// the stepper marks the next step as working; Complete waits for the review and Adapt for the decision;
// with the same answers the canvas, panels and tiles show what the simulation shows; the run writes in
// the page's language and keeps it when the page switches, saying so; Clear everything empties the form,
// the canvas and the run and forgets the key; the browser asks before leaving while a live result exists.
// Prints LIVE RUN OK. Usage: node tests/live-run.mjs
import { APP_ROOT, launchBrowser, serveStatic, port, context } from "./lib/harness.mjs";
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
  const start = await p.evaluate(() => ({ tape: document.getElementById("mode-text").textContent, fictional: document.querySelector(".fictional").hidden, play: document.getElementById("play").hidden, form: !!document.getElementById("live-name"), url: location.search }));
  check(start.tape === EN["p.mode.live"] && start.fictional && start.play && start.form && !/scenario|step/.test(start.url), "Run it live puts LIVE on the tape, opens the Start form, hides Play and the fictional label, and keeps the address bare", JSON.stringify(start));
  const waiting = await tiles(p);
  check(waiting.stake.main === "…" && waiting.stake.note === EN["kpi.wait.analyst"] && waiting.pressure.main === "…" && waiting.pressure.note === EN["kpi.wait.redteam"] && waiting.cost.main === "…", "before the agents answer, each tile shows … and what it waits for", JSON.stringify(waiting));

  await live.sample(p);
  await live.openDialog(p);
  await live.start(p);
  await live.waitFor(p, "review");
  const review = await p.evaluate(() => ({ step: window.BMC.state.step, bar: document.getElementById("bar").textContent }));
  check(review.step === 1 && review.bar.includes(EN["live.turn.complete"]), "Complete waits for the review", JSON.stringify(review));

  await p.click("#btn-cta"); // Challenge this canvas: the Red team answers, the Analyst is held
  await p.waitForFunction(() => window.BMC.state.live.agent === "analyst", null, { timeout: 15000 });
  await p.waitForTimeout(2200);
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
  const headline = await p.$eval("#step-title", (h) => h.textContent);
  check(done.reached === 5 && api.calls.map((c) => c.agent).join(" ") === "completer redteam analyst strategist writer", "Adapt waits for the decision; Apply runs the Writer and the summary shows", JSON.stringify(done));

  // ---- the language stays the run's --------------------------------------------------------------------------
  await p.click('.lang-option[data-lang="de"]');
  await p.waitForTimeout(300);
  const de = await p.evaluate(() => ({ step: document.querySelector("#steps .vc-step:nth-child(1) .vc-step__label")?.textContent || "", title: document.getElementById("step-title").textContent, panel: document.getElementById("panel").textContent, next: document.getElementById("btn-cta")?.textContent.trim() }));
  check(de.title === headline && de.panel.includes(DE["live.lang.kept"].replace("{lang}", DE["lang.en"])) && de.next === DE["live.again"], "switched to German, the interface changes, the analysis stays in English and says so", JSON.stringify({ ...de, panel: de.panel.slice(0, 120) }));
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
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} live-run checks passed`);
if (!failed) console.log("LIVE RUN OK");
process.exit(failed ? 1 : 0);
