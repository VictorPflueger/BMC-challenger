// The presenter: the six steps, Back and Next, Play, the key figures and the bar under the story, for
// the simulation and the live run alike. A run goes as far as it can and waits only where the person
// acts: at Start (start the agents), at Complete (keep, edit or remove the AI's items, then challenge the
// canvas) and at Adapt (one response per issue, then apply). Play walks the simulation's steps by
// itself, each for as long as its title and lead take to read (7 to 14 seconds), and stops wherever the
// person acts; Space plays or pauses, and a step chosen by click, arrow key, clicker (PageDown and
// PageUp) or link pauses it. The address follows the simulation (?scenario=s1&step=4), and a link to a
// later step plays the run up to it with the recorded choices. A live run puts nothing in the address.
// Adapted from the Data Quality Agent 2.2.0's presenter.
//
// Everything a step shows comes from js/run.js (the run model), js/story.js (its words) and js/view.js
// (its drawing); a live run fills the same model from the agents' answers (js/live.js) and adds its own
// screens (js/live_view.js, js/live_dialog.js). Nothing here computes a figure. The person's choices live
// in memory only (this module and js/session.js) and are gone when the tab closes (brief 5.9).

import { getLang, setLang, onLang, t } from "./i18n/index.js";
import { SCENARIOS, scenarioById } from "../data/scenarios/index.js";
import { STEPS, STEP, localise, buildRun, recordedChoices } from "./run.js";
import { stepWords, staleWords, tileWords } from "./story.js";
import { renderCanvas, fitCanvas, renderPanel, renderBar, renderBlock, fitSummary, firstSteps } from "./view.js";
import { h, icon } from "./dom.js";
import { renderKpis } from "./kpis.js";
import { estimateRun } from "./estimate.js";
import { SIM, presetById } from "./config.js";
import { fmtMoney, fmtPartMoney, fmtPressure } from "./format.js";
import { session, onSessionChange, updateSession, setForm, setBlock, resetRun, clearEverything, installLeaveWarning, markDownloaded, hasUnsavedResult, dropResult } from "./session.js";
import * as live from "./live.js";
import { setupLiveDialog } from "./live_dialog.js";
import { panelLiveStart, panelNotRun, liveBar, liveWords, renderBlockEdit, enteredFields } from "./live_view.js";
import { createReportView } from "./report_view.js";
import { stopNotice } from "./report.js";

const $ = (id) => document.getElementById(id);

export async function start() {
  const els = {
    title: $("step-title"), lead: $("step-lead"), stale: $("stale"), canvas: $("canvas"), panel: $("panel"), bar: $("bar"),
    steps: $("steps"), play: $("play"), playText: $("play-text"), back: $("btn-back"), next: $("btn-next"), announce: $("announce"),
    dialog: $("block-dialog"), dialogTitle: $("block-dialog-title"), dialogBody: $("block-dialog-body"),
    stepsDialog: $("steps-dialog"), stepsBody: $("steps-dialog-body"), live: $("live"), liveText: $("live-text"),
    mode: $("mode-tag"), modeText: $("mode-text"), fictional: document.querySelector(".fictional")
  };
  // Where the canvas is tight (1280 × 720, 1366 × 768): Vici's compact framework view. Up to 960 px high
  // (1600 × 900 too) the Summary's first steps are no taller than the Writer's columns, so the canvas keeps
  // its room; the rest open from "+2 more".
  const tight = matchMedia("(max-height: 820px) and (min-width: 961px)");
  const short = matchMedia("(max-height: 960px) and (min-width: 961px)");
  const params = new URLSearchParams(location.search);
  const state = {
    scenarioId: scenarioById(params.get("scenario")) ? params.get("scenario") : SIM.defaultScenario,
    step: 0,
    reached: 0, // the simulation: 0 nothing run; 1 waits for the review; 4 waits for the decision; 5 applied
    removed: new Set(),
    decisions: new Map(),
    applied: false,
    selectedIssue: "I1",
    openBlock: null
  };
  /** Play: on, the frame asked for, the time spent reading the step, the step it timed, the last frame. */
  const P = { on: false, raf: 0, at: 0, step: -1, last: 0 };
  const isLive = () => session().mode === "live";
  const run = () => session().run;
  /** How far the run has come and whether the decision is applied, for either producer. */
  const reachedNow = () => (isLive() ? run().reached : state.reached);
  const appliedNow = () => (isLive() ? run().applied : state.applied);

  // ---- the run as it stands ------------------------------------------------------------------------------
  const cache = new Map();
  const local = (id, lang) => {
    const key = `${id}|${lang}`;
    if (!cache.has(key)) cache.set(key, localise(scenarioById(id), lang));
    return cache.get(key);
  };
  const estimates = new Map();
  const estimateOf = (sc, r) => {
    if (!estimates.has(sc.id)) estimates.set(sc.id, estimateRun(sc, r));
    return estimates.get(sc.id);
  };
  /** Before a live run: what it would cost on a setting, for the person's own company and canvas. */
  function liveEstimate(presetId, research) {
    const ref = local(SIM.defaultScenario, getLang());
    const sc = { ...ref, company: { ...ref.company, ...live.liveScenario().company }, entered: session().entered };
    return estimateRun(sc, buildRun(sc), presetId, { research });
  }
  function context() {
    const lang = getLang();
    if (isLive()) {
      const s = session();
      const r = s.run;
      return {
        sc: live.liveScenario(), run: live.liveRun(), lang,
        step: state.step, reached: r.reached, applied: r.applied, selectedIssue: state.selectedIssue, scenarios: [], estimate: null,
        live: {
          status: r.status, agent: r.agent, seconds: Math.max(0, Math.round((Date.now() - r.startedAt) / 1000)), stopped: r.stopped,
          started: r.status !== "idle", form: s.form, entered: s.entered, lang: r.lang, cost: r.cost, capEur: r.settings?.capEur,
          unchecked: r.unchecked, edits: r.edits, sample: local(state.scenarioId, lang).company.name, research: r.research
        }
      };
    }
    const sc = local(state.scenarioId, lang);
    const r = buildRun(sc, { removed: state.removed, decisions: state.decisions });
    return {
      sc, run: r, lang,
      step: state.step, reached: state.reached, applied: state.applied, selectedIssue: state.selectedIssue,
      scenarios: SCENARIOS.map((s) => local(s.id, lang)),
      estimate: estimateOf(sc, r)
    };
  }

  // ---- what the person does ------------------------------------------------------------------------------
  const on = {
    scenario: (id) => { if (id !== state.scenarioId) { state.scenarioId = id; reset(); } },
    toggleItem: (id) => {
      if (isLive()) {
        if (run().status !== "review") return;
        const removed = run().removed;
        if (removed.has(id)) removed.delete(id); else removed.add(id);
        render();
        return;
      }
      if (state.reached > STEP.complete) return;
      if (state.removed.has(id)) state.removed.delete(id); else state.removed.add(id);
      render();
    },
    edit: (id, text) => { if (isLive() && run().status === "review") { const v = text.trim(); if (v) run().edits.set(id, v); else run().edits.delete(id); render(); } },
    issue: (id) => { state.selectedIssue = id; render(); },
    decide: (issue, choice) => {
      if (isLive()) { if (run().status === "decision") { run().decisions.set(issue, choice); render(); } return; }
      if (!state.applied) { state.decisions.set(issue, choice); render(); }
    },
    reopen: () => {
      if (isLive()) return;
      state.applied = false; state.reached = STEP.adapt; render(); armAttention();
    },
    steps: () => { drawStepsDialog(); els.stepsDialog.showModal(); },
    form: (key, value) => {
      setForm({ [key]: value }, { quiet: true });
      // The missing-name note goes as soon as there is a name.
      if (key === "name" && value.trim()) { const err = $("live-name-error"); if (err && !err.hidden) { err.hidden = true; $("live-name").removeAttribute("aria-invalid"); } }
    },
    items: (block, texts, redraw = false, focus = -1) => {
      setBlock(block, texts);
      if (redraw) { renderBlockEdit(els.dialogBody, els.dialogTitle, block, context(), on); if (focus >= 0) $(`edit-${block}-${focus}`)?.focus(); }
    },
    sample: () => {
      const sc = local(state.scenarioId, getLang());
      setForm({ name: sc.company.name, sector: sc.company.sector, country: t(`country.${sc.company.country}`), description: sc.company.description });
      for (const [b, items] of Object.entries(sc.entered.blocks)) setBlock(b, items.map((it) => it.text));
      render();
    },
    // An agent at work is stopped first: its answer would belong to a run that no longer exists.
    clear: () => discard("clear", () => { live.abort(); clearEverything(); state.step = 0; render(); }),
    bar: (action) => {
      if (isLive()) return liveAction(action);
      if (action === "start") { begin(STEP.complete); play(); }
      else if (action === "challenge") { state.reached = STEP.adapt; go(STEP.challenge, { keep: true }); }
      else if (action === "apply") { state.applied = true; state.reached = STEP.summary; render(); announce(stepWords(context()).title); }
      else if (action === "restart") { pause(); reset(); go(STEP.start); }
      else if (action === "report") report.open();
      else go(state.step + 1, { keep: true });
    }
  };

  // ---- the live run --------------------------------------------------------------------------------------
  const dialog = setupLiveDialog({
    estimate: liveEstimate,
    fields: () => enteredFields(session().form, session().entered, getLang()),
    onStart: (settings) => { state.step = STEP.start; live.start(settings); }
  });
  function liveAction(action) {
    if (action === "agents") {
      if (!session().form.name.trim()) {
        const err = $("live-name-error");
        if (err) { err.hidden = false; $("live-name").setAttribute("aria-invalid", "true"); $("live-name").focus(); }
        return;
      }
      dialog.open();
    } else if (action === "challenge") live.challenge();
    else if (action === "apply") { live.apply(); announce(t("live.agent.writer")); }
    else if (action === "abort") live.abort();
    else if (action === "again") discard("again", () => { dropResult(); resetRun(); go(STEP.start); });
    else if (action === "simulation") setMode("simulation");
    else if (action === "report") report.open();
    else go(state.step + 1);
  }

  // ---- throwing a live result away -----------------------------------------------------------------------
  // Start again and Clear everything drop a live run the person paid for. While its result isn't downloaded
  // they ask first, in Vici's destructive confirmation with the safe choice focused; once it is, they don't.
  const discardDialog = $("discard-dialog");
  let discarding = null;
  function discard(kind, done) {
    if (!hasUnsavedResult()) { done(); return; }
    discarding = done;
    $("discard-title").textContent = t(`discard.${kind}`);
    $("discard-go").textContent = t(kind === "clear" ? "live.clear" : "live.again");
    discardDialog.returnValue = "";
    discardDialog.showModal();
  }
  discardDialog.addEventListener("close", () => {
    const done = discarding;
    discarding = null;
    if (discardDialog.returnValue === "discard" && done) done();
  });

  // ---- the report ----------------------------------------------------------------------------------------
  /**
   * Where the bar offers the report: a simulation's Summary after the decision, a live run's Summary once
   * the Writer is done, and a stopped live run that finished a step, wherever its stop shows.
   */
  function reportOnOffer() {
    if (!isLive()) return state.applied && state.step === STEP.summary;
    const r = run();
    if (r.status === "done") return state.step === STEP.summary;
    return r.status === "stopped" && r.reached >= STEP.complete && state.step >= r.reached;
  }
  /** The report's context (js/report.js): a scenario's in the page's language, a live run's in its own. */
  function reportContext() {
    if (!reportOnOffer()) return null;
    const ctx = context();
    const ai = Object.values(ctx.run.completed.blocks).flat().filter((it) => it.source === "ai").length;
    if (!isLive()) return { sc: ctx.sc, run: ctx.run, lang: ctx.lang, mode: "simulation", applied: true, tiles: tileWords(ctx), created: new Date(), removed: { n: ctx.run.removed.size, of: ai }, live: null, notice: "" };
    const r = run();
    const lang = r.lang;
    const live = { model: presetById(r.settings.preset).model, preset: r.settings.preset, research: !!r.settings.research, capEur: r.settings.capEur, reached: r.reached, stopped: r.stopped, researchState: r.research, unchecked: r.unchecked };
    return { sc: ctx.sc, run: ctx.run, lang, mode: "live", applied: r.applied, tiles: tileWords({ ...ctx, lang }), created: new Date(), removed: { n: ctx.run.removed.size, of: ai }, live, notice: stopNotice(live, lang) };
  }
  // A download is a kept result: the browser's warning before the tab closes stands down until it changes.
  const report = createReportView({ dialog: $("report-dialog"), title: $("report-dialog-title"), body: $("report-body"), tools: $("report-tools"), context: reportContext, announce: (text) => announce(text), onSaved: markDownloaded });
  // Each mode comes back where it was left: the simulation at the step the presenter was on, a live run
  // at the step its agents have reached (front, which the session listener below moves on).
  let simStep = 0;
  let front = 0;
  let pending = 0;
  /** Simulation or live: the tape, the button that switches, and what only the simulation shows. */
  function setMode(mode) {
    pause();
    if (!isLive()) simStep = state.step;
    updateSession({ mode });
    if (mode === "live") { front = run().reached; state.step = Math.min(front, STEP.summary); } else state.step = simStep;
    drawMode();
    syncUrl();
    render();
    els.title.focus({ preventScroll: true });
  }
  function drawMode() {
    const lv = isLive();
    els.mode.dataset.mode = lv ? "live" : "simulation";
    els.modeText.textContent = t(lv ? "p.mode.live" : "p.mode.simulation");
    $("tip-mode").textContent = t(lv ? "p.mode.tip.live" : "p.mode.tip");
    els.liveText.textContent = t(lv ? "p.live.back" : "p.live");
    els.play.hidden = lv;
    document.body.dataset.mode = lv ? "live" : "simulation";
  }
  els.live.addEventListener("click", () => setMode(isLive() ? "simulation" : "live"));
  // The screen follows the agents: when a step's answer arrives and the person was at the front of the
  // run, the new step shows.
  onSessionChange(() => {
    if (!isLive()) return;
    const r = run();
    if (r.reached > front) {
      if (state.step >= front) { state.step = r.reached; requestAnimationFrame(() => els.title.focus({ preventScroll: true })); }
      front = r.reached;
    }
    if (r.reached < front) front = r.reached;
    if (!pending) pending = requestAnimationFrame(() => { pending = 0; syncUrl(); render(); });
  });
  setInterval(() => {
    if (!isLive() || run().status !== "working") return;
    const el = $("live-seconds");
    if (el) el.textContent = t("live.seconds", { s: Math.max(0, Math.round((Date.now() - run().startedAt) / 1000)) });
  }, 1000);
  installLeaveWarning();

  /** Starts the run of the chosen company: the agents complete the canvas and wait for the review. */
  function begin(to = STEP.complete) {
    state.removed = new Set();
    state.decisions = new Map();
    state.applied = false;
    state.reached = STEP.complete;
    state.selectedIssue = "I1";
    // A link to a later step plays the run up to it with the recorded choices.
    if (to > STEP.complete) {
      const rec = recordedChoices(local(state.scenarioId, getLang()));
      state.removed = rec.removed;
      state.reached = STEP.adapt;
      if (to >= STEP.summary) { state.decisions = rec.decisions; state.applied = true; state.reached = STEP.summary; }
    }
    go(Math.min(to, state.reached), { keep: true });
  }

  /** Back to the first screen of the chosen company, nothing run. */
  function reset() {
    state.step = 0;
    state.reached = 0;
    state.removed = new Set();
    state.decisions = new Map();
    state.applied = false;
    state.selectedIssue = "I1";
    syncUrl();
    render();
  }

  // ---- drawing -------------------------------------------------------------------------------------------
  const keyOf = (el) => {
    if (!el || !els.canvas.closest("body").contains(el)) return null;
    if (el.id) return `#${el.id}`;
    const row = el.closest("[data-item]")?.dataset.item;
    if (el.classList.contains("item-toggle")) return `toggle:${el.closest("dialog") ? "d" : "c"}:${row}`;
    if (el.classList.contains("item-open")) return `item:${row}`;
    if (el.dataset.issue) return `issue:${el.dataset.issue}`;
    if (el.dataset.scenario) return `company:${el.dataset.scenario}`;
    if (el.classList.contains("block-more")) return `more:${el.dataset.open}`;
    if (el.classList.contains("option__radio")) return `radio:${el.name}:${[...document.getElementsByName(el.name)].indexOf(el)}`;
    return null;
  };
  const findKey = (key) => {
    if (!key) return null;
    if (key.startsWith("#")) return document.getElementById(key.slice(1));
    const [kind, a, b] = key.split(":");
    if (kind === "toggle") return document.querySelector(`${a === "d" ? "#block-dialog" : "#canvas"} [data-item="${b}"] .item-toggle`);
    if (kind === "item") return document.querySelector(`#canvas [data-item="${a}"] .item-open`);
    if (kind === "issue") return document.querySelector(`.issue-pick[data-issue="${a}"]`);
    if (kind === "company") return document.querySelector(`.company[data-scenario="${a}"]`);
    if (kind === "more") return document.querySelector(`.block-more[data-open="${a}"]`);
    if (kind === "radio") return document.getElementsByName(a)[Number(b)] || null;
    return null;
  };

  let words = { title: "", lead: "" };
  function render() {
    const ctx = context();
    const focus = keyOf(document.activeElement);
    const lv = !!ctx.live;
    // A live step the run never reached (it stopped first) and the live Start have their own words.
    const own = lv && (ctx.step === STEP.start || ctx.step > ctx.reached);
    words = own ? liveWords(ctx) : stepWords(ctx);
    els.title.textContent = words.title;
    els.lead.textContent = words.lead;
    document.body.dataset.step = STEPS[state.step];
    renderCanvas(els.canvas, ctx, on);
    if (lv && ctx.step === STEP.start) els.panel.replaceChildren(...panelLiveStart(ctx, on).filter(Boolean));
    else if (lv && ctx.step > ctx.reached) els.panel.replaceChildren(...panelNotRun(ctx).filter(Boolean));
    else renderPanel(els.panel, ctx, on);
    if (lv) livePanelNotes(ctx);
    const bar = lv ? liveBar(ctx, on) : null;
    if (bar) { els.bar.replaceChildren(bar.el); els.bar.dataset.kind = bar.kind; } else renderBar(els.bar, ctx, on);
    if (lv && !bar && ctx.step === STEP.adapt && ctx.live.status === "decision") els.bar.querySelector(".turn-bar")?.insertBefore(h("span", { class: "vc-tag vc-tag--feature ai-notice" }, icon("sparkle"), t("p.ai")), $("btn-cta"));
    renderKpis(ctx);
    const old = !lv && (Date.now() - new Date(`${ctx.sc.as_of}T12:00:00`).getTime()) / 86400000 > SIM.staleDays;
    els.stale.hidden = !old;
    els.stale.querySelector(".stale-text").textContent = lv ? "" : staleWords(ctx.sc, ctx.lang);
    els.fictional.hidden = lv;
    renderSteps();
    drawPlay();
    fitSummary(els.panel, short.matches);
    fitCanvas(els.canvas);
    if (els.stepsDialog.open) drawStepsDialog();
    // A block being entered redraws itself when a line comes or goes; redrawn from here as well, it
    // would replace the field under the person's fingers while they type.
    const entering = lv && ctx.step === STEP.start && ctx.live.status === "idle";
    if (state.openBlock && els.dialog.open && !entering) openBlock(state.openBlock, ctx);
    const target = findKey(focus);
    if (target && !target.disabled) target.focus({ preventScroll: true });
    fill(P.on && !waits() ? P.at / readMs() : 0);
    drawFoot();
  }
  /** In a live run: texts the fact audit refused twice, and the language the run wrote in. */
  function livePanelNotes(ctx) {
    const notes = [];
    const unchecked = ctx.live.unchecked.filter((u) => u.step === ctx.step);
    if (unchecked.length) notes.push(h("p", { class: "panel-note unchecked" }, h("span", { class: "vc-tag vc-tag--sm vc-tag--warning" }, t("live.unchecked")), " ", t("live.unchecked.text", { where: unchecked.map((u) => u.where).join(", ") })));
    if (ctx.live.started && ctx.live.lang !== ctx.lang) notes.push(h("p", { class: "panel-note" }, t("live.lang.kept", { lang: t(`lang.${ctx.live.lang}`) })));
    if (ctx.step === STEP.challenge && ctx.live.research.disabled) notes.push(h("p", { class: "panel-note" }, t("live.research.off")));
    if (notes.length) els.panel.prepend(...notes);
  }
  new ResizeObserver(() => fitCanvas(els.canvas)).observe(els.canvas);
  const refit = () => { fitSummary(els.panel, short.matches); fitCanvas(els.canvas); };
  window.addEventListener("resize", refit);
  document.fonts?.ready.then(refit);
  // Where the canvas is tight, Vici's compact framework view shows each item's first line.
  const compact = () => els.canvas.classList.toggle("vc-framework--compact", tight.matches);
  tight.addEventListener("change", () => { compact(); refit(); });
  short.addEventListener("change", refit);
  compact();
  /** Every first step of the chosen responses, in the dialog the summary's "+2 more" opens. */
  function drawStepsDialog() { els.stepsBody.replaceChildren(h("ul", { class: "first-steps" }, firstSteps(context()))); }

  // ---- the step bar --------------------------------------------------------------------------------------
  const items = [...els.steps.querySelectorAll(".vc-step")];
  items.forEach((li, n) => {
    const b = li.querySelector(".vc-step__button");
    if (!li.querySelector(".vc-step__hint")) b.querySelector(".vc-step__label").append(Object.assign(document.createElement("span"), { className: "vc-step__hint" }));
    b.addEventListener("click", () => go(n));
  });
  /** The furthest step the presenter may show: a stopped live run shows its Summary of what is done. */
  const maxStep = () => (isLive() && run().status === "stopped" ? STEP.summary : reachedNow());

  function renderSteps() {
    const lv = isLive();
    const r = run();
    items.forEach((li, n) => {
      const b = li.querySelector(".vc-step__button");
      const current = n === state.step;
      li.classList.toggle("vc-step--current", current);
      li.classList.toggle("vc-step--done", n < state.step);
      if (current) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      const notRun = lv && r.status === "stopped" && n > r.reached;
      b.disabled = n > maxStep() || (notRun && n < STEP.summary);
      const turn = lv
        ? (n === STEP.start && r.status === "idle") || (n === STEP.complete && r.status === "review") || (n === STEP.summary && r.status === "done") ? "turn" : n === STEP.adapt && r.status === "decision" ? "decision" : ""
        : (n === STEP.start && state.reached === 0) || (n === STEP.complete && state.reached === STEP.complete) || (n === STEP.summary && state.applied) ? "turn" : n === STEP.adapt && state.reached >= STEP.adapt && !state.applied ? "decision" : "";
      li.dataset.turn = turn ? "yours" : "";
      li.dataset.notRun = notRun ? "true" : "";
      li.querySelector(".vc-step__hint").textContent = turn ? t(turn === "decision" ? "turn.decision" : "turn.title") : notRun ? t("live.notrun") : lv && r.status === "working" && n === r.reached + 1 ? t("live.working") : "";
    });
    els.back.disabled = state.step === 0;
    els.next.disabled = state.step >= maxStep() && !(!lv && state.step === STEP.start && state.reached === 0);
    els.next.title = state.step === STEP.adapt && !appliedNow() ? t("p.next.decide") : "";
  }

  // ---- Play (the simulation) -----------------------------------------------------------------------------
  /** The step waits for the person: Start before the run, the review at Complete, the decision at Adapt. */
  function waits() {
    if (isLive()) return true;
    if (state.step === STEP.start && state.reached === 0) return true;
    if (state.step === STEP.complete && state.reached === STEP.complete) return true;
    if (state.step === STEP.adapt && !state.applied) return true;
    return false;
  }
  /** The story is over: the summary is on screen and nothing is left for the person to do. */
  const finished = () => appliedNow() && state.step === STEP.summary;
  /** A dialog covers the page: Play holds its time until it closes. */
  const covered = () => !!document.querySelector("dialog[open]");
  /** How long Play stays on a step: the time to read its title and lead, 7 to 14 seconds. */
  function readMs() {
    const n = `${words.title} ${words.lead}`.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    return Math.min(SIM.playMaxMs, Math.max(SIM.playMinMs, SIM.playBaseMs + SIM.playPerWordMs * n));
  }

  function play() {
    if (isLive()) return;
    if (state.reached === 0) { begin(STEP.complete); }
    else if (finished()) { begin(STEP.complete); }
    P.on = true;
    P.last = 0;
    calm();
    drawPlay();
    render();
    if (!P.raf) P.raf = requestAnimationFrame(frame);
  }
  function pause() {
    if (!P.on) return;
    P.on = false;
    cancelAnimationFrame(P.raf);
    P.raf = 0;
    drawPlay();
    fill(0);
    drawFoot();
    armAttention();
  }
  function frame(now) {
    P.raf = 0;
    if (!P.on) return;
    const dt = P.last ? Math.min(now - P.last, 100) : 0;
    P.last = now;
    if (P.step !== state.step) Object.assign(P, { step: state.step, at: 0 });
    const total = readMs();
    if (waits()) P.at = 0;
    else if (finished()) { pause(); return; }
    else if (state.step < maxStep() && !covered()) {
      P.at += dt;
      if (P.at >= total) { go(state.step + 1, { keep: true }); P.raf = requestAnimationFrame(frame); return; }
    }
    fill(waits() ? 0 : P.at / total);
    drawFoot(total);
    P.raf = requestAnimationFrame(frame);
  }
  /** How far the step is read: the rail to the next step and the bar along the action fill with it. */
  function fill(p) {
    const v = Math.max(0, Math.min(1, p)).toFixed(4);
    items.forEach((li, n) => li.style.setProperty("--vc-step-fill", n === state.step ? v : "0"));
    $("btn-cta")?.style.setProperty("--fill", v);
  }
  /** Play, Pause or Replay on the one button before the steps. */
  function drawPlay() {
    const st = P.on ? "pause" : finished() ? "replay" : "play";
    els.play.dataset.state = st;
    els.play.querySelector(".vc-icon").className = `vc-icon vc-icon--${st === "pause" ? "pause" : st === "replay" ? "refresh" : "play"}`;
    els.playText.textContent = t(`p.play.${st}`);
  }
  /** Beside the action, in words: when Play moves on, or that the move is the person's. */
  function drawFoot(total = readMs()) {
    const note = $("foot-note");
    if (!note || els.bar.dataset.kind !== "next") return;
    const text = P.on ? (state.step < maxStep() && !waits() ? t("foot.plays", { s: Math.max(1, Math.ceil((total - P.at) / 1000)) }) : "") : t("foot.move");
    if (note.textContent !== text) note.textContent = text;
    note.dataset.tone = P.on ? "" : "move";
  }
  // Paused, the action draws the eye (Vici's vc-attention) after six seconds without a click, a key or a
  // scroll. Where the page waits for the person, the action carries vc-attention from the start.
  let quiet = 0;
  function calm() {
    const cta = $("btn-cta");
    if (cta?.classList.contains("vc-attention-late")) cta.classList.remove("vc-attention", "vc-attention-late");
  }
  function armAttention() {
    clearTimeout(quiet);
    calm();
    quiet = setTimeout(() => {
      const cta = $("btn-cta");
      if (P.on || !cta || covered() || cta.classList.contains("vc-attention")) return;
      cta.classList.add("vc-attention", "vc-attention-late");
    }, 6000);
  }
  for (const type of ["pointerdown", "keydown", "wheel"]) document.addEventListener(type, () => { if (!P.on) armAttention(); }, { capture: true, passive: true });
  els.play.addEventListener("click", () => (P.on ? pause() : play()));

  // ---- moving between steps ------------------------------------------------------------------------------
  /** Says a change that keeps the focus where it is, such as the title after the decision is applied. */
  function announce(text) { els.announce.textContent = text; }
  /**
   * Shows step n. A step chosen by the presenter pauses Play; keep: Next and Play go on playing. Every
   * step change moves the focus to the step's title, so a screen reader reads it (Vici, Presenting step
   * by step); Play's own moves too.
   */
  function go(n, { focus = true, keep = false } = {}) {
    if (!keep) pause();
    if (!isLive() && state.reached === 0 && n > 0) { begin(STEP.complete); return; }
    // A stopped live run skips the steps it never ran: from its last step done straight to its Summary.
    if (isLive() && run().status === "stopped" && n > run().reached && n < STEP.summary) n = n > state.step ? STEP.summary : run().reached;
    state.step = Math.max(0, Math.min(maxStep(), n));
    if (P.step !== state.step) Object.assign(P, { step: state.step, at: 0 });
    syncUrl();
    render();
    if (!P.on) armAttention();
    if (focus) els.title.focus({ preventScroll: true });
  }
  els.back.addEventListener("click", () => go(state.step - 1));
  els.next.addEventListener("click", () => go(state.step + 1, { keep: true }));
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || covered()) return;
    const target = e.target;
    if (target?.closest?.("input, textarea, select, [contenteditable]")) return;
    if (e.key === " ") {
      if (target?.closest?.("button, a, summary, label, [role=button], [role=radio]") || isLive()) return;
      e.preventDefault();
      if (!e.repeat) (P.on ? pause() : play());
      return;
    }
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(state.step + 1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(state.step - 1); }
  });

  /** The address follows the simulation: ?scenario=s1&step=4. A live run keeps it bare. */
  function syncUrl() {
    const u = new URL(location.href);
    if (isLive()) { u.searchParams.delete("scenario"); u.searchParams.delete("step"); }
    else {
      u.searchParams.set("scenario", state.scenarioId);
      if (state.step > 0) u.searchParams.set("step", String(state.step)); else u.searchParams.delete("step");
    }
    if (u.searchParams.has("lang")) u.searchParams.set("lang", getLang());
    if (u.href !== location.href) history.replaceState(null, "", u);
  }

  // ---- the block, opened ---------------------------------------------------------------------------------
  /** Before a live run the block's dialog edits its items; otherwise it shows them in full. */
  function openBlock(id, ctx = context()) {
    if (ctx.live && ctx.step === STEP.start && ctx.live.status === "idle") renderBlockEdit(els.dialogBody, els.dialogTitle, id, ctx, on);
    else renderBlock(els.dialogBody, els.dialogTitle, id, ctx, on);
  }
  els.canvas.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (e.target.closest(".item-toggle")) return;
    if (!opener) return;
    state.openBlock = opener.dataset.open;
    openBlock(state.openBlock);
    els.dialog.showModal();
  });
  els.dialog.addEventListener("close", () => {
    const b = state.openBlock;
    state.openBlock = null;
    // Empty lines go when the block closes.
    if (b && isLive() && run().status === "idle") { setBlock(b, (session().entered.blocks[b] || []).map((it) => it.text.trim()).filter(Boolean)); render(); }
  });

  // ---- the guide, the language and the figures of the talk track -------------------------------------
  for (const g of document.querySelectorAll("dialog.vc-guide")) {
    g.addEventListener("vc:guideclose", (e) => { if (e.detail?.returnValue === "done" && !isLive() && state.reached > 0 && !finished()) play(); });
  }
  /** The talk track's figures: the first scenario's recorded run, as its tiles show it. */
  function fillGuide() {
    for (const lang of ["en", "de"]) {
      const sc = local(SIM.defaultScenario, lang);
      const r = buildRun(sc, recordedChoices(sc));
      const ai = Object.values(r.completed.blocks).flat().filter((it) => it.source === "ai").length;
      const figs = {
        "lead.stake": fmtPartMoney(r.before.atStake, r.before.priced, r.before.count, lang),
        "lead.pressure": fmtPressure(r.before.pressure.before, r.before.pressure.of, lang),
        "lead.left": fmtPartMoney(r.after.left, r.after.priced, r.after.count, lang),
        "lead.pressureAfter": fmtPressure(r.after.pressure.after, r.after.pressure.of, lang),
        "lead.upside": fmtMoney(r.after.upside, lang),
        "lead.i1": fmtMoney(r.before.issues[0].before.expected, lang),
        "lead.ai": String(ai),
        "lead.issues": String(r.before.count),
        "lead.cost": `≈ ${new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(estimateOf(sc, r).eur)}`
      };
      for (const el of document.querySelectorAll(`#guide-${lang} [data-fig]`)) if (Object.hasOwn(figs, el.dataset.fig)) el.textContent = figs[el.dataset.fig];
    }
  }

  const reflect = (lang) => {
    for (const b of document.querySelectorAll(".lang-option")) b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    for (const b of document.querySelectorAll(".guide-open")) b.hidden = b.getAttribute("lang") !== lang;
  };
  for (const b of document.querySelectorAll(".lang-option")) b.addEventListener("click", () => setLang(b.dataset.lang));
  onLang((lang) => { reflect(lang); drawMode(); syncUrl(); render(); report.refresh(); });
  reflect(getLang());
  fillGuide();

  // ---- start -------------------------------------------------------------------------------------------
  drawMode();
  const linked = Number(params.get("step"));
  if (Number.isInteger(linked) && linked >= 1 && linked <= STEPS.length - 1) begin(linked);
  else { syncUrl(); render(); }
  armAttention();
  // For the tests and the console: what the presenter holds, read-only. Never the key, never the inputs.
  window.BMC = Object.freeze({
    get state() { return { ...state, removed: [...state.removed], decisions: Object.fromEntries(state.decisions), mode: session().mode, live: { status: run().status, reached: run().reached, agent: run().agent, stopped: run().stopped ? { cause: run().stopped.cause, step: run().stopped.step } : null, cost: { usd: run().cost.usd, eur: run().cost.eur, requests: run().cost.requests }, repairs: run().repairs, research: { ...run().research }, unchecked: run().unchecked.length } }; },
    get playing() { return P.on; },
    readMs
  });
}
