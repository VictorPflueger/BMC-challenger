// The sector KPI library (brief 6.4), data/kpis.js, shared by the set of four:
//   sectors     exactly the twelve sectors of the brief and "general", named in English and German
//   counts      8 to 12 KPIs a sector, exactly the ten named general KPIs
//   shape       { id: "<sector>.<name>", sector, name {en, de}, unit, better, definition {en, de}, source }
//               with unique ids, a unit from UNITS worded in both languages, better "higher" or "lower",
//               a source that is "common practice" or a web address
//   scenarios   the scenario sectors carry the brief's starting points
//   no values   definitions hold no benchmark figure
// Prints KPIS OK.
// Usage: node tests/kpis.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT } from "./lib/harness.mjs";

const { SECTORS, KPIS, UNITS, kpisFor, kpi } = await import(pathToFileURL(path.join(APP_ROOT, "data/kpis.js")).href);
const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const filled = (o) => o && typeof o.en === "string" && o.en.trim() && typeof o.de === "string" && o.de.trim();

const BRIEF_SECTORS = ["telecom", "transport_logistics", "automotive_mobility", "industrial_manufacturing", "energy_utilities", "retail_consumer", "banking", "insurance", "health_life_sciences", "public_sector", "software_digital", "chemicals_materials", "general"];
check(JSON.stringify(SECTORS.map((s) => s.id)) === JSON.stringify(BRIEF_SECTORS), `the thirteen sectors of brief 6.4, in its order (${SECTORS.map((s) => s.id).join(", ")})`);
check(SECTORS.every((s) => filled(s.name)), "every sector is named in English and German");

for (const s of BRIEF_SECTORS) {
  const n = KPIS.filter((x) => x.sector === s).length;
  if (s === "general") check(n === 10, `general holds exactly ten KPIs (${n})`);
  else check(n >= 8 && n <= 12, `${s} holds 8 to 12 KPIs (${n})`);
}
const GENERAL = ["Revenue", "EBIT margin", "Gross margin", "Free cash flow", "Customer churn", "Net Promoter Score", "Customer acquisition cost", "Customer lifetime value", "Staff turnover", "CO2 per unit of output"];
check(JSON.stringify(KPIS.filter((x) => x.sector === "general").map((x) => x.name.en)) === JSON.stringify(GENERAL), "the general KPIs are the brief's ten: revenue, EBIT margin, gross margin, free cash flow, customer churn, net promoter score, customer acquisition cost, customer lifetime value, staff turnover and CO2 per unit of output");

const ids = KPIS.map((x) => x.id);
check(new Set(ids).size === ids.length, `every KPI id is unique (${ids.length} KPIs)`);
const shapeProblems = [];
for (const x of KPIS) {
  const keys = Object.keys(x).join(",");
  if (keys !== "id,sector,name,unit,better,definition,source") shapeProblems.push(`${x.id}: fields ${keys}`);
  if (!/^[a-z][a-z_]*\.[a-z0-9_]+$/.test(x.id) || x.id.split(".")[0] !== x.sector) shapeProblems.push(`${x.id}: the id does not start with its sector`);
  if (!BRIEF_SECTORS.includes(x.sector)) shapeProblems.push(`${x.id}: unknown sector`);
  if (!filled(x.name)) shapeProblems.push(`${x.id}: a name is missing`);
  if (!filled(x.definition)) shapeProblems.push(`${x.id}: a definition is missing`);
  if (!Object.hasOwn(UNITS, x.unit)) shapeProblems.push(`${x.id}: unit "${x.unit}" is not in UNITS`);
  if (x.better !== "higher" && x.better !== "lower") shapeProblems.push(`${x.id}: better is "${x.better}"`);
  if (!(x.source === "common practice" || /^https:\/\//.test(x.source))) shapeProblems.push(`${x.id}: source "${x.source}"`);
  if (!Object.isFrozen(x) || !Object.isFrozen(x.name) || !Object.isFrozen(x.definition)) shapeProblems.push(`${x.id}: not frozen`);
}
check(!shapeProblems.length, `every KPI has the brief's shape, filled in both languages${shapeProblems.length ? `: ${shapeProblems.join("; ")}` : ""}`);
check(Object.values(UNITS).every(filled), `every unit is worded in English and German (${Object.keys(UNITS).length} units)`);
check(Object.keys(UNITS).every((u) => KPIS.some((x) => x.unit === u)), "every unit is used by a KPI");
for (const s of BRIEF_SECTORS) {
  const names = KPIS.filter((x) => x.sector === s);
  check(new Set(names.map((x) => x.name.en)).size === names.length && new Set(names.map((x) => x.name.de)).size === names.length, `${s}: no two KPIs share a name in either language`);
}

const STARTING_POINTS = {
  transport_logistics: ["cost_per_teu", "freight_rate", "schedule_reliability", "vessel_utilisation", "fuel_cost_per_teu", "co2_per_teu_km", "empty_container_cost"],
  industrial_manufacturing: ["order_intake", "book_to_bill", "service_revenue_share", "recurring_revenue_share", "on_time_delivery", "connected_base_share", "warranty_cost", "technician_utilisation"],
  energy_utilities: ["customer_churn", "cost_to_serve", "gross_margin_per_mwh", "outage_minutes", "smart_meter_share", "bad_debt", "heat_customers"]
};
for (const [s, names] of Object.entries(STARTING_POINTS)) {
  const missing = names.filter((n) => !kpi(`${s}.${n}`));
  check(!missing.length, `${s} carries the brief's starting points (${names.length})${missing.length ? `; missing: ${missing.join(", ")}` : ""}`);
}
check(kpi("transport_logistics.cost_per_teu")?.name.en === "Cost per container moved", "the handoff example's KPI id resolves to Cost per container moved");

// Definitions, never benchmark values: no figure with a unit or a percent sign. Named standards and
// definitional numbers (30 days of stress, from −100 to 100, five years) are allowed by name.
const figure = /\d+([.,]\d+)?\s*(%|€|EUR|Euro|euros?|ct|kWh|MWh|t\b|tonnes?)/i;
const valued = KPIS.filter((x) => figure.test(x.definition.en) || figure.test(x.definition.de)).map((x) => x.id);
check(!valued.length, `no definition holds a benchmark value${valued.length ? `: ${valued.join(", ")}` : ""}`);
check(figure.test("A good margin is 12 %") && !figure.test("Share of patients readmitted within 30 days"), "control: the benchmark pattern catches a figure with a unit and passes a definitional number");

const t = kpisFor("transport_logistics");
check(t.length === KPIS.filter((x) => x.sector === "transport_logistics").length + 10 && t.every((x) => x.sector === "transport_logistics" || x.sector === "general"), "kpisFor gives a sector's KPIs and the general ones");
check(kpi("transport_logistics.nonexistent") === null, "kpi() gives null for an id the library does not have");
check(Object.isFrozen(KPIS) && Object.isFrozen(SECTORS) && Object.isFrozen(UNITS), "the library cannot be changed at runtime");

const failed = results.filter(([ok]) => !ok);
for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
if (failed.length) { console.log(`\n${failed.length} of ${results.length} checks failed.`); process.exit(1); }
console.log(`\nAll ${results.length} checks passed (${KPIS.length} KPIs in ${SECTORS.length} sectors).\nKPIS OK`);
