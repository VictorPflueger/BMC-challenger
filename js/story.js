// The words of each step and each figure, in the active language, from the run model (js/run.js) and
// the presenter's state. Pure: no DOM. Names, never record ids, reach the screen (Vici): an issue is its
// title, a block its name, an option its title.
//
// A step's title answers one question with its figure, and once the person has decided it states the
// result (Vici, Presenting step by step). The lead says what the agents did, in a sentence or two; Play
// times each step by the words of its title and lead.

import { t, tn } from "./i18n/index.js";
import { fmtMoney, fmtPartMoney, fmtPressure, fmtCents, fmtDate } from "./format.js";
import { money } from "./risk.js";
import { renderFacts } from "./facts.js";
import { factTexts } from "./format.js";
import { BLOCKS } from "./canvas.js";
import { STEP } from "./run.js";

/** How many of the nine blocks the team entered something in. */
export function filledBlocks(sc) {
  return BLOCKS.filter((b) => (sc.entered.blocks[b] || []).length > 0).length;
}

/** The Writer's text with its placeholders filled by code, from the result after the decision. */
export function writerText(text, run, lang) {
  return renderFacts(text, factTexts(run.after, lang));
}

/**
 * The title and lead of a step. ctx: { sc, run, step, reached, applied, lang }.
 */
export function stepWords(ctx) {
  const { sc, run, step, applied, lang } = ctx;
  const ai = run.completed ? Object.values(run.completed.blocks).flat().filter((it) => it.source === "ai") : [];
  const kept = ai.filter((it) => !run.removed.has(it.id)).length;
  const before = run.before;
  const sources = sc.answers.signals.length;
  switch (step) {
    case STEP.start:
      return {
        title: t("st.start.title", { company: sc.company.name, filled: filledBlocks(sc) }, lang),
        lead: t("st.start.lead", null, lang)
      };
    case STEP.complete:
      return {
        title: kept === ai.length ? t("st.complete.title", { n: ai.length }, lang) : t("st.complete.kept", { kept, n: ai.length }, lang),
        lead: t("st.complete.lead", null, lang)
      };
    case STEP.challenge:
      return {
        title: t("st.challenge.title", { n: before.count, pressure: fmtPressure(before.pressure.before, before.pressure.of, lang) }, lang),
        lead: sources ? tn("st.challenge.lead", sources, { date: fmtDate(sc.answers.signals[0].read_on || sc.as_of, lang, "short") }, lang) : t("st.challenge.leadNone", null, lang)
      };
    case STEP.assess:
      return {
        title: t("st.assess.title", { stake: fmtPartMoney(before.atStake, before.priced, before.count, lang) }, lang),
        lead: t("st.assess.lead", null, lang)
      };
    case STEP.adapt:
      return applied
        ? { title: t("st.adapt.done", { left: fmtPartMoney(run.after.left, run.after.priced, run.after.count, lang), stake: fmtMoney(before.atStake, lang) }, lang), lead: t("st.adapt.doneLead", null, lang) }
        : { title: t("st.adapt.title", { n: before.count }, lang), lead: t("st.adapt.lead", null, lang) };
    default:
      return {
        title: writerText(sc.answers.summary.headline, run, lang),
        lead: writerText(sc.answers.summary.situation, run, lang)
      };
  }
}

/**
 * What the bar under the story says and does. Returns { kind: "turn" | "next" | "end", heading, text,
 * label, action }: "turn" where the person acts (with vc-attention), "next" where Play may move on,
 * "end" on the last step. action names what the button does: start, challenge, apply, go or restart.
 */
export function barWords(ctx) {
  const { run, step, reached, applied, lang } = ctx;
  const before = run.before;
  if (step === STEP.start && reached === 0) return { kind: "turn", heading: t("turn.title", null, lang), text: t("turn.start", null, lang), label: t("turn.start.action", null, lang), action: "start" };
  if (step === STEP.complete && reached === STEP.complete) return { kind: "turn", heading: t("turn.title", null, lang), text: t("turn.complete", null, lang), label: t("turn.complete.action", null, lang), action: "challenge" };
  if (step === STEP.adapt && !applied) {
    return {
      kind: "turn",
      heading: t("turn.decision", null, lang),
      text: t("turn.adapt", { left: fmtPartMoney(run.after.left, run.after.priced, run.after.count, lang), stake: fmtMoney(before.atStake, lang) }, lang),
      label: t("turn.adapt.action", null, lang),
      action: "apply"
    };
  }
  if (step === STEP.summary) return { kind: "end", heading: "", text: t("turn.end", null, lang), label: t("turn.end.action", null, lang), action: "restart" };
  return { kind: "next", heading: "", text: "", label: t(`next.${["", "challenge", "assess", "adapt", "summary"][step] || "complete"}`, null, lang), action: "go" };
}

/**
 * The three tiles. Before anything runs they answer first: the scenario's figures from its recording,
 * worked out by the engine. After the decision the old value stays struck through beside the new one.
 * Returns { stake, pressure, cost }, each { value, was, note, state }.
 */
export function tileWords(ctx) {
  const { run, applied, estimate, lang } = ctx;
  const before = run.before;
  const after = run.after;
  // On part of the issues the note under the amount says so: "€13.6m" / "on 5 of 6 issues".
  const part = before.priced < before.count;
  const of = { priced: before.priced, total: before.count };
  const leftNote = part ? tn("kpi.stake.leftPart", before.count, of, lang) : after.upside > 0 ? t("kpi.stake.left.upside", { upside: fmtMoney(after.upside, lang) }, lang) : t("kpi.stake.left", null, lang);
  const stake = applied
    ? { value: money(after.left, lang), was: money(before.atStake, lang), note: leftNote, state: "decided" }
    : { value: money(before.atStake, lang), was: "", note: part ? tn("fig.part", before.count, of, lang) : tn("kpi.stake.found", before.count, {}, lang), state: "ready" };
  const pressureNow = fmtPressure(before.pressure.before, before.pressure.of, lang);
  const pressure = applied
    ? { value: fmtPressure(after.pressure.after, after.pressure.of, lang), was: pressureNow, note: t("kpi.pressure.after", null, lang), state: "decided" }
    : { value: pressureNow, was: "", note: t("kpi.pressure.found", null, lang), state: "ready" };
  const cost = estimate
    ? { value: `≈ ${fmtCents(estimate.eur, lang)}`, was: "", note: t("kpi.cost.estimate", null, lang), state: "ready" }
    : { value: "…", was: "", note: t("p.kpi.cost.note", null, lang), state: "idle" };
  return { stake, pressure, cost };
}

/** "Facts as of 23 November 2026": shown with "Check for updates" once a scenario is older than its limit. */
export function staleWords(sc, lang) {
  return t("p.stale", { date: fmtDate(sc.as_of, lang) }, lang);
}
