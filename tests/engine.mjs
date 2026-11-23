// The engine against its golden cases (AC-16): B0, B1 and B2 from PLAN.md section 5 and the boundary
// cases, read from tests/fixtures/golden.json. Every value must equal the exact figure within 1e-9 and
// every display string must match in English and in German. The engine also refuses what it cannot
// price. Prints ENGINE OK.
// Usage: node tests/engine.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT } from "./lib/harness.mjs";

const mod = (p) => import(pathToFileURL(path.join(APP_ROOT, p)).href);
const risk = await mod("js/risk.js");
const { assess, factValues, PENALTY, blockState } = await mod("js/engine.js");
const { factTexts, fmtMoney } = await mod("js/format.js");
const G = JSON.parse(readFileSync(path.join(APP_ROOT, "tests/fixtures/golden.json"), "utf8"));

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const exact = (s) => { const [a, b] = String(s).split("/").map(Number); return b ? a / b : a; };
const near = (x, s) => x !== null && Math.abs(x - exact(s)) <= 1e-9;
const plain = (s) => String(s).replace(/ /g, " ");
const STATE = { "under pressure": "pressure", watch: "watch", clear: "clear" };
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

// ---- B0: the bands ---------------------------------------------------------------------------------
for (const r of G.B0) {
  check(risk.riskScore(r.impact, r.likelihood) === r.score && risk.band(r.impact, r.likelihood) === r.band, `B0: impact ${r.impact}, likelihood ${r.likelihood} scores ${r.score}, ${r.band}`);
}
check(JSON.stringify(Object.values(risk.PROBABILITY)) === "[0.1,0.3,0.5,0.7,0.9]", "likelihood 1 to 5 counts as 0.1, 0.3, 0.5, 0.7 and 0.9");
check(JSON.stringify(PENALTY) === '{"low":5,"medium":10,"high":20,"critical":35}', "band penalties: low 5, medium 10, high 20, critical 35");

// ---- B1: five issues and a decision ------------------------------------------------------------------
const b1 = assess(G.B1.issues, G.B1.decisions);
for (const fx of G.B1.issues) {
  const r = b1.issues.find((i) => i.id === fx.id);
  check(r && r.before.band === fx.band && near(r.before.expected, fx.expected) && plain(fmtMoney(r.before.expected, "en")) === fx.expected_en,
    `B1 ${fx.id}: ${fx.band}, expected ${fx.expected_en} a year (${r ? r.before.expected : "missing"})`);
}
for (const fx of G.B1.blocks) {
  const b = b1.blocks.find((x) => x.id === fx.id);
  check(b && b.before.health === fx.health_before && b.after.health === fx.health_after && b.before.state === STATE[fx.state_before] && b.after.state === STATE[fx.state_after],
    `B1 ${fx.id}: health ${fx.health_before} then ${fx.health_after}, ${fx.state_before} then ${fx.state_after}${b ? "" : " (missing)"}`);
}
const values = factValues(b1);
const words = { en: factTexts(b1, "en"), de: factTexts(b1, "de") };
for (const fx of G.B1.figures) {
  check(near(values[fx.key], fx.exact) && plain(words.en[fx.key]) === fx.en && plain(words.de[fx.key]) === fx.de,
    `B1 ${fx.name}: ${fx.exact} as "${fx.en}" and "${fx.de}" (got ${values[fx.key]}, "${plain(words.en[fx.key])}", "${plain(words.de[fx.key])}")`);
}
check(b1.count === 5 && b1.priced === 5, "B1: five issues, all five priced");

// ---- B2: part of the data ------------------------------------------------------------------------------
const b2issues = G.B1.issues.map((i) => (G.B2.not_monetisable.includes(i.id) ? { ...i, monetisable: false } : i));
const b2 = assess(b2issues, G.B1.decisions);
const v2 = factValues(b2);
const w2 = { en: factTexts(b2, "en"), de: factTexts(b2, "de") };
for (const fx of G.B2.figures) {
  check(near(v2[fx.key], fx.exact) && plain(w2.en[fx.key]) === fx.en && plain(w2.de[fx.key]) === fx.de,
    `B2 ${fx.name}: ${fx.exact} as "${fx.en}" and "${fx.de}" (got ${v2[fx.key]}, "${plain(w2.en[fx.key])}", "${plain(w2.de[fx.key])}")`);
}
check(v2["issue.I4.expected"] === null && w2.en["issue.I4.expected"] === "not in euros" && w2.de["issue.I4.expected"] === "nicht in Euro", "B2: the issue without a euro range has no expected value and says so, never €0");
check(b2.pressure.before === 7 && b2.resilience.before === b1.resilience.before, "B2: block health does not depend on euros");

// ---- the fact keys of brief 6.5 ------------------------------------------------------------------------
const keys = Object.keys(values).filter((k) => !k.startsWith("issue.")).sort().join(",");
check(keys === "at_stake,issues.count,issues.priced,left,pressure.after,pressure.before,resilience.after,resilience.before,upside", `the fact keys are the brief's: ${keys}`);
check(["I1", "I2", "I3", "I4", "I5"].every((id) => `issue.${id}.expected` in values && `issue.${id}.band` in values), "each issue has issue.<id>.expected and issue.<id>.band");

// ---- boundaries ----------------------------------------------------------------------------------------
for (const m of G.boundaries.money) {
  const en = plain(risk.money(m.eur, "en"));
  const de = plain(risk.money(m.eur, "de"));
  check(en === m.en && de === m.de, `money: ${m.eur} shows as "${m.en}" and "${m.de}" (got "${en}" and "${de}")`);
}
check(/ /.test(risk.money(5760000, "de")) && !/ /.test(risk.money(5760000, "de")), "German amounts hold together with no-break spaces");
const hf = G.boundaries.health_floor;
const floor = assess(hf.issues, []);
check(floor.blocks.find((b) => b.id === hf.block).before.health === hf.health && near(floor.resilience.before, hf.resilience), `health stops at 0 when penalties pass 100; resilience ${hf.resilience}`);
const zw = G.boundaries.zero_width;
const zero = assess([zw.issue], []);
check(near(zero.atStake, zw.expected) && plain(fmtMoney(zero.atStake, "en")) === zw.en && plain(fmtMoney(zero.atStake, "de")) === zw.de, `a range of zero width: expected ${zw.en}`);
check(risk.roundHalfAway(2.5) === 3 && risk.roundHalfAway(-2.5) === -3 && risk.roundHalfAway(0.9995, 3) === 1 && risk.roundHalfAway(1.25, 1) === 1.3 && risk.roundHalfAway(1.005, 2) === 1.01, "rounding is half away from zero, after cleaning float noise (1.005 to two decimals is 1.01)");
check(risk.money(-1250000, "en") === "−€1.3m", "a negative amount carries a minus sign");
check(blockState(null) === "clear" && blockState("low") === "watch" && blockState("medium") === "pressure" && blockState("critical") === "pressure", "block states: none clear, low watch, medium or worse under pressure");

// ---- what the engine refuses -----------------------------------------------------------------------------
const one = (over) => [{ id: "Q1", impact: 3, likelihood: 3, blocks: ["value"], eur_year_low: 1, eur_year_high: 2, ...over }];
check(throws(() => assess(one({ impact: 6 }))), "refuses an impact outside 1 to 5");
check(throws(() => assess(one({ likelihood: 2.5 }))), "refuses a likelihood that is not a whole step");
check(throws(() => assess(one({ blocks: ["pricing"] }))), "refuses a block that does not exist");
check(throws(() => assess(one({ eur_year_low: 5, eur_year_high: 1 }))), "refuses a range whose low end passes its high end");
check(throws(() => assess(one({ eur_year_low: -1 }))), "refuses a negative amount");
check(throws(() => assess(one({}), [{ issue: "Q1", choice: "ignore" }])), "refuses an unknown choice");
check(!throws(() => assess(one({ monetisable: false, eur_year_low: null, eur_year_high: null }))), "an issue without euros needs no range");

const failed = results.filter(([ok]) => !ok);
for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
if (failed.length) { console.log(`\n${failed.length} of ${results.length} checks failed.`); process.exit(1); }
console.log(`\nAll ${results.length} checks passed.\nENGINE OK`);
