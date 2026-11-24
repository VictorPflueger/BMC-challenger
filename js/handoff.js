// The handoff file (brief 4.3 and 10; AC-21): a run as strategy-challenge/1, the JSON the Prototype Ideator
// reads without a model call. It maps one to one: the nine blocks are its areas with the canvas the Red team
// challenged (the team's items and the AI's items the person kept, with their edits), the items keep their
// ids, each issue keeps its KPI effects and its euro range with the engine's expected value, every option
// the Strategist offered is a response with the person's choice marked, an accepted issue gets an "accept"
// response once the person decided (as the PESTEL Challenger writes it), and the score is resilience. Every
// figure is a number the engine computed for the person's choice, so the file says what the tiles say; an
// issue without a euro range carries null euros. Code writes all of it; the file carries no key, no prompt
// and no thinking. handoffProblems() checks a file against the shared schema and the references the schema
// can't hold, before the page offers it. countryCode() and sourcesOf() follow the SWOT Challenger's
// js/handoff.js (31a2ac3).

import { APP } from "./config.js";
import { t } from "./i18n/index.js";
import { BLOCKS } from "./canvas.js";
import { band, expected } from "./risk.js";
import { optionEffect } from "./run.js";
import { factTexts } from "./format.js";
import { renderFacts } from "./facts.js";
import { GENERAL_KNOWLEDGE } from "./guards.js";
import { validate, describeErrors } from "./schema.js";
import SCHEMA from "../schemas/strategy-challenge-1.js";

export const HANDOFF_SCHEMA = "strategy-challenge/1";
export const TOOL = Object.freeze({ id: "bmc-challenger", name: APP.name, version: APP.version, url: APP.url });
const KPI_ID = /^[a-z_]+\.[a-z0-9_]+$/;

/** A date as the file writes it: YYYY-MM-DD. */
const day = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d || "").slice(0, 10));

/** The country as two capital letters: a code as given, a name in English or German, or ZZ, the unknown region. */
export function countryCode(value) {
  const v = String(value || "").trim();
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  if (!v) return "ZZ";
  const want = v.toLocaleLowerCase("de");
  try {
    const names = ["en", "de"].map((l) => new Intl.DisplayNames([l], { type: "region" }));
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        // A retired code (DD, the old East Germany) is an alias of today's (DE): only canonical codes count.
        if (Intl.getCanonicalLocales(`und-${code}`)[0] !== `und-${code}`) continue;
        if (names.some((n) => { try { const name = n.of(code); return name && name !== code && name.toLocaleLowerCase("de") === want; } catch { return false; } })) return code;
      }
    }
  } catch { /* no region names in this engine */ }
  return "ZZ";
}

/**
 * The sources with the dates they were read: the run's signals (a scenario's as of its date, a live run's
 * as of the day its Scout read them), then any other address an issue cites. Each address once.
 */
export function sourcesOf(sc) {
  const out = [];
  const seen = new Set();
  const add = (url, title, read) => {
    if (!/^https?:\/\//.test(String(url || "")) || seen.has(url)) return;
    seen.add(url);
    let host = url;
    try { host = new URL(url).hostname; } catch { /* keep the address */ }
    out.push({ url, title: title || host, read_on: day(read || sc.as_of) });
  };
  for (const s of sc.answers.signals || []) add(s.url, s.title, s.read_on);
  for (const i of sc.answers.issues || []) for (const u of i.evidence || []) if (u !== GENERAL_KNOWLEDGE) add(u, null, null);
  return out;
}

/** A KPI effect as the file writes it; a KPI outside the library keeps its id when it has the shape sector.name. */
function kpiOf(k, sector) {
  const slug = String(k.id || k.name || "kpi").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "kpi";
  return { id: KPI_ID.test(k.id) ? k.id : `${sector}.${slug}`, name: k.name, unit: k.unit, direction: k.direction, change_low: k.change_low, change_high: k.change_high, basis: k.basis || "" };
}

/**
 * The handoff file of a run. opts: { sc (a localised scenario, or the live run in that shape), run
 * (js/run.js buildRun), lang, mode ("simulation" | "live"), model (a live run's model id), applied (the
 * person applied the decision), created (a Date), stopped (a stopped run's { step } with its words in
 * stopText) }. Returns the plain object, not yet checked.
 */
export function handoffFor({ sc, run, lang, mode, model = null, applied = false, created = new Date(), stopText = "" }) {
  const tr = (key, vars = null) => t(key, vars, lang);
  const sector = sc.company.sector || sc.answers.completion?.sector || "general";
  const sources = sourcesOf(sc);
  const signal = new Map(sources.map((s) => [s.url, s]));
  const impacts = new Map((sc.answers.impacts?.impacts || []).map((im) => [im.issue, im]));
  const areas = BLOCKS.map((b) => ({
    id: b,
    label: tr(`block.${b}.name`),
    items: (run.kept.blocks[b] || []).map((it) => (it.source === "ai"
      ? { id: it.id, text: it.text, source: "ai", ...(it.confidence ? { confidence: it.confidence } : {}), ...(it.basis ? { basis: it.basis } : {}) }
      : { id: it.id, text: it.text, source: "user" }))
  }));
  const issues = run.issues.map((i) => {
    const r = run.before.issues.find((x) => x.id === i.id);
    const im = impacts.get(i.id);
    const priced = !!im && im.monetisable !== false;
    return {
      id: i.id,
      title: i.title,
      type: i.type,
      description: i.description,
      areas: [...i.blocks],
      items: [...i.items],
      impact: i.impact,
      likelihood: i.likelihood,
      band: r.before.band,
      horizon: i.horizon,
      kpis: (i.kpis || []).map((k) => kpiOf(k, sector)),
      eur_year_low: priced ? i.eur_year_low : null,
      eur_year_high: priced ? i.eur_year_high : null,
      eur_year_expected: priced ? r.before.expected : null,
      eur_basis: priced ? i.eur_basis : im ? tr("h.notPriced", { reason: i.reason || tr("h.notPriced.none") }) : tr("h.notAssessed"),
      evidence: (i.evidence || []).filter((u) => signal.has(u)).map((u) => ({ ...signal.get(u) })),
      confidence: i.confidence
    };
  });
  // Every option offered, the chosen one marked once the person applied the decision; an accepted issue
  // gets its accept response then. A residual needs a euro range, so an issue without one has none.
  const responses = [];
  for (const o of run.options) {
    const issue = run.issues.find((i) => i.id === o.issue);
    o.list.forEach((opt, k) => {
      const e = optionEffect(issue, opt);
      responses.push({
        id: "",
        issue: o.issue,
        kind: opt.kind,
        chosen: applied && o.chosen === k,
        title: opt.title,
        first_step: opt.first_step,
        owner: opt.owner,
        changes: opt.changes.map((c) => ({
          area: c.block,
          action: c.action,
          ...(c.action === "add" ? {} : { item: c.item }),
          text: c.action === "remove" ? run.completed.blocks[c.block]?.find((x) => x.id === c.item)?.text || "" : c.text
        })),
        residual: opt.kind === "mitigate" && e.before !== null
          ? { impact: opt.impact, likelihood: opt.likelihood, band: band(opt.impact, opt.likelihood), eur_year_low: opt.eur_year_low, eur_year_high: opt.eur_year_high, eur_year_expected: e.after }
          : null,
        upside: opt.kind === "advantage"
          ? { likelihood: opt.likelihood, eur_year_low: opt.eur_year_low, eur_year_high: opt.eur_year_high, eur_year_expected: expected(opt.eur_year_low, opt.eur_year_high, opt.likelihood) }
          : null,
        effort: opt.effort,
        time_to_impact: tr(`time.${opt.time_to_impact}`)
      });
    });
    if (applied && o.chosen === "accept") {
      responses.push({ id: "", issue: o.issue, kind: "accept", chosen: true, title: tr("choice.accept"), first_step: "", owner: "", changes: [], residual: null, upside: null, effort: "S", time_to_impact: "" });
    }
  }
  responses.forEach((r, k) => { r.id = `R${k + 1}`; });
  // Before the decision the figures after it are the figures before it: buildRun previews the
  // recommended options, which nobody has chosen yet.
  const after = applied ? run.after : run.before;
  const s = sc.answers.summary;
  const facts = factTexts(run.after, lang);
  const fill = (text) => renderFacts(text, facts);
  const summary = s
    ? { headline: fill(s.headline), text: [fill(s.situation), s.findings.map((x) => `- ${fill(x)}`).join("\n"), fill(s.recommendation)].join("\n\n") }
    : { headline: tr("h.summary.none", { company: sc.company.name }), text: stopText };
  return {
    schema: HANDOFF_SCHEMA,
    tool: { ...TOOL },
    created: created.toISOString(),
    language: lang,
    mode,
    model: mode === "live" ? model : null,
    company: {
      name: sc.company.name,
      sector,
      country: countryCode(sc.company.country),
      description: sc.company.description || "",
      fictional: mode !== "live"
    },
    framework: { type: "bmc", areas },
    issues,
    responses,
    figures: {
      at_stake_eur_year: run.before.atStake,
      left_eur_year: after.left,
      upside_eur_year: applied ? run.after.upside : 0,
      score: { name: "resilience", scale: "0-100", before: run.before.resilience.before, after: after.resilience.after },
      pressure: { label: tr("p.kpi.pressure.label"), before: run.before.pressure.before, after: after.pressure.after, of: run.before.pressure.of }
    },
    summary,
    sources,
    disclaimer: [tr("h.disclaimer"), stopText].filter(Boolean).join(" ")
  };
}

/** What is wrong with a handoff file: the shared schema's errors and the references it can't hold. */
export function handoffProblems(json) {
  if (!json || json.schema !== HANDOFF_SCHEMA) return [`not a ${HANDOFF_SCHEMA} file`];
  const v = validate(json, SCHEMA, SCHEMA.$defs);
  if (!v.valid) return describeErrors(v.errors).split("\n").filter(Boolean);
  const out = [];
  const ids = json.issues.map((i) => i.id);
  const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (twice.length) out.push(`issue ids appear twice: ${[...new Set(twice)].join(", ")}`);
  const rids = json.responses.map((r) => r.id);
  if (new Set(rids).size !== rids.length) out.push("response ids appear twice");
  const items = new Set(json.framework.areas.flatMap((a) => a.items.map((i) => i.id)));
  const areas = new Set(json.framework.areas.map((a) => a.id));
  for (const i of json.issues) {
    for (const id of i.items) if (!items.has(id)) out.push(`issue ${i.id} names item ${id}, which the file doesn't have`);
    for (const a of i.areas) if (!areas.has(a)) out.push(`issue ${i.id} names block ${a}, which the file doesn't have`);
    if (i.band !== band(i.impact, i.likelihood)) out.push(`issue ${i.id} is ${i.band}, but impact ${i.impact} and likelihood ${i.likelihood} make it ${band(i.impact, i.likelihood)}`);
    const priced = [i.eur_year_low, i.eur_year_high, i.eur_year_expected].filter((x) => x !== null).length;
    if (priced !== 0 && priced !== 3) out.push(`issue ${i.id} has part of a euro range`);
    if (priced === 3 && Math.abs(i.eur_year_expected - expected(i.eur_year_low, i.eur_year_high, i.likelihood)) > 1e-6) out.push(`issue ${i.id}'s expected value is not its range's midpoint times its likelihood`);
  }
  for (const r of json.responses) {
    if (!ids.includes(r.issue)) out.push(`response ${r.id} names issue ${r.issue}, which the file doesn't have`);
    for (const c of r.changes) if (c.item && !items.has(c.item)) out.push(`response ${r.id} changes item ${c.item}, which the file doesn't have`);
  }
  for (const id of ids) if (json.responses.filter((r) => r.issue === id && r.chosen).length > 1) out.push(`issue ${id} has more than one chosen response`);
  if (/sk-ant-/.test(JSON.stringify(json))) out.push("the file holds something shaped like an API key");
  return out;
}
