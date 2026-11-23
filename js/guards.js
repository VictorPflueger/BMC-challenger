// Checks a schema can't express (brief 6.7), run on every agent's answer after the schema validator,
// and by tools/check-scenarios.mjs on every recorded answer. Three kinds of finding, as in the
// Prototype Ideator's guards:
//   refusals  the answer goes back once with them listed; a second failure stops a live run there;
//   audit     prose that fails the fact audit (js/facts.js): it goes back with its tokens, and a text
//             refused twice shows with an "Unchecked" tag instead of stopping the run;
//   notes     reported, never sent back: a dash used as punctuation, which the writing rules ban.
// The live pipeline of 0.3.0 sends refusals and audit findings back through repairMessage().

import { BLOCKS, isBlock, itemIds } from "./canvas.js";
import { kpiById } from "../data/kpis.js";
import { auditText, normalise, placeholders } from "./facts.js";

export const LIMITS = Object.freeze({
  itemText: 90, itemBasis: 140, itemsPerBlock: 8, newPerBlock: 3, minPerBlock: 2,
  issuesMax: 8, issueTitle: 80, issueText: 300, issueBlocksMax: 4,
  kpisMin: 1, kpisMax: 3, optionsMin: 1, optionsMax: 2, changesMin: 1, changesMax: 3,
  headline: 110, summaryWords: 80, findings: 3, assumptionsMin: 3, assumptionsMax: 5
});
export const GENERAL_KNOWLEDGE = "general knowledge";

const words = (s) => normalise(s).split(" ").filter(Boolean).length;
const filled = (s) => typeof s === "string" && normalise(s) !== "";
const chars = (s) => [...normalise(s)].length;
const isScale = (n) => Number.isInteger(n) && n >= 1 && n <= 5;
// No em dash as punctuation; an en dash counts when it stands between spaces, not in a range such as
// "Europe–Asia" (Vici's writing rule, as the Ideator's guards check it).
const DASH = /\S ?— ?\S|\S – \S/u;

/** Every prose field of an answer, with where it stands: [where, text]. */
export function proseOf(step, answer) {
  const out = [];
  const add = (where, text) => { if (typeof text === "string") out.push([where, text]); };
  if (step === "complete") (answer.items || []).forEach((it, i) => { add(`item ${i + 1} text`, it.text); add(`item ${i + 1} basis`, it.basis); });
  if (step === "research") (answer.signals || []).forEach((s, i) => { add(`signal ${i + 1} title`, s.title); add(`signal ${i + 1} summary`, s.summary); });
  if (step === "challenge") for (const i of answer.issues || []) { add(`${i.id} title`, i.title); add(`${i.id} description`, i.description); add(`${i.id} contradicts`, i.contradicts); }
  if (step === "assess") {
    (answer.baselines || []).forEach((b, k) => { add(`baseline ${k + 1} name`, b.name); add(`baseline ${k + 1} basis`, b.basis); });
    for (const im of answer.impacts || []) {
      (im.kpis || []).forEach((k, j) => { add(`${im.issue} KPI ${j + 1} basis`, k.basis); if (!kpiById(k.id)) { add(`${im.issue} KPI ${j + 1} name`, k.name); add(`${im.issue} KPI ${j + 1} definition`, k.definition); } });
      add(`${im.issue} euro basis`, im.eur_basis);
      add(`${im.issue} reason`, im.reason);
    }
  }
  if (step === "adapt") for (const r of answer.responses || []) (r.options || []).forEach((o, k) => {
    const at = `${r.issue} option ${k + 1}`;
    add(`${at} title`, o.title); add(`${at} first step`, o.first_step); add(`${at} owner`, o.owner);
    (o.changes || []).forEach((c, j) => add(`${at} change ${j + 1}`, c.text));
  });
  if (step === "summary") {
    add("headline", answer.headline); add("situation", answer.situation); add("recommendation", answer.recommendation);
    (answer.findings || []).forEach((f, i) => add(`finding ${i + 1}`, f));
    (answer.assumptions || []).forEach((a, i) => add(`assumption ${i + 1}`, a));
  }
  return out.filter(([, text]) => text !== "");
}

/** The fact audit and the writing notes over an answer's prose. */
function prose(step, answer, { facts = [], evidence = {} }, audit, notes) {
  for (const [where, text] of proseOf(step, answer)) {
    const a = auditText(text, { facts, evidence });
    if (!a.pass) audit.push({ where, tokens: a.tokens, unknownFacts: a.unknownFacts });
    const dash = text.match(DASH);
    if (dash) notes.push(`${where}: a dash as punctuation ("${dash[0]}")`);
  }
}

/**
 * The Completer's answer. entered: the canvas the person entered, { blocks: { id: [items] } }.
 * Refused: a block the answer gives more than three new items, a block that ends with fewer than two
 * or more than eight, an empty or over-long text or basis, a sector the library doesn't know.
 */
export function completionProblems(answer, { entered, sectors = [], evidence = {} } = {}) {
  const refusals = [];
  const audit = [];
  const notes = [];
  const items = Array.isArray(answer?.items) ? answer.items : [];
  if (sectors.length && !sectors.includes(answer?.sector)) refusals.push(`the sector "${answer?.sector}" is not in the library`);
  for (const b of BLOCKS) {
    const added = items.filter((it) => it.block === b).length;
    const total = (entered?.blocks?.[b]?.length || 0) + added;
    if (added > LIMITS.newPerBlock) refusals.push(`${b}: ${added} new items, at most ${LIMITS.newPerBlock}`);
    if (total < LIMITS.minPerBlock) refusals.push(`${b}: ${total} items after completion, at least ${LIMITS.minPerBlock}`);
    if (total > LIMITS.itemsPerBlock) refusals.push(`${b}: ${total} items after completion, at most ${LIMITS.itemsPerBlock}`);
  }
  items.forEach((it, i) => {
    if (!filled(it.text) || chars(it.text) > LIMITS.itemText) refusals.push(`item ${i + 1}: the text must have 1 to ${LIMITS.itemText} characters`);
    if (!filled(it.basis) || chars(it.basis) > LIMITS.itemBasis) refusals.push(`item ${i + 1}: the basis must have 1 to ${LIMITS.itemBasis} characters`);
  });
  prose("complete", { items }, { evidence }, audit, notes);
  return { refusals, audit, notes, ok: !refusals.length && !audit.length };
}

/**
 * The Red team's answer. canvas: the completed canvas; signals: the run's signals (their URLs are the
 * only sources an issue may cite, apart from "general knowledge").
 */
export function issuesProblems(answer, { canvas, signals = [], evidence = {} } = {}) {
  const refusals = [];
  const audit = [];
  const notes = [];
  const issues = Array.isArray(answer?.issues) ? answer.issues : [];
  const ids = itemIds(canvas);
  const urls = new Set(signals.map((s) => s.url));
  if (!issues.length) refusals.push("no issues");
  if (issues.length > LIMITS.issuesMax) refusals.push(`${issues.length} issues, at most ${LIMITS.issuesMax}`);
  issues.forEach((i, k) => {
    const at = i.id || `issue ${k + 1}`;
    if (i.id !== `I${k + 1}`) refusals.push(`${at}: issues are numbered I1, I2 and on, in order; this one should be I${k + 1}`);
    if (!filled(i.title) || chars(i.title) > LIMITS.issueTitle) refusals.push(`${at}: the title must have 1 to ${LIMITS.issueTitle} characters`);
    if (!filled(i.description) || chars(i.description) > LIMITS.issueText) refusals.push(`${at}: the description must have 1 to ${LIMITS.issueText} characters`);
    if (!filled(i.contradicts)) refusals.push(`${at}: names nothing it contradicts`);
    const blocks = Array.isArray(i.blocks) ? i.blocks : [];
    if (!blocks.length || blocks.length > LIMITS.issueBlocksMax) refusals.push(`${at}: names ${blocks.length} blocks, 1 to ${LIMITS.issueBlocksMax}`);
    for (const b of blocks) if (!isBlock(b)) refusals.push(`${at}: the block "${b}" does not exist`);
    if (new Set(blocks).size !== blocks.length) refusals.push(`${at}: names a block twice`);
    for (const id of i.items || []) {
      if (!ids.has(id)) refusals.push(`${at}: the item "${id}" does not exist`);
      else if (!blocks.includes(id.replace(/-\d+$/, ""))) refusals.push(`${at}: the item "${id}" lies outside the blocks it names`);
    }
    if (!isScale(i.impact) || !isScale(i.likelihood)) refusals.push(`${at}: impact and likelihood are whole numbers from 1 to 5`);
    const evidenceList = Array.isArray(i.evidence) ? i.evidence : [];
    if (!evidenceList.length) refusals.push(`${at}: rests on nothing`);
    for (const e of evidenceList) if (e !== GENERAL_KNOWLEDGE && !urls.has(e)) refusals.push(`${at}: "${e}" is neither a signal's address nor "${GENERAL_KNOWLEDGE}"`);
  });
  prose("challenge", { issues }, { evidence }, audit, notes);
  return { refusals, audit, notes, ok: !refusals.length && !audit.length };
}

/**
 * The Analyst's answer. issues: the issues it prices; sector: the company's sector. A KPI outside the
 * library needs its name, unit, direction and definition; a range's low end may not exceed its high end.
 */
export function impactsProblems(answer, { issues = [], sector = "general", evidence = {} } = {}) {
  const refusals = [];
  const audit = [];
  const notes = [];
  const impacts = Array.isArray(answer?.impacts) ? answer.impacts : [];
  const want = issues.map((i) => i.id);
  const got = impacts.map((im) => im.issue);
  for (const id of want) if (got.filter((g) => g === id).length !== 1) refusals.push(`${id}: needs exactly one impact, has ${got.filter((g) => g === id).length}`);
  for (const id of got) if (!want.includes(id)) refusals.push(`the impact for "${id}" names no issue`);
  for (const im of impacts) {
    const at = im.issue;
    const kpis = Array.isArray(im.kpis) ? im.kpis : [];
    if (kpis.length < LIMITS.kpisMin || kpis.length > LIMITS.kpisMax) refusals.push(`${at}: ${kpis.length} KPI effects, ${LIMITS.kpisMin} to ${LIMITS.kpisMax}`);
    for (const k of kpis) {
      const known = kpiById(k.id);
      if (known && known.sector !== sector && known.sector !== "general") refusals.push(`${at}: the KPI "${k.id}" belongs to another sector`);
      if (!known && !(filled(k.name) && filled(k.unit) && filled(k.definition) && ["up", "down"].includes(k.direction))) refusals.push(`${at}: the KPI "${k.id}" is not in the library and lacks its name, unit, direction or definition`);
      if (!(Number.isFinite(k.change_low) && Number.isFinite(k.change_high)) || k.change_low > k.change_high) refusals.push(`${at}: the change of "${k.id}" runs from low to high`);
      if (!filled(k.basis)) refusals.push(`${at}: the change of "${k.id}" has no basis`);
    }
    const lo = im.eur_year_low;
    const hi = im.eur_year_high;
    if (im.monetisable) {
      if (!(Number.isFinite(lo) && Number.isFinite(hi)) || lo < 0 || lo > hi || hi === 0) refusals.push(`${at}: a euro range runs from 0 or more to a higher, positive high end`);
      if (!filled(im.eur_basis)) refusals.push(`${at}: the euro range has no basis`);
    } else {
      if (lo !== 0 || hi !== 0) refusals.push(`${at}: not monetisable, so both ends of the range are 0`);
      if (!filled(im.reason)) refusals.push(`${at}: not monetisable, but says not why`);
    }
  }
  (answer?.baselines || []).forEach((b, k) => { if (!Number.isFinite(b.value) || !filled(b.unit) || !filled(b.basis)) refusals.push(`baseline ${k + 1}: needs a value, a unit and a basis`); });
  prose("assess", { impacts, baselines: answer?.baselines }, { evidence }, audit, notes);
  return { refusals, audit, notes, ok: !refusals.length && !audit.length };
}

/**
 * The Strategist's answer. issues: the issues with their impacts merged (impact, likelihood and the
 * euro range); canvas: the completed canvas. Refused: a residual risk above the original, more than
 * three changes, a change naming an item that doesn't exist, an add without text or a removal with
 * text, not exactly one recommended option per issue, an upside with an impact.
 */
export function responsesProblems(answer, { issues = [], canvas, evidence = {} } = {}) {
  const refusals = [];
  const audit = [];
  const notes = [];
  const responses = Array.isArray(answer?.responses) ? answer.responses : [];
  const ids = itemIds(canvas);
  const byId = new Map(issues.map((i) => [i.id, i]));
  for (const i of issues) if (responses.filter((r) => r.issue === i.id).length !== 1) refusals.push(`${i.id}: needs exactly one response`);
  for (const r of responses) {
    const issue = byId.get(r.issue);
    if (!issue) { refusals.push(`the response for "${r.issue}" names no issue`); continue; }
    const options = Array.isArray(r.options) ? r.options : [];
    if (options.length < LIMITS.optionsMin || options.length > LIMITS.optionsMax) refusals.push(`${r.issue}: ${options.length} options, ${LIMITS.optionsMin} or ${LIMITS.optionsMax}`);
    if (options.filter((o) => o.recommended).length !== 1) refusals.push(`${r.issue}: recommends ${options.filter((o) => o.recommended).length} options, exactly one`);
    options.forEach((o, k) => {
      const at = `${r.issue} option ${k + 1}`;
      for (const f of ["title", "first_step", "owner"]) if (!filled(o[f])) refusals.push(`${at}: ${f.replace("_", " ")} is empty`);
      const changes = Array.isArray(o.changes) ? o.changes : [];
      if (changes.length < LIMITS.changesMin || changes.length > LIMITS.changesMax) refusals.push(`${at}: ${changes.length} changes, ${LIMITS.changesMin} to ${LIMITS.changesMax}`);
      changes.forEach((c, j) => {
        const cat = `${at} change ${j + 1}`;
        if (c.action === "add") {
          if (c.item !== "") refusals.push(`${cat}: an added item has no id yet`);
          if (!filled(c.text) || chars(c.text) > LIMITS.itemText) refusals.push(`${cat}: an added item needs 1 to ${LIMITS.itemText} characters`);
        } else {
          if (!ids.has(c.item)) refusals.push(`${cat}: the item "${c.item}" does not exist`);
          else if (c.item.replace(/-\d+$/, "") !== c.block) refusals.push(`${cat}: the item "${c.item}" is not in the block "${c.block}"`);
          if (c.action === "change" && (!filled(c.text) || chars(c.text) > LIMITS.itemText)) refusals.push(`${cat}: a changed item needs 1 to ${LIMITS.itemText} characters`);
          if (c.action === "remove" && c.text !== "") refusals.push(`${cat}: a removal has no text`);
        }
      });
      if (o.kind === "mitigate") {
        if (!isScale(o.impact) || !isScale(o.likelihood)) refusals.push(`${at}: the residual impact and likelihood are whole numbers from 1 to 5`);
        else if (o.impact * o.likelihood > issue.impact * issue.likelihood) refusals.push(`${at}: the residual risk is above the issue's own`);
        if (issue.monetisable !== false) {
          if (!(o.eur_year_low >= 0 && o.eur_year_low <= o.eur_year_high)) refusals.push(`${at}: the residual range runs from low to high`);
          else if (o.eur_year_high > issue.eur_year_high) refusals.push(`${at}: the residual range reaches above the issue's own`);
        }
      } else if (o.kind === "advantage") {
        if (o.impact !== 0) refusals.push(`${at}: an advantage has impact 0`);
        if (!isScale(o.likelihood)) refusals.push(`${at}: the upside's likelihood is a whole number from 1 to 5`);
        if (!(o.eur_year_low >= 0 && o.eur_year_low <= o.eur_year_high && o.eur_year_high > 0)) refusals.push(`${at}: the upside's range runs from low to a positive high end`);
      } else refusals.push(`${at}: the kind is mitigate or advantage`);
    });
  }
  prose("adapt", { responses }, { evidence }, audit, notes);
  return { refusals, audit, notes, ok: !refusals.length && !audit.length };
}

/** The Writer's answer: the lengths of brief 6.2, and every placeholder a key the engine returned. */
export function summaryProblems(answer, { facts = [], evidence = {} } = {}) {
  const refusals = [];
  const audit = [];
  const notes = [];
  const s = answer || {};
  if (!filled(s.headline) || chars(s.headline.replace(/\{\{fact:[^}]+\}\}/g, "€0.0m")) > LIMITS.headline) refusals.push(`the headline must have 1 to ${LIMITS.headline} characters with its figures filled in`);
  for (const f of ["situation", "recommendation"]) if (!filled(s[f]) || words(s[f]) > LIMITS.summaryWords) refusals.push(`the ${f} must have 1 to ${LIMITS.summaryWords} words`);
  if (!Array.isArray(s.findings) || s.findings.length !== LIMITS.findings || !s.findings.every(filled)) refusals.push(`exactly ${LIMITS.findings} findings`);
  if (!Array.isArray(s.assumptions) || s.assumptions.length < LIMITS.assumptionsMin || s.assumptions.length > LIMITS.assumptionsMax || !s.assumptions.every(filled)) refusals.push(`${LIMITS.assumptionsMin} to ${LIMITS.assumptionsMax} assumptions`);
  prose("summary", s, { facts, evidence }, audit, notes);
  return { refusals, audit, notes, ok: !refusals.length && !audit.length };
}

/** The keys a summary cites, for the checker: every placeholder in every field. */
export function summaryKeys(answer) {
  return [...new Set(proseOf("summary", answer || {}).flatMap(([, text]) => placeholders(text)))];
}

/** What a repair turn says: the problems found, for the model to fix in one answer. */
export function repairMessage({ refusals = [], audit = [] }) {
  const lines = [...refusals];
  for (const a of audit) {
    if (a.tokens.length) lines.push(`${a.where}: write these without numbers, or cite them as a placeholder from "facts": ${a.tokens.join(", ")}`);
    if (a.unknownFacts.length) lines.push(`${a.where}: these placeholders are not in "facts": ${a.unknownFacts.join(", ")}`);
  }
  return `Your answer broke these rules. Send the whole answer again with them fixed and nothing else changed.\n- ${lines.join("\n- ")}`;
}
