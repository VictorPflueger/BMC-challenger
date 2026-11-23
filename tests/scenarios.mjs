// The scenario checker (AC-06, gate G3). tools/check-scenarios.mjs passes the three scenarios as they are,
// along the recorded choices and others, and fails on a planted defect of each kind brief 7 lists: an
// answer that breaks its schema or names a missing id; a missing language or placeholders that differ
// between languages; prose that fails the fact audit; a figure that no longer matches the frozen
// reference; a fact missing from DATA_SOURCES.md; anything shaped like a key; a thinking block. A
// recorded choice that cannot play fails too. Each defect is planted in a copy of a scenario, never in
// the file.
// Usage: node tests/scenarios.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT } from "./lib/harness.mjs";

const mod = (p) => import(pathToFileURL(path.join(APP_ROOT, p)).href);
const { checkScenario, checkAll, playProblems, otherChoices } = await mod("tools/check-scenarios.mjs");
const { SCENARIOS } = await mod("data/scenarios/index.js");
const { localise, recordedChoices } = await mod("js/run.js");

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });

// ---- the scenarios as they are ---------------------------------------------------------------------------
const all = checkAll();
check(all.scenarios === 3 && !all.problems.length, `the three scenarios pass every check in both languages (${SCENARIOS.map((s) => s.id).join(", ")})`, all.problems.slice(0, 6).map(([k, t]) => `${k}: ${t}`).join(" | "));

// ---- a defect of each kind, planted in a copy -------------------------------------------------------------
const copy = (id) => structuredClone(SCENARIOS.find((s) => s.id === id));
const PLANTS = [
  ["schema", "an option whose time to impact is written as text", "s1", (s) => { s.answers.responses[0].options[0].time_to_impact = "3-6 months"; }],
  ["guard", "an issue that names an item the canvas does not have", "s1", (s) => { s.answers.issues[0].items = ["costs-9"]; }],
  ["guard", "a recorded removal of an item the person entered", "s1", (s) => { s.choices.removed = ["value-1"]; }],
  ["language", "a text without its German", "s2", (s) => { delete s.answers.issues[1].title.de; }],
  ["language", "a German text that is the English one copied", "s3", (s) => { s.answers.issues[0].description.de = s.answers.issues[0].description.en; }],
  ["placeholders", "a summary whose German cites another fact than its English", "s1", (s) => { s.answers.summary.recommendation.de = s.answers.summary.recommendation.de.replace("{{fact:left}}", "{{fact:at_stake}}"); }],
  ["audit", "a figure written into an issue's prose", "s2", (s) => { s.answers.issues[0].description.en += " Service revenue fell 12% last year."; s.answers.issues[0].description.de += " Der Serviceumsatz fiel im letzten Jahr um 12 %."; }],
  ["audit", "a placeholder the engine never returns", "s3", (s) => { s.answers.summary.recommendation.en += " {{fact:issue.I9.expected}}"; s.answers.summary.recommendation.de += " {{fact:issue.I9.expected}}"; }],
  ["figure", "a euro range moved after the figures were frozen", "s1", (s) => { s.answers.impacts.impacts[0].eur_year_high += 2000000; }],
  ["source", "a fact DATA_SOURCES.md does not list", "s2", (s) => { s.facts.push("S2.9"); }],
  ["source", "a source DATA_SOURCES.md does not list", "s3", (s) => { const url = "https://example.org/unlisted"; const old = s.answers.signals[0].url; s.answers.signals[0].url = url; for (const i of s.answers.issues) i.evidence = i.evidence.map((u) => (u === old ? url : u)); }],
  ["key", "an API key pasted into a basis", "s1", (s) => { s.answers.completion.items[0].basis.en = "sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWx"; }],
  ["key", "a long token in a text", "s2", (s) => { s.company.description.de += " 4f9a8c7e6d5b4a3928171615141312111009a8b7"; }],
  ["thinking", "a thinking block left in an answer", "s3", (s) => { s.answers.issues[0].thinking = { type: "thinking", thinking: "First I list the risks.", signature: "EqQBCgIYAhIM" }; }]
];
for (const [kind, what, id, plant] of PLANTS) {
  const s = copy(id);
  plant(s);
  const problems = checkScenario(s);
  const kinds = [...new Set(problems.map(([k]) => k))];
  check(kinds.includes(kind), `${kind}: ${what} (${id}) fails`, `found ${kinds.join(", ") || "nothing"}`);
}
// Each kind the brief lists is planted at least once.
const planted = new Set(PLANTS.map(([k]) => k));
check(["schema", "guard", "language", "placeholders", "audit", "figure", "source", "key", "thinking"].every((k) => planted.has(k)), `every kind of defect the brief lists is planted (${[...planted].join(", ")})`);

// ---- the plays -------------------------------------------------------------------------------------------
// The schema and the guards stop a scenario before it plays, so a run that does not play is planted
// where the checker plays it: a company without its name, and one without its signals.
{
  const sc = localise(SCENARIOS[0], "en");
  const nameless = playProblems({ ...sc, company: { ...sc.company, name: undefined } }, recordedChoices(sc), "en");
  const silent = playProblems({ ...sc, answers: { ...sc.answers, signals: undefined } }, recordedChoices(sc), "en");
  const fine = playProblems(sc, recordedChoices(sc), "en");
  check(nameless.length > 0 && silent.length > 0 && !fine.length, "play: a step whose words cannot fill in, or that cannot be drawn, fails; the recorded run plays", [...nameless, ...silent].slice(0, 2).join(" | "));
  const others = otherChoices(sc);
  const recorded = JSON.stringify([...recordedChoices(sc).decisions]);
  check(others.length === 4 && others.filter(([, c]) => JSON.stringify([...c.decisions]) !== recorded).length >= 3, `the checker plays ${others.length} other choices besides the recorded one (${others.map(([n]) => n).join("; ")})`);
}
// A defect only another choice reaches: an option the recording never chose.
{
  const s = copy("s2");
  const r = s.answers.responses.find((x) => x.options.length > 1);
  const recorded = s.choices.decisions.find((d) => d.issue === r.issue);
  const other = recorded.option === 0 ? 1 : 0;
  r.options[other].time_to_impact = "someday";
  const problems = checkScenario(s);
  check(problems.some(([k]) => k === "schema" || k === "play"), `an option the recording never chose is checked too (${r.issue}, option ${other + 1})`, problems.slice(0, 3).map(([k, t]) => `${k}: ${t}`).join(" | "));
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} scenario checks passed.`);
if (!failed) console.log("SCENARIOS OK");
process.exit(failed ? 1 : 0);
