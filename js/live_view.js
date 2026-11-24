// What a live run adds to the screen (PLAN.md §7, the shaped brief of 0.3.0): the Start form with the
// company's details, the block dialog where a person enters, edits and removes items, the bar while an
// agent works (who, what, how long, with Abort) or after the run stopped (why, and what next), and the
// panel of a step that never ran. Everything else draws as the simulation draws it, from the same run.

import { h, icon } from "./dom.js";
import { t } from "./i18n/index.js";
import { STEP } from "./run.js";
import { SECTORS } from "../data/kpis.js";
import { LIMITS } from "./guards.js";
import { BLOCKS } from "./canvas.js";

const STEP_NAMES = ["start", "complete", "challenge", "assess", "adapt", "summary"];
const stepName = (n, lang) => t(`p.step.${STEP_NAMES[n]}`, null, lang);
const field = (id, label, control, hint = null) => h("div", { class: "vc-field live-field" }, h("label", { class: "vc-label", for: id }, label), control, hint);
/** "Public information only", wherever a person can type (standing requirement 7). */
export const notice = (lang) => h("p", { class: "vc-help live-public" }, icon("info"), h("span", {}, t("live.public", null, lang)));

/** The Start panel of a live run: the company, the notice, and a scenario's canvas to start from. */
export function panelLiveStart(ctx, on) {
  const { lang } = ctx;
  const { form, started, sample } = ctx.live;
  const lock = started ? { disabled: true } : {};
  const input = (id, key, max, extra = {}) => h("input", { class: "vc-input", id, type: "text", maxlength: String(max), value: form[key], autocomplete: "off", ...lock, ...extra, on: { input: (e) => on.form(key, e.target.value) } });
  const sector = h("select", { class: "vc-select", id: "live-sector", ...lock, on: { change: (e) => on.form("sector", e.target.value) } },
    h("option", { value: "", selected: !form.sector }, t("live.sector.decide", null, lang)),
    SECTORS.filter((s) => s.id !== "general").map((s) => h("option", { value: s.id, selected: form.sector === s.id }, s.name[lang])));
  return [
    h("h2", { class: "panel-title" }, t("live.start.title", null, lang)),
    notice(lang),
    h("div", { class: "live-form" },
      field("live-name", t("live.company", null, lang), input("live-name", "name", 60, { required: true, "aria-describedby": "live-name-error" }),
        h("p", { class: "vc-help vc-help--error", id: "live-name-error", hidden: true }, icon("error"), t("live.company.missing", null, lang))),
      field("live-sector", t("live.sector", null, lang), sector),
      field("live-country", t("live.country", null, lang), input("live-country", "country", 40, { placeholder: t("live.country.hint", null, lang) })),
      field("live-line", t("live.line", null, lang), input("live-line", "description", 140, { placeholder: t("live.line.hint", null, lang) }))),
    h("div", { class: "live-actions" },
      started
        ? h("p", { class: "vc-help" }, t("live.started", null, lang))
        : h("button", { type: "button", class: "vc-button vc-button--secondary vc-button--sm", id: "live-sample", on: { click: () => on.sample() } }, icon("layout"), t("live.sample", { company: sample }, lang)),
      h("button", { type: "button", class: "vc-button vc-button--ghost vc-button--sm", id: "live-clear", on: { click: () => on.clear() } }, icon("trash"), t("live.clear", null, lang)))
  ];
}

/** The title and lead of the live Start, and of a step a stopped run never reached. */
export function liveWords(ctx) {
  const { lang, step } = ctx;
  if (step === STEP.start) {
    return ctx.live.started
      ? { title: t("live.st.started", { company: ctx.sc.company.name }, lang), lead: t("live.st.startedLead", null, lang) }
      : { title: t("live.st.title", null, lang), lead: t("live.st.lead", null, lang) };
  }
  return { title: t("live.st.notrun", { step: stepName(step, lang) }, lang), lead: stopWords(ctx) };
}

/** A step a stopped run never reached: why, and what is done. */
export function panelNotRun(ctx) {
  const { lang } = ctx;
  const s = ctx.live.stopped;
  return [
    h("h2", { class: "panel-title" }, t("live.notrun.title", { step: stepName(ctx.step, lang) }, lang)),
    h("p", { class: "panel-note" }, stopWords(ctx)),
    ctx.reached ? h("p", { class: "panel-note" }, t("live.notrun.done", { steps: [1, 2, 3, 4, 5].filter((n) => n <= ctx.reached).map((n) => stepName(n, lang)).join(", ") }, lang)) : null,
    s?.problems?.length ? h("details", { class: "live-problems" }, h("summary", {}, t("live.notrun.problems", null, lang)), h("ul", {}, s.problems.slice(0, 8).map((p) => h("li", {}, p)))) : null
  ];
}

/** Why the run stopped, in plain words. */
export function stopWords(ctx) {
  const { lang } = ctx;
  const s = ctx.live.stopped;
  if (!s) return "";
  if (s.cause === "cap") return t("live.stop.cap", { step: stepName(ctx.reached, lang) }, lang);
  if (s.cause === "repair") return t("live.stop.repair", { agent: t(`live.name.${s.agent}`, null, lang) }, lang);
  if (s.cause === "aborted") return t("live.stop.aborted", null, lang);
  return t(`err.${s.cause}`, { detail: s.detail || "" }, lang);
}

/** The AI notice, beside every action that sets agents to work. */
const aiTag = (lang) => h("span", { class: "vc-tag vc-tag--feature ai-notice" }, icon("sparkle"), t("p.ai", null, lang));

/**
 * The bar under the story in a live run: what the person can do here and now. Returns { kind, el }.
 * kinds: turn (the person acts: start, review, decide), work (an agent works), stop (the run stopped),
 * end (done), next (a step behind the run's front).
 */
export function liveBar(ctx, on) {
  const { lang, step, reached } = ctx;
  const L = ctx.live;
  const cta = (label, action, extra = "") => h("button", { type: "button", class: ["vc-button", "cta", extra], id: "btn-cta", on: { click: () => on.bar(action) } }, label, icon(action === "abort" ? "stop" : "chevron-right"));
  const turn = (heading, text, label, action, kind = "turn") => ({
    kind,
    el: h("div", { class: "vc-callout turn turn-bar live-turn", role: "status" },
      h("span", { class: "vc-callout__cell", "aria-hidden": "true" }, icon(kind === "stop" ? "warning" : "hand")),
      h("div", { class: "vc-callout__body" }, h("p", { class: "vc-callout__title" }, heading), h("p", { class: "turn-text" }, text)),
      kind === "turn" ? aiTag(lang) : null,
      cta(label, action, kind === "turn" ? "vc-attention" : ""))
  });
  if (L.status === "working") {
    return {
      kind: "work",
      el: h("div", { class: "story-foot live-work", role: "status" },
        h("p", { class: "foot-note live-agent" }, h("span", { class: "vc-spinner", "aria-hidden": "true" }), h("span", {}, t(`live.agent.${L.agent}`, null, lang)), " · ", h("span", { id: "live-seconds" }, t("live.seconds", { s: L.seconds }, lang))),
        cta(t("live.abort", null, lang), "abort", "vc-button--secondary"))
    };
  }
  if (L.status === "stopped" && step >= reached) {
    return turn(t("live.stopped", null, lang), stopWords(ctx), t("live.again", null, lang), "again", "stop");
  }
  if (step === STEP.start && !L.started) return turn(t("turn.title", null, lang), t("live.turn.start", null, lang), t("live.turn.start.action", null, lang), "agents");
  if (step === STEP.complete && L.status === "review") return turn(t("turn.title", null, lang), t("live.turn.complete", null, lang), t("turn.complete.action", null, lang), "challenge");
  if (step === STEP.adapt && L.status === "decision") return null; // the simulation's decision bar, with the notice added by the caller
  if (step === STEP.summary && L.status === "done") {
    return { kind: "end", el: h("div", { class: "story-foot" }, h("p", { class: "foot-note", id: "foot-note" }, t("live.end", null, lang)), cta(t("live.again", null, lang), "again")) };
  }
  if (step < reached) return null; // Next, as in the simulation
  return { kind: "wait", el: h("div", { class: "story-foot" }, h("p", { class: "foot-note" }, t("live.wait", null, lang)), cta(t("live.back", null, lang), "simulation", "vc-button--secondary")) };
}

/**
 * The block dialog where a person enters a block's items before a live run: one field a line, at most
 * eight, each at most 90 characters, with Remove and Add an item. Enter goes to the next line, or adds
 * one at the end. on.items(block, texts, redraw, focus).
 */
export function renderBlockEdit(body, title, blockId, ctx, on) {
  const { lang } = ctx;
  const items = ctx.live.entered.blocks[blockId] || [];
  title.textContent = t(`block.${blockId}.name`, null, lang);
  const texts = items.map((it) => it.text);
  const full = texts.length >= LIMITS.itemsPerBlock;
  const enter = (e, i) => {
    if (e.key !== "Enter" || e.isComposing) return;
    e.preventDefault();
    texts[i] = e.target.value;
    if (i + 1 < texts.length) body.querySelector(`#edit-${blockId}-${i + 1}`)?.focus();
    else if (!full && e.target.value.trim()) { texts.push(""); on.items(blockId, texts, true, texts.length - 1); }
  };
  const rows = texts.map((text, i) => h("li", { class: "edit-row" },
    h("input", { class: "vc-input", type: "text", maxlength: String(LIMITS.itemText), value: text, id: `edit-${blockId}-${i}`, "aria-label": t("live.item.label", { n: i + 1 }, lang), autocomplete: "off",
      on: { change: (e) => { texts[i] = e.target.value; on.items(blockId, texts); }, keydown: (e) => enter(e, i) } }),
    h("button", { type: "button", class: "vc-icon-button", "aria-label": t("live.item.remove", { item: text || String(i + 1) }, lang), on: { click: () => { texts.splice(i, 1); on.items(blockId, texts, true); } } }, icon("close"))));
  body.replaceChildren(
    h("p", { class: "block-dialog__question" }, t(`block.${blockId}.question`, null, lang)),
    notice(lang),
    rows.length ? h("ul", { class: "edit-list" }, rows) : h("p", { class: "vc-framework__empty" }, t("live.block.empty", null, lang)),
    h("button", { type: "button", class: "vc-button vc-button--secondary vc-button--sm", id: "edit-add", disabled: full, on: { click: () => { texts.push(""); on.items(blockId, texts, true, texts.length - 1); } } }, icon("plus"), t(full ? "live.item.full" : "live.item.add", { n: LIMITS.itemsPerBlock }, lang)));
}

/**
 * At Complete in a live run, the field under an AI item where the person may rewrite it: the item keeps
 * its basis and confidence, and its tag says it was edited. The field's name starts with its visible
 * label and names the item. on.edit(id, text).
 */
export function editField(it, lang, on) {
  const id = `edit-${it.id}`;
  return h("div", { class: "vc-field item-edit" },
    h("label", { class: "vc-label", for: id }, t("live.item.words", null, lang)),
    h("input", { class: "vc-input vc-input--sm", type: "text", maxlength: String(LIMITS.itemText), value: it.text, id, "aria-label": t("live.item.edit", { item: it.text }, lang), autocomplete: "off",
      on: { change: (e) => on.edit(it.id, e.target.value) } }));
}

/** Every text a person entered, with where it stands, for the private-data check. */
export function enteredFields(form, entered, lang) {
  const out = [
    { where: t("live.company", null, lang), text: form.name },
    { where: t("live.country", null, lang), text: form.country },
    { where: t("live.line", null, lang), text: form.description }
  ];
  for (const b of BLOCKS) for (const it of entered.blocks[b] || []) out.push({ where: t(`block.${b}.name`, null, lang), text: it.text });
  return out;
}
