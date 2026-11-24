// One agent's step of a live run (brief 5.2): one request with its structured answer, checked by the
// schema validator and the guards; a failing answer goes back once with its problems listed; a second
// failure stops the run there, except prose that only fails the fact audit, which shows with the
// Unchecked tag instead (brief 5.10). Before every request the budget cap decides whether it may go
// (js/budget.js). Requests stream through the shared client and its retries (js/anthropic.js).

import { streamMessage, withRetry } from "./anthropic.js";
import { validate, describeErrors } from "./schema.js";
import { OUTPUT } from "../schemas/index.js";
import { repairMessage } from "./guards.js";
import { fitToCap } from "./budget.js";
import { AGENT_TOKENS, RUN } from "./config.js";
import { promptFor } from "./prompts.js";

/** Why a run stopped early: "cap" (the budget), "repair" (a second failing answer) or "api" (an error). */
export class StopError extends Error {
  constructor(kind, { agent, problems = [], cause = null } = {}) {
    super(`stopped: ${kind}`);
    this.name = "StopError";
    this.kind = kind;
    this.agent = agent;
    this.problems = problems;
    this.cause = cause;
  }
}

/** The request an agent sends on a setting: its prompt, the state as JSON, the schema, effort and thinking. */
export function requestFor(agent, schemaName, input, preset) {
  const body = {
    model: preset.model,
    max_tokens: AGENT_TOKENS[agent].max,
    system: promptFor(agent),
    messages: [{ role: "user", content: JSON.stringify(input) }],
    output_config: { effort: preset.effort, format: { type: "json_schema", schema: OUTPUT[schemaName] } }
  };
  if (preset.thinking) body.thinking = preset.thinking;
  return body;
}

/** The text of an answer, its JSON parsed, or what went wrong. */
export function parseAnswer(message) {
  const text = (message.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (message.stop_reason === "max_tokens") return { text, error: "The answer was cut off at its output limit. Write it shorter." };
  try {
    return { text, value: JSON.parse(text) };
  } catch {
    return { text, error: "The answer was not valid JSON." };
  }
}

/** Sends one request through the shared client with its retries, and counts what it cost. */
export async function send(body, ctx, agent) {
  const t0 = Date.now();
  const { message } = await withRetry(
    () => streamMessage({ key: ctx.key, body, signal: ctx.signal, idleMs: RUN.idleMs }),
    { signal: ctx.signal, onRetry: (r) => ctx.onEvent?.({ type: "retry", agent, attempt: r.attempt, waitMs: r.waitMs, status: r.error?.status }) }
  );
  ctx.ledger.add(message.usage);
  ctx.onEvent?.({ type: "answer", agent, ms: Date.now() - t0, usage: message.usage, stop: message.stop_reason });
  return message;
}

/**
 * One agent's step. ctx: { key, preset, capEur, signal, ledger, check(answer) → { refusals, audit },
 * onEvent }. ledger: { spentUsd(), add(usage), repairsLeft(), useRepair() }. Returns { answer,
 * unchecked: [where], repaired }, or throws StopError (or the client's error, or an AbortError).
 */
export async function runAgent(agent, schemaName, input, ctx) {
  const first = requestFor(agent, schemaName, input, ctx.preset);
  let body = first;
  let repaired = false;
  for (;;) {
    const fit = fitToCap(body, { spentUsd: ctx.ledger.spentUsd(), capEur: ctx.capEur, min: AGENT_TOKENS[agent].min });
    if (!fit) throw new StopError("cap", { agent });
    if (fit.cut) ctx.onEvent?.({ type: "cut", agent, maxTokens: fit.body.max_tokens });
    const message = await send(fit.body, ctx, agent);
    const parsed = parseAnswer(message);
    let problems = { refusals: [], audit: [] };
    if (parsed.error) problems.refusals.push(parsed.error);
    else {
      const v = validate(parsed.value, OUTPUT[schemaName]);
      if (!v.valid) problems.refusals.push(...describeErrors(v.errors).split("\n"));
      else {
        const g = ctx.check(parsed.value);
        problems = { refusals: g.refusals || [], audit: g.audit || [] };
      }
    }
    if (!problems.refusals.length && !problems.audit.length) return { answer: parsed.value, unchecked: [], repaired };
    if (repaired || ctx.ledger.repairsLeft() <= 0) {
      if (problems.refusals.length) throw new StopError("repair", { agent, problems: problems.refusals });
      return { answer: parsed.value, unchecked: problems.audit.map((a) => a.where), repaired };
    }
    ctx.ledger.useRepair();
    ctx.onEvent?.({ type: "repair", agent, problems: [...problems.refusals, ...problems.audit.map((a) => `${a.where}: ${a.tokens.join(", ")}`)] });
    body = { ...first, messages: [...first.messages, { role: "assistant", content: parsed.text || "(no answer)" }, { role: "user", content: repairMessage(problems) }] };
    repaired = true;
  }
}
