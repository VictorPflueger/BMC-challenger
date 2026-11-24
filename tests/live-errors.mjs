// AC-10 in Chromium against the stand-in: each failure of a request ends in its plain message (the
// dictionary's text, in the page's language), with nothing shaped like a key in it: 401 (the key; a
// different message when the organisation blocks calls from a browser), 402, 403, 404, 400 for missing
// credit, 400 for a reached usage limit, another 400 with the API's words, 429, the 429 of a monthly
// spend cap, 529, 500 and a network failure. 429, 500, 529 and network failures are retried twice,
// after 1.5 and 4 seconds or after retry-after (at most 20 seconds, js/anthropic.js; the cap is checked
// in Node with the clock stubbed); the spend cap, credit and key errors never are. Prints LIVE ERRORS OK.
// Usage: node tests/live-errors.mjs
import { APP_ROOT, launchBrowser, serveStatic, port, context, exit } from "./lib/harness.mjs";
import { install, live, apiError } from "./lib/standin.mjs";
import { ApiError, withRetry } from "../js/anthropic.js";
import EN from "../js/i18n/en.js";
import DE from "../js/i18n/de.js";

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });
const LEAK = "sk-ant-api03-leakedKEYleakedKEYleakedKEY0123456789";

const CASES = [
  ["key", apiError(401, "authentication_error", "invalid x-api-key"), 1],
  ["cors", apiError(401, "authentication_error", "CORS requests are not allowed for this Organization because of its settings."), 1],
  ["billing", apiError(402, "billing_error", "There's an issue with your billing."), 1],
  ["permission", apiError(403, "permission_error", "Your API key does not have permission to use the specified resource."), 1],
  ["model", apiError(404, "not_found_error", "model: claude-haiku-5-5"), 1],
  ["credit", apiError(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API."), 1],
  ["limit", apiError(400, "invalid_request_error", "You have reached your specified API usage limits. You will regain access on 2026-12-01 at 00:00 UTC."), 1],
  ["invalid", apiError(400, "invalid_request_error", `messages: bad request for key ${LEAK}`), 1],
  ["spend", apiError(429, "rate_limit_error", "You have reached your API usage limits.", { details: { error_code: "enforced_spend_limit_reached" } }), 1],
  ["rate", apiError(429, "rate_limit_error", "Number of request tokens has exceeded your per-minute rate limit.", { headers: { "retry-after": "1" } }), 3, [1000, 1000]],
  ["busy", apiError(529, "overloaded_error", "Overloaded"), 3, [1500, 4000]],
  ["server", apiError(500, "api_error", "Internal server error"), 3, [1500, 4000]],
  ["network", { kind: "network" }, 3, [1500, 4000]]
];

const server = await serveStatic(APP_ROOT, port(9212));
const browser = await launchBrowser();
async function failing(lang, response) {
  const { context: ctx } = await context(browser, { width: 1280, height: 720 });
  const api = await install(ctx, { script: (agent) => (agent === "completer" ? response : undefined) });
  const p = await ctx.newPage();
  const consoleText = [];
  p.on("console", (m) => consoleText.push(m.text()));
  await p.goto(`${server.base}?guide=0&lang=${lang}`);
  await p.waitForSelector('html[data-boot="ready"]');
  await live.enter(p);
  await live.sample(p);
  await live.openDialog(p);
  await live.start(p);
  const st = await live.waitFor(p, "stopped", 30000);
  const bar = await p.evaluate(() => document.querySelector("#bar").textContent);
  const html = await p.content();
  await ctx.close();
  return { st, bar, calls: api.calls.filter((c) => c.agent === "completer"), html, consoleText: consoleText.join("\n") };
}

try {
  for (const [cause, response, tries, gaps] of CASES) {
    const r = await failing("en", response);
    const want = EN[`err.${cause}`].replace("{detail}", "").trim();
    const shown = cause === "invalid" ? r.bar.includes(want) && r.bar.includes("sk-ant-[REDACTED]") : r.bar.includes(want);
    check(r.st.stopped?.cause === cause && shown, `${cause}: the run stops with "${want.slice(0, 70)}"`, JSON.stringify({ stopped: r.st.stopped, bar: r.bar.slice(0, 200) }));
    check(r.calls.length === tries, `${cause}: ${tries === 1 ? "never retried" : `retried twice (${tries} requests)`}`, `${r.calls.length} requests`);
    if (gaps) {
      const d = r.calls.slice(1).map((c, i) => c.at - r.calls[i].at);
      const ok = d.length === 2 && d.every((ms, i) => ms >= gaps[i] - 50 && ms <= gaps[i] + 1500);
      check(ok, `${cause}: the retries wait ${gaps.map((g) => `${g / 1000} s`).join(", then ")}`, d.join(", "));
    }
    check(!r.html.includes(LEAK) && !r.consoleText.includes(LEAK), `${cause}: nothing shaped like the key reaches the page or the console`);
  }
  for (const [cause, response] of [CASES[0], CASES[5], CASES[10]]) {
    const r = await failing("de", response);
    const want = DE[`err.${cause}`].replace("{detail}", "").trim();
    check(r.st.stopped?.cause === cause && r.bar.includes(want), `German, ${cause}: "${want.slice(0, 60)}"`, r.bar.slice(0, 200));
  }
} finally {
  await browser.close();
  await server.close();
}

// ---- retry-after: at most 20 seconds (the clock stubbed in Node) ------------------------------------------
{
  const waits = [];
  const real = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms) => { waits.push(ms); return real(fn, 0); };
  let n = 0;
  try {
    await withRetry(async () => { n += 1; if (n < 3) throw new ApiError({ status: 429, type: "rate_limit_error", message: "slow down", retryAfter: n === 1 ? "60" : "3" }); return "ok"; });
  } finally { globalThis.setTimeout = real; }
  check(n === 3 && waits[0] === 20000 && waits[1] === 3000, "retry-after is honoured and held to at most 20 seconds", JSON.stringify(waits));
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} error checks passed`);
if (!failed) console.log("LIVE ERRORS OK");
exit(failed ? 1 : 0);
