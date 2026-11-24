// Draws the stage of a step: the canvas in Vici's framework view, the step's panel and the bar under the
// story, and fills the dialog that opens a block. Every text goes in through textContent (js/dom.js).
//
// The canvas keeps its classic layout on every step. Each block shows its name, its state as a tag with a
// mark and words (Vici's framework view: under pressure, watch, adapted, AI-completed) and as many of
// its items as fit, one line each, then "+2 more". When not all fit, the block keeps in view what the step
// is about: the AI's items at Complete, the items an issue names at Challenge and Assess, the changed
// items at Adapt and Summary, and the selected issue's items before all of them. A click on the block's
// name or on one of its items opens the block with every item in full. Items carry their own state: entered, AI (lilac), added by a
// response, challenged, adapted (the old text struck through above the new) or removed.

import { h, icon } from "./dom.js";
import { t, tn } from "./i18n/index.js";
import { BLOCKS, blockOf } from "./canvas.js";
import { STEP, aiItems } from "./run.js";
import { filledBlocks, writerText, barWords } from "./story.js";
import { fmtMoney, fmtRange, fmtChange, fmtBaseline, fmtDate } from "./format.js";
import { band as bandOf, riskScore } from "./risk.js";
import { kpiById, SECTORS } from "../data/kpis.js";
import { GENERAL_KNOWLEDGE } from "./guards.js";
import { editField } from "./live_view.js";

const blockName = (id) => t(`block.${id}.name`);
const issueLabel = (i) => `${i.id.slice(1)}. ${i.title}`;
// The issue in view is the one selected at Challenge, Assess and Adapt alike.
const sectorName = (id, lang) => SECTORS.find((s) => s.id === id)?.name?.[lang] || id;

// ---- the canvas ---------------------------------------------------------------------------------------

/** Which canvas a step shows, and with which block states (before or after the decision). */
function canvasOf(ctx) {
  const { sc, run, step, applied } = ctx;
  if (step === STEP.start) return { blocks: sc.entered.blocks, side: null };
  if (step === STEP.complete) return { blocks: run.completed.blocks, side: null, removed: run.removed };
  if (step === STEP.challenge || step === STEP.assess) return { blocks: run.kept.blocks, side: "before" };
  if (step === STEP.adapt) return { blocks: run.adapted.compare.blocks, side: applied ? "after" : "before" };
  return { blocks: run.adapted.after.blocks, side: "after" };
}

/** The issues naming each item, and the worst band among them, for the challenged mark. */
function challengedItems(run) {
  const map = new Map();
  for (const r of run.before.issues) {
    const issue = run.issues.find((i) => i.id === r.id);
    for (const id of issue.items) {
      const prev = map.get(id);
      const rank = ["low", "medium", "high", "critical"];
      if (!prev || rank.indexOf(r.before.band) > rank.indexOf(prev)) map.set(id, r.before.band);
    }
  }
  return map;
}

/**
 * One item as a row of Vici's framework view: the mark, the text (a button that opens the block), the
 * state words and, at Complete, the switch that keeps or removes an AI item. on.toggleItem, when given,
 * draws the switch.
 */
function itemRow(it, { status, word, current, lang, toggle = null, rank = 0 }) {
  const source = it.source === "user" ? "entered" : it.source;
  const states = [];
  // tag-quiet: a word the canvas leaves to the mark beside it, kept for screen readers. An AI item's
  // sparkle says "AI" (the legend names the mark); an added item's "Added" already says it adapts; a
  // challenged item keeps its warning mark, and the block's own tag names the worst band.
  const sparkle = source === "ai" && !status;
  if (source === "ai") states.push(h("span", { class: ["vc-tag vc-tag--sm vc-item__state vc-item__state--source", sparkle && !it.edited ? "tag-quiet" : ""] }, it.edited ? t("item.aiEdited", null, lang) : t("item.ai", null, lang)));
  else if (source === "added") states.push(h("span", { class: "vc-tag vc-tag--sm vc-item__state vc-item__state--source" }, t("item.added", null, lang)));
  else states.push(h("span", { class: "vc-item__state vc-visually-hidden" }, t("item.entered", null, lang)));
  if (status) states.push(h("span", { class: ["vc-tag vc-tag--sm vc-item__state vc-item__state--status", (source === "added" && status === "addressed") || status === "challenged" ? "tag-quiet" : ""] }, word));
  const mark = status === "removed" ? icon("minus") : status === "addressed" ? icon("check") : status === "challenged" ? icon("warning") : source === "ai" || source === "added" ? icon("sparkle") : null;
  const text = it.was && status !== "removed" ? [h("s", { class: "vc-item__was" }, it.was), it.text] : it.text;
  const removed = status === "removed";
  return h("li", { class: "vc-item", dataset: { source, item: it.id, rank: String(rank), ...(status ? { status } : {}) }, "aria-current": current ? "true" : null },
    h("div", { class: "vc-item__summary" },
      h("span", { class: "vc-item__mark", "aria-hidden": "true" }, mark),
      h("button", { type: "button", class: "item-open", dataset: { open: it.block || blockOf(it.id) } }, h("span", { class: "vc-item__text" }, text)),
      h("span", { class: "vc-item__states" }, states),
      toggle ? h("button", { type: "button", class: "vc-icon-button item-toggle", "aria-pressed": String(removed), "aria-label": t(removed ? "p.complete.keepLabel" : "p.complete.removeLabel", { item: it.text }, lang), title: t(removed ? "p.complete.keep" : "p.complete.remove", null, lang), on: { click: () => toggle(it.id) } }, icon(removed ? "undo" : "close")) : null));
}

/**
 * A block's state in words, as its tag carries them: "2 issues · high", "1 issue · low", "Adapted", or
 * "Adapted · 1 issue · low". The noun is in its own span, which a tight canvas hides from the eye but
 * not from a screen reader ("2 · high" on screen).
 */
function stateWords(status, n, worst, lang) {
  const parts = [];
  if (status === "addressed") parts.push(t("state.adapted", null, lang));
  if (status !== "addressed" || n) {
    if (parts.length) parts.push(" · ");
    const noun = tn("state.noun", n, {}, lang);
    parts.push(String(n), h("span", { class: "tag-long" }, " ", noun), " · ", t(`band.${worst}`, null, lang));
  }
  return parts;
}

/** The status and words of an item on this step: removed, added or changed by a response, or challenged. */
function itemState(it, ctx, challenged) {
  const { step, lang } = ctx;
  if (step === STEP.complete && ctx.run.removed.has(it.id)) return { status: "removed", word: t("item.removed", null, lang) };
  if (it.status === "removed") return { status: "removed", word: t("item.removed", null, lang) };
  if (it.status === "added" || it.status === "changed") return { status: "addressed", word: t("item.adapted", null, lang) };
  if ((step === STEP.challenge || step === STEP.assess || step === STEP.adapt) && challenged.has(it.id)) return { status: "challenged", word: t(`band.${challenged.get(it.id)}`, null, lang) };
  return { status: null, word: "" };
}

/** The canvas of the step into its container: nine blocks in the classic layout. */
export function renderCanvas(el, ctx, on = {}) {
  const { run, step, lang } = ctx;
  const toggle = step === STEP.complete && ctx.reached === STEP.complete && (!ctx.live || ctx.live.status === "review") ? on.toggleItem : null;
  const { blocks, side } = canvasOf(ctx);
  const challenged = step >= STEP.challenge ? challengedItems(run) : new Map();
  const selected = step === STEP.challenge || step === STEP.adapt ? run.issues.find((i) => i.id === ctx.selectedIssue) : null;
  const changedBlocks = new Set(Object.values(run.adapted.compare.blocks).flat().filter((it) => it.status).map((it) => it.block));
  // What a block keeps in view when not all of it fits (fitCanvas): what this step is about.
  const leads = (it, s) => (step === STEP.complete ? it.source === "ai" : step >= STEP.adapt ? s.status === "addressed" || s.status === "removed" : s.status === "challenged");
  const areas = BLOCKS.map((b) => {
    const items = blocks[b] || [];
    const engine = side ? run[side === "before" ? "before" : "after"].blocks.find((x) => x.id === b) : null;
    const state = engine ? engine[side] : null;
    let status = state && state.state !== "clear" ? state.state : null;
    if (side === "after" && changedBlocks.has(b) && status !== "pressure") status = "addressed";
    // The AI completed the block: said at Complete, where that is the story; later steps lead with the risk.
    const aiDone = step === STEP.complete && !(ctx.sc.entered.blocks[b] || []).length && items.some((it) => it.source === "ai");
    const tags = [];
    if (aiDone) tags.push(h("span", { class: "vc-tag vc-tag--sm vc-framework__state vc-framework__state--source" }, icon("sparkle"), t("item.ai", null, lang)));
    if (status) {
      const words = stateWords(status, engine.issues.length, state.worst, lang);
      tags.push(h("span", { class: "vc-tag vc-tag--sm vc-framework__state vc-framework__state--status" }, icon(status === "pressure" ? "warning" : status === "watch" ? "eye" : "check"), words));
    }
    // At Adapt the canvas previews the selected responses: a block they change says how many changes.
    const changes = step >= STEP.adapt ? items.filter((it) => it.status).length : 0;
    if (changes && status !== "addressed") tags.push(h("span", { class: "vc-tag vc-tag--sm vc-framework__state change-tag" }, icon("check"), String(changes), h("span", { class: "tag-long" }, " ", tn("state.changeWord", changes, {}, lang))));
    const current = selected ? selected.blocks.includes(b) : false;
    const list = items.length
      ? h("ul", { class: "vc-framework__items" }, items.map((it) => {
        const s = itemState(it, ctx, challenged);
        const isCurrent = selected ? selected.items.includes(it.id) : false;
        return itemRow(it, { ...s, current: isCurrent, lang, toggle: it.source === "ai" ? toggle : null, rank: isCurrent ? 2 : leads(it, s) ? 1 : 0 });
      }))
      : h("p", { class: "vc-framework__empty block-question" }, t(`block.${b}.question`, null, lang));
    return h("section", { class: "vc-framework__area block", dataset: { block: b, ...(status ? { status } : {}), ...(aiDone ? { source: "ai" } : {}) }, "aria-labelledby": `blk-${b}`, "aria-current": current ? "true" : null },
      h("header", { class: "vc-framework__head" },
        h("h2", { class: "vc-framework__title block-name" }, h("button", { type: "button", class: "block-open", id: `blk-${b}`, dataset: { open: b } }, blockName(b))),
        tags.length ? h("p", { class: "vc-framework__states" }, tags) : null,
        items.length ? h("button", { type: "button", class: "block-more", dataset: { open: b }, hidden: true }) : null),
      list);
  });
  el.replaceChildren(...areas);
  el.dataset.step = String(step);
}

/**
 * Shows in each block as many items as fit, then "+N more". Run after the canvas is in the page and on
 * every resize: the blocks take their height from the layout, never from their items. An item's rank
 * (data-rank, set by renderCanvas) says what goes first: the items of rank 0 from the last up, then those
 * of rank 1, then 2. The items left in view keep their order.
 */
export function fitCanvas(el) {
  for (const area of el.querySelectorAll(".block")) {
    const question = area.querySelector(".block-question");
    if (question) {
      question.hidden = false;
      question.hidden = question.getBoundingClientRect().bottom > area.getBoundingClientRect().bottom - 3;
    }
    const list = area.querySelector(".vc-framework__items");
    const more = area.querySelector(".block-more");
    if (!list || !more) continue;
    const items = [...list.children];
    for (const li of items) li.hidden = false;
    more.hidden = true;
    list.hidden = false;
    // Too tall when the last item in view ends below the list. Measured on the items, not the list's
    // scroll height, which a focus ring drawn around a switch would also count.
    const overflows = () => {
      const last = items.findLast((li) => !li.hidden);
      return !!last && last.getBoundingClientRect().bottom > list.getBoundingClientRect().bottom + 1;
    };
    if (!overflows()) continue;
    more.hidden = false;
    const order = items.map((li, i) => [li, Number(li.dataset.rank) || 0, i]).sort((a, b) => a[1] - b[1] || b[2] - a[2]).map(([li]) => li);
    let shown = items.length;
    // "+2 more"; a tight canvas shows "+2" and keeps the word for screen readers (tag-long).
    const label = () => { const n = items.length - shown; more.replaceChildren(`+${n}`, h("span", { class: "tag-long" }, " ", tn("block.more", n, {}))); };
    label();
    while (shown > 0 && overflows()) {
      order[items.length - shown].hidden = true;
      shown -= 1;
      label();
    }
    // With no item in view the list keeps no height; a count that would fall outside the block stays hidden.
    list.hidden = shown === 0;
    if (more.getBoundingClientRect().bottom > area.getBoundingClientRect().bottom - 2) more.hidden = true;
    more.setAttribute("aria-label", t("block.moreLabel", { n: items.length - shown, block: blockName(area.dataset.block) }));
  }
}

// ---- the block, opened --------------------------------------------------------------------------------

/** The dialog's body: every item of the block in full, with its source, basis and confidence, and its issues. */
export function renderBlock(body, title, blockId, ctx, on = {}) {
  const { run, step, lang } = ctx;
  const toggle = step === STEP.complete && ctx.reached === STEP.complete && (!ctx.live || ctx.live.status === "review") ? on.toggleItem : null;
  const { blocks, side } = canvasOf(ctx);
  title.textContent = blockName(blockId);
  const challenged = step >= STEP.challenge ? challengedItems(run) : new Map();
  const items = blocks[blockId] || [];
  const rows = items.map((it) => {
    const s = itemState(it, ctx, challenged);
    const row = itemRow(it, { ...s, current: false, lang, toggle: it.source === "ai" ? toggle : null });
    const note = [];
    if (it.source === "ai") note.push(h("p", {}, h("strong", {}, t("item.basis", null, lang)), " ", it.basis, " · ", t(`conf.${it.confidence}`, null, lang)));
    if (it.source === "added") note.push(h("p", {}, t("item.addedBy", null, lang)));
    if (it.status === "changed") note.push(h("p", {}, t("item.changedBy", null, lang)));
    // In the dialog the text is plain, not a button: the block is already open. While a live run waits
    // for the review, an AI item's text is a field the person may rewrite.
    const opener = row.querySelector(".item-open");
    if (ctx.live && toggle && it.source === "ai" && on.edit) opener.replaceWith(editField(it, lang, on));
    else opener.replaceWith(...opener.childNodes);
    if (note.length) row.append(h("div", { class: "vc-item__body" }, note));
    return row;
  });
  const issues = step >= STEP.challenge ? run.issues.filter((i) => i.blocks.includes(blockId)) : [];
  body.replaceChildren(
    h("p", { class: "block-dialog__question" }, t(`block.${blockId}.question`, null, lang)),
    rows.length ? h("ul", { class: "vc-framework__items block-dialog__items" }, rows) : h("p", { class: "vc-framework__empty" }, t("block.empty", null, lang)),
    issues.length ? h("div", { class: "block-dialog__issues" },
      h("h3", {}, t("block.issues", null, lang)),
      h("ul", {}, issues.map((i) => {
        const r = run[side === "after" ? "after" : "before"].issues.find((x) => x.id === i.id);
        const b = r[side === "after" ? "after" : "before"].band;
        return h("li", {}, h("span", { class: "vc-tag vc-tag--sm band-tag", dataset: { band: b } }, t(`band.${b}`, null, lang)), " ", issueLabel(i));
      }))) : null);
}

// ---- the panels ---------------------------------------------------------------------------------------

function panelStart(ctx, on) {
  const { scenarios, sc, lang } = ctx;
  return [
    h("h2", { class: "panel-title" }, t("p.start.title", null, lang)),
    h("div", { class: "companies", role: "radiogroup", "aria-label": t("p.start.title", null, lang) }, scenarios.map((s) => {
      const chosen = s.id === sc.id;
      return h("button", { type: "button", role: "radio", class: "company", "aria-checked": String(chosen), dataset: { scenario: s.id }, on: { click: () => on.scenario(s.id) } },
        h("span", { class: "company-name" }, s.company.name),
        h("span", { class: "company-meta" }, `${sectorName(s.company.sector, lang)} · ${t(`country.${s.company.country}`, null, lang)}`),
        h("span", { class: "company-text" }, s.company.description),
        h("span", { class: "company-size" }, s.company.size),
        h("span", { class: "company-filled" }, t("p.start.filled", { n: filledBlocks(s) }, lang)));
    }))
  ];
}

function panelComplete(ctx) {
  const { run, reached, lang } = ctx;
  const items = aiItems(run);
  const kept = items.filter((it) => !it.removed).length;
  const mark = (kind, name) => h("li", { dataset: { mark: kind } }, h("span", { class: "vc-item__mark", "aria-hidden": "true" }, name ? icon(name) : null), t(`legend.${kind}`, null, lang));
  return [
    h("div", { class: "panel-head" },
      h("h2", { class: "panel-title" }, t("p.complete.title", null, lang)),
      h("p", { class: "panel-note" }, t("p.complete.count", { kept, n: items.length }, lang))),
    h("p", { class: "complete-hint" }, reached > STEP.complete || (ctx.live && ctx.live.status !== "review") ? t("p.complete.locked", null, lang) : t(ctx.live ? "live.complete.hint" : "p.complete.hint", null, lang)),
    h("ul", { class: "vc-framework__legend" }, mark("entered"), mark("ai", "sparkle"), mark("removed", "minus"))
  ];
}

function sourceLine(url, ctx) {
  const { sc, lang } = ctx;
  if (url === GENERAL_KNOWLEDGE) return h("li", {}, t("p.source.general", null, lang));
  const s = sc.answers.signals.find((x) => x.url === url);
  // The title and when it was published; the step's lead says when the sources were read.
  const published = s.published ? t("p.source.published", { date: fmtDate(s.published, lang, "short") }, lang) : "";
  return h("li", {}, h("a", { href: url, rel: "noopener noreferrer", target: "_blank" }, s.title), published ? h("span", { class: "source-when" }, " · ", published) : null);
}

function issueList(ctx, on, choiceWords) {
  const { run, lang } = ctx;
  return h("ul", { class: "issue-list", role: "list" }, run.issues.map((i) => {
    const r = run.before.issues.find((x) => x.id === i.id);
    const selected = i.id === ctx.selectedIssue;
    return h("li", {}, h("button", { type: "button", class: "issue-pick", "aria-pressed": String(selected), dataset: { issue: i.id }, on: { click: () => on.issue(i.id) } },
      h("span", { class: "issue-pick__n", "aria-hidden": "true" }, i.id.slice(1)),
      h("span", { class: "issue-pick__title" }, i.title),
      h("span", { class: "vc-tag vc-tag--sm band-tag", dataset: { band: r.before.band } }, choiceWords ? choiceWords(i) : t(`band.${r.before.band}`, null, lang))));
  }));
}

/** The issues as a row of numbered switches, each with a word of its own (its expected loss, its choice). */
function issueTabs(ctx, on, labelOf) {
  const { run, lang } = ctx;
  return h("ul", { class: "issue-tabs", "aria-label": t("p.adapt.issues", null, lang) }, run.issues.map((i) => {
    const r = run.before.issues.find((x) => x.id === i.id);
    const selected = i.id === ctx.selectedIssue;
    return h("li", {}, h("button", { type: "button", class: "issue-tab", "aria-pressed": String(selected), "aria-label": `${issueLabel(i)}: ${labelOf(i, r)}`, dataset: { issue: i.id, band: r.before.band }, on: { click: () => on.issue(i.id) } },
      h("span", { class: "issue-pick__n", "aria-hidden": "true" }, i.id.slice(1)),
      h("span", { class: "issue-tab__word", "aria-hidden": "true" }, labelOf(i, r))));
  }));
}

function panelChallenge(ctx, on) {
  const { run, lang } = ctx;
  const i = run.issues.find((x) => x.id === ctx.selectedIssue) || run.issues[0];
  const r = run.before.issues.find((x) => x.id === i.id);
  return [
    h("div", { class: "split" },
      h("div", { class: "split__list" }, h("h2", { class: "panel-title" }, t("p.challenge.issues", null, lang)), issueList(ctx, on)),
      h("article", { class: "issue-detail", "aria-live": "polite" },
        h("h3", { class: "issue-detail__title" }, issueLabel(i)),
        h("p", { class: "issue-detail__tags" },
          h("span", { class: "vc-tag vc-tag--sm band-tag", dataset: { band: r.before.band } }, t(`band.${r.before.band}`, null, lang)),
          h("span", { class: "vc-tag vc-tag--sm" }, t(`type.${i.type}`, null, lang)),
          h("span", { class: "vc-tag vc-tag--sm" }, t(`horizon.${i.horizon}`, null, lang)),
          h("span", { class: "vc-tag vc-tag--sm vc-tag--feature" }, t(`conf.${i.confidence}`, null, lang))),
        h("p", { class: "issue-detail__text" }, i.description),
        h("dl", { class: "facts" },
          h("dt", {}, t("p.issue.contradicts", null, lang)), h("dd", {}, i.contradicts),
          h("dt", {}, t("p.issue.blocks", null, lang)), h("dd", {}, i.blocks.map(blockName).join(", ")),
          h("dt", {}, t("p.issue.rests", null, lang)), h("dd", {}, h("ul", { class: "sources" }, i.evidence.map((u) => sourceLine(u, ctx)))))))
  ];
}

/** Marker sizes by expected euros a year: thirds of the largest (Vici's three steps). */
function sizeOf(value, max) {
  if (value === null || !max) return "";
  if (value <= max / 3) return "vc-risk__marker--sm";
  if (value > (2 * max) / 3) return "vc-risk__marker--lg";
  return "";
}

function riskMatrix(ctx) {
  const { run, lang } = ctx;
  const rows = run.before.issues;
  const max = Math.max(0, ...rows.map((r) => r.before.expected || 0));
  const cells = [];
  for (let impact = 5; impact >= 1; impact--) {
    cells.push(h("span", { class: "vc-risk__tick" }, String(impact)));
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      const score = riskScore(impact, likelihood);
      const here = run.issues.filter((i) => i.impact === impact && i.likelihood === likelihood);
      cells.push(h("div", { class: "vc-risk__cell", dataset: { impact: String(impact), likelihood: String(likelihood), band: bandOf(impact, likelihood) } },
        h("span", { class: "vc-risk__score" }, String(score)),
        here.map((i) => {
          const r = rows.find((x) => x.id === i.id);
          return h("span", { class: ["vc-risk__marker", sizeOf(r.before.expected, max)], dataset: { impact: String(impact), likelihood: String(likelihood) }, "aria-label": issueLabel(i), "aria-current": i.id === ctx.selectedIssue ? "true" : null }, i.id.slice(1));
        })));
    }
  }
  cells.push(h("span", { class: "vc-risk__tick", "aria-hidden": "true" }));
  for (let l = 1; l <= 5; l++) cells.push(h("span", { class: "vc-risk__tick" }, String(l)));
  const sizes = new Set(rows.map((r) => sizeOf(r.before.expected, max)));
  return h("figure", { class: "vc-risk", "aria-labelledby": "rm-title" },
    h("figcaption", {}, h("p", { class: "vc-chart__title", id: "rm-title" }, tn("p.assess.matrix", rows.length, {}, lang))),
    h("div", { class: "vc-risk__plot" },
      h("p", { class: "vc-risk__axis vc-risk__axis--impact" }, t("p.assess.impact", null, lang)),
      h("div", { class: "vc-risk__grid" }, cells),
      h("p", { class: "vc-risk__axis vc-risk__axis--likelihood" }, t("p.assess.likelihood", null, lang))),
    h("ul", { class: "vc-risk__key" },
      ["low", "medium", "high", "critical"].map((b) => h("li", { dataset: { band: b } }, t(`p.assess.key.${b}`, null, lang))),
      sizes.has("vc-risk__marker--sm") ? h("li", { dataset: { size: "sm" } }, t("p.assess.key.sm", null, lang)) : null,
      sizes.has("vc-risk__marker--lg") ? h("li", { dataset: { size: "lg" } }, t("p.assess.key.lg", null, lang)) : null),
    h("details", { class: "vc-risk__numbers" },
      h("summary", {}, t("p.assess.numbers", null, lang)),
      h("div", { class: "vc-table-wrap" }, h("table", { class: "vc-table vc-table--compact" },
        h("thead", {}, h("tr", {}, ["issue", "impact", "likelihood", "score", "band", "stake"].map((c) => h("th", { scope: "col" }, t(`p.assess.col.${c}`, null, lang))))),
        h("tbody", {}, rows.map((r) => {
          const i = run.issues.find((x) => x.id === r.id);
          return h("tr", {}, h("th", { scope: "row" }, issueLabel(i)), h("td", {}, String(i.impact)), h("td", {}, String(i.likelihood)), h("td", {}, String(r.before.score)), h("td", {}, t(`band.${r.before.band}`, null, lang)), h("td", {}, r.before.expected === null ? t("fig.noEuros", null, lang) : fmtMoney(r.before.expected, lang)));
        }))))));
}

function panelAssess(ctx, on) {
  const { sc, run, lang } = ctx;
  const i = run.issues.find((x) => x.id === ctx.selectedIssue) || run.issues[0];
  const r = run.before.issues.find((x) => x.id === i.id);
  const tag = h("span", { class: "vc-tag vc-tag--sm vc-tag--feature" }, icon("sparkle"), t("p.estimate", null, lang));
  const expectedWords = r.before.expected === null
    ? t("p.assess.notEuros", { reason: i.reason }, lang)
    : t("p.assess.expected", { expected: fmtMoney(r.before.expected, lang), mid: fmtMoney((i.eur_year_low + i.eur_year_high) / 2, lang), p: String(r.before.probability).replace(".", lang === "de" ? "," : ".") }, lang);
  return [
    h("div", { class: "assess" },
      riskMatrix(ctx),
      h("div", { class: "assess__issue" },
        issueTabs(ctx, on, (x, row) => (row.before.expected === null ? t("fig.noEuros", null, lang) : fmtMoney(row.before.expected, lang))),
        h("article", { class: "issue-detail", "aria-live": "polite" },
          h("h3", { class: "issue-detail__title" }, issueLabel(i), " ", h("span", { class: "vc-tag vc-tag--sm band-tag", dataset: { band: r.before.band } }, t(`band.${r.before.band}`, null, lang))),
          h("dl", { class: "facts" },
            h("dt", {}, t("p.assess.col.kpis", null, lang)), h("dd", {}, h("ul", { class: "kpi-effects" }, i.kpis.map((k) => h("li", {}, `${k.name} `, h("span", { class: "kpi-change ai-figure" }, fmtChange(k, lang)), kpiById(k.id) ? null : [" ", h("span", { class: "vc-tag vc-tag--sm" }, t("p.kpi.new", null, lang))])))),
            h("dt", {}, t("p.assess.col.range", null, lang)), h("dd", {}, i.monetisable ? [h("span", { class: "ai-figure" }, fmtRange(i.eur_year_low, i.eur_year_high, lang)), " ", tag, h("span", { class: "basis" }, ` ${i.eur_basis}`)] : t("fig.noEuros", null, lang)),
            h("dt", {}, t("p.assess.col.expected", null, lang)), h("dd", {}, expectedWords)),
          h("details", { class: "baselines" },
            h("summary", {}, t("p.assess.baselines", null, lang)),
            h("ul", {}, sc.answers.impacts.baselines.map((b) => h("li", {}, `${b.name}: `, h("strong", { class: "ai-figure" }, fmtBaseline(b, lang)), `. ${b.basis}.`)))))))
  ];
}

const KIND_WORD = { mitigate: "choice.mitigate", advantage: "choice.advantage", accept: "choice.accept" };

function choiceKey(o, chosen) {
  return chosen === "accept" ? "accept" : o.list[chosen].kind;
}

function effectWords(e, lang) {
  if (e.before === null) {
    if (e.kind === "advantage") return t("effect.advantageNoEuros", { upside: fmtMoney(e.upside, lang) }, lang);
    return t(e.kind === "mitigate" ? "effect.mitigateBand" : "effect.noEuros", { b1: t(`band.${e.bandBefore}`, null, lang), b2: t(`band.${e.bandAfter}`, null, lang) }, lang);
  }
  if (e.kind === "mitigate") return t("effect.mitigate", { before: fmtMoney(e.before, lang), after: fmtMoney(e.after, lang), b1: t(`band.${e.bandBefore}`, null, lang), b2: t(`band.${e.bandAfter}`, null, lang) }, lang);
  if (e.kind === "advantage") return t("effect.advantage", { upside: fmtMoney(e.upside, lang), before: fmtMoney(e.before, lang) }, lang);
  return t("effect.accept", { before: fmtMoney(e.before, lang) }, lang);
}

function changeLine(c, ctx) {
  const { run, lang } = ctx;
  const item = run.completed.blocks[c.block]?.find((x) => x.id === c.item);
  const gone = c.action !== "add" && (!item || run.removed.has(c.item));
  const text = c.action === "remove" ? item?.text || "" : c.text;
  const note = gone ? t("change.gone", null, lang) : "";
  return h("li", { dataset: { action: c.action, ...(gone ? { skipped: "true" } : {}) } }, t(`change.${c.action}`, { block: blockName(c.block) }, lang), " ", h("span", { class: "change-text" }, text), gone ? h("span", { class: "change-gone" }, " ", note) : null);
}

function panelAdapt(ctx, on) {
  const { run, applied, lang } = ctx;
  const o = run.options.find((x) => x.issue === ctx.selectedIssue) || run.options[0];
  const i = run.issues.find((x) => x.id === o.issue);
  const kindOf = (x) => { const opt = run.options.find((y) => y.issue === x.id); return opt.chosen === "accept" ? "accept" : opt.list[opt.chosen].kind; };
  const cards = [...o.list.map((opt, k) => ({ key: k, opt, effect: o.effects[k] })), { key: "accept", opt: null, effect: o.effects[o.list.length] }];
  return [
    h("div", { class: "adapt" },
      h("div", { class: "adapt__top" },
        issueTabs(ctx, on, (x) => t(`choice.short.${kindOf(x)}`, null, lang)),
        h("p", { class: "options__legend", id: "options-legend" }, issueLabel(i)),
        applied ? h("p", { class: "options__done" }, t("p.adapt.applied", null, lang), " ", h("button", { type: "button", class: "vc-button vc-button--sm vc-button--secondary", on: { click: () => on.reopen() } }, icon("undo"), t("p.adapt.change", null, lang))) : null),
      h("fieldset", { class: "options", disabled: applied, "aria-labelledby": "options-legend" },
        h("div", { class: "options__cards", dataset: { options: String(o.list.length) } }, cards.map(({ key, opt, effect }) => {
          const chosen = o.chosen === key;
          const kind = opt ? opt.kind : "accept";
          return h("label", { class: "option", dataset: { kind, chosen: chosen ? "true" : null } },
            h("input", { type: "radio", class: "option__radio", name: `opt-${o.issue}`, checked: chosen, on: { change: () => on.decide(o.issue, key) } }),
            h("span", { class: "option__head" },
              h("span", { class: "option__kind" }, t(KIND_WORD[kind], null, lang)),
              opt ? h("span", { class: "option__meta" }, `${t(`effort.${opt.effort}`, null, lang)} · ${t(`time.${opt.time_to_impact}`, null, lang)}`) : null,
              opt?.recommended ? h("span", { class: "vc-tag vc-tag--sm vc-tag--feature" }, icon("sparkle"), t("p.adapt.recommended", null, lang)) : null),
            h("span", { class: "option__title" }, opt ? opt.title : t("p.adapt.acceptTitle", null, lang)),
            opt ? h("ul", { class: "option__changes" }, opt.changes.map((c) => changeLine(c, ctx))) : null,
            h("span", { class: "option__effect" }, effectWords(effect, lang)));
        }))))
  ];
}

/** The first step of each chosen response, in the issues' order, with its owner and time. */
export function firstSteps(ctx) {
  const { run, lang } = ctx;
  return run.options.filter((o) => o.chosen !== "accept").map((o) => {
    const opt = o.list[o.chosen];
    return h("li", {}, opt.first_step, h("span", { class: "step-meta" }, ` ${opt.owner} · ${t(`time.${opt.time_to_impact}`, null, lang)}`));
  });
}

function panelSummary(ctx, on) {
  const { sc, run, lang } = ctx;
  const s = sc.answers.summary;
  const steps = firstSteps(ctx);
  const col = (title, ...body) => h("section", { class: "summary__col" }, h("h2", { class: "panel-title" }, title), body);
  return [
    h("div", { class: "summary" },
      col(t("p.summary.findings", null, lang), h("ol", {}, s.findings.map((f) => h("li", {}, writerText(f, run, ctx.live?.lang || lang))))),
      col(t("p.summary.recommendation", null, lang), h("p", {}, writerText(s.recommendation, run, ctx.live?.lang || lang))),
      col(t("p.summary.assumptions", null, lang), h("ul", {}, s.assumptions.map((a) => h("li", {}, writerText(a, run, ctx.live?.lang || lang))))),
      col(t("p.summary.next", null, lang),
        steps.length ? h("ul", { class: "first-steps" }, steps) : h("p", {}, t("p.summary.noSteps", null, lang)),
        steps.length ? h("button", { type: "button", class: "block-more summary-more", id: "summary-more", hidden: true, on: { click: () => on.steps?.() } }) : null))
  ];
}

/**
 * Shows as many first steps as the summary has room for, in the issues' order, then "+2 more", which
 * opens them all. Run after the panel is in the page and on every resize.
 */
export function fitSummary(panel) {
  const list = panel.querySelector(".first-steps");
  const more = panel.querySelector(".summary-more");
  if (!list || !more) return;
  const items = [...list.children];
  for (const li of items) li.hidden = false;
  more.hidden = true;
  const limit = () => panel.getBoundingClientRect().bottom - parseFloat(getComputedStyle(panel).paddingBottom || "0");
  const overflows = () => Math.max(items.findLast((li) => !li.hidden)?.getBoundingClientRect().bottom || 0, more.hidden ? 0 : more.getBoundingClientRect().bottom) > limit() + 1;
  if (!overflows()) return;
  more.hidden = false;
  let shown = items.length;
  const label = () => { const n = items.length - shown; more.replaceChildren(`+${n}`, h("span", { class: "tag-long" }, " ", tn("block.more", n, {}))); };
  label();
  while (shown > 1 && overflows()) {
    items[--shown].hidden = true;
    label();
  }
  more.setAttribute("aria-label", t("p.summary.moreLabel", { n: items.length }));
}

/** The panel of a step. on: { scenario, toggleItem, issue, decide, reopen }. */
export function renderPanel(el, ctx, on) {
  const { step } = ctx;
  const parts = step === STEP.start ? panelStart(ctx, on)
    : step === STEP.complete ? panelComplete(ctx)
      : step === STEP.challenge ? panelChallenge(ctx, on)
        : step === STEP.assess ? panelAssess(ctx, on)
          : step === STEP.adapt ? panelAdapt(ctx, on)
            : panelSummary(ctx, on);
  el.replaceChildren(...parts);
  el.dataset.step = String(step);
}

// ---- the bar under the story --------------------------------------------------------------------------

/**
 * The bar right under the story: where the person acts, Vici's merlot callout says "Your turn" and holds
 * the one primary action with vc-attention; elsewhere it says when Play moves on and holds Next, named
 * for where it leads. on.bar(action) runs the action.
 */
export function renderBar(el, ctx, on) {
  const words = barWords(ctx);
  const button = h("button", { type: "button", class: ["vc-button", "cta", words.kind === "turn" ? "vc-attention" : ""], id: "btn-cta", on: { click: () => on.bar(words.action) } }, words.label, icon(words.action === "restart" ? "refresh" : "chevron-right"));
  if (words.kind === "turn") {
    el.replaceChildren(h("div", { class: "vc-callout turn turn-bar", role: "status" },
      h("span", { class: "vc-callout__cell", "aria-hidden": "true" }, icon("hand")),
      h("div", { class: "vc-callout__body" }, h("p", { class: "vc-callout__title" }, words.heading), h("p", { class: "turn-text" }, words.text)),
      button));
  } else {
    el.replaceChildren(h("div", { class: "story-foot" },
      h("p", { class: "foot-note", id: "foot-note" }, words.kind === "end" ? words.text : ""),
      button));
  }
  el.dataset.kind = words.kind;
}
