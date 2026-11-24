// AC-09: no request starts whose worst case passes the budget cap. The worst case of a request is its
// input (about four characters a token) times the input price, max_tokens times the output price and
// $0.01 for each search it may run, worked out here on its own and compared with js/budget.js. In
// Chromium against the stand-in: a request that fits only with fewer output tokens goes with the step's
// minimum; a run that can't go on stops before the request, says "Stopped at your budget cap after
// <step>", sends nothing more, marks the rest not run and keeps what is done in its record (the report
// of M4 prints it on every page); the meter equals the usage of every answer times its price plus $0.01
// a search, at 0.894, within 1e-9; the Session cost tile shows the spend with the cap in its note.
// Prints LIVE BUDGET OK. Usage: node tests/live-budget.mjs
import { APP_ROOT, launchBrowser, serveStatic, port, context } from "./lib/harness.mjs";
import { install, live } from "./lib/standin.mjs";
import { fitToCap, worstCaseUsd } from "../js/budget.js";
import { MODELS, AGENT_TOKENS, FX_USD_EUR } from "../js/config.js";
import EN from "../js/i18n/en.js";

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });
const price = (id) => MODELS.find((m) => m.id === id).price;
/** The worst case, worked out without js/budget.js. */
function worst(body, searches = 0, extra = 0) {
  const tokens = Math.ceil(JSON.stringify({ system: body.system, messages: body.messages, tools: body.tools, format: body.output_config?.format }).length / 4) + extra;
  const p = price(body.model);
  return (tokens * p.input + body.max_tokens * p.output) / 1e6 + searches * 0.01;
}

// ---- the rule in numbers -------------------------------------------------------------------------------
const body = { model: "claude-haiku-5-5", max_tokens: 8000, system: "x".repeat(4000), messages: [{ role: "user", content: "y".repeat(8000) }], output_config: { effort: "medium" } };
check(Math.abs(worstCaseUsd(body) - worst(body)) < 1e-12 && Math.abs(worstCaseUsd(body, { searches: 5, extraInput: 20000 }) - worst(body, 5, 20000)) < 1e-12, "the worst case is the input times its price, max_tokens times the output price and $0.01 a search", `${worstCaseUsd(body)} vs ${worst(body)}`);
const capFor = (usd) => usd * FX_USD_EUR;
const full = worst(body);
const low = worst({ ...body, max_tokens: 3000 });
check(fitToCap(body, { spentUsd: 0, capEur: capFor(full + 0.001), min: 3000 })?.body.max_tokens === 8000, "a request whose worst case fits goes as it is");
const cut = fitToCap(body, { spentUsd: 0.01, capEur: capFor(0.01 + (full + low) / 2), min: 3000 });
check(cut?.cut === true && cut.body.max_tokens === 3000, "a request that fits only with fewer output tokens goes with the step's minimum", JSON.stringify(cut && { cut: cut.cut, max: cut.body.max_tokens }));
check(fitToCap(body, { spentUsd: 0.01, capEur: capFor(0.01 + low - 1e-6), min: 3000 }) === null, "a request that doesn't fit even then doesn't go");

const server = await serveStatic(APP_ROOT, port(9211));
const browser = await launchBrowser();
async function page(opts = {}) {
  const { context: ctx } = await context(browser, { width: 1280, height: 720 });
  const api = await install(ctx, opts);
  const p = await ctx.newPage();
  await p.goto(`${server.base}?guide=0`);
  await p.waitForSelector('html[data-boot="ready"]');
  return { ctx, p, api };
}
const spent = (calls) => calls.reduce((n, c) => { const pr = price(c.body.model); return n + (c.usage.input_tokens * pr.input + c.usage.output_tokens * pr.output) / 1e6 + c.usage.web_search_requests * 0.01; }, 0);

try {
  // ---- the meter, on two settings with research ---------------------------------------------------------
  for (const preset of ["balanced", "thorough"]) {
    const { ctx, p, api } = await page({ research: true });
    const end = await live.full(p, { preset, research: true });
    const usd = spent(api.calls);
    const tile = await p.evaluate(() => ({ main: document.querySelector("#kpi-cost .kpi-main").textContent, note: document.querySelector("#kpi-cost .kpi-note").textContent }));
    check(end.status === "done" && Math.abs(end.cost.usd - usd) < 1e-9 && Math.abs(end.cost.eur - usd * 0.894) < 1e-9 && end.cost.requests === api.calls.length,
      `${preset}: the meter equals usage times price plus $0.01 a search, at 0.894, within 1e-9 ($${usd.toFixed(6)})`, JSON.stringify({ meter: end.cost, usd }));
    check(/€0\.50/.test(tile.note) && tile.main !== "…", `${preset}: the Session cost tile shows the spend with the cap in its note`, JSON.stringify(tile));
    await ctx.close();
  }

  // ---- a stop before the request -------------------------------------------------------------------------
  {
    // The Completer's answer reports 110,000 output tokens ($0.055): with a cap of €0.05 the Red team's
    // worst case no longer fits.
    const { ctx, p, api } = await page({ usage: (agent) => (agent === "completer" ? { input_tokens: 1000, output_tokens: 110000 } : {}) });
    await live.enter(p);
    await live.sample(p);
    await live.openDialog(p);
    await live.start(p, { cap: 0.05 });
    await live.waitFor(p, "review");
    await p.click("#btn-cta");
    const st = await live.waitFor(p, "stopped");
    await p.waitForTimeout(500);
    const screen = await p.evaluate(() => ({ bar: document.querySelector("#bar").textContent, steps: [...document.querySelectorAll("#steps .vc-step")].map((li) => li.dataset.notRun === "true") }));
    const msg = EN["live.stop.cap"].replace("{step}", EN["p.step.complete"]);
    check(st.stopped?.cause === "cap" && st.reached === 1 && api.calls.length === 1, "a run whose next request could pass the cap stops before it and sends nothing more", JSON.stringify({ st, calls: api.calls.map((c) => c.agent) }));
    check(screen.bar.includes(msg), `it says "${msg}"`, screen.bar.slice(0, 160));
    check(same(screen.steps, [false, false, true, true, true, true]), "the steps it never ran are marked not run; what is done stays", JSON.stringify(screen.steps));
    await ctx.close();
  }

  // ---- fewer output tokens instead of a stop --------------------------------------------------------------
  {
    // A first run records the Red team's request; the second spends so much on the Completer that this
    // request fits under the cap only with the step's minimum.
    const dry = await page();
    await live.full(dry.p);
    const red = dry.api.calls.find((c) => c.agent === "redteam").body;
    await dry.ctx.close();
    const cap = 0.5;
    const room = (worst(red) + worst({ ...red, max_tokens: AGENT_TOKENS.redteam.min })) / 2; // between the two worst cases
    const pr = price("claude-haiku-5-5");
    const out = Math.floor(((cap / FX_USD_EUR - room) * 1e6 - 1000 * pr.input) / pr.output);
    const { ctx, p, api } = await page({ usage: (agent) => (agent === "completer" ? { input_tokens: 1000, output_tokens: out } : {}) });
    await live.enter(p);
    await live.sample(p);
    await live.openDialog(p);
    await live.start(p, { cap });
    await live.waitFor(p, "review");
    await p.click("#btn-cta");
    await p.waitForFunction(() => window.BMC.state.live.reached >= 2 || window.BMC.state.live.status === "stopped", null, { timeout: 15000 });
    const sent = api.calls.find((c) => c.agent === "redteam");
    check(sent && sent.body.max_tokens === AGENT_TOKENS.redteam.min, `a request that fits only with fewer output tokens goes with the step's minimum (${AGENT_TOKENS.redteam.min})`, JSON.stringify({ max: sent?.body.max_tokens, out }));
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} budget checks passed`);
if (!failed) console.log("LIVE BUDGET OK");
process.exit(failed ? 1 : 0);
