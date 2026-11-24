// AC-12 in Chromium against the stand-in. With research on, the Scout's request carries Anthropic's basic
// web search (web_search_20250305, five uses) and the strict submit_signals tool, and no output format;
// only addresses from the conversation's own search results are kept, any other is dropped and noted in
// the console (D13, without a second request); a paused turn is sent again unchanged, the paused answer
// included; an organisation with web search switched off goes on without research and the Challenge
// step says so. Without research the run says once, in the console, that the model knows the world up
// to June 2026. Prints LIVE RESEARCH OK. Usage: node tests/live-research.mjs
import { APP_ROOT, launchBrowser, serveStatic, port, context } from "./lib/harness.mjs";
import { install, live, scoutTurn, apiError, s1Answers } from "./lib/standin.mjs";
import { OUTPUT } from "../schemas/index.js";
import EN from "../js/i18n/en.js";

const DEFAULTS = s1Answers({ research: true }).scout.signals;
const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });
const server = await serveStatic(APP_ROOT, port(9214));
const browser = await launchBrowser();
async function run(opts, runOpts = { research: true }) {
  const { context: ctx } = await context(browser, { width: 1280, height: 720 });
  const api = await install(ctx, { research: true, ...opts });
  const p = await ctx.newPage();
  const lines = [];
  p.on("console", (m) => lines.push(m.text()));
  await p.goto(`${server.base}?guide=0`);
  await p.waitForSelector('html[data-boot="ready"]');
  const end = await live.full(p, runOpts);
  return { ctx, p, api, end, lines };
}
const red = (api) => JSON.parse(api.calls.find((c) => c.agent === "redteam").body.messages[0].content);

try {
  // ---- the request ---------------------------------------------------------------------------------------
  {
    const { ctx, api, end } = await run({});
    const scout = api.calls.find((c) => c.agent === "scout").body;
    const [search, tool] = scout.tools || [];
    check(end.status === "done" && search?.type === "web_search_20250305" && search.name === "web_search" && search.max_uses === 5, "the Scout searches with web_search_20250305, five uses at most", JSON.stringify(search));
    check(tool?.name === "submit_signals" && tool.strict === true && JSON.stringify(tool.input_schema) === JSON.stringify(OUTPUT.Signals) && !scout.output_config.format, "it reports through the strict submit_signals tool and sends no output format", JSON.stringify({ name: tool?.name, strict: tool?.strict }));
    check(red(api).signals.length === api.defaults.scout.signals.length && end.research.ran, "the Red team reads the signals found", `${red(api).signals.length} signals`);
    await ctx.close();
  }

  // ---- addresses from the run's own results only ---------------------------------------------------------------
  {
    const { ctx, api, end, lines } = await run({
      research: false, // the Red team's answer rests on general knowledge, so three sources suffice
      script: (agent, body, n, calls) => {
        if (agent !== "scout") return undefined;
        const signals = [...DEFAULTS.slice(0, 3), { title: "Made up", summary: "A page no search returned.", url: "https://example.org/not-found", published: "", areas: ["costs"] }];
        return scoutTurn(signals, { urls: signals.slice(0, 3).map((s) => s.url) });
      }
    });
    const urls = red(api).signals.map((s) => s.url);
    check(end.status === "done" && urls.length === 3 && !urls.includes("https://example.org/not-found") && end.research.dropped === 1, "an address no search of the run returned is dropped", JSON.stringify({ urls, dropped: end.research.dropped }));
    check(lines.some((l) => /dropped 1 signal/.test(l)) && api.calls.filter((c) => c.agent === "scout").length === 1, "the console notes it, and no second request goes out for it");
    await ctx.close();
  }

  // ---- pause_turn --------------------------------------------------------------------------------------------
  {
    let paused = null;
    const { ctx, api, end } = await run({
      script: (agent, body, n, calls) => {
        if (agent !== "scout") return undefined;
        const signals = DEFAULTS;
        if (n === 1) { paused = scoutTurn(signals, { submit: false, stop: "pause_turn" }); return paused; }
        return scoutTurn(signals);
      }
    });
    const scouts = api.calls.filter((c) => c.agent === "scout");
    const again = scouts[1]?.body.messages || [];
    check(end.status === "done" && scouts.length === 2 && again.length === 2 && JSON.stringify(again[0]) === JSON.stringify(scouts[0].body.messages[0]) && again[1].role === "assistant" && JSON.stringify(again[1].content) === JSON.stringify(paused.content),
      "a paused turn goes back unchanged, the paused answer included, and the search goes on", JSON.stringify({ n: scouts.length, roles: again.map((m) => m.role) }));
    await ctx.close();
  }

  // ---- web search switched off ------------------------------------------------------------------------------
  {
    // The Red team's answer then rests on general knowledge (the stand-in's answers without research).
    const { ctx, p, api, end, lines } = await run({ research: false, script: (agent) => (agent === "scout" ? apiError(400, "invalid_request_error", "Web search is not enabled for this organization.") : undefined) });
    await p.evaluate(() => document.querySelectorAll("#steps .vc-step")[2].querySelector("button").click());
    const note = await p.evaluate(() => document.getElementById("panel").textContent);
    check(end.status === "done" && end.research.disabled && api.calls.some((c) => c.agent === "redteam") && red(api).signals.length === 0, "an organisation without web search goes on without research", JSON.stringify(end.research));
    check(note.includes(EN["live.research.off"]) && lines.some((l) => /switched off/.test(l)), "the Challenge step and the console say so");
    await ctx.close();
  }

  // ---- no research: the knowledge cutoff, once ------------------------------------------------------------
  {
    const { ctx, api, end, lines } = await run({ research: false }, { research: false });
    const said = lines.filter((l) => /knows the world up to June 2026/.test(l));
    check(end.status === "done" && !api.calls.some((c) => c.agent === "scout") && said.length === 1, "without research the run says once that the model knows the world up to June 2026", JSON.stringify(said));
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} research checks passed`);
if (!failed) console.log("LIVE RESEARCH OK");
process.exit(failed ? 1 : 0);
