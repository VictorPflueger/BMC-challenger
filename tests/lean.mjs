// How lean the tool stays: limits a change has to argue with. Node.js only.
//   shell    the presenter is at most eight modules of its own (main, app, view, story, run, kpis,
//            estimate, lang; PLAN.md §2) of at most 1,800 lines together; the rest of js/ is the
//            engine, the formats, the configuration, the schemas' validator and, from 0.3.0, the client
//   app      at most 6,500 lines of JavaScript in js/ (the dictionaries in js/i18n/ apart) and one
//            stylesheet of at most 480 lines (450 until 0.3.0 brought the live screens); vici/ is
//            Vici's, tests/ and tools/ aren't the app
//   network  no module makes requests but the live client, and in it only js/anthropic.js;
//            no module and not the page names another host to call, and the security policy connects
//            to api.anthropic.com only
//   cuts     what the design review cut stays out (PLAN.md §17): the Resilience tile, a method dialog,
//            a language control in the live dialog, misplaced-item flags, a before-and-after toggle,
//            "Save run as simulation", the report's separate About page, and uploads (D12)
//   docs     README.md at most 900 words, DESIGN.md at most 700, DATA_SOURCES.md at most 1,200 (its
//            addresses not counted) and, once it exists, DEMO_SCRIPT.md at most 700
// Each rule is first tried on a planted example that must break it. Prints CUTS OK and LEAN OK.
// Adapted from the Sovereignty Assessment's tests/lean.mjs.
// Usage: node tests/lean.mjs
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";

const LIMITS = { shellModules: 8, shellLines: 1800, jsLines: 6500, cssFiles: 1, cssLines: 480, readme: 900, script: 700, design: 700, sources: 1200 };
const SHELL = ["main.js", "app.js", "view.js", "story.js", "run.js", "kpis.js", "estimate.js", "lang.js"];
const NET = /\bfetch\s*\(|XMLHttpRequest|WebSocket|new EventSource|navigator\.sendBeacon/;
const HOSTS = /https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi;
const CALLED = new Set(["api.anthropic.com"]);
// Links a person follows, not hosts the page calls: the byline, the canvas's credit and licence, and
// Anthropic's console in key messages.
const LINKS = new Set(["www.linkedin.com", "victorpflueger.github.io", "platform.claude.com", "www.strategyzer.com", "creativecommons.org"]);
// What the design review cut, by the ids, classes and words it would bring back.
const CUT_UI = /\b(?:id|class)="[^"]*\b(kpi-resilience|method-dialog|method-open|live-lang|misplaced|before-after|save-simulation|report-about)\b|data-vc-kpi="Resilience|type="file"/;
const CUT_TEXT = /Save run as simulation|About this report|Misplaced item/i;

const results = [];
const cut = [];
const check = (ok, what, list = results) => list.push([!!ok, what]);
const read = (f) => readFileSync(path.join(APP_ROOT, f), "utf8");
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const lines = (text) => text.split("\n").length;
const words = (text) => text.replace(/```[\s\S]*?```/g, " ").replace(/https?:\/\/\S+/g, " ").split(/\s+/).filter(Boolean).length;
const policy = (html) => Object.fromEntries(((html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/) || [])[1] || "")
  .split(";").map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([k, ...v]) => [k, v]));
const policyProblems = (html) => {
  const p = policy(html);
  const out = [];
  const connect = (p["connect-src"] || []).map((s) => s.replace(/^https:\/\//, ""));
  if (connect.sort().join(" ") !== [...CALLED].sort().join(" ")) out.push(`connect-src is "${(p["connect-src"] || []).join(" ")}"`);
  for (const [k, v] of Object.entries(p)) if (k !== "connect-src" && v.some((s) => /^https?:|^\*$|^wss?:/.test(s))) out.push(`${k} loads from ${v.join(" ")}`);
  if (!p["default-src"]?.includes("'self'")) out.push("no default-src 'self'");
  return out;
};
const hostsIn = (text) => [...text.matchAll(HOSTS)].map((m) => m[1].toLowerCase()).filter((h) => !CALLED.has(h) && !LINKS.has(h) && h !== "www.w3.org");

// ---- the rules catch what they are for ----------------------------------------------------------------
check(NET.test(code('const r = await fetch("https://api.open-meteo.com/v1/forecast");')) && !NET.test(code("// reads fetch() bodies\nconst fetched = items.filter(Boolean);")), "control: the network pattern catches a request, and passes a comment and ordinary code");
check(hostsIn('const URL = "https://api.open-meteo.com/v1/forecast";').length === 1 && !hostsIn('fetch("https://api.anthropic.com/v1/messages")').length && !hostsIn('<a href="https://www.strategyzer.com">').length, "control: a host other than the API and the links is caught");
check(policyProblems(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src https://api.anthropic.com https://unpkg.com">`).length > 0 && policyProblems(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://unpkg.com; connect-src https://api.anthropic.com">`).length > 0, "control: a policy that connects or loads elsewhere is caught");
check(CUT_UI.test('<div class="kpi vc-stat" id="kpi-resilience">') && CUT_UI.test('<input type="file" accept=".pdf">') && CUT_TEXT.test("Save run as simulation") && !CUT_UI.test('<div class="kpi vc-stat" id="kpi-stake">') && !CUT_TEXT.test("Run it live"), "control: a part the design review cut is caught, and the tool's own parts are not");
check(words("one two https://example.com/a-very-long-address three") === 3, "control: an address is not counted as words");

// ---- the app ----------------------------------------------------------------------------------------------
const js = readdirSync(path.join(APP_ROOT, "js")).filter((f) => f.endsWith(".js"));
const jsLines = js.reduce((n, f) => n + lines(read(`js/${f}`)), 0);
const shell = SHELL.filter((f) => js.includes(f));
const shellLines = shell.reduce((n, f) => n + lines(read(`js/${f}`)), 0);
check(shell.length <= LIMITS.shellModules && ["main.js", "app.js", "lang.js"].every((f) => shell.includes(f)), `shell: ${shell.length} of the presenter's ${LIMITS.shellModules} planned modules so far (${shell.join(", ")})`);
check(shellLines <= LIMITS.shellLines, `shell: ${shellLines} lines, at most ${LIMITS.shellLines}`);
check(jsLines <= LIMITS.jsLines, `app: ${jsLines} lines of JavaScript in ${js.length} modules, at most ${LIMITS.jsLines}`);
const css = readdirSync(path.join(APP_ROOT, "css")).filter((f) => f.endsWith(".css"));
const cssLines = css.reduce((n, f) => n + lines(read(`css/${f}`)), 0);
check(css.length === LIMITS.cssFiles && cssLines <= LIMITS.cssLines, `app: ${cssLines} lines of CSS in ${css.length} file(s), one file of at most ${LIMITS.cssLines} lines`);

// ---- network and policy -----------------------------------------------------------------------------------
const net = js.filter((f) => NET.test(code(read(`js/${f}`))));
check(!net.length || net.join() === "anthropic.js", `network: no module makes requests but js/anthropic.js, which arrives in 0.3.0 (found in ${net.join(", ") || "none"})`);
const hosts = [...js.map((f) => `js/${f}`), ...readdirSync(path.join(APP_ROOT, "js/i18n")).map((f) => `js/i18n/${f}`), "index.html", "css/app.css"].flatMap((f) => hostsIn(code(read(f))).map((h) => `${f}: ${h}`));
check(!hosts.length, `network: no module and not the page names a host to call but the API${hosts.length ? `; found ${[...new Set(hosts)].slice(0, 6).join(", ")}` : ""}`);
const p = policyProblems(read("index.html"));
check(!p.length, `policy: the page connects to api.anthropic.com only and loads everything from itself${p.length ? `; ${p.join("; ")}` : ""}`);

// ---- the cuts ---------------------------------------------------------------------------------------------------
const page = read("index.html");
const leftUi = page.match(CUT_UI) || page.match(CUT_TEXT);
check(!leftUi, `page: nothing the design review cut is in index.html${leftUi ? ` (found ${leftUi[0]})` : ""}`, cut);
const texts = [...js.map((f) => `js/${f}`), "js/i18n/en.js", "js/i18n/de.js"];
const leftCode = texts.map((f) => [f, code(read(f)).match(CUT_UI) || code(read(f)).match(CUT_TEXT)]).filter(([, m]) => m);
check(!leftCode.length, `page: no script or dictionary brings a cut part back${leftCode.length ? ` (${leftCode.map(([f, m]) => `${f}: ${m[0]}`).join("; ")})` : ""}`, cut);
const tiles = [...page.matchAll(/data-vc-kpi="([^"]+)"/g)].map((m) => m[1]);
check(tiles.length === 3, `page: three key figures, no fourth (${tiles.join(", ")})`, cut);

// ---- docs ---------------------------------------------------------------------------------------------------------
const count = (f) => (existsSync(path.join(APP_ROOT, f)) ? words(read(f)) : Infinity);
for (const [f, max] of [["README.md", LIMITS.readme], ["DESIGN.md", LIMITS.design], ["DATA_SOURCES.md", LIMITS.sources]]) check(count(f) <= max, `docs: ${f} has ${count(f)} words, at most ${max}`);
if (existsSync(path.join(APP_ROOT, "DEMO_SCRIPT.md"))) check(count("DEMO_SCRIPT.md") <= LIMITS.script, `docs: DEMO_SCRIPT.md has ${count("DEMO_SCRIPT.md")} words, at most ${LIMITS.script}`);

let failed = 0;
for (const [list, token] of [[results, null], [cut, "CUTS OK"]]) {
  for (const [ok, what] of list) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  const f = list.filter(([ok]) => !ok).length;
  failed += f;
  if (token && !f) console.log(token);
}
if (failed) { console.log(`\n${failed} of ${results.length + cut.length} checks failed.`); process.exit(1); }
console.log(`\nAll ${results.length + cut.length} checks passed.\nLEAN OK`);
