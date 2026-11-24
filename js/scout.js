// The Scout (brief 5.7, off by default): one conversation with Anthropic's web search, at most five
// searches, reporting through one strict client tool, submit_signals. Code accepts only the addresses
// this conversation's own search results returned; any other is dropped and noted in the console,
// without a second request (D13). pause_turn sends the paused conversation again unchanged. An
// organisation with web search switched off answers 400: the run goes on without research and says so.

import { ApiError, isWebSearchDisabled } from "./anthropic.js";
import { validate } from "./schema.js";
import { OUTPUT } from "../schemas/index.js";
import { fitToCap } from "./budget.js";
import { AGENT_TOKENS, ANTHROPIC, ESTIMATE, RUN } from "./config.js";
import { promptFor } from "./prompts.js";
import { send, StopError } from "./pipeline.js";

export const SIGNALS_TOOL = Object.freeze({
  name: "submit_signals",
  description: "Report the pages your searches found that bear on this business model.",
  strict: true,
  input_schema: OUTPUT.Signals
});

/** The Scout's first request on a setting. */
export function scoutRequest(input, preset) {
  const body = {
    model: preset.model,
    max_tokens: AGENT_TOKENS.scout.max,
    system: promptFor("scout"),
    messages: [{ role: "user", content: JSON.stringify(input) }],
    tools: [{ ...ANTHROPIC.webSearchTool }, SIGNALS_TOOL],
    output_config: { effort: preset.effort }
  };
  if (preset.thinking) body.thinking = preset.thinking;
  return body;
}

/** Every address the search results of a message carry. */
export function resultUrls(message) {
  const urls = [];
  for (const b of message.content || []) {
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) for (const r of b.content) if (r?.url) urls.push(r.url);
  }
  return urls;
}

/**
 * Runs the research. ctx as js/pipeline.js runAgent takes it. Returns { signals, disabled, dropped,
 * requests }: the signals with addresses from the conversation's own results, whether the organisation
 * has web search switched off, and how many signals were dropped for an address no search returned.
 */
export async function runScout(input, ctx) {
  const first = scoutRequest(input, ctx.preset);
  let messages = first.messages;
  const found = new Set();
  for (let n = 0; n < RUN.researchRequests; n++) {
    const fit = fitToCap({ ...first, messages }, { spentUsd: ctx.ledger.spentUsd(), capEur: ctx.capEur, min: AGENT_TOKENS.scout.min, searches: ANTHROPIC.webSearchTool.max_uses, extraInput: ESTIMATE.researchInputTokens });
    if (!fit) throw new StopError("cap", { agent: "scout" });
    let message;
    try {
      message = await send(fit.body, ctx, "scout");
    } catch (e) {
      if (e instanceof ApiError && isWebSearchDisabled(e)) return { signals: [], disabled: true, dropped: 0, requests: n + 1 };
      throw e;
    }
    for (const u of resultUrls(message)) found.add(u);
    const call = (message.content || []).find((b) => b.type === "tool_use" && b.name === SIGNALS_TOOL.name);
    if (call) {
      const report = validate(call.input, OUTPUT.Signals).valid ? call.input.signals : [];
      const kept = report.filter((s) => found.has(s.url));
      const dropped = report.length - kept.length;
      if (dropped) console.info(`[Scout] dropped ${dropped} signal(s) whose address no search of this run returned.`);
      return { signals: kept, disabled: false, dropped, requests: n + 1 };
    }
    if (message.stop_reason !== "pause_turn") break;
    // Paused: the conversation goes back unchanged, the paused answer included, and the search goes on.
    messages = [...messages, { role: "assistant", content: message.content }];
  }
  return { signals: [], disabled: false, dropped: 0, requests: RUN.researchRequests };
}
