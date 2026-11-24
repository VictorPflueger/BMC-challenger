// The live run (brief 5, PLAN.md §10): the six agents in turn on the person's own company and key, each
// answer checked before its step shows, waiting where the person acts. It fills js/session.js with the
// same shape the simulation's recordings have, so the presenter draws a live run with the code that
// draws a scenario (js/run.js buildRun). Abort stops at once and keeps every step done; a stop for the
// budget cap, a second failing answer or an API error does the same and says why.
//
//   start(settings)  the Completer, then the run waits for the review of the AI's items
//   challenge()      the Scout (when research is on), the Red team, the Analyst and the Strategist, then
//                    the run waits for the decision
//   apply()          the Writer, then the summary
//   abort()          stops the agent at work
//
// The agents write only to the run they started. Clear everything or a new run replaces the session's
// run; an answer that arrives for the old one is dropped, and its pipeline ends without a word.

import { session, updateRun, resetRun, markResult } from "./session.js";
import { getKey, redactSecrets } from "./keystore.js";
import { createCostTracker, normalizeUsage, usageCostUsd } from "./cost.js";
import { presetById, RUN, APP, KNOWLEDGE_CUTOFF } from "./config.js";
import { inputFor } from "./prompts.js";
import { runAgent, StopError } from "./pipeline.js";
import { runScout } from "./scout.js";
import * as G from "./guards.js";
import { STEP, buildRun } from "./run.js";
import { SECTORS } from "../data/kpis.js";
import { complete } from "./canvas.js";
import { causeOf } from "./api_messages.js";
import { fmtMoney } from "./format.js";
import { band } from "./risk.js";
import { scenarioById } from "../data/scenarios/index.js";

const AGENT_STEP = { completer: STEP.complete, scout: STEP.challenge, redteam: STEP.challenge, analyst: STEP.assess, strategist: STEP.adapt, writer: STEP.summary };
let controller = null;
let ledger = null;
let current = null;

/** Thrown when the run an agent works for is no longer the session's: its pipeline ends quietly. */
class Superseded extends Error {}

/** Writes to the run this module started, or ends its pipeline once that run was cleared or replaced. */
function put(patch) {
  if (session().run !== current) throw new Superseded();
  updateRun(patch);
}
const ours = () => session().run === current;

/** Today as YYYY-MM-DD, the date the Scout's sources were read. */
const today = () => new Date().toISOString().slice(0, 10);

/**
 * The live run in the shape of a localised scenario (js/run.js localise): the company and the canvas
 * the person entered, every answer so far with the person's edits to the AI's items, and no recorded
 * choices. One language: the run's.
 */
export function liveScenario() {
  const s = session();
  const r = s.run;
  const a = r.answers;
  const completion = a.completion ? { sector: a.completion.sector, items: a.completion.items.map((it) => ({ ...it })) } : { sector: s.form.sector || "general", items: [] };
  // An AI item the person edited keeps its place, its basis and its confidence, with the person's text.
  // complete() appends a block's AI items in the order of the answer, so the k-th item of a block in the
  // answer is the k-th AI item of that block on the canvas.
  if (a.completion && r.edits.size) {
    const done = complete(s.entered, a.completion);
    const seen = {};
    for (const it of completion.items) {
      const k = (seen[it.block] = (seen[it.block] ?? -1) + 1);
      const id = (done.blocks[it.block] || []).filter((x) => x.source === "ai")[k]?.id;
      if (id && r.edits.has(id)) { it.text = r.edits.get(id); it.edited = true; }
    }
  }
  return {
    id: "live",
    source: "live",
    as_of: today(),
    facts: [],
    // A run of a scenario's company, filled in from it and its name kept, is a run of a fictional company.
    company: { name: s.form.name.trim(), sector: completion.sector || s.form.sector || "general", country: s.form.country.trim(), description: s.form.description.trim(), fictional: !!s.sample && scenarioById(s.sample)?.company.name === s.form.name.trim() },
    entered: s.entered,
    answers: {
      completion,
      signals: (a.signals || []).map((x) => ({ ...x, read_on: x.read_on || today() })),
      issues: a.issues || [],
      impacts: a.impacts || { baselines: [], impacts: [] },
      responses: a.responses || [],
      summary: a.summary
    },
    choices: { removed: [], decisions: [] }
  };
}

/** The run as it stands, built like a scenario's. */
export function liveRun() {
  const r = session().run;
  return buildRun(liveScenario(), { removed: r.removed, decisions: r.decisions });
}

/** What the guards may take as evidence: the person's items and the Scout's sources. */
function evidence(sc) {
  return {
    titles: sc.answers.signals.map((x) => x.title),
    texts: [...Object.values(sc.entered.blocks).flat().map((it) => it.text), sc.company.name, sc.company.description, ...sc.answers.signals.map((x) => x.summary)],
    urls: sc.answers.signals.map((x) => x.url)
  };
}

/** The money, counts and requests of this run, and its two repairs. */
function newLedger(modelId) {
  const tracker = createCostTracker(modelId);
  let repairs = RUN.repairs;
  return {
    add(usage) { const snap = tracker.add(usage); put({ cost: snap }); return snap; },
    spentUsd: () => tracker.snapshot().usd,
    repairsLeft: () => repairs,
    useRepair() { repairs -= 1; put({ repairs: RUN.repairs - repairs }); }
  };
}

// One sentence in the console on what an agent did (brief 5.2), for the presenter; the screen never
// shows these.
const TAG = `[${APP.name}]`;

function context() {
  const r = session().run;
  return {
    key: getKey(),
    preset: presetById(r.settings.preset),
    capEur: r.settings.capEur,
    signal: controller.signal,
    ledger,
    onEvent: (e) => {
      if (e.type === "repair") console.info(TAG, `The ${e.agent}'s answer broke ${e.problems.length} rule(s) and went back once.`);
      if (e.type === "retry") console.info(TAG, `The API answered ${e.status || "nothing"}; trying again in ${(e.waitMs / 1000).toFixed(1)} s.`);
      if (e.type === "cut") console.info(TAG, `Near the budget cap: the ${e.agent} may write ${e.maxTokens} tokens at most.`);
      if (e.type === "answer") {
        const run = session().run;
        const was = run.usage[e.agent] || { requests: 0, input: 0, output: 0, searches: 0, usd: 0, seconds: 0 };
        const u = normalizeUsage(e.usage);
        put({
          seconds: { ...run.seconds, [e.agent]: Math.round(e.ms / 100) / 10 },
          usage: { ...run.usage, [e.agent]: { requests: was.requests + 1, input: was.input + u.input_tokens, output: was.output + u.output_tokens, searches: was.searches + u.web_search_requests, usd: was.usd + usageCostUsd(presetById(run.settings.preset).model, e.usage), seconds: Math.round((was.seconds + e.ms / 1000) * 10) / 10 } }
        });
      }
    }
  };
}

/** Runs one agent in the open: who works, since when; its answer or a stop. */
async function step(agent, schemaName, input, check) {
  put({ status: "working", agent, startedAt: Date.now() });
  const out = await runAgent(agent, schemaName, input, { ...context(), check });
  if (out.unchecked.length) put({ unchecked: [...session().run.unchecked, ...out.unchecked.map((where) => ({ step: AGENT_STEP[agent], where }))] });
  return out.answer;
}

/**
 * What the run measured, as one console line for the presenter and for the estimate's next check
 * (G26 of M3): the setting, then per agent its requests, tokens, searches, cost and seconds, and the
 * totals. Counts and times only: nothing the person entered, nothing an agent wrote, never the key.
 */
function logMeasured() {
  const r = session().run;
  const p = presetById(r.settings.preset);
  const steps = Object.fromEntries(Object.entries(r.usage).map(([a, u]) => [a, { ...u, usd: Math.round(u.usd * 1e6) / 1e6 }]));
  console.info(TAG, `Measured: ${JSON.stringify({ setting: p.id, model: p.model, effort: p.effort, research: !!r.settings.research, cap_eur: r.settings.capEur, status: r.status, repairs: r.repairs, usd: Math.round(r.cost.usd * 1e6) / 1e6, eur: Math.round(r.cost.eur * 1e6) / 1e6, requests: r.cost.requests, steps })}`);
}

/** Ends the run early with what is done: why, and at which step. */
function stop(e, agent) {
  const cause = e instanceof StopError ? (e.kind === "cap" ? "cap" : "repair") : causeOf(e);
  const at = AGENT_STEP[agent] ?? session().run.reached;
  const detail = cause === "invalid" ? redactSecrets(String(e?.message || "")).slice(0, 160) : "";
  updateRun({ status: "stopped", agent: null, stopped: { cause, step: at, agent, detail, problems: e?.problems || [] } });
  console.info(TAG, cause === "aborted" ? `Stopped by Abort at the ${agent}; the steps done stay.` : `Stopped at the ${agent}: ${cause}. The steps done stay.`);
  logMeasured();
  if (session().run.reached > 0) markResult();
}

async function guarded(fn) {
  const mine = new AbortController();
  controller = mine;
  try {
    await fn();
  } catch (e) {
    if (!(e instanceof Superseded) && ours()) stop(e, session().run.agent);
  } finally {
    if (controller === mine) controller = null;
  }
}

/** Starts a run: the Completer fills the canvas, then the run waits for the person's review. */
export async function start(settings) {
  const s = session();
  resetRun({ settings: { ...settings }, lang: settings.lang });
  current = session().run;
  const preset = presetById(settings.preset);
  ledger = newLedger(preset.model);
  console.info(TAG, `Live run on ${preset.model}, ${preset.effort} effort${settings.research ? ", with research" : ""}, cap €${settings.capEur.toFixed(2)}.`);
  if (!settings.research) console.info(TAG, `No research: the model knows the world up to ${new Date(`${KNOWLEDGE_CUTOFF}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.`);
  await guarded(async () => {
    const sc = liveScenario();
    const answer = await step("completer", "Completion", inputFor("completer", { lang: settings.lang, company: { ...sc.company, sector: s.form.sector }, entered: s.entered }),
      (a) => G.completionProblems(a, { entered: s.entered, sectors: SECTORS.map((x) => x.id), evidence: evidence(sc) }));
    put({ answers: { ...session().run.answers, completion: answer }, reached: STEP.complete, status: "review", agent: null });
    markResult();
    console.info(TAG, `The Completer added ${answer.items.length} items.`);
  });
}

/** After the review: research when on, then the Red team, the Analyst and the Strategist. */
export async function challenge() {
  const r = session().run;
  current = r;
  await guarded(async () => {
    const lang = r.lang;
    let sc = liveScenario();
    let run = liveRun();
    if (r.settings.research) {
      put({ status: "working", agent: "scout", startedAt: Date.now() });
      const res = await runScout(inputFor("scout", { lang, company: sc.company, completed: run.kept }), context());
      const signals = res.signals.map((x) => ({ ...x, read_on: today() }));
      put({ answers: { ...session().run.answers, signals }, research: { ran: !res.disabled, disabled: res.disabled, dropped: res.dropped } });
      if (res.disabled) console.info(TAG, "Web search is switched off for this organisation; the run goes on without research.");
      else console.info(TAG, `The Scout reported ${signals.length} source(s)${res.dropped ? `, ${res.dropped} dropped` : ""}.`);
      sc = liveScenario();
    }
    const issues = await step("redteam", "Issues", inputFor("redteam", { lang, company: sc.company, completed: run.kept, signals: sc.answers.signals, research: r.settings.research }),
      (a) => G.issuesProblems(a, { canvas: run.kept, signals: sc.answers.signals, evidence: evidence(sc) }));
    put({ answers: { ...session().run.answers, issues: issues.issues }, reached: STEP.challenge });
    console.info(TAG, `The Red team found ${issues.issues.length} issue(s).`);
    sc = liveScenario();
    const impacts = await step("analyst", "Impacts", inputFor("analyst", { lang, company: sc.company, completed: run.kept, issues: sc.answers.issues }),
      (a) => G.impactsProblems(a, { issues: sc.answers.issues, sector: sc.company.sector, evidence: evidence(sc) }));
    put({ answers: { ...session().run.answers, impacts }, reached: STEP.assess });
    console.info(TAG, `The Analyst priced ${impacts.impacts.filter((i) => i.monetisable).length} of ${impacts.impacts.length} issue(s).`);
    sc = liveScenario();
    run = liveRun();
    const responses = await step("strategist", "Responses", inputFor("strategist", { lang, company: sc.company, completed: run.kept, issues: sc.answers.issues, impacts }),
      (a) => G.responsesProblems(a, { issues: run.issues, canvas: run.kept, evidence: evidence(sc) }));
    put({ answers: { ...session().run.answers, responses: responses.responses }, reached: STEP.adapt, status: "decision", agent: null });
    console.info(TAG, `The Strategist offered ${responses.responses.reduce((n, x) => n + x.options.length, 0)} option(s).`);
  });
}

/** The words a figure takes in the Writer's facts, so it sees what each key stands for. */
function factTexts(run, lang) {
  const out = {};
  for (const [k, v] of Object.entries(run.facts)) {
    if (/^(at_stake|left|upside)$|\.expected$/.test(k)) out[k] = fmtMoney(v, lang);
    else out[k] = String(v);
  }
  for (const i of run.issues) out[`issue.${i.id}.band`] = band(i.impact, i.likelihood);
  return out;
}

/** After the decision: the Writer writes the summary. */
export async function apply() {
  const r = session().run;
  current = r;
  updateRun({ applied: true });
  await guarded(async () => {
    const sc = liveScenario();
    const run = liveRun();
    const facts = factTexts(run, r.lang);
    const summary = await step("writer", "Summary", inputFor("writer", { lang: r.lang, company: sc.company, issues: run.issues, options: run.options, facts }),
      (a) => G.summaryProblems(a, { facts: Object.keys(run.facts), evidence: evidence(sc) }));
    put({ answers: { ...session().run.answers, summary }, reached: STEP.summary, status: "done", agent: null });
    markResult();
    const c = session().run.cost;
    console.info(TAG, `The Writer wrote the summary. The run cost $${c.usd.toFixed(4)} (€${c.eur.toFixed(4)}) in ${c.requests} request(s).`);
    logMeasured();
  });
}

/** Abort: the agent at work stops at once; every step done stays. */
export function abort() {
  controller?.abort();
}

/** True while an agent works. */
export const working = () => session().run.status === "working";
