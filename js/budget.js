// The budget cap (brief 5.5): before every request, code works out its worst case, the estimated input
// tokens times the input price, max_tokens times the output price, and $0.01 for each search the request
// may run. If what the run has spent plus that worst case would pass the cap, max_tokens drops to the
// step's minimum; if the request still doesn't fit, the run stops before it and keeps what is done.
// Pure functions, priced from js/config.js like the meter, so the tests can hold them to the cent.

import { modelById, FX_USD_EUR, ESTIMATE, ANTHROPIC } from "./config.js";

/** About four characters a token: the input of a request, from what it sends. */
export function inputTokens(body, extra = 0) {
  const sent = JSON.stringify({ system: body.system, messages: body.messages, tools: body.tools, format: body.output_config?.format });
  return Math.ceil(sent.length / ESTIMATE.charsPerToken) + extra;
}

/** The most a request can cost, in US dollars. searches: how many web searches it may run. */
export function worstCaseUsd(body, { searches = 0, extraInput = 0 } = {}) {
  const model = modelById(body.model);
  if (!model) throw new RangeError(`no price for the model ${body.model}`);
  const input = inputTokens(body, extraInput);
  const p = model.price.longPrompt && input > model.price.longPrompt.thresholdTokens ? model.price.longPrompt : model.price;
  return (input * p.input + body.max_tokens * p.output) / 1e6 + searches * (ANTHROPIC.webSearchUsdPer1000 / 1000);
}

/**
 * The request as it may go under the cap, or null when it can't. spentUsd: what the run has spent;
 * capEur: the person's cap; min: the step's smallest max_tokens. Returns { body, cut } where cut says
 * that max_tokens was lowered to fit.
 */
export function fitToCap(body, { spentUsd, capEur, min, searches = 0, extraInput = 0 }) {
  const capUsd = capEur / FX_USD_EUR;
  if (spentUsd + worstCaseUsd(body, { searches, extraInput }) <= capUsd + 1e-12) return { body, cut: false };
  const lower = { ...body, max_tokens: Math.min(body.max_tokens, min) };
  if (lower.max_tokens < body.max_tokens && spentUsd + worstCaseUsd(lower, { searches, extraInput }) <= capUsd + 1e-12) return { body: lower, cut: true };
  return null;
}
