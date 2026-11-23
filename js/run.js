// The run model: everything a step shows, worked out from a scenario and the person's choices. Pure: the
// same scenario and choices give the same run, in either language, so the screen, the tests and the
// checker read one source. The live run of 0.3.0 fills the same shape from the agents' answers.
//
// A scenario is authored once for both languages: every text the person reads is a pair { en, de }, every
// id, number and block once (data/scenarios/). localise() picks one language and adds what code adds to
// a live answer: the KPI's name, unit and definition from the library, and the date each source was read.
// buildRun() then completes the canvas, drops the AI items the person removed, prices the issues with
// the engine, puts Accept beside every issue's options and applies the chosen changes to a copy.

import { complete, withoutRemoved, applyChanges, itemIds } from "./canvas.js";
import { assess, factValues } from "./engine.js";
import { expected, issueExpected, band } from "./risk.js";
import { kpiById } from "../data/kpis.js";

/** The six steps, in order: Start, then the five agents' steps. */
export const STEPS = Object.freeze(["start", "complete", "challenge", "assess", "adapt", "summary"]);
export const STEP = Object.freeze(Object.fromEntries(STEPS.map((s, i) => [s, i])));

/** A text in both languages: an object with exactly the strings en and de. */
export function isPair(v) {
  return !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 2 && typeof v.en === "string" && typeof v.de === "string";
}

/** The value with every { en, de } pair replaced by its text in `lang`. */
export function pick(value, lang) {
  if (isPair(value)) return value[lang];
  if (Array.isArray(value)) return value.map((v) => pick(v, lang));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, pick(v, lang)]));
  return value;
}

/**
 * One language of an authored scenario, in the shape of the contracts in schemas/index.js: the company,
 * the canvas its team entered (ids added in order, "value-1" on), the six answers and the recorded
 * choices. Library KPIs get their name, unit and definition from data/kpis.js, as code gives them a live
 * answer; each signal gets the date its source was read, the scenario's as-of date.
 */
export function localise(src, lang) {
  const p = (v) => pick(v, lang);
  const blocks = Object.fromEntries(Object.entries(src.entered).map(([b, items]) => [b, items.map((it, i) => ({ id: `${b}-${i + 1}`, block: b, text: p(it), source: "user" }))]));
  const kpi = (k) => {
    const known = kpiById(k.id);
    return {
      id: k.id,
      name: known ? known.name[lang] : p(k.name),
      unit: known ? known.unit : p(k.unit),
      direction: k.direction,
      definition: known ? known.definition[lang] : p(k.definition),
      change_low: k.change_low,
      change_high: k.change_high,
      basis: p(k.basis)
    };
  };
  const a = src.answers;
  return {
    id: src.id,
    source: src.source,
    as_of: src.as_of,
    facts: [...src.facts],
    company: { ...p(src.company) },
    entered: { blocks },
    answers: {
      completion: { sector: a.completion.sector, items: p(a.completion.items) },
      signals: a.signals.map((s) => ({ ...p(s), read_on: src.as_of })),
      issues: p(a.issues),
      impacts: { baselines: p(a.impacts.baselines), impacts: a.impacts.impacts.map((im) => ({ ...p(im), kpis: im.kpis.map(kpi) })) },
      responses: p(a.responses),
      summary: p(a.summary)
    },
    choices: { removed: [...src.choices.removed], decisions: src.choices.decisions.map((d) => ({ ...d })) }
  };
}

/** The option an issue's response recommends, as an index into its options; 0 when none says so. */
export function recommended(sc, issueId) {
  const r = sc.answers.responses.find((x) => x.issue === issueId);
  const i = r ? r.options.findIndex((o) => o.recommended) : -1;
  return i < 0 ? 0 : i;
}

/** A decision as the presenter keeps it: "accept", or the index of an option (0 or 1). */
const decisionOf = (sc, issueId, decisions) => (decisions.has(issueId) ? decisions.get(issueId) : recommended(sc, issueId));

/** The recorded choices as the presenter keeps them: a set of removed ids and a map of decisions. */
export function recordedChoices(sc) {
  return {
    removed: new Set(sc.choices.removed),
    decisions: new Map(sc.choices.decisions.map((d) => [d.issue, d.choice === "accept" ? "accept" : d.option]))
  };
}

/** What an option does to its issue, per issue: the expected loss before and after, the upside, the bands. */
export function optionEffect(issue, option) {
  const before = issue.monetisable === false ? null : issueExpected(issue);
  const bandBefore = band(issue.impact, issue.likelihood);
  if (!option || option === "accept") return { kind: "accept", before, after: before, upside: 0, bandBefore, bandAfter: bandBefore };
  if (option.kind === "mitigate") {
    const residual = before === null ? null : Math.min(before, expected(option.eur_year_low, option.eur_year_high, option.likelihood));
    return { kind: "mitigate", before, after: residual, upside: 0, bandBefore, bandAfter: band(option.impact, option.likelihood) };
  }
  return { kind: "advantage", before, after: before, upside: expected(option.eur_year_low, option.eur_year_high, option.likelihood), bandBefore, bandAfter: bandBefore };
}

/**
 * The run as it stands. sc: a localised scenario; removed: the AI item ids the person removed at
 * Complete; decisions: issue id to "accept" or an option index (a missing issue takes the recommended
 * option, as the decision screen preselects it). Returns
 *   completed  the canvas with the AI's items; kept: without the removed ones
 *   issues     the Red team's issues, each with its impact (euro range, KPI effects) merged in and the
 *              references to removed items dropped
 *   options    per issue: its options with Accept added by code, and the chosen one
 *   before     the engine's result with every issue accepted; after: with the chosen responses
 *   adapted    the chosen changes applied to a copy of the kept canvas (canvas.applyChanges)
 *   facts      the fact keys for the Writer's placeholders, from the result after the decision
 */
export function buildRun(sc, { removed = new Set(), decisions = new Map() } = {}) {
  const completed = complete(sc.entered, sc.answers.completion);
  const kept = withoutRemoved(completed, removed);
  const impacts = new Map(sc.answers.impacts.impacts.map((im) => [im.issue, im]));
  const issues = sc.answers.issues.map((i) => {
    const im = impacts.get(i.id) || {};
    return {
      ...i,
      items: i.items.filter((id) => !removed.has(id)),
      kpis: im.kpis || [],
      monetisable: im.monetisable !== false,
      eur_year_low: im.eur_year_low ?? 0,
      eur_year_high: im.eur_year_high ?? 0,
      eur_basis: im.eur_basis || "",
      reason: im.reason || "",
      estimate_confidence: im.confidence || null
    };
  });
  const options = issues.map((i) => {
    const list = sc.answers.responses.find((r) => r.issue === i.id)?.options || [];
    const d = decisionOf(sc, i.id, decisions);
    const chosen = d === "accept" || !list[d] ? "accept" : d;
    return { issue: i.id, list, chosen, effects: [...list.map((o) => optionEffect(i, o)), optionEffect(i, "accept")] };
  });
  const engineIssues = issues.map((i) => ({ id: i.id, impact: i.impact, likelihood: i.likelihood, blocks: i.blocks, monetisable: i.monetisable, eur_year_low: i.eur_year_low, eur_year_high: i.eur_year_high }));
  const chosenDecisions = options.map((o) => {
    if (o.chosen === "accept") return { issue: o.issue, choice: "accept" };
    const opt = o.list[o.chosen];
    return { issue: o.issue, choice: opt.kind, impact: opt.impact, likelihood: opt.likelihood, eur_year_low: opt.eur_year_low, eur_year_high: opt.eur_year_high };
  });
  const before = assess(engineIssues, []);
  const after = assess(engineIssues, chosenDecisions);
  const changes = options.flatMap((o) => (o.chosen === "accept" ? [] : o.list[o.chosen].changes.map((c) => ({ ...c, issue: o.issue }))));
  const adapted = applyChanges(kept, changes, itemIds(completed));
  return { completed, kept, removed: new Set(removed), issues, options, before, after, adapted, facts: factValues(after) };
}

/** The AI's items of a run, block by block, each with whether the person removed it. */
export function aiItems(run) {
  return Object.values(run.completed.blocks).flat().filter((it) => it.source === "ai").map((it) => ({ ...it, removed: run.removed.has(it.id) }));
}
