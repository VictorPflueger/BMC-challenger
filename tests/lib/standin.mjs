// A scripted stand-in for api.anthropic.com in Chromium (brief 5.9, PLAN.md §12): no automated test
// ever calls the real API. install() routes the page's requests to the API through Playwright: the free
// GET /v1/models answers with the three models, and each POST /v1/messages is answered as a stream of
// server-sent events from a script, or with the error the script names. Every request is recorded with
// its headers, body and time. The agent of a request is read from its system prompt.
//
// The default script answers every agent with scenario S1's recorded answers in English, the Scout
// with S1's sources through a web search and submit_signals. A test overrides any agent's answer.
import { localise } from "../../js/run.js";
import { scenarioById } from "../../data/scenarios/index.js";

const AGENTS = { Completer: "completer", Scout: "scout", "Red team": "redteam", Analyst: "analyst", Strategist: "strategist", Writer: "writer" };
export const KEY = "sk-ant-api03-STANDIN-only-for-tests-0123456789abcdefghij-XYZ9";

/** The agent a request comes from, by its prompt. */
export function agentOf(body) {
  const m = String(body?.system || "").match(/You are the (Completer|Scout|Red team|Analyst|Strategist|Writer)\./);
  return m ? AGENTS[m[1]] : "unknown";
}

/** S1's recorded answers, in English, as each agent returns them. research: whether signals exist. */
export function s1Answers({ research = false } = {}) {
  const sc = localise(scenarioById("s1"), "en");
  const a = sc.answers;
  const issues = a.issues.map((i) => ({ ...i, evidence: research ? i.evidence : i.evidence.map(() => "general knowledge").slice(0, 1) }));
  const signals = a.signals.map(({ read_on, ...s }) => s);
  return {
    sc,
    completer: { sector: a.completion.sector, items: a.completion.items.map(({ edited, ...it }) => it) },
    scout: { signals },
    redteam: { issues },
    analyst: { baselines: a.impacts.baselines, impacts: a.impacts.impacts },
    strategist: { responses: a.responses },
    writer: a.summary
  };
}

/** Tokens a response reports: about four characters a token, as the estimate counts them. */
const tok = (v) => Math.max(1, Math.ceil(JSON.stringify(v).length / 4));

/** The server-sent events of one message: content blocks as the API streams them. */
export function sse({ model = "claude-haiku-5-5", content = [], stop = "end_turn", usage = {} }) {
  const out = [];
  const ev = (type, data) => out.push(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  ev("message_start", { message: { id: `msg_${Math.random().toString(36).slice(2, 10)}`, type: "message", role: "assistant", model, content: [], stop_reason: null, usage: { input_tokens: usage.input_tokens ?? 100, output_tokens: 1 } } });
  content.forEach((block, i) => {
    if (block.type === "text") {
      ev("content_block_start", { index: i, content_block: { type: "text", text: "" } });
      const text = block.text;
      for (let k = 0; k < text.length; k += 400) ev("content_block_delta", { index: i, delta: { type: "text_delta", text: text.slice(k, k + 400) } });
    } else if (block.type === "tool_use") {
      ev("content_block_start", { index: i, content_block: { type: "tool_use", id: block.id, name: block.name, input: {} } });
      ev("content_block_delta", { index: i, delta: { type: "input_json_delta", partial_json: JSON.stringify(block.input) } });
    } else {
      ev("content_block_start", { index: i, content_block: block });
    }
    ev("content_block_stop", { index: i });
  });
  ev("message_delta", { delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: usage.output_tokens ?? 50, ...(usage.web_search_requests ? { server_tool_use: { web_search_requests: usage.web_search_requests } } : {}) } });
  ev("message_stop", {});
  return out.join("");
}

/** A JSON answer as an agent streams it. */
export const answer = (value, extra = {}) => ({ kind: "answer", content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }], ...extra });
/** An error response. */
export const apiError = (status, type, message, { headers = {}, details = null } = {}) => ({ kind: "error", status, headers, body: { type: "error", error: { type, message, ...(details ? { details } : {}) }, request_id: "req_standin" } });

/** The Scout's turn: one search with S1's sources, then submit_signals with the signals given. */
export function scoutTurn(signals, { urls = signals.map((s) => s.url), stop = "tool_use", submit = true } = {}) {
  const content = [
    { type: "server_tool_use", id: "srvtoolu_standin1", name: "web_search", input: { query: "standin query" } },
    { type: "web_search_tool_result", tool_use_id: "srvtoolu_standin1", content: urls.map((url, i) => ({ type: "web_search_result", url, title: `Result ${i + 1}`, encrypted_content: `enc${i}`, page_age: "November 2026" })) }
  ];
  if (submit) content.push({ type: "tool_use", id: "toolu_standin1", name: "submit_signals", input: { signals } });
  return { kind: "answer", content, stop, usage: { web_search_requests: 1 } };
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-expose-headers": "request-id, retry-after" };

/**
 * Routes the API in a browser context. script(agent, body, n, all) returns what to answer: an
 * answer(), apiError(), scoutTurn(), { kind: "network" }, { kind: "hold" } (never answers, for Abort),
 * or undefined for the default. models: the ids GET /v1/models lists, or an apiError() for it.
 * Returns { calls, models }: every POST with { agent, body, headers, at, n } and every GET.
 */
export async function install(context, { script = () => undefined, research = false, models = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"], usage = null } = {}) {
  const defaults = s1Answers({ research });
  const calls = [];
  const gets = [];
  const count = {};
  await context.route("https://api.anthropic.com/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const headers = req.headers();
    if (req.method() === "GET") {
      gets.push({ url: req.url(), headers, at: Date.now() });
      if (!Array.isArray(models)) return route.fulfill({ status: models.status, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(models.body) });
      return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify({ data: models.map((id) => ({ id, type: "model", capabilities: { server_tools: { web_search: { supported: true } } } })), has_more: false }) });
    }
    const body = req.postDataJSON();
    const agent = agentOf(body);
    count[agent] = (count[agent] || 0) + 1;
    const n = count[agent];
    calls.push({ agent, body, headers, at: Date.now(), n, url: req.url() });
    let r = await script(agent, body, n, calls);
    if (!r) r = agent === "scout" ? scoutTurn(defaults.scout.signals) : answer(defaults[agent]);
    if (r.kind === "hold") return; // never answered: the page's Abort ends it
    if (r.kind === "network") return route.abort("failed");
    if (r.kind === "error") return route.fulfill({ status: r.status, headers: { ...CORS, "content-type": "application/json", "request-id": "req_standin", ...r.headers }, body: JSON.stringify(r.body) });
    const u = r.usage || {};
    const use = usage ? usage(agent, body, n) : {};
    const text = r.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const usageOut = { input_tokens: use.input_tokens ?? tok(body), output_tokens: use.output_tokens ?? tok(text || r.content), web_search_requests: use.web_search_requests ?? u.web_search_requests ?? 0 };
    return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "text/event-stream", "request-id": `req_${agent}_${n}` }, body: sse({ model: body.model, content: r.content, stop: r.stop || "end_turn", usage: usageOut }) });
  });
  return { calls, gets, defaults };
}

/** A live run's page helpers: the live Start, the dialog, a run to a status. */
export const live = {
  async enter(page) {
    await page.click("#live");
    await page.waitForFunction(() => window.BMC?.state.mode === "live");
  },
  async sample(page) { await page.click("#live-sample"); },
  async openDialog(page) {
    await page.click("#btn-cta");
    await page.waitForSelector("#live-dialog[open]");
  },
  /** Fills the dialog and starts: key, setting, research, cap, the acknowledgement. */
  async start(page, { key = KEY, preset = "balanced", research = false, cap = null } = {}) {
    if (await page.locator("#live-key").isVisible()) await page.fill("#live-key", key);
    await page.check(`input[name="live-preset"][value="${preset}"]`, { force: true });
    if (research !== await page.isChecked("#live-research")) await page.click("#live-research", { force: true });
    if (cap !== null) await page.$eval("#live-cap", (el, v) => { el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true })); }, cap);
    await page.check("#live-ack", { force: true });
    await page.click("#live-start");
  },
  async status(page) { return page.evaluate(() => window.BMC.state.live); },
  async waitFor(page, statuses, timeout = 20000) {
    const want = [].concat(statuses);
    await page.waitForFunction((w) => w.includes(window.BMC?.state.live.status), want, { timeout });
    return page.evaluate(() => window.BMC.state.live);
  },
  /** Start, review (kept as it is), challenge, decide (the recommended options), apply. */
  async full(page, opts = {}) {
    await live.enter(page);
    await live.sample(page);
    await live.openDialog(page);
    await live.start(page, opts);
    await live.waitFor(page, ["review", "stopped"]);
    if ((await live.status(page)).status === "stopped") return live.status(page);
    await page.click("#btn-cta");
    await live.waitFor(page, ["decision", "stopped"], 30000);
    if ((await live.status(page)).status === "stopped") return live.status(page);
    await page.click("#btn-cta");
    return live.waitFor(page, ["done", "stopped"]);
  }
};
