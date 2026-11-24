// The one store of this tab's live work (brief 5.9): the company and canvas the person entered, the
// settings of the live run, every answer the agents gave, the person's choices and what the run cost.
// It lives in memory and nowhere else: nothing here is written to local storage, session storage,
// IndexedDB, the Cache API or a cookie, put in a URL or logged, and a reload or a closed tab ends it.
// The key alone lives apart, in js/keystore.js, which the four tools share; "Clear everything" empties
// both. While a live result exists that hasn't been downloaded, the browser asks before the page is
// left. Adapted from the Prototype Ideator's js/session.js (532e0f5): the same functions, with this
// tool's fields.

import { forgetKey } from "./keystore.js";
import { APP } from "./config.js";
import { BLOCKS } from "./canvas.js";

/** A run that hasn't started: nothing answered, nothing chosen. */
export function blankRun() {
  return {
    status: "idle",            // idle, working, review, decision, done or stopped
    agent: null,               // the agent at work while working
    startedAt: 0,              // when that agent started, in ms
    reached: 0,                // the furthest step with a checked answer (1 Complete … 5 Summary)
    lang: "en",                // the language the run writes in, fixed when it starts
    settings: null,            // { preset, research, capEur }
    answers: { completion: null, signals: [], issues: [], impacts: null, responses: [], summary: null },
    unchecked: [],             // [{ step, where }] texts shown with the Unchecked tag
    removed: new Set(),        // AI item ids the person removed at Complete
    edits: new Map(),          // AI item id → the text the person wrote instead
    decisions: new Map(),      // issue id → "accept" or an option's index
    applied: false,
    research: { ran: false, disabled: false, dropped: 0 },
    stopped: null,             // { cause, step, message } once the run stops early
    cost: { usd: 0, eur: 0, requests: 0, input_tokens: 0, output_tokens: 0, web_searches: 0 },
    repairs: 0,
    seconds: {},               // agent → seconds its request took
    usage: {}                  // agent → { requests, input, output, searches, usd, seconds }, all its requests
  };
}

function blank() {
  return {
    mode: "simulation",          // "simulation" or "live"
    form: { name: "", sector: "", country: "", description: "" },
    entered: { blocks: Object.fromEntries(BLOCKS.map((b) => [b, []])) },
    run: blankRun(),
    sample: null,                // the scenario "Start from …'s canvas" filled in: fictional while its name stays
    result: false,               // true once a live run has produced something worth keeping
    downloaded: false            // true once that result has been downloaded since it last changed
  };
}

let state = blank();
const listeners = new Set();

function notify() {
  for (const fn of [...listeners]) {
    try { fn(state); } catch (e) { console.error(`[${APP.name}] session listener failed:`, e); }
  }
}

/** The session, read-only by convention: change it through the functions below. */
export function session() {
  return state;
}

/** Calls fn(session) after every change. Returns an unsubscribe function. */
export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Changes plain fields of the session. */
export function updateSession(patch) {
  for (const [k, v] of Object.entries(patch || {})) if (Object.hasOwn(state, k)) state[k] = v;
  notify();
}

/** Changes fields of the live run. */
export function updateRun(patch) {
  Object.assign(state.run, patch);
  notify();
}

/** The company's details as the person typed them; quiet: no redraw while they type. */
export function setForm(patch, { quiet = false } = {}) {
  state.form = { ...state.form, ...patch };
  if (!quiet) notify();
}

/** A block's items as the person entered them, numbered in order ("value-1" on). */
export function setBlock(block, texts) {
  state.entered.blocks[block] = texts.map((text, i) => ({ id: `${block}-${i + 1}`, block, text, source: "user" }));
  notify();
}

/** A new run with these settings: the answers and choices of any earlier run are gone. */
export function resetRun(patch = {}) {
  state.run = { ...blankRun(), ...patch };
  notify();
}

/** A result now exists that the person may want to keep; the leave-page warning starts. */
export function markResult() {
  state.result = true;
  state.downloaded = false;
  notify();
}

/** The person downloaded the result; the leave-page warning stops until the result changes. */
export function markDownloaded() {
  state.downloaded = true;
  notify();
}

/** The person threw the result away (Start again): nothing is left to keep, so the warning stops. */
export function dropResult() {
  state.result = false;
  state.downloaded = false;
  notify();
}

/** True while a result exists that hasn't been downloaded. */
export function hasUnsavedResult() {
  return state.result && !state.downloaded;
}

/** "Clear everything": the session starts again and the key is forgotten. */
export function clearEverything() {
  const mode = state.mode;
  state = blank();
  state.mode = mode;
  forgetKey();
  notify();
}

/**
 * The browser's own leave-page warning while a result hasn't been downloaded. `target` is the window;
 * returns a function that removes the listener.
 */
export function installLeaveWarning(target = globalThis.window) {
  if (!target?.addEventListener) return () => {};
  const onLeave = (event) => {
    if (!hasUnsavedResult()) return;
    event.preventDefault();
    event.returnValue = "";
  };
  target.addEventListener("beforeunload", onLeave);
  return () => target.removeEventListener("beforeunload", onLeave);
}
