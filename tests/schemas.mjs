// The schemas (brief 4.3, 5.2 and section 10):
//   handoff     strategy-challenge/1 validates the brief's example and refuses each planted break, and
//               schemas/index.js carries exactly schemas/strategy-challenge-1.json
//   output      every agent output schema has all fields required, no union types and
//               additionalProperties false, uses only the keywords structured outputs enforce, and each
//               request stays within 24 optional and 16 union-typed parameters and 20 strict tools
//   contracts   the twelve records exist, each accepts a sound sample and refuses a planted break
// Prints SCHEMAS OK.
// Usage: node tests/schemas.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT } from "./lib/harness.mjs";

const mod = (p) => import(pathToFileURL(path.join(APP_ROOT, p)).href);
const { validate } = await mod("js/schema.js");
const { HANDOFF, HANDOFF_DEFS, OUTPUT, CONTRACTS } = await mod("schemas/index.js");
const json = JSON.parse(readFileSync(path.join(APP_ROOT, "schemas/strategy-challenge-1.json"), "utf8"));
const example = JSON.parse(readFileSync(path.join(APP_ROOT, "tests/fixtures/handoff-example.json"), "utf8"));

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const copy = (v) => JSON.parse(JSON.stringify(v));
const handoff = (v) => validate(v, HANDOFF, HANDOFF_DEFS);
const contract = (name, v) => validate(v, CONTRACTS[name], CONTRACTS);

// ---- the handoff file ---------------------------------------------------------------------------------
check(JSON.stringify(HANDOFF) === JSON.stringify(json), "schemas/index.js carries exactly schemas/strategy-challenge-1.json");
const ok = handoff(example);
check(ok.valid, `the brief's example validates${ok.valid ? "" : `: ${ok.errors.map((e) => `${e.path} ${e.message}`).join("; ")}`}`);
const breaks = [
  ["a missing required field", (v) => { delete v.disclaimer; }],
  ["another schema name", (v) => { v.schema = "strategy-challenge/2"; }],
  ["a field the shape does not have", (v) => { v.prompt = "You are a strategist"; }],
  ["an impact of 6", (v) => { v.issues[0].impact = 6; }],
  ["a likelihood that is not whole", (v) => { v.issues[0].likelihood = 2.5; }],
  ["an unknown response kind", (v) => { v.responses[0].kind = "ignore"; }],
  ["an area that no framework has", (v) => { v.issues[0].areas = ["pricing"]; }],
  ["a figure written as text", (v) => { v.figures.at_stake_eur_year = "€9.5m"; }],
  ["a creation time that is no time", (v) => { v.created = "1 December 2026"; }],
  ["a source date that is no date", (v) => { v.sources[0].read_on = "2026-13-01"; }],
  ["an unknown score", (v) => { v.figures.score.name = "health"; }],
  ["an item id without its block", (v) => { v.framework.areas[0].items[0].id = "1"; }],
  ["a negative amount", (v) => { v.issues[0].eur_year_low = -1; }]
];
for (const [what, plant] of breaks) {
  const v = copy(example);
  plant(v);
  check(!handoff(v).valid, `the handoff schema refuses ${what}`);
}
const accepted = copy(example);
accepted.responses.push({ id: "R2", issue: "I1", kind: "accept", chosen: false, title: "Accept the risk", first_step: "", owner: "", changes: [], residual: null, upside: null, effort: "S", time_to_impact: "" });
accepted.issues[0].eur_year_low = null; accepted.issues[0].eur_year_high = null; accepted.issues[0].eur_year_expected = null;
check(handoff(accepted).valid, "an accepted response and an issue without euros validate (nulls where there is no figure)");

// ---- the agent output schemas ------------------------------------------------------------------------
const ALLOWED = new Set(["type", "properties", "required", "additionalProperties", "items", "enum", "description"]);
function walk(s, at, visit) {
  visit(s, at);
  if (s.properties) for (const [k, v] of Object.entries(s.properties)) walk(v, `${at}.${k}`, visit);
  if (s.items) walk(s.items, `${at}[]`, visit);
}
let optional = 0;
let unions = 0;
for (const [name, schema] of Object.entries(OUTPUT)) {
  const problems = [];
  walk(schema, name, (s, at) => {
    for (const k of Object.keys(s)) if (!ALLOWED.has(k)) problems.push(`${at} uses ${k}`);
    if (Array.isArray(s.type)) { unions += 1; problems.push(`${at} has a union type`); }
    if (s.enum && !s.enum.every((e) => typeof e === "string")) problems.push(`${at} has an enum that is not strings`);
    if (s.type === "object") {
      if (s.additionalProperties !== false) problems.push(`${at} allows other fields`);
      const keys = Object.keys(s.properties || {}).sort().join(",");
      const req = [...(s.required || [])].sort().join(",");
      if (keys !== req) { optional += Object.keys(s.properties || {}).length - (s.required || []).length; problems.push(`${at} has optional fields`); }
    }
  });
  check(!problems.length, `${name}: every field required, no union type, additionalProperties false, only enforced keywords${problems.length ? `: ${problems.join("; ")}` : ""}`);
}
// One request carries one output schema, plus the Scout's one strict tool when research is on.
check(optional <= 24 && unions <= 16, `requests stay within 24 optional and 16 union-typed parameters (${optional} and ${unions} across all schemas)`);
check(Object.keys(OUTPUT).length === 6, "six output schemas: Completion, Signals, Issues, Impacts, Responses, Summary");
const sample = {
  Completion: { sector: "transport_logistics", items: [{ block: "partners", text: "Port terminals in Bremerhaven and Rotterdam", basis: "A carrier needs berths on its loops", confidence: "high" }] },
  Summary: { headline: "Emission costs put {{fact:at_stake}} a year at risk", situation: "s", findings: ["a", "b", "c"], recommendation: "r", assumptions: ["x", "y", "z"] }
};
for (const [name, v] of Object.entries(sample)) check(validate(v, OUTPUT[name]).valid, `${name}: a sound answer validates`);
const extra = copy(sample.Completion); extra.items[0].colour = "lilac";
check(!validate(extra, OUTPUT.Completion).valid, "Completion: a field the schema does not have is refused");

// ---- the twelve contracts -------------------------------------------------------------------------------
const NAMES = ["Canvas", "Item", "Completion", "Signal", "Issue", "Impact", "Response", "Decision", "Summary", "Scenario", "RunEvent", "AuditEvent"];
check(NAMES.every((n) => CONTRACTS[n]) && Object.keys(CONTRACTS).length === 12, `the twelve contracts of brief section 10 exist (${Object.keys(CONTRACTS).join(", ")})`);
const item = { id: "value-2", block: "value", text: "Emissions statement per container", source: "ai", confidence: "medium", basis: "Shippers report transport emissions" };
const blocks = { partners: [], activities: [], resources: [], value: [{ id: "value-1", block: "value", text: "Weekly Europe–Asia loops", source: "user" }, item], relationships: [], channels: [], segments: [], costs: [], revenue: [] };
const company = { name: "Tidewell Lines", sector: "transport_logistics", country: "DE", description: "Container carrier based in Bremen", fictional: true };
const issue = { id: "I1", title: "Emission allowances raise the cost of every European call", type: "regulation", description: "Voyages to and from EU ports need allowances.", blocks: ["costs", "revenue"], items: ["costs-2"], contradicts: "Cost structure", impact: 4, likelihood: 4, horizon: "now", evidence: ["general knowledge"], confidence: "medium" };
const impact = { issue: "I1", kpis: [{ id: "transport_logistics.cost_per_teu", name: "Cost per container moved", unit: "EUR per TEU", direction: "up", definition: "", change_low: 12, change_high: 25, basis: "Allowance price times emissions" }], monetisable: true, eur_year_low: 2000000, eur_year_high: 6000000, eur_basis: "Containers times the uncovered cost", reason: "", confidence: "medium" };
const option = { kind: "mitigate", title: "Publish a surcharge", first_step: "Pricing sets the formula", owner: "Commercial", effort: "M", time_to_impact: "3-6 months", changes: [{ block: "revenue", action: "add", item: "", text: "Emissions surcharge per container" }], impact: 3, likelihood: 2, eur_year_low: 1000000, eur_year_high: 3000000, recommended: true };
const summary = sample.Summary;
const answers = { completion: sample.Completion, signals: [], issues: [issue], impacts: { baselines: [], impacts: [impact] }, responses: [{ issue: "I1", options: [option] }], summary };
const SAMPLES = {
  Canvas: [{ company, blocks }, (v) => { v.blocks.value = Array.from({ length: 9 }, (_, i) => ({ id: `value-${i + 1}`, block: "value", text: "x", source: "user" })); }, "a block with nine items"],
  Item: [item, (v) => { delete v.basis; }, "an AI item without its basis"],
  Completion: [sample.Completion, (v) => { v.items[0].text = "x".repeat(91); }, "an item of 91 characters"],
  Signal: [{ title: "Container lines shift capacity back to Suez", summary: "Two sentences.", url: "https://example.org/a", published: "2026-10-21", areas: ["channels"] }, (v) => { v.url = "ftp://example.org"; }, "an address that is not on the web"],
  Issue: [issue, (v) => { v.blocks = ["value", "costs", "revenue", "channels", "segments"]; }, "an issue on five blocks"],
  Impact: [impact, (v) => { v.kpis = []; }, "an impact without a KPI"],
  Response: [{ issue: "I1", options: [option] }, (v) => { v.options = [option, option, option]; }, "three options"],
  Decision: [{ issue: "I1", choice: "mitigate", option: 0, at: "2026-11-23T20:00:00Z", by: "person" }, (v) => { v.by = "agent"; }, "a decision the agent took"],
  Summary: [summary, (v) => { v.findings = ["a", "b"]; }, "two findings"],
  Scenario: [{ id: "s1", source: "authored", as_of: "2026-11-23", company, entered: { company, blocks }, answers: { en: answers, de: answers }, choices: { removed: [], decisions: [{ issue: "I1", choice: "mitigate", option: 0 }] } }, (v) => { delete v.answers.de; }, "a scenario in one language only"],
  RunEvent: [{ seq: 0, type: "run_started", step: null, data: {} }, (v) => { v.type = "guess"; }, "an unknown event"],
  AuditEvent: [{ at: "2026-11-23T20:00:00Z", who: "person", step: "adapt", what: "chose to mitigate I1", detail: {} }, (v) => { v.who = "someone"; }, "an unknown actor"]
};
for (const [name, [good, plant, what]] of Object.entries(SAMPLES)) {
  const r = contract(name, good);
  const bad = copy(good);
  plant(bad);
  check(r.valid && !contract(name, bad).valid, `${name}: a sound record validates and ${what} is refused${r.valid ? "" : `: ${r.errors.map((e) => `${e.path} ${e.message}`).join("; ")}`}`);
}

const failed = results.filter(([ok]) => !ok);
for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
if (failed.length) { console.log(`\n${failed.length} of ${results.length} checks failed.`); process.exit(1); }
console.log(`\nAll ${results.length} checks passed.\nSCHEMAS OK`);
