// AC-19 in Chromium against the stand-in: each refusal of brief 6.7 returns its message to the agent and
// gets one repair, after which the run goes on; a second failing answer stops the run there with what is
// done, and says which agent broke the rules. The refusals planted: a Completer item of 120 characters,
// a fourth new item in one block, an item that repeats the team's own (their items stay theirs); a block
// or an item that doesn't exist and nine issues (Red team); a KPI outside the library without its
// definition and a euro range whose low end passes its high end (Analyst); a residual risk above the
// issue's own and four changes in one option (Strategist). The Writer's prose that fails the fact audit
// goes back with its tokens, and after a second refusal shows with "Unchecked" instead of stopping.
// Prints LIVE REPAIR OK. Usage: node tests/live-repair.mjs
import { APP_ROOT, launchBrowser, serveStatic, port, context } from "./lib/harness.mjs";
import { install, live, answer, s1Answers } from "./lib/standin.mjs";
import EN from "../js/i18n/en.js";

const D = s1Answers();
const clone = (v) => JSON.parse(JSON.stringify(v));
const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });

const CASES = [
  ["completer", "an item of 120 characters", () => { const a = clone(D.completer); a.items[0].text = "x".repeat(120); return a; }, /1 to 90 characters/],
  ["completer", "a fourth new item in one block", () => { const a = clone(D.completer); const it = a.items.find((x) => x.block === "partners"); a.items.push({ ...it, text: "Port authorities of Bremen and Hamburg" }); return a; }, /partners: 4 new items, at most 3/],
  ["completer", "an item that repeats the team's own", () => { const a = clone(D.completer); const team = D.sc.entered.blocks.value[0].text; a.items.push({ block: "value", text: team, basis: "The team says so.", confidence: "high" }); return a; }, /repeats the team's item/],
  ["redteam", "a block that doesn't exist", () => { const a = clone(D.redteam); a.issues[0].blocks = ["pricing"]; return a; }, /blocks/],
  ["redteam", "an item that doesn't exist", () => { const a = clone(D.redteam); a.issues[0].items = ["value-99"]; return a; }, /the item "value-99" does not exist/],
  ["redteam", "nine issues", () => ({ issues: [...D.redteam.issues, ...D.redteam.issues.slice(0, 3)].map((i, k) => ({ ...i, id: `I${k + 1}` })) }), /9 issues, at most 8/],
  ["analyst", "a KPI outside the library without its definition", () => { const a = clone(D.analyst); a.impacts[0].kpis[0] = { ...a.impacts[0].kpis[0], id: "made.up_kpi", definition: "" }; return a; }, /not in the library and lacks/],
  ["analyst", "a euro range whose low end passes its high end", () => { const a = clone(D.analyst); const im = a.impacts.find((x) => x.monetisable); im.eur_year_low = im.eur_year_high + 1; return a; }, /euro range runs from 0 or more to a higher/],
  ["strategist", "a residual risk above the issue's own", () => { const a = clone(D.strategist); const o = a.responses[0].options.find((x) => x.kind === "mitigate"); o.impact = 5; o.likelihood = 5; return a; }, /residual risk is above the issue's own/],
  ["strategist", "four changes in one option", () => { const a = clone(D.strategist); const o = a.responses[0].options[0]; while (o.changes.length < 4) o.changes.push({ block: "revenue", action: "add", item: "", text: `Extra change ${o.changes.length}` }); return a; }, /4 changes, 1 to 3/]
];
const REACHED = { completer: 0, redteam: 1, analyst: 2, strategist: 3 };

const server = await serveStatic(APP_ROOT, port(9216));
const browser = await launchBrowser();
async function run(agent, bad, twice) {
  const { context: ctx } = await context(browser, { width: 1280, height: 720 });
  const api = await install(ctx, { script: (a, body, n) => (a === agent && (n === 1 || twice) ? answer(bad()) : undefined) });
  const p = await ctx.newPage();
  await p.goto(`${server.base}?guide=0`);
  await p.waitForSelector('html[data-boot="ready"]');
  const end = await live.full(p);
  const bar = await p.evaluate(() => document.querySelector("#bar").textContent);
  const panel = await p.evaluate(() => document.querySelector("#panel").textContent);
  await ctx.close();
  return { end, bar, panel, calls: api.calls.filter((c) => c.agent === agent) };
}

try {
  for (const [agent, what, bad, rule] of CASES) {
    const once = await run(agent, bad, false);
    const repair = once.calls[1]?.body.messages.at(-1)?.content || "";
    check(once.end.status === "done" && once.calls.length === 2 && rule.test(repair) && once.end.repairs === 1, `${agent}, ${what}: refused with its message, one repair, and the run goes on`, JSON.stringify({ status: once.end.status, calls: once.calls.length, repair: repair.slice(0, 160) }));
    const two = await run(agent, bad, true);
    const msg = EN["live.stop.repair"].replace("{agent}", EN[`live.name.${agent}`]);
    check(two.end.status === "stopped" && two.end.stopped?.cause === "repair" && two.end.reached === REACHED[agent] && two.calls.length === 2 && two.bar.includes(msg),
      `${agent}, ${what}: a second failure stops the run there with ${REACHED[agent]} step(s) done`, JSON.stringify({ end: two.end, calls: two.calls.length, bar: two.bar.slice(0, 160) }));
  }

  // ---- the Writer's figures ------------------------------------------------------------------------------
  const typed = () => ({ ...clone(D.writer), headline: "Tidewell Lines has €5m a year at stake on its European calls" });
  const once = await run("writer", typed, false);
  const sent = once.calls[1]?.body.messages.at(-1)?.content || "";
  check(once.end.status === "done" && once.calls.length === 2 && /headline: write these without numbers/.test(sent) && /\b5m\b/.test(sent) && once.end.unchecked === 0, "a figure the Writer types goes back with its tokens, and a clean repair is checked", JSON.stringify({ status: once.end.status, sent: sent.slice(0, 200) }));
  const two = await run("writer", typed, true);
  check(two.end.status === "done" && two.end.unchecked > 0 && two.panel.includes(EN["live.unchecked"]) && two.panel.includes("headline"), "refused twice, the text shows with \"Unchecked\" and the run doesn't stop", JSON.stringify({ end: two.end, panel: two.panel.slice(0, 200) }));
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} repair checks passed`);
if (!failed) console.log("LIVE REPAIR OK");
process.exit(failed ? 1 : 0);
