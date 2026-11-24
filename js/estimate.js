// What a run costs, estimated before it runs. A simulation calls no model, so its Session cost tile shows
// what a live run of the same company would cost at the setting a stranger gets (Balanced: Haiku 5.5 at
// medium effort), with web research when the recording used it. The live run of 0.3.0 counts the same
// way before it starts and then measures what each request really used.
//
// The method, stated in the guide: about four characters a token (PLAN.md §10); per request, each
// agent's prompt with its output schema, the state it reads as compact JSON, and the answer it writes;
// adaptive thinking at medium effort adds an allowance to every answer; research adds five searches at
// $10 per 1,000 and the search results the Scout reads. Prices from js/config.js, converted at the
// sisters' fixed rate. An estimate, so the tile says "≈" and "estimated".

import { MODELS, SETTINGS, DEFAULT_SETTING, FX_USD_EUR, WEB_SEARCH_USD } from "./config.js";
import { kpisFor } from "../data/kpis.js";

const CHARS_PER_TOKEN = 4;
const PROMPT_TOKENS = 1200; // one agent's prompt (under 600 words) with its output schema
const THINKING_TOKENS = 1500; // adaptive thinking at medium effort, per answer
const RESEARCH = Object.freeze({ searches: 5, inputTokens: 20000 }); // the Scout's searches and what it reads

const tokens = (value) => Math.ceil(JSON.stringify(value).length / CHARS_PER_TOKEN);

/**
 * The cost of a live run of this scenario. sc: a localised scenario; run: js/run.js buildRun of it.
 * Returns { setting, model, effort, requests, input, output, searches, usd, eur }.
 */
export function estimateRun(sc, run, setting = DEFAULT_SETTING) {
  const s = SETTINGS[setting];
  const m = MODELS[s.model];
  const a = sc.answers;
  const company = { name: sc.company.name, sector: sc.company.sector, country: sc.company.country, description: sc.company.description };
  const canvas = run.completed.blocks;
  const library = kpisFor(sc.company.sector).map((k) => ({ id: k.id, name: k.name.en, unit: k.unit, better: k.better, definition: k.definition.en }));
  const research = a.signals.length > 0;
  const steps = [
    { reads: [company, sc.entered.blocks], writes: a.completion },
    research ? { reads: [company, canvas], writes: { signals: a.signals }, extra: RESEARCH.inputTokens, searches: RESEARCH.searches } : null,
    { reads: [canvas, a.signals], writes: { issues: a.issues } },
    { reads: [canvas, a.issues, library], writes: a.impacts },
    { reads: [canvas, a.issues, a.impacts], writes: { responses: a.responses } },
    { reads: [company, a.issues, a.impacts, run.options.map((o) => ({ issue: o.issue, chosen: o.chosen })), Object.keys(run.facts)], writes: a.summary }
  ].filter(Boolean);
  let input = 0;
  let output = 0;
  let searches = 0;
  for (const step of steps) {
    input += PROMPT_TOKENS + tokens(step.reads) + (step.extra || 0);
    output += tokens(step.writes) + (s.thinking ? THINKING_TOKENS : 0);
    searches += step.searches || 0;
  }
  const usd = (input * m.input + output * m.output) / 1e6 + searches * WEB_SEARCH_USD;
  return { setting, model: m.label, effort: s.effort, research, requests: steps.length, input, output, searches, usd, eur: usd * FX_USD_EUR };
}
