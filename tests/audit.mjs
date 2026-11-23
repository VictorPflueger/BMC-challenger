// The fact audit and the guardrails (brief 5.10 and 6.7, gate G4). Prose carries figures only as
// {{fact:key}}, filled by code from the engine's values in the run's language; the audit refuses every other
// number, while years, dates, counts in words up to twelve and names with digits as the evidence writes
// them pass. Then each guardrail refuses a planted defect in an otherwise sound answer: an issue naming a
// block or item that doesn't exist; more issues than allowed; a residual risk above the original; more
// than three changes; a KPI outside the library without its name, unit, direction and definition; a euro
// range whose low end exceeds its high end; and this tool's own rules on ids, sources and options.
// Golden texts in English and German; every case is a planted fixture, so each rule can fail.
// Adapted from the Prototype Ideator's tests/facts.mjs (ec368c3), whose audit this tool uses unchanged.
// Usage: node tests/audit.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT } from "./lib/harness.mjs";

const mod = (p) => import(pathToFileURL(path.join(APP_ROOT, p)).href);
const X = await mod("js/facts.js");
const G = await mod("js/guards.js");
const { SCENARIOS } = await mod("data/scenarios/index.js");
const { localise, buildRun, recordedChoices } = await mod("js/run.js");
const { factTexts } = await mod("js/format.js");

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- the audit on golden texts, both languages ---------------------------------------------------------
const evidence = { texts: ["The plant follows Industry 4.0 and reports to ISO 14083.", "Wir messen nach ISO 14083."], titles: ["Annual report 2025"], quotes: [], urls: ["https://example.org/report"] };
const facts = ["at_stake", "left", "issue.I1.expected", "pressure.before"];
const audit = (text) => X.auditText(text, { facts, evidence });
const CASES = [
  ["The rule took effect in 2025 and applies on 12 March 2026.", [], "English: a year and a written date pass"],
  ["Since 2026-01-01 the rule applies to every call.", [], "an ISO date passes"],
  ["It takes three people and twelve weeks.", [], "English: counts in words up to twelve pass"],
  ["What is left a year comes to {{fact:left}}, from {{fact:at_stake}}.", [], "known placeholders pass"],
  ["The line follows Industry 4.0 and measures to ISO 14083.", [], "names with digits pass where the evidence writes them so"],
  ["See https://example.org/report for the method.", [], "a source's address passes"],
  ["Die Regel gilt seit dem 12. März 2026 für zwölf Häfen.", [], "German: a date and zwölf pass"],
  ["Mit den gewählten Antworten bleiben im Jahr {{fact:left}}.", [], "German: a known placeholder passes"],
  ["It costs 14 % more fuel.", ["14", "%"], "English: a percentage is refused"],
  ["It loses about €2.8m a year.", ["2.8m"], "English: an amount the engine didn't write is refused"],
  ["It takes thirteen weeks.", ["thirteen"], "English: a count in words above twelve is refused"],
  ["Half of the boxes miss their feeder.", ["Half"], "English: a fraction in words is refused"],
  ["The plant follows Industry 5.0.", ["5.0"], "a name with digits the evidence doesn't write is refused"],
  ["Das kostet dreißig Stunden und die Hälfte der Wege.", ["dreißig", "Hälfte"], "German: dreißig and Hälfte are refused"],
  ["Der Serviceumsatz fiel um 12 Prozent.", ["12", "Prozent"], "German: a number and Prozent are refused"],
  ["In Q3 the rates fell by 28 per cent.", ["Q3", "28", "per cent"], "a quarter's short form, a number and per cent are refused"]
];
check(same(audit("It ships 14 boxes.").tokens, ["14"]), "control: a bare number is caught, so the audit can refuse");
check(same(X.auditText("The plant follows Industry 4.0.", { facts, evidence: {} }).tokens, ["4.0"]), "control: a name with digits passes only on the evidence's word");
for (const [text, tokens, what] of CASES) {
  const got = audit(text);
  check(same(got.tokens, tokens) && got.pass === !tokens.length, `${what}: ${JSON.stringify(text)} gives ${JSON.stringify(got.tokens)}`);
}
{
  const got = audit("The cost is {{fact:issue.I9.expected}} a year.");
  check(!got.pass && same(got.unknownFacts, ["issue.I9.expected"]), "a placeholder the engine didn't return is refused");
}

// ---- the placeholders, filled from this tool's engine in both languages ----------------------------------
{
  const sc = localise(SCENARIOS[0], "en");
  const run = buildRun(sc, recordedChoices(sc));
  const text = "{{fact:at_stake}} at stake, {{fact:left}} left; the first issue {{fact:issue.I1.expected}}, {{fact:pressure.before}} blocks under pressure.";
  const en = X.renderFacts(text, factTexts(run.after, "en"));
  const de = X.renderFacts(text, factTexts(run.after, "de")).replace(/ /g, " ");
  check(en === "€32.9m at stake, €7.8m left; the first issue €12.6m, 6 of 9 blocks under pressure.", `English, from the engine: ${en}`);
  check(de === "32,9 Mio. € at stake, 7,8 Mio. € left; the first issue 12,6 Mio. €, 6 von 9 blocks under pressure.", `German figures, from the engine: ${de}`);
  const s2 = localise(SCENARIOS[1], "en");
  const run2 = buildRun(s2, recordedChoices(s2));
  const part = X.renderFacts("{{fact:at_stake}}; {{fact:issue.I6.expected}}", factTexts(run2.after, "en"));
  check(part === "€13.6m on 5 of 6 issues; not in euros", `a sum over part of the issues says so, and an issue without euros says that: ${part}`);
}

// ---- the guardrails, each refusing a planted defect --------------------------------------------------------
// A sound answer of each agent, from the first scenario in English; each case plants one defect in a copy.
const sc = localise(SCENARIOS[0], "en");
const run = buildRun(sc, recordedChoices(sc));
const canvas = run.completed;
const ev = { titles: sc.answers.signals.map((s) => s.title), texts: [...Object.values(sc.entered.blocks).flat().map((it) => it.text), ...sc.answers.signals.map((s) => s.summary)], urls: sc.answers.signals.map((s) => s.url) };
const sound = {
  complete: () => G.completionProblems(structuredClone(sc.answers.completion), { entered: sc.entered, evidence: ev }),
  challenge: (a) => G.issuesProblems(a, { canvas, signals: sc.answers.signals, evidence: ev }),
  assess: (a) => G.impactsProblems(a, { issues: sc.answers.issues, sector: sc.company.sector, evidence: ev }),
  adapt: (a) => G.responsesProblems(a, { issues: run.issues, canvas, evidence: ev }),
  summary: (a) => G.summaryProblems(a, { facts: Object.keys(run.facts), evidence: ev })
};
const base = {
  challenge: () => ({ issues: structuredClone(sc.answers.issues) }),
  assess: () => structuredClone(sc.answers.impacts),
  adapt: () => ({ responses: structuredClone(sc.answers.responses) }),
  summary: () => structuredClone(sc.answers.summary)
};
check(sound.complete().ok && ["challenge", "assess", "adapt", "summary"].every((k) => sound[k](base[k]()).ok), "control: the sound answers pass every guardrail");

const GUARDS = [
  ["challenge", "an issue naming a block that doesn't exist", (a) => { a.issues[0].blocks.push("customers"); }, /block "customers" does not exist/],
  ["challenge", "an issue naming an item that doesn't exist", (a) => { a.issues[0].items.push("value-9"); }, /item "value-9" does not exist/],
  ["challenge", "an item outside the blocks its issue names", (a) => { a.issues[0].items.push("segments-1"); }, /outside the blocks/],
  ["challenge", "more issues than allowed", (a) => { while (a.issues.length < 9) a.issues.push({ ...structuredClone(a.issues[0]), id: `I${a.issues.length + 1}` }); }, /at most 8/],
  ["challenge", "issues out of order", (a) => { a.issues[1].id = "I7"; }, /numbered I1, I2/],
  ["challenge", "a source that is no signal", (a) => { a.issues[0].evidence = ["https://example.org/elsewhere"]; }, /neither a signal's address/],
  ["assess", "a euro range whose low end exceeds its high end", (a) => { a.impacts[0].eur_year_low = 30000000; }, /runs from 0 or more to a higher/],
  ["assess", "a KPI outside the library without its definition", (a) => { a.impacts[0].kpis[0] = { id: "custom.share", name: "Share of loops", unit: "%", direction: "", definition: "", change_low: 1, change_high: 2, basis: "x" }; }, /not in the library and lacks/],
  ["assess", "a KPI of another sector", (a) => { a.impacts[0].kpis[0] = { ...a.impacts[0].kpis[0], id: "energy_utilities.grid_losses" }; }, /belongs to another sector/],
  ["assess", "a range not monetised but not zero", (a) => { Object.assign(a.impacts[0], { monetisable: false, reason: "" }); }, /both ends of the range are 0|says not why/],
  ["adapt", "a residual risk above the original", (a) => { const o = a.responses[0].options.find((x) => x.kind === "mitigate"); o.impact = 5; o.likelihood = 5; }, /residual risk is above/],
  ["adapt", "more than three changes", (a) => { const o = a.responses[0].options[0]; while (o.changes.length < 4) o.changes.push({ block: "value", action: "add", item: "", text: "Another line of service" }); }, /changes, 1 to 3/],
  ["adapt", "a change to an item that doesn't exist", (a) => { a.responses[0].options[0].changes[0] = { block: "value", action: "change", item: "value-9", text: "x" }; }, /item "value-9" does not exist/],
  ["adapt", "two recommended options", (a) => { const r = a.responses.find((x) => x.options.length === 2); for (const o of r.options) o.recommended = true; }, /recommends 2 options/],
  ["adapt", "an advantage with an impact", (a) => { const o = a.responses.flatMap((r) => r.options).find((x) => x.kind === "advantage"); o.impact = 2; }, /advantage has impact 0/],
  ["summary", "a summary of four findings", (a) => { a.findings.push("One more."); }, /exactly 3 findings/],
  ["summary", "a headline longer than allowed", (a) => { a.headline = `${a.headline} ${"and more ".repeat(10)}`; }, /headline must have/]
];
for (const [step, what, plant, want] of GUARDS) {
  const a = base[step]();
  plant(a);
  const r = sound[step](a);
  check(!r.ok && r.refusals.some((x) => want.test(x)), `${step}: ${what} is refused`, r.refusals.slice(0, 3).join(" | ") || "nothing refused");
}
// The person's choices are the only way a response reaches the canvas: tests/unit.mjs checks that the
// canvas stays as kept until a response is chosen and applied.

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} audit checks passed.`);
if (!failed) console.log("AUDIT OK");
process.exit(failed ? 1 : 0);
