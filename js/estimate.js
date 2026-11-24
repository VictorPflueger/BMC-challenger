// What a run costs and takes, estimated before it runs (brief 5.6). Each step's request is rebuilt from
// the real prompt (js/prompts.js), its output schema and the state it reads as JSON, and its answer from
// the answer a run of this size writes: a scenario's own answers in the simulation, and before a live
// run the first scenario's answers as the expected size, with the person's own company and canvas as
// the input. About four characters a token, an allowance for adaptive thinking on each answer, and for
// research five searches at $10 per 1,000 with what the Scout reads (js/config.js ESTIMATE). Priced at
// js/config.js, converted at the sisters' fixed rate. An estimate, so the screen says "≈" and
// "estimated"; Victor's measured runs replace the assumptions.

import { modelById, presetById, DEFAULT_PRESET, FX_USD_EUR, ESTIMATE, ANTHROPIC } from "./config.js";
import { promptFor } from "./prompts.js";
import { OUTPUT } from "../schemas/index.js";
import { kpisFor } from "../data/kpis.js";

const tokens = (value) => Math.ceil((typeof value === "string" ? value : JSON.stringify(value ?? "")).length / ESTIMATE.charsPerToken);

/**
 * The cost and time of a run. sc: a localised scenario (or a live one shaped like it); run: js/run.js
 * buildRun of it; presetId: the setting; research: whether the Scout runs (by default when the
 * scenario's run used it). Returns { preset, model, effort, research, requests, input, output,
 * searches, usd, eur, seconds }.
 */
export function estimateRun(sc, run, presetId = DEFAULT_PRESET, { research } = {}) {
  const p = presetById(presetId);
  const m = modelById(p.model);
  const a = sc.answers;
  const scout = research ?? a.signals.length > 0;
  const company = { name: sc.company.name, sector: sc.company.sector, country: sc.company.country, description: sc.company.description };
  const canvas = run.completed.blocks;
  const library = kpisFor(sc.company.sector).map((k) => ({ id: k.id, name: k.name.en, unit: k.unit, better: k.better, definition: k.definition.en }));
  const steps = [
    ["completer", "Completion", [company, sc.entered.blocks], a.completion],
    scout ? ["scout", "Signals", [company, canvas], { signals: a.signals }, ESTIMATE.researchInputTokens, ANTHROPIC.webSearchTool.max_uses] : null,
    ["redteam", "Issues", [company, canvas, a.signals], { issues: a.issues }],
    ["analyst", "Impacts", [company, canvas, a.issues, library], a.impacts],
    ["strategist", "Responses", [company, canvas, a.issues, a.impacts], { responses: a.responses }],
    ["writer", "Summary", [company, a.issues, run.options.map((o) => ({ issue: o.issue, chosen: o.chosen })), run.facts], a.summary]
  ].filter(Boolean);
  let input = 0;
  let output = 0;
  let searches = 0;
  for (const [agent, schema, reads, writes, extra = 0, n = 0] of steps) {
    input += tokens(promptFor(agent)) + tokens(OUTPUT[schema]) + tokens(reads) + extra;
    output += tokens(writes) + (ESTIMATE.thinkingTokens[p.id] || 0);
    searches += n;
  }
  const usd = (input * m.price.input + output * m.price.output) / 1e6 + searches * (ANTHROPIC.webSearchUsdPer1000 / 1000);
  return { preset: p.id, model: m.label, effort: p.effort, research: scout, requests: steps.length, input, output, searches, usd, eur: usd * FX_USD_EUR, seconds: steps.length * ESTIMATE.secondsPerStep[p.id] };
}
