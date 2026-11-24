// AC-08 against the stand-in in Chromium (tests/lib/standin.mjs; no real API call): on each setting
// every request sends its model, effort and thinking (Fast: Haiku 5.5, low, thinking disabled;
// Balanced: Haiku 5.5, medium, no thinking field; Thorough: Sonnet 5.5, medium, no thinking field),
// the step's output_config.format as its JSON schema (the Scout its two tools instead), anthropic-version
// 2023-06-01, the browser-access header, stream true and the key, to api.anthropic.com only, after the
// free GET /v1/models; a failing answer gets exactly one repair, and the run goes on; Abort at each agent
// stops the run at once, sends nothing more and keeps every step done. Prints LIVE REQUESTS OK.
// Usage: node tests/live-requests.mjs
import { APP_ROOT, launchBrowser, serveStatic, port, context, NETWORK_NOISE } from "./lib/harness.mjs";
import { install, live, answer, KEY } from "./lib/standin.mjs";
import { OUTPUT } from "../schemas/index.js";
import { PRESETS, ANTHROPIC } from "../js/config.js";

const SCHEMA = { completer: "Completion", redteam: "Issues", analyst: "Impacts", strategist: "Responses", writer: "Summary" };
const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const server = await serveStatic(APP_ROOT, port(9210));
const browser = await launchBrowser();
async function page(opts = {}) {
  const { context: ctx, outside } = await context(browser, { width: 1280, height: 720 });
  const api = await install(ctx, opts);
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e.message || e)));
  p.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
  await p.goto(`${server.base}?guide=0`);
  await p.waitForSelector('html[data-boot="ready"]');
  return { ctx, p, api, outside, errors };
}

try {
  // ---- every setting, every request ------------------------------------------------------------------
  for (const preset of PRESETS) {
    const { ctx, p, api, outside, errors } = await page({ research: true });
    const end = await live.full(p, { preset: preset.id, research: true });
    const calls = api.calls;
    const bad = [];
    for (const c of calls) {
      const b = c.body;
      const h = c.headers;
      const where = `${c.agent}#${c.n}`;
      if (!c.url.startsWith(ANTHROPIC.messagesUrl)) bad.push(`${where}: ${c.url}`);
      if (h["anthropic-version"] !== "2023-06-01") bad.push(`${where}: anthropic-version ${h["anthropic-version"]}`);
      if (h["anthropic-dangerous-direct-browser-access"] !== "true") bad.push(`${where}: no browser-access header`);
      if (h["x-api-key"] !== KEY) bad.push(`${where}: the key is not sent as x-api-key`);
      if (b.stream !== true) bad.push(`${where}: not streamed`);
      if (b.model !== preset.model) bad.push(`${where}: model ${b.model}`);
      if (b.output_config?.effort !== preset.effort) bad.push(`${where}: effort ${b.output_config?.effort}`);
      if (preset.thinking ? !same(b.thinking, preset.thinking) : "thinking" in b) bad.push(`${where}: thinking ${JSON.stringify(b.thinking)}`);
      if (c.agent === "scout") {
        if (b.output_config.format) bad.push(`${where}: the Scout sends a format`);
        if (!same(b.tools?.[0], ANTHROPIC.webSearchTool) || b.tools?.[1]?.name !== "submit_signals" || b.tools[1].strict !== true) bad.push(`${where}: tools ${JSON.stringify(b.tools?.map((x) => x.name || x.type))}`);
      } else if (!(b.output_config?.format?.type === "json_schema" && same(b.output_config.format.schema, OUTPUT[SCHEMA[c.agent]]))) bad.push(`${where}: format is not the ${SCHEMA[c.agent]} schema`);
    }
    const agents = calls.map((c) => c.agent).join(" ");
    check(end.status === "done" && agents === "completer scout redteam analyst strategist writer", `${preset.id}: a full run with research makes its six requests in order`, `${end.status}: ${agents}`);
    check(!bad.length, `${preset.id}: every request sends ${preset.model}, effort ${preset.effort}, ${preset.thinking ? "thinking disabled" : "no thinking field"}, its schema, both headers, the key and stream`, bad.slice(0, 5).join("; "));
    const first = calls[0]?.at ?? 0;
    check(api.gets.length >= 1 && api.gets[0].at <= first && api.gets[0].headers["x-api-key"] === KEY && /\/v1\/models/.test(api.gets[0].url), `${preset.id}: the key is checked first with the free GET /v1/models`, JSON.stringify(api.gets.map((g) => g.url)));
    check(!outside.length && !errors.length, `${preset.id}: nothing goes to another host, no page error`, [...outside, ...errors].slice(0, 3).join(" | "));
    await ctx.close();
  }

  // ---- one repair, then the run goes on ---------------------------------------------------------------
  {
    const { ctx, p, api } = await page({
      script: (agent, body, n) => {
        if (agent !== "redteam" || n !== 1) return undefined;
        const good = api.defaults.redteam.issues;
        return answer({ issues: [...good, ...good.slice(0, 3)].map((i, k) => ({ ...i, id: `I${k + 1}` })) }); // nine issues: at most eight
      }
    });
    const end = await live.full(p);
    const red = api.calls.filter((c) => c.agent === "redteam");
    const second = red[1]?.body.messages || [];
    check(end.status === "done" && red.length === 2 && end.repairs === 1, "a failing answer gets exactly one repair and the run goes on to the summary", `${end.status}, ${red.length} Red team requests, ${end.repairs} repair(s)`);
    check(second.length === 3 && second[1].role === "assistant" && JSON.parse(second[1].content).issues.length === 9 && second[2].role === "user" && /^Your answer broke these rules/.test(second[2].content) && /9 issues, at most 8/.test(second[2].content),
      "the repair sends the answer back with its problems listed", JSON.stringify(second.map((m) => [m.role, String(m.content).slice(0, 60)])));
    await ctx.close();
  }

  // ---- Abort at each agent ---------------------------------------------------------------------------
  const STEPS_DONE = { completer: 0, scout: 1, redteam: 1, analyst: 2, strategist: 3, writer: 4 };
  for (const agent of Object.keys(STEPS_DONE)) {
    const { ctx, p, api } = await page({ research: true, script: (a) => (a === agent ? { kind: "hold" } : undefined) });
    await live.enter(p);
    await live.sample(p);
    await live.openDialog(p);
    await live.start(p, { research: true });
    if (STEPS_DONE[agent] >= 1) { await live.waitFor(p, "review"); await p.click("#btn-cta"); }
    if (agent === "writer") { await live.waitFor(p, "decision"); await p.click("#btn-cta"); }
    await p.waitForFunction((a) => window.BMC.state.live.agent === a, agent, { timeout: 15000 });
    await p.waitForTimeout(200);
    const before = api.calls.length;
    const t0 = Date.now();
    await p.click("#btn-cta"); // Abort, while the agent works
    const st = await live.waitFor(p, "stopped", 3000);
    const ms = Date.now() - t0;
    await p.waitForTimeout(800);
    const kept = await p.evaluate(() => ({ items: document.querySelectorAll('#canvas [data-source="ai"]').length, bar: document.querySelector("#bar")?.textContent || "" }));
    check(st.stopped?.cause === "aborted" && st.reached === STEPS_DONE[agent] && ms < 1500 && api.calls.length === before && /stopped the run|angehalten/i.test(kept.bar),
      `Abort while the ${agent} works stops at once (${ms} ms), sends nothing more and keeps ${STEPS_DONE[agent]} step(s) done`, JSON.stringify({ st, ms, calls: [before, api.calls.length] }));
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} request checks passed`);
if (!failed) console.log("LIVE REQUESTS OK");
process.exit(failed ? 1 : 0);
