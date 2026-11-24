// Runs every check in order and prints a summary. The tool itself needs none of this.
// Usage: node tests/run-all.mjs                  (all suites)
//        node tests/run-all.mjs unit shell       (only the named suites)
//        node tests/run-all.mjs --require-vici   (fail, rather than skip, without a ViciDesign checkout)
// Adapted from the Sovereignty Assessment's tests/run-all.mjs.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";

const SUITES = [
  { id: "tokens", what: "colour system on Vici's tokens, light and dark: contrast, colour-blind separation", file: "tests/tokens.mjs", browser: false },
  { id: "page-icon", what: "page icon: favicon, header and loading screen, as on the website's card", file: "tests/page-icon.mjs", browser: false },
  { id: "vici-files", what: "vici/ holds exactly the files its README lists, unchanged from Vici", file: "tests/vici-files.mjs", browser: false },
  { id: "i18n", what: "both languages: the same keys, no empty value, the same placeholders, every key asked for and used, no typed sentence", file: "tests/i18n.mjs", browser: false },
  { id: "unit", what: "the language module, the formats, the risk helpers, the canvas and the configuration", file: "tests/unit.mjs", browser: false },
  { id: "engine", what: "golden cases B0 to B2 and the boundaries within 1e-9, every display string in both languages", file: "tests/engine.mjs", browser: false },
  { id: "schemas", what: "the handoff schema, the agents' output schemas within the API's limits, the twelve records", file: "tests/schemas.mjs", browser: false },
  { id: "kpis", what: "the sector KPI library: thirteen sets, 8 to 12 KPIs each, both languages, no benchmark values", file: "tests/kpis.mjs", browser: false },
  { id: "scenarios", what: "the scenario checker passes the three scenarios and fails on a planted defect of each kind", file: "tests/scenarios.mjs", browser: false },
  { id: "audit", what: "the fact audit on golden texts in both languages, and each guardrail refusing a planted defect", file: "tests/audit.mjs", browser: false },
  { id: "policy", what: "the security policy exactly as the brief has it, nothing loaded from elsewhere, no inline script or style", file: "tests/policy.mjs", browser: false },
  { id: "decisions", what: "the four decisions after 0.2.0, settled with Vici first: theme script, first lines, German words, recorded", file: "tests/decisions.mjs", browser: false },
  { id: "lean", what: "the presenter's size, no request before the live client, the design review's cuts, the docs' length", file: "tests/lean.mjs", browser: false },
  { id: "hygiene", what: "no client, prospect, contact or meeting named in any published file", file: "tests/hygiene.mjs", browser: false },
  { id: "parity", what: "the shared parts equal every sibling that has them", file: "tests/parity.mjs", browser: false },
  { id: "docs", what: "the documents: sections, length, version, every path they name", file: "tests/docs.mjs", browser: false },
  { id: "storage", what: "nothing is kept: storage only for the theme, the language and the guide's note, in the code and in the browser, a played run included", file: "tests/storage.mjs", browser: true },
  { id: "shell", what: "the page in Chromium: English first, the switch without a reload, the guide, the figures, the talk bar, the credit", file: "tests/shell.mjs", browser: true },
  { id: "presenter", what: "each scenario played offline in both languages with other choices: tiles, canvas and summary agree with the engine", file: "tests/presenter.mjs", browser: true },
  { id: "play", what: "Play's timing and stops, the keys, a link to a later step, the address and the focus", file: "tests/play.mjs", browser: true },
  { id: "layout", what: "every step of the three scenarios at 1280 × 720 and 1920 × 1080 in both themes and languages: one screen, nothing cut, screenshots", file: "tests/layout.mjs", browser: true },
  { id: "vici", what: "Vici's own checks on the page and on every step rendered in both languages, the dictionaries, the scenarios, the docs; vici/ byte for byte", file: "tests/vici.mjs", browser: true },
  { id: "hexagon", what: "nothing round: the tool's files, and the rendered page in both themes", file: "tests/hexagon.mjs", browser: true }
];

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const chosen = SUITES.filter((s) => !only.length || only.includes(s.id));
const unknown = only.filter((id) => !SUITES.some((s) => s.id === id));
if (unknown.length) { console.log(`Unknown suite(s): ${unknown.join(", ")}. Suites: ${SUITES.map((s) => s.id).join(", ")}`); process.exit(1); }
const summary = [];
// In GitHub Actions a failed suite also becomes an annotation with its FAIL lines, readable in the
// run's summary and through the API without the full log.
const CI = process.env.GITHUB_ACTIONS === "true";
const annotate = (s, out) => {
  const lines = out.split("\n").filter((l) => l.trim());
  const picked = [];
  lines.forEach((l, i) => {
    if (!/^(FAIL|Error|AssertionError|TypeError)|failed|exceeded/i.test(l.trim())) return;
    picked.push(l.trim());
    for (let j = i + 1; j < lines.length && /^\s+(-|at |\S)/.test(lines[j]) && j <= i + 8; j++) picked.push(lines[j].trim());
  });
  const text = (picked.length ? picked : lines.slice(-12).map((l) => l.trim())).join(" ⏎ ").slice(0, 6000);
  console.log(`::error title=${s.id} suite failed::${text}`);
};
for (const s of chosen) {
  console.log(`\n=== ${s.id}: ${s.what} ===`);
  const started = Date.now();
  const r = spawnSync(process.execPath, [path.join(APP_ROOT, s.file), ...(s.id === "vici" ? flags : [])], { cwd: APP_ROOT, stdio: CI ? ["inherit", "pipe", "pipe"] : "inherit", env: process.env, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (CI) {
    process.stdout.write(r.stdout || "");
    process.stderr.write(r.stderr || "");
    if (r.status !== 0) annotate(s, `${r.stdout || ""}\n${r.stderr || ""}`);
  }
  summary.push({ ...s, ok: r.status === 0, code: r.status, seconds: Math.round((Date.now() - started) / 1000) });
  if (r.status === 2 && s.browser) {
    console.log("Playwright is missing; browser suites are skipped. See tests/README.md.");
    break;
  }
}

console.log("\n=== Summary ===");
for (const s of summary) console.log(`${s.ok ? "PASS" : "FAIL"}  ${s.id.padEnd(10)} ${String(s.seconds).padStart(4)} s  ${s.what}`);
const skipped = chosen.length - summary.length;
if (skipped) console.log(`(${skipped} suite${skipped === 1 ? "" : "s"} not run)`);
const allPassed = summary.length === chosen.length && summary.every((s) => s.ok);
// The success line names a run of every suite (a partial run says so above).
if (allPassed && !only.length) console.log(`ALL SUITES PASSED (${summary.length} of ${SUITES.length})`);
process.exit(allPassed ? 0 : 1);
