// The documents of this version are complete, short and consistent with the code:
//   - README.md at most 900 words, DESIGN.md at most 700 and DATA_SOURCES.md at most 1,200 (its
//     addresses not counted); a word is anything between spaces, table bars included; each carries its
//     sections and names the version js/config.js does; README links the published site;
//   - TECH_NOTES.md has its numbered sections, and every section the code or a document cites
//     ("TECH_NOTES §3") exists;
//   - DATA_SOURCES.md quotes Strategyzer's credit as its terms word it, with the date read, and links the
//     terms and the licence; TECH_NOTES.md logs the date the prices were read;
//   - REVIEW.md names every file whose header says it was copied, adapted or taken from elsewhere, and
//     every file it names exists;
//   - tests/README.md lists every suite tests/run-all.mjs runs, and the count;
//   - every repository path a document names (in backticks or as a relative link) exists;
//   - from 0.3.0 (G17 of M3): TECH_NOTES.md §2 gives each API fact the live client rests on with its
//     source, read on 24 November 2026; REVIEW.md names each file of the shared live client with the
//     commit it came from; README.md says where a live run sends its requests and what it costs, and
//     its costs are the estimate js/estimate.js gives for Tidewell Lines.
// Adapted from the Sovereignty Assessment's tests/docs.mjs.
// Usage: node tests/docs.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { APP_ROOT } from "./lib/harness.mjs";

const { APP } = await import(pathToFileURL(path.join(APP_ROOT, "js/config.js")).href);
const DOCS = {
  "README.md": { max: 900, sections: ["What it does", "What is real and what is simulated", "A live run", "The canvas", "Run it", "Tests", "The documents", "Part of a set of four", "Author"], version: `version ${APP.version}` },
  "DESIGN.md": { max: 700, sections: ["Who it is for and where it is seen", "The screen", "Colour", "Words and languages", "The figures", "What stayed and what went"], version: `Version ${APP.version}` },
  "DATA_SOURCES.md": { max: 1200, urlsFree: true, sections: ["The Business Model Canvas", "The German names of the blocks", "The sector KPI library", "The exchange rate", "The fictional companies"], version: `Version ${APP.version}` },
  "TECH_NOTES.md": { numbered: 15, version: `Version ${APP.version}` },
  "REVIEW.md": { sections: ["Copied unchanged", "Copied with a new header", "Adapted", "Written for this tool"], version: `Version ${APP.version}` },
  "tests/README.md": { sections: ["What runs", "Setup for the browser suites", "The private term list", "The golden cases"] },
  "vici/README.md": {},
  "DEMO_SCRIPT.md": { max: 700, sections: ["Before you start", "If something goes wrong", "Questions that will come", "After the demo"] },
  "DEMO_SCRIPT.de.md": { max: 700, sections: ["Bevor Sie anfangen", "Wenn etwas schiefgeht", "Fragen, die kommen werden", "Nach der Vorführung"] },
  "PLAN.md": {}
};
const LIVE_URL = "https://victorpflueger.github.io/BMC-challenger/";
const CREDIT = "The text and link Strategyzer.com should be clearly visible and legible under every canvas.";

const problems = [];
const text = {};
const counts = [];
const wordsOf = (t, urlsFree) => (urlsFree ? t.replace(/https?:\/\/\S+/g, " ") : t).split(/\s+/).filter(Boolean).length;
for (const [f, rule] of Object.entries(DOCS)) {
  const p = path.join(APP_ROOT, f);
  if (!fs.existsSync(p)) { problems.push(`${f} is missing`); continue; }
  const t = fs.readFileSync(p, "utf8");
  text[f] = t;
  if (rule.max) {
    const tokens = wordsOf(t, rule.urlsFree);
    counts.push(`${f} ${tokens} words of ${rule.max}${rule.urlsFree ? " (addresses not counted)" : ""}`);
    if (tokens > rule.max) problems.push(`${f} has ${tokens} words; at most ${rule.max}`);
  }
  const heads = [...t.matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1].trim());
  for (const s of rule.sections || []) if (!heads.some((h) => h.startsWith(s))) problems.push(`${f} lacks the section "${s}"`);
  if (rule.numbered) for (let n = 1; n <= rule.numbered; n++) if (!heads.some((h) => h.startsWith(`${n}. `))) problems.push(`${f} lacks section ${n}`);
  if (rule.version && !t.includes(rule.version)) problems.push(`${f} does not name "${rule.version}"`);
}
if (text["README.md"] && !text["README.md"].includes(LIVE_URL)) problems.push(`README.md does not link the published site (${LIVE_URL})`);
// The guides say which version this is, in their What is real chapter.
{
  const page = fs.readFileSync(path.join(APP_ROOT, "index.html"), "utf8");
  for (const head of ["This version", "Diese Version"]) {
    const row = (page.match(new RegExp(`<th scope="row">${head}</th><td>([^<]*)</td>`)) || [])[1] || "";
    if (!row.startsWith(`${APP.version} `)) problems.push(`index.html's guide row "${head}" does not open with ${APP.version} ("${row.slice(0, 40)}")`);
  }
}

// Lines that pass or fail by name: the demo scripts and the version (G4 and G9 of M5).
const verdicts = [];
const verdict = (ok, what, detail = "") => { verdicts.push([ok, what]); if (!ok) problems.push(`${what}${detail ? `: ${detail}` : ""}`); };

// ---- the demo scripts --------------------------------------------------------------------------------------
// Each quotes the default scenario's figures as the engine words them in its language; its timed steps are
// the guide's talk track in that language (the titles, the words to say, the minutes, and a heading that
// names their total); every address it gives (?scenario, ?step, ?guide, ?lang) names a scenario, a step, a
// guide and a language the page takes, and the German script's addresses keep the page German.
const flat = (x) => String(x).replace(/[  ]/g, " ").replace(/[“”„"«»]/g, "").replace(/\s+/g, " ").trim();
const NUMBER_WORDS = { en: ["", "one", "two", "three", "four", "five", "six", "seven"], de: ["", "eine", "zwei", "drei", "vier", "fünf", "sechs", "sieben"] };
function talkTrack(page, lang) {
  const id = `guide-${lang}`;
  const start = page.indexOf(`id="${id}"`);
  const guide = page.slice(start, page.indexOf("</dialog>", start));
  const unescape = (t) => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'");
  return [...guide.matchAll(/<li><strong>(.*?)<\/strong>\s*<span class="vc-guide__say">(.*?)<\/span>\s*<span class="vc-guide__time">(.*?)<\/span><\/li>/gs)]
    .map((m) => ({ title: flat(unescape(m[1].replace(/<[^>]+>/g, ""))).replace(/\.$/, ""), say: flat(unescape(m[2].replace(/<[^>]+>/g, ""))), time: flat(m[3]) }));
}
function scriptSteps(text) {
  return text.split("\n").filter((l) => /^\| \d+(\.\d+)? min \|/.test(l)).map((l) => {
    const cells = l.split("|").slice(1, -1).map((c) => c.trim());
    return { time: flat(cells[0]), title: flat(cells[1]), say: flat(cells[2]) };
  });
}
function scriptProblems(text, lang, track, figures, ids) {
  const out = [];
  const steps = scriptSteps(text);
  if (steps.length !== track.length) out.push(`${steps.length} timed steps, the talk track has ${track.length}`);
  track.forEach((g, i) => {
    const s = steps[i];
    if (!s) return;
    if (s.title !== g.title) out.push(`step ${i + 1} is "${s.title}", the guide's "${g.title}"`);
    if (s.time !== g.time) out.push(`step ${i + 1} takes ${s.time}, the guide's ${g.time}`);
    if (s.say !== g.say) out.push(`step ${i + 1} says other words than the guide`);
  });
  const total = track.reduce((n, g) => n + parseFloat(g.time), 0);
  const heading = lang === "de" ? `## Die ${NUMBER_WORDS.de[total]} Minuten` : `## The ${NUMBER_WORDS.en[total]} minutes`;
  if (!text.split("\n").includes(heading)) out.push(`no heading "${heading.slice(3)}" for the talk track's ${total} minutes`);
  const body = flat(text);
  for (const [name, value] of Object.entries(figures)) if (!body.includes(flat(value))) out.push(`does not quote ${name} as the engine words it (${value})`);
  for (const m of text.matchAll(/`(\?[^`]+|(?:scenario|step|guide|lang)=[^`]+)`/g)) {
    const q = new URLSearchParams(m[1].replace(/^\?/, ""));
    for (const [k, v] of q) {
      const fine = k === "scenario" ? ids.includes(v) : k === "step" ? /^[0-5]$/.test(v) : k === "guide" ? ["0", "present"].includes(v) : k === "lang" ? ["en", "de"].includes(v) : false;
      if (!fine) out.push(`the address ${m[1]} names ${k}=${v}, which the page does not take`);
    }
    if (lang === "de" && m[1].startsWith("?") && q.get("lang") !== "de") out.push(`the German address ${m[1]} does not keep the page German`);
  }
  return out;
}
{
  const page = fs.readFileSync(path.join(APP_ROOT, "index.html"), "utf8");
  const { localise, buildRun, recordedChoices } = await import(pathToFileURL(path.join(APP_ROOT, "js/run.js")).href);
  const { SCENARIOS } = await import(pathToFileURL(path.join(APP_ROOT, "data/scenarios/index.js")).href);
  const { SIM } = await import(pathToFileURL(path.join(APP_ROOT, "js/config.js")).href);
  const { fmtMoney, fmtPartMoney, fmtPressure } = await import(pathToFileURL(path.join(APP_ROOT, "js/format.js")).href);
  const { estimateRun } = await import(pathToFileURL(path.join(APP_ROOT, "js/estimate.js")).href);
  const ids = SCENARIOS.map((x) => x.id);
  const figuresOf = (lang) => {
    const sc = localise(SCENARIOS.find((x) => x.id === SIM.defaultScenario), lang);
    const r = buildRun(sc, recordedChoices(sc));
    const eur = new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(estimateRun(sc, r).eur);
    return {
      "the company": sc.company.name,
      "what is at stake": fmtPartMoney(r.before.atStake, r.before.priced, r.before.count, lang),
      "the blocks under pressure": fmtPressure(r.before.pressure.before, r.before.pressure.of, lang),
      "what is left": fmtPartMoney(r.after.left, r.after.priced, r.after.count, lang),
      "the blocks still under pressure": fmtPressure(r.after.pressure.after, r.after.pressure.of, lang),
      "the first issue's expected loss": fmtMoney(r.before.issues[0].before.expected, lang),
      "the AI's items": String(Object.values(r.completed.blocks).flat().filter((it) => it.source === "ai").length),
      "the session cost": `≈ ${eur}`
    };
  };
  let agree = 0;
  const found = [];
  for (const [file, lang] of [["DEMO_SCRIPT.md", "en"], ["DEMO_SCRIPT.de.md", "de"]]) {
    const t = text[file];
    if (!t) { found.push(`${file} is missing`); continue; }
    const track = talkTrack(page, lang);
    const bad = scriptProblems(t, lang, track, figuresOf(lang), ids);
    if (track.length < 3 || track.length > 7) bad.push(`the guide's talk track has ${track.length} steps`);
    if (bad.length) found.push(...bad.map((b) => `${file}: ${b}`)); else agree += 1;
  }
  verdict(agree === 2, `demo scripts: ${agree} of 2 agree with the engine and the talk track`, found.slice(0, 6).join("; "));
  // The rule fails on planted scripts: a figure changed, a step dropped, an address the page does not take.
  const en = text["DEMO_SCRIPT.md"] || "";
  const track = talkTrack(page, "en");
  const figs = figuresOf("en");
  const caught = [
    en.replace(flat(figs["what is left"]) === figs["what is left"] ? figs["what is left"] : "\u0000", "€9.9m"),
    en.split("\n").filter((l, i, all) => i !== all.findIndex((x) => /^\| \d+ min \|/.test(x))).join("\n"),
    `${en}\nTry \`?scenario=s9&step=7\`.`
  ].map((planted) => scriptProblems(planted, "en", track, figs, ids).length > 0);
  verdict(caught.every(Boolean) && en.includes(figs["what is left"]), `control: a demo script with a changed figure, a dropped step and an address the page does not take is caught (${caught.filter(Boolean).length} of 3)`);
}

// ---- the version -------------------------------------------------------------------------------------------
// The page's strings, its static text and the documents (but TECH_NOTES and REVIEW, whose logs name each
// version as it came) name no version of this tool but js/config.js's, and promise no later one. A line may
// name another tool's version ("Data Quality Agent 2.2.0") or a standard ("EN ISO 14083"). Adapted from the
// PESTEL Challenger 1.0.0's tests/docs.mjs (907b1c7).
const OTHER_TOOL = /(Agent|Assessment|Radar|Challenger|Ideator|Hunter|Vici|ViciDesign|Playwright|Chromium|Chrome|Node|ISO|EN|Haiku|Sonnet|Opus|schema|playwright@)\s*v?\d+\.\d+(\.\d+)?/i;
function versionProblems(where, t) {
  const out = [];
  for (const line of t.split("\n")) {
    const promise = line.match(/\b(follows? in|comes? with version|arrives? in|from version|folgt in|kommt mit Version)\b[^.]*\d+\.\d+(\.\d+)?/i);
    if (promise) out.push(`${where}: "${promise[0].slice(0, 60)}"`);
    for (const m of line.matchAll(/\b\d+\.\d+\.\d+\b/g)) {
      if (m[0] === APP.version) continue;
      if (promise && m.index >= promise.index && m.index < promise.index + promise[0].length) continue;
      const around = line.slice(Math.max(0, m.index - 24), m.index + m[0].length + 12);
      if (OTHER_TOOL.test(around)) continue;
      out.push(`${where}: "${around.trim()}"`);
    }
  }
  return out;
}
{
  const found = [];
  for (const l of ["en", "de"]) {
    const { default: dict } = await import(pathToFileURL(path.join(APP_ROOT, `js/i18n/${l}.js`)).href);
    for (const [k, v] of Object.entries(dict)) found.push(...versionProblems(`${l}.js ${k}`, String(v)));
  }
  found.push(...versionProblems("index.html", fs.readFileSync(path.join(APP_ROOT, "index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ")));
  for (const name of ["README.md", "DESIGN.md", "DATA_SOURCES.md", "DEMO_SCRIPT.md", "DEMO_SCRIPT.de.md"]) if (text[name]) found.push(...versionProblems(name, text[name]));
  verdict(!found.length, `version: the page's strings, its static text and the documents name no version but ${APP.version} and promise none`, found.slice(0, 4).join("; "));
  const stale = versionProblems("planted", "Version 0.3.0 plays recorded runs. The report as a PDF follows in 0.4.0.\nBuilt on the Data Quality Agent 2.2.0.");
  verdict(stale.length === 2 && !stale.some((x) => x.includes("2.2.0")), "control: a planted line with an earlier version and a promise is caught, another tool's version is not", stale.join("; "));
}

// The canvas's credit, the licence and the dates.
const sources = text["DATA_SOURCES.md"] || "";
if (!sources.includes(`> ${CREDIT}`)) problems.push("DATA_SOURCES.md does not quote Strategyzer's credit word for word");
for (const u of ["https://strategyzer.com/legal/usage-of-our-tools", "https://creativecommons.org/licenses/by-sa/3.0/", "https://www.strategyzer.com"]) if (!sources.includes(u)) problems.push(`DATA_SOURCES.md does not link ${u}`);
if (!/read on 23 November 2026 at https:\/\/strategyzer\.com\/legal\/usage-of-our-tools/.test(sources)) problems.push("DATA_SOURCES.md does not give the date Strategyzer's terms were read");
if (!/Read on \d{1,2} [A-Z][a-z]+ \d{4} at https:\/\/platform\.claude\.com\/docs\/en\/about-claude\/models\/overview and https:\/\/platform\.claude\.com\/docs\/en\/about-claude\/pricing/.test(text["TECH_NOTES.md"] || "")) problems.push("TECH_NOTES.md does not log the date the models and prices were read");

// The live client's facts, files and costs (G17 of M3).
const API_PAGES = [
  "https://platform.claude.com/docs/en/about-claude/models/overview",
  "https://platform.claude.com/docs/en/about-claude/pricing",
  "https://platform.claude.com/docs/en/build-with-claude/effort",
  "https://platform.claude.com/docs/en/build-with-claude/thinking",
  "https://platform.claude.com/docs/en/build-with-claude/structured-outputs",
  "https://platform.claude.com/docs/en/build-with-claude/token-counting",
  "https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool",
  "https://platform.claude.com/docs/en/api/errors",
  "https://platform.claude.com/docs/en/api/rate-limits"
];
/** The facts of TECH_NOTES §2: each page in a row of its table, under a heading read on that day. */
function factProblems(notes) {
  const out = [];
  const sec = (notes.match(/^## 2\. [\s\S]*?(?=^## 3\. )/m) || [""])[0];
  if (!/read again on 24 November 2026 at each source below/.test(sec) || !/\| Source, read on 24 November 2026 \|/.test(sec)) out.push("TECH_NOTES.md §2 does not say its facts were read on 24 November 2026");
  for (const u of API_PAGES) if (!sec.split("\n").some((l) => /^\| .+ \| /.test(l) && l.trim().endsWith(`| ${u} |`))) out.push(`TECH_NOTES.md §2 gives no fact from ${u}`);
  return out;
}
problems.push(...factProblems(text["TECH_NOTES.md"] || ""));
const LIVE_CLIENT = ["js/anthropic.js", "js/sse.js", "js/cost.js", "js/keystore.js"];
for (const f of LIVE_CLIENT) {
  const row = (text["REVIEW.md"] || "").split("\n").find((l) => l.startsWith(`| \`${f}\` |`));
  if (!row || !/\b[0-9a-f]{7,40}\b/.test(row.split("|")[2] || "")) problems.push(`REVIEW.md does not name ${f} with the commit it came from`);
}
{
  const { estimateRun } = await import(pathToFileURL(path.join(APP_ROOT, "js/estimate.js")).href);
  const { localise, buildRun, recordedChoices } = await import(pathToFileURL(path.join(APP_ROOT, "js/run.js")).href);
  const { scenarioById } = await import(pathToFileURL(path.join(APP_ROOT, "data/scenarios/index.js")).href);
  const sc = localise(scenarioById("s1"), "en");
  const run = buildRun(sc, recordedChoices(sc));
  const e = (p, research = false) => estimateRun(sc, run, p, { research }).eur;
  const cents = (v) => `€${v.toFixed(2)}`;
  const live = ((text["README.md"] || "").match(/^## A live run\n([\s\S]*?)(?=^## )/m) || [])[1] || "";
  const claims = [
    [e("fast") < 0.01 && e("balanced") < 0.01, "under €0.01 on Fast and on Balanced"],
    [true, `about ${cents(e("thorough"))} on Thorough`],
    [true, `research adds about ${cents(e("balanced", true) - e("balanced"))}`],
    [true, "`api.anthropic.com` alone, with your key"]
  ];
  for (const [holds, words] of claims) if (!holds || !live.includes(words)) problems.push(`README.md's live run does not say "${words}"${holds ? "" : ", which the estimate no longer bears out"}`);
  counts.push(`README.md's live costs: Fast ${cents(e("fast"))}, Balanced ${cents(e("balanced"))}, Thorough ${cents(e("thorough"))}, research ${cents(e("balanced", true) - e("balanced"))} (estimate for Tidewell Lines)`);
  // The checks fail on planted faults.
  if (!factProblems((text["TECH_NOTES.md"] || "").replace(API_PAGES[7], "https://example.com/errors")).some((x) => x.includes("api/errors"))) problems.push("self-test: a missing source in TECH_NOTES.md §2 went unnoticed");
  if (!factProblems((text["TECH_NOTES.md"] || "").replace("read again on 24 November 2026 at each source below", "read again at each source below")).length) problems.push("self-test: a missing date in TECH_NOTES.md §2 went unnoticed");
}

// The scenarios' facts (gate G12): every scenario has its as-of date, every fact it names a row in
// DATA_SOURCES.md with the date read, every source it cites a link there; a scenario 90 days past its date
// says to check for updates (tests/presenter.mjs shows it in the browser).
{
  const { SCENARIOS } = await import(pathToFileURL(path.join(APP_ROOT, "data/scenarios/index.js")).href);
  const { SIM } = await import(pathToFileURL(path.join(APP_ROOT, "js/config.js")).href);
  const { staleWords } = await import(pathToFileURL(path.join(APP_ROOT, "js/story.js")).href);
  const rows = sources.split("\n").filter((l) => /^\| S\d\.\d+ \|/.test(l));
  for (const sc of SCENARIOS) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sc.as_of)) problems.push(`${sc.id} has no as-of date`);
    if (!sc.facts.length) problems.push(`${sc.id} names no fact`);
    for (const id of sc.facts) {
      const row = rows.find((l) => l.startsWith(`| ${id} |`));
      if (!row) problems.push(`DATA_SOURCES.md lacks the fact ${id} of ${sc.id}`);
      else if (!/\| \d{4}-\d{2}-\d{2} \|\s*$/.test(row)) problems.push(`DATA_SOURCES.md gives no date read for ${id}`);
    }
    for (const s of sc.answers.signals) if (!sources.includes(s.url)) problems.push(`DATA_SOURCES.md does not link ${sc.id}'s source ${s.url}`);
  }
  const stale = staleWords(SCENARIOS[0], "en");
  if (SIM.staleDays !== 90 || !/check for updates/i.test(stale) || !/aktualität/i.test(staleWords(SCENARIOS[0], "de"))) problems.push(`a scenario 90 days old does not say to check for updates (${SIM.staleDays} days, "${stale}")`);
  counts.push(`${rows.length} scenario facts in DATA_SOURCES.md for ${SCENARIOS.length} scenarios`);
}

// The files in the repository, and those a header says came from elsewhere.
const git = (...args) => execFileSync("git", args, { cwd: APP_ROOT, encoding: "utf8" });
const tracked = git("ls-files", "--cached", "--others", "--exclude-standard").split("\n").filter((f) => f && fs.existsSync(path.join(APP_ROOT, f)));
const taken = tracked.filter((f) => /\.(m?js|css|html|yml)$/.test(f) && !f.startsWith("vici/")).filter((f) => {
  const head = fs.readFileSync(path.join(APP_ROOT, f), "utf8").split("\n").slice(0, 25).join("\n");
  return /\b(Adapted from the|Copied from the|Taken from the)\b/.test(head);
});
const review = text["REVIEW.md"] || "";
const reviewNames = new Set([...review.matchAll(/`([^`\s]+)`/g)].map((m) => m[1]));
const unreviewed = taken.filter((f) => !reviewNames.has(f) && !reviewNames.has(f.replace(/^tests\//, "")) && !(f.startsWith(".github/workflows/") && review.includes(path.basename(f))));
if (unreviewed.length) problems.push(`REVIEW.md does not name ${unreviewed.join(", ")}, whose header says it was taken from elsewhere`);
if (taken.length < 8) problems.push(`only ${taken.length} files say where they came from; the header check may have broken`);

// tests/README.md lists every suite run-all runs.
const runAll = fs.readFileSync(path.join(APP_ROOT, "tests/run-all.mjs"), "utf8");
const suites = [...runAll.matchAll(/\{ id: "([a-z0-9-]+)"/g)].map((m) => m[1]);
const listed = [...(text["tests/README.md"] || "").matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((m) => m[1]);
const missingSuites = suites.filter((s) => !listed.includes(s));
const extraSuites = listed.filter((s) => !suites.includes(s));
if (missingSuites.length || extraSuites.length) problems.push(`tests/README.md lists ${listed.length} suites, run-all runs ${suites.length}${missingSuites.length ? `; missing ${missingSuites.join(", ")}` : ""}${extraSuites.length ? `; extra ${extraSuites.join(", ")}` : ""}`);
if (!(text["tests/README.md"] || "").includes(`ALL SUITES PASSED (${suites.length} of ${suites.length})`)) problems.push(`tests/README.md does not give the count of suites (${suites.length})`);

// Sections the code and the documents cite.
let cited = 0;
for (const f of [...tracked.filter((x) => /\.(m?js|css|html|yml|md)$/.test(x) && !x.startsWith("vici/") && x !== "PLAN.md")]) {
  const t = fs.readFileSync(path.join(APP_ROOT, f), "utf8");
  for (const m of t.matchAll(/\bTECH_NOTES(?:\.md)? ?§ ?(\d+)/g)) {
    cited += 1;
    if (text["TECH_NOTES.md"] && !new RegExp(`^## ${m[1]}\\. `, "m").test(text["TECH_NOTES.md"])) problems.push(`${f} cites TECH_NOTES §${m[1]}, which does not exist`);
  }
  if (/\bDESIGN(?:\.md)? ?§ ?\d/.test(t)) problems.push(`${f} cites DESIGN.md by section number; its sections have names`);
}

// Paths the documents name. A file a later milestone adds may be named ahead of time, if PLAN.md's file
// tree holds it: each with the version that brings it.
const PLANNED = { "js/keystore.js": "0.3.0", "js/anthropic.js": "0.3.0", "js/sse.js": "0.3.0", "js/cost.js": "0.3.0", "DEMO_SCRIPT.md": "1.0.0" };
for (const [f] of Object.entries(PLANNED)) if (!(text["PLAN.md"] || "").includes(path.basename(f))) problems.push(`${f} is named as planned, but PLAN.md's file tree does not hold it`);
const EXT = /\.(m?js|css|html|md|json|svg|yml|txt|jpg|woff2)$/;
const FOLDERS = ["", "js", "js/i18n", "css", "data", "schemas", "tests", "tests/lib", "tests/fixtures", "vici", "vici/dist", ".github/workflows"];
let named = 0;
for (const [f, t] of Object.entries(text)) {
  if (f === "PLAN.md" || f === "vici/README.md") continue;
  const base = path.dirname(path.join(APP_ROOT, f));
  const names = new Set();
  for (const m of t.matchAll(/`([^`\s]+)`/g)) names.add(m[1]);
  for (const m of t.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) if (!/^[a-z]+:/i.test(m[1])) names.add(m[1]);
  for (const n of names) {
    const clean = n.replace(/[.,;:]$/, "");
    if (/[<>*{}$=]|^~|^\/|^https?:|^-|^\?/.test(clean)) continue;
    if (/^[\w-]+(\.[\w-]+)*\.(io|com|org|net|de|dev|ai|eu)(\/|$)/i.test(clean)) continue; // a web address, not a path
    if (!clean.includes("/") && !EXT.test(clean)) continue;
    if (!/^[\w./ -]+$/.test(clean) || !(EXT.test(clean) || clean.endsWith("/") || /^(\.\.\/)?(js|css|data|schemas|tests|vici|fixtures|lib)(\/|$)/.test(clean))) continue;
    if (/^\.\.\//.test(clean)) continue; // a folder next to the repository (../ViciDesign), not in it
    const candidates = clean.includes("/") ? [path.join(APP_ROOT, clean), path.join(base, clean)] : FOLDERS.map((d) => path.join(APP_ROOT, d, clean));
    named += 1;
    if (!candidates.some((c) => fs.existsSync(c)) && !PLANNED[clean]) problems.push(`${f} names ${clean}, which does not exist`);
  }
}

// Negative controls: the counting, the section check and the credit check catch planted faults.
{
  const planted = "## 1. A\n" + "word ".repeat(950);
  if (!(wordsOf(planted) > 900)) problems.push("self-test: the word count missed a planted long document");
  if (/^## 2\. /m.test(planted)) problems.push("self-test: the section check missed a planted missing section");
  if (wordsOf("a https://example.com/b c", true) !== 2) problems.push("self-test: an address was counted as a word");
  if (`> ${CREDIT.replace("legible", "readable")}`.includes(`> ${CREDIT}`)) problems.push("self-test: the credit check missed a changed word");
}

for (const [ok, what] of verdicts) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
for (const c of counts) console.log(`      ${c}`);
for (const p of problems) console.log(`FAIL  ${p}`);
console.log(`${Object.keys(DOCS).length} documents checked, ${taken.length} files that say where they came from, ${cited} section citations and ${named} named paths: ${problems.length} problem${problems.length === 1 ? "" : "s"}.`);
if (!problems.length) console.log("DOCS OK");
process.exit(problems.length ? 1 : 0);
