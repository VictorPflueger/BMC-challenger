// The handoff file (brief 4.3 and 10; AC-21): each scenario's file, in English and German, with the recorded
// choices and with two others (every issue accepted; the other option where an issue has two), passes the
// shared schema and the references it can't hold, and the Prototype Ideator's own reader reads it. Its
// figures are the engine's: at stake, left and upside a year, blocks under pressure and resilience before
// and after, and each issue's expected value. It holds no key, no prompt and no thinking. Planted defects
// fail: a missing field, an item id the file doesn't have, a key-shaped string, a band that doesn't match.
// The Ideator's reader comes from a checkout at IDEATOR_DIR or ../PrototypeIdeator; it is required on
// GitHub Actions and with --require-ideator, else its checks are skipped and say so. Node.js only.
// Usage: node tests/handoff.mjs [--require-ideator]
import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { APP_ROOT, exit } from "./lib/harness.mjs";
import { SCENARIOS } from "../data/scenarios/index.js";
import { localise, buildRun, recordedChoices } from "../js/run.js";
import { handoffFor, handoffProblems, countryCode, HANDOFF_SCHEMA } from "../js/handoff.js";
import { band, expected } from "../js/risk.js";
import { AGENTS, promptFor } from "../js/prompts.js";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const near = (a, b) => (a === null || b === null ? a === b : Math.abs(a - b) <= 1e-9);
const REQUIRE = process.argv.includes("--require-ideator") || process.env.GITHUB_ACTIONS === "true";
const IDEATOR = [process.env.IDEATOR_DIR, path.resolve(APP_ROOT, "..", "PrototypeIdeator")].filter(Boolean).find((d) => existsSync(path.join(d, "js", "handoff.js")));
const readHandoff = IDEATOR ? (await import(pathToFileURL(path.join(IDEATOR, "js", "handoff.js")).href)).readHandoff : null;
if (!readHandoff) check(!REQUIRE, `${REQUIRE ? "FAIL" : "SKIP"}: no Prototype Ideator checkout in IDEATOR_DIR or ../PrototypeIdeator, so its reader is not tried`);
const CREATED = new Date("2026-11-24T10:00:00Z");
// The first sentence of each agent's prompt and of the shared rules: none may reach a file.
const PROMPT_MARKS = [...AGENTS.map((a) => promptFor(a).split("\n").find((l) => /^You are the /.test(l)).split(".")[0]), "You are one agent in a pipeline"];

/** Other choices than the recorded ones: every issue accepted, or the option the recording didn't take. */
function choiceSets(sc) {
  const rec = recordedChoices(sc);
  const accept = new Map(sc.answers.issues.map((i) => [i.id, "accept"]));
  const other = new Map(sc.answers.issues.map((i) => {
    const n = sc.answers.responses.find((r) => r.issue === i.id)?.options.length || 0;
    const was = rec.decisions.get(i.id);
    return [i.id, n === 2 ? (was === 0 ? 1 : 0) : was === "accept" ? 0 : "accept"];
  }));
  return { recorded: rec.decisions, accepted: accept, other };
}

for (const s of SCENARIOS) {
  for (const lang of ["en", "de"]) {
    const sc = localise(s, lang);
    const removed = recordedChoices(sc).removed;
    for (const [name, decisions] of Object.entries(choiceSets(sc))) {
      const at = `${s.id} ${lang} ${name}`;
      const run = buildRun(sc, { removed, decisions });
      const file = handoffFor({ sc, run, lang, mode: "simulation", applied: true, created: CREATED });
      const json = JSON.parse(JSON.stringify(file));
      const problems = handoffProblems(json);
      check(!problems.length, `${at}: the file passes the shared schema and its references${problems.length ? `: ${problems.slice(0, 3).join("; ")}` : ""}`);
      check(json.schema === HANDOFF_SCHEMA && json.tool.id === "bmc-challenger" && json.framework.type === "bmc" && json.language === lang && json.mode === "simulation" && json.model === null && json.company.fictional === true, `${at}: schema, tool, framework, language, mode and model as a simulation writes them`);
      check(json.framework.areas.length === 9 && json.framework.areas.every((a) => a.items.length === (run.kept.blocks[a.id] || []).length), `${at}: the nine blocks with the items the Red team challenged`);
      // The figures are the engine's.
      const f = json.figures;
      check(near(f.at_stake_eur_year, run.before.atStake) && near(f.left_eur_year, run.after.left) && near(f.upside_eur_year, run.after.upside), `${at}: at stake, left and upside a year are the engine's (${f.at_stake_eur_year}, ${f.left_eur_year}, ${f.upside_eur_year})`);
      check(f.pressure.before === run.before.pressure.before && f.pressure.after === run.after.pressure.after && f.pressure.of === 9 && near(f.score.before, run.before.resilience.before) && near(f.score.after, run.after.resilience.after) && f.score.name === "resilience" && f.score.scale === "0-100", `${at}: blocks under pressure and resilience before and after are the engine's`);
      const each = json.issues.every((i) => {
        const r = run.before.issues.find((x) => x.id === i.id);
        return r && near(i.eur_year_expected, r.before.expected) && i.band === r.before.band;
      });
      check(each && json.issues.length === run.issues.length, `${at}: every issue's expected value and band are the engine's`);
      // One chosen response per issue, the person's decision.
      const chosenRight = run.options.every((o) => {
        const mine = json.responses.filter((r) => r.issue === o.issue && r.chosen);
        const kind = o.chosen === "accept" ? "accept" : o.list[o.chosen].kind;
        return mine.length === 1 && mine[0].kind === kind && (kind === "accept" || mine[0].title === o.list[o.chosen].title);
      });
      check(chosenRight, `${at}: each issue has exactly one chosen response, the one decided`);
      const text = JSON.stringify(json);
      check(!/sk-ant-/.test(text) && !PROMPT_MARKS.some((m) => text.includes(m)) && !/"thinking"|"signature"/.test(text), `${at}: no key, no prompt and no thinking in the file`);
      if (readHandoff) {
        const r = readHandoff(json, { file: `${at}.json` });
        const sameIssues = r.ok && r.issues.length === run.issues.length && r.issues.every((x) => x.response && x.response.kind === json.responses.find((y) => y.issue === x.source.issue && y.chosen)?.kind);
        check(r.ok && !r.problems.length && sameIssues, `${at}: the Prototype Ideator's reader reads it, every issue with its chosen response${r.problems?.length ? `: ${r.problems.slice(0, 2).join("; ")}` : ""}`);
      }
    }
  }
}

// ---- the check fails where it should ----------------------------------------------------------------
const sc = localise(SCENARIOS[0], "en");
const base = () => JSON.parse(JSON.stringify(handoffFor({ sc, run: buildRun(sc, recordedChoices(sc)), lang: "en", mode: "simulation", applied: true, created: CREATED })));
const planted = [
  ["a missing field (company.country)", (j) => { delete j.company.country; }],
  ["an item id the file doesn't have", (j) => { j.issues[0].items = [...j.issues[0].items, "value-99"]; }],
  ["a key-shaped string", (j) => { j.summary.text += " sk-ant-api03-planted0123456789"; }],
  ["a band that doesn't match its impact and likelihood", (j) => { j.issues[0].band = j.issues[0].band === "low" ? "critical" : "low"; }],
  ["an expected value that isn't the engine's", (j) => { const i = j.issues.find((x) => x.eur_year_expected !== null); i.eur_year_expected += 1000; }],
  ["a response that names no issue of the file", (j) => { j.responses[0].issue = "I42"; }]
];
for (const [what, spoil] of planted) {
  const j = base();
  spoil(j);
  check(handoffProblems(j).length > 0, `control: the check refuses ${what}`);
}
check(!handoffProblems(base()).length, "control: the same file unspoilt passes");
if (readHandoff) {
  const j = base();
  delete j.company.country;
  check(!readHandoff(j).ok, "control: the Ideator's reader refuses the file without company.country");
}
// The country as two capital letters: a code as given, a name in English or German, else ZZ.
check(countryCode("DE") === "DE" && countryCode("de") === "DE" && countryCode("Germany") === "DE" && countryCode("Deutschland") === "DE" && countryCode("Österreich") === "AT" && countryCode("Narnia") === "ZZ" && countryCode("") === "ZZ", "the country as a code: DE, de, Germany, Deutschland, Österreich (AT); Narnia and nothing as ZZ");

let failed = 0;
for (const [ok, what] of results) { console.log(`${ok ? "PASS" : "FAIL"}  ${what}`); if (!ok) failed += 1; }
if (failed) { console.log(`\n${failed} of ${results.length} checks failed.`); exit(1); }
else { console.log(`\nAll ${results.length} checks passed${readHandoff ? `, the Ideator's reader from ${IDEATOR}` : ""}.\nHANDOFF OK`); exit(0); }
