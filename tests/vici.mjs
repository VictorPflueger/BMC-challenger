// Vici's own rules, checked with Vici's own functions (Build a prototype, "Check it"; AC-01): the How it
// works guides and their key figures (guideProblems), the byline (bylineProblems), the Writing
// guideline's checkable patterns (writingProblems), the AI notice of a page that can start a live run
// (aiNoticeProblems) and names, not record ids (recordIdProblems). They run on the page as served, on the
// page as rendered in English and in German, on every text in the dictionaries and on the docs.
// ViciDesign's check-guide-render.mjs drives the guide over http. vici/ holds Vici's files byte for byte,
// at the commit vici/README.md and the workflow name. The texts the agents and the scenarios write join
// these checks with the simulation in 0.2.0.
//
// Each imported check first fails on a planted control. Prints VICI CONTROLS OK, VICI STANDARDS OK and
// VICI OK. The functions come from a ViciDesign checkout (VICI_DIR, or ../ViciDesign); without one the
// suite says so and passes, unless --require-vici is given or it runs on GitHub Actions. Adapted from the
// Sovereignty Assessment's tests/vici.mjs.
// Usage: node tests/vici.mjs [--require-vici]
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, REQUIRE_VICI, viciDir, launchBrowser, serveStatic, port, NETWORK_NOISE } from "./lib/harness.mjs";

const dir = viciDir();
if (!dir) {
  console.log(`${REQUIRE_VICI ? "FAIL" : "SKIP"}  no ViciDesign checkout in VICI_DIR or next to this repository (../ViciDesign)`);
  process.exit(REQUIRE_VICI ? 1 : 0);
}
const lib = async (file) => import(pathToFileURL(path.join(dir, "scripts", "lib", file)).href);
const { guideProblems } = await lib("guide.mjs");
const { bylineProblems } = await lib("byline.mjs");
const { writingProblems } = await lib("writing.mjs");
const { aiNoticeProblems, canRunLive, AI_NOTICE } = await lib("ai.mjs");
const { recordIdProblems } = await lib("ids.mjs");
const mod = (p) => import(pathToFileURL(path.join(APP_ROOT, p)).href);

const read = (f) => readFileSync(path.join(APP_ROOT, f), "utf8");
const html = read("index.html");
const page = (paragraphs, lang = "en-GB") => `<html lang="${lang}"><body>${paragraphs.map((t) => `<p>${String(t).replace(/</g, "&lt;")}</p>`).join("")}</body></html>`;
const controls = [];
const standards = [];
const control = (ok, what) => controls.push([!!ok, what]);
const check = (ok, what) => standards.push([!!ok, what]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The ids of the tool's data: the KPI library's KPIs, with and without their sector ("general.ebit_margin"
// and "ebit_margin"), and its sectors, where they are not plain words, and the item ids of the handoff
// example. Vici's names-not-ids rule: none of them may reach a screen.
const { KPIS, SECTORS } = await mod("data/kpis.js");
const example = JSON.parse(read("tests/fixtures/handoff-example.json"));
const coded = (id) => /[_-]/.test(id);
const IDS = new Set([...KPIS.map((k) => k.id), ...KPIS.map((k) => k.id.split(".")[1]).filter(coded), ...SECTORS.map((s) => s.id).filter(coded)]);
for (const m of JSON.stringify(example).matchAll(/"id":\s*"([a-z]+-\d+|[a-z_]+\.[a-z_]+)"/g)) IDS.add(m[1]);

// ---- the checks can fail ----------------------------------------------------------------------------
control(guideProblems(html.replace(/<dialog\b[^>]*vc-guide[\s\S]*?<\/dialog>/g, "")).length > 0, "control: guideProblems catches a page without its guides");
control(guideProblems(html.replace('<div class="kpis"', '<p class="vc-stat" data-vc-kpi="Blocks checked" data-vc-kpi-de="Geprüfte Bausteine">6</p><div class="kpis"')).some((p) => /Blocks checked|Geprüfte Bausteine/.test(p)), "control: guideProblems catches a key figure no How it works chapter explains");
control(bylineProblems(html.replace(/href="https:\/\/victorpflueger\.github\.io\/VIP\/index\.html"/, 'href="#"')).length > 0, "control: bylineProblems catches a byline without the website link");
control(writingProblems(page(["The canvas scores 77 — much more."])).length > 0 && writingProblems(page(["A seamless canvas."])).length > 0, "control: writingProblems catches an em dash and a stock word");
control(recordIdProblems("<p>The weakest figure is cost_per_teu, see value-1.</p>", IDS).length === 2 && !recordIdProblems("<p>The weakest figure is the cost per container.</p>", IDS).length, "control: recordIdProblems catches a KPI id and an item id on a screen, and passes names");
control(aiNoticeProblems(html.split(AI_NOTICE.en).join("An assistant")).length > 0 && !aiNoticeProblems('<meta http-equiv="Content-Security-Policy" content="connect-src \'none\'"><p>Replay</p>').length, "control: aiNoticeProblems catches a live page that never says it is an AI, and leaves a page that cannot run live alone");

// ---- the page as served -------------------------------------------------------------------------------
const g = guideProblems(html);
check(!g.length, `the two guides follow Vici's standard, a row in How it works for each key figure in its language included${g.length ? `: ${g.join("; ")}` : ""}`);
check(/<dialog class="vc-dialog vc-guide" id="guide-en" lang="en-GB"[\s\S]*?<h2[^>]*>How the prototype works<\/h2>/.test(html), "the English guide is titled How the prototype works, in English");
check(/<dialog class="vc-dialog vc-guide" id="guide-de" lang="de"[\s\S]*?<h2[^>]*>So funktioniert der Prototyp<\/h2>/.test(html), "the German guide is titled So funktioniert der Prototyp, in German");
const kpis = [...html.matchAll(/\bdata-vc-kpi="([^"]+)" data-vc-kpi-de="([^"]+)"/g)].map((m) => `${m[1]} / ${m[2]}`);
check(kpis.join("|") === "At stake a year / Risiko pro Jahr|Blocks under pressure / Bausteine unter Druck|Session cost / Sitzungskosten", `the header marks three key figures, each in both languages (${kpis.join(", ")})`);
const b = bylineProblems(html);
check(!b.length, `the byline follows Vici's standard${b.length ? `: ${b.join("; ")}` : ""}`);
const w = writingProblems(html);
check(!w.length, `index.html keeps Vici's writing rules${w.length ? `: ${w.join("; ")}` : ""}`);
const a = aiNoticeProblems(html);
check(canRunLive(html) && !a.length, `the page can start a live run and says "${AI_NOTICE.en}"${a.length ? `: ${a.join("; ")}` : ""}`);
check(new RegExp(`id="live" data-vc-live[^>]*>[\\s\\S]*?</button>\\s*<span class="vc-tag vc-tag--feature[^"]*"[^>]*>[\\s\\S]{0,160}${esc(AI_NOTICE.en)}</span>`).test(html), "the AI notice stands in a lilac tag right beside Run it live");
const DE = (await mod("js/i18n/de.js")).default;
const EN = (await mod("js/i18n/en.js")).default;
check(EN["p.ai"] === AI_NOTICE.en && DE["p.ai"] === AI_NOTICE.de, `the German page says "${AI_NOTICE.de}"`);
const header = (html.match(/<header class="app-header"[\s\S]*?<\/header>/) || [""])[0];
check(/>SIMULATION</.test(header), "the header says SIMULATION, in capitals");
const strip = (html.match(/<\/header>(?:\s*<!--[\s\S]*?-->)?\s*<div class="intro"[^>]*>([\s\S]*?)<\/div>\s*(?:<!--[\s\S]*?-->\s*)?<nav/) || [])[1] || "";
check(/<p class="intro-text"[^>]*>[^<]{40,240}<\/p>/.test(strip) && /fictional companies/.test(strip) && /your Claude key/.test(strip) && /class="vc-byline"/.test(strip), "the strip under the header says what the prototype does and how real its data is, beside the byline");
check((html.match(/class="vc-byline"/g) || []).length === 1, "the page carries one byline");
check(IDS.size >= 130 && [...IDS].some((id) => /^[a-z]+-\d+$/.test(id)), `the data's ids are known (${IDS.size}, e.g. ${[...IDS].slice(0, 3).join(", ")})`);

// ---- the page as rendered, in English and in German ---------------------------------------------------
const browser = await launchBrowser();
const server = await serveStatic(APP_ROOT, port(8600));
try {
  for (const lang of ["en", "de"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort("blockedbyclient"));
    const p = await context.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(String(e.message || e)));
    p.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
    await p.goto(`${server.base}?guide=0&lang=${lang}`);
    await p.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
    await p.waitForTimeout(400);
    const view = await p.content();
    // The page in one language shows one guide: the other is out of its way (lang.js takes its
    // data-vc-guide-auto and its button), so Vici's guide check sees the page as a one-language page.
    const other = lang === "en" ? "de" : "en";
    const rg = guideProblems(view.replace(new RegExp(`<dialog\\b[^>]*\\bid="guide-${other}"[\\s\\S]*?</dialog>`), "").replace(new RegExp(`<button[^>]*data-vc-guide-open="guide-${other}"[\\s\\S]*?</button>`), ""));
    const rb = bylineProblems(view);
    const rw = writingProblems(view);
    const ra = aiNoticeProblems(view);
    const name = lang === "en" ? "English" : "German";
    check(!rg.length && !rb.length && !rw.length && !ra.length && !errors.length, `rendered in ${name}: the guide, the byline, the writing and the AI notice pass${[...rg, ...rb, ...rw, ...ra, ...errors].length ? `: ${[...rg, ...rb, ...rw, ...ra, ...errors].join("; ")}` : ""}`);
    check(new RegExp(`<html[^>]*lang="${lang === "de" ? "de" : "en-GB"}"`).test(view) && view.includes(lang === "de" ? AI_NOTICE.de : AI_NOTICE.en), `rendered in ${name}: the page says its language and carries the AI notice in it`);
    const ri = recordIdProblems(view, IDS);
    check(!ri.length, `rendered in ${name}: names, not record ids${ri.length ? `: ${ri.join("; ")}` : ""}`);
    await context.close();
  }
  // ViciDesign's own drive of the guide, over http.
  const r = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(dir, "scripts", "check-guide-render.mjs"), server.base], { cwd: dir, env: process.env });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 240000);
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, out }); });
  });
  check(r.code === 0 && /GUIDE BEHAVIOUR OK/.test(r.out), `Vici's check-guide-render.mjs passes against the page over http${r.code === 0 ? "" : `: ${r.out.split("\n").filter((l) => l.trim()).slice(-6).join(" | ")}`}`);
} finally {
  await server.close();
  await browser.close();
}

// ---- every text in the dictionaries ---------------------------------------------------------------------
for (const [lang, D] of [["en", EN], ["de", DE]]) {
  const texts = Object.values(D);
  const p = writingProblems(page(texts, lang === "de" ? "de" : "en-GB"));
  check(texts.length > 50 && !p.length, `${lang === "en" ? "English" : "German"}: the ${texts.length} texts of the dictionary keep the writing rules${p.length ? `: ${p.join("; ")}` : ""}`);
  const ids = recordIdProblems(texts.join("\n"), IDS);
  check(!ids.length, `${lang === "en" ? "English" : "German"}: names, not record ids, in every text of the dictionary${ids.length ? `: ${ids.join("; ")}` : ""}`);
}
// The KPI library's names and definitions, which the agents and the report show from 0.2.0 on.
for (const lang of ["en", "de"]) {
  const texts = KPIS.flatMap((k) => [k.name[lang], k.definition[lang]]);
  const p = writingProblems(page(texts, lang === "de" ? "de" : "en-GB"));
  check(!p.length, `${lang === "en" ? "English" : "German"}: the names and definitions of the ${KPIS.length} KPIs keep the writing rules${p.length ? `: ${p.slice(0, 6).join("; ")}` : ""}`);
}

// ---- the docs, as text --------------------------------------------------------------------------------
// Code, inline code and addresses are not prose.
for (const doc of ["README.md", "PLAN.md", "DESIGN.md", "TECH_NOTES.md", "DATA_SOURCES.md", "REVIEW.md", "tests/README.md", "vici/README.md"]) {
  const there = existsSync(path.join(APP_ROOT, doc));
  const p = there ? writingProblems(page([read(doc).replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "").replace(/https?:\/\/\S+/g, "")])) : ["missing"];
  check(!p.length, `${doc} keeps the writing rules${p.length ? `: ${p.join("; ")}` : ""}`);
}

// ---- vici/: Vici's files, unchanged, at the commit the README and the workflow name -------------------
const pin = (read("vici/README.md").match(/commit \*\*`([0-9a-f]{7,40})`\*\*/) || [])[1];
const workflow = existsSync(path.join(APP_ROOT, ".github/workflows/tests.yml")) ? read(".github/workflows/tests.yml") : "";
const ref = (workflow.match(/repository: VictorPflueger\/ViciDesign\s+ref: ([0-9a-f]{7,40})/) || [])[1];
check(pin && ref && ref.startsWith(pin), `vici/README.md and the workflow name the same ViciDesign commit (${pin} and ${ref})`);
let head = null;
try { head = execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { /* not a git checkout */ }
check(!head || !pin || head.startsWith(pin), `the ViciDesign checkout is at that commit (${head ? head.slice(0, 7) : "not a git checkout"})`);
const files = [];
const walk = (d) => { for (const f of readdirSync(path.join(APP_ROOT, d))) { const p = `${d}/${f}`; if (statSync(path.join(APP_ROOT, p)).isDirectory()) walk(p); else files.push(p); } };
walk("vici");
const ours = files.filter((f) => f !== "vici/README.md");
const differ = ours.filter((f) => { const there = path.join(dir, f.slice("vici/".length)); return !existsSync(there) || !readFileSync(there).equals(readFileSync(path.join(APP_ROOT, f))); });
check(ours.length >= 10 && !differ.length, `the ${ours.length} files in vici/ equal ViciDesign's byte for byte${differ.length ? `: ${differ.join(", ")} differ` : ""}`);
const listed = [...read("vici/README.md").matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
const unlisted = ours.filter((f) => !listed.some((l) => (l.includes("*") ? new RegExp(`^${l.replace(/[.]/g, "\\.").replace(/\*/g, "[^/]*")}$`).test(f.slice(5)) : f.slice(5) === l)));
check(!unlisted.length, `vici/README.md lists every file it holds${unlisted.length ? `: ${unlisted.join(", ")} missing` : ""}`);

let failed = 0;
const report = (results, token) => {
  const f = results.filter(([ok]) => !ok).length;
  for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  failed += f;
  return f ? null : token;
};
const tokens = [report(controls, "VICI CONTROLS OK"), report(standards, "VICI STANDARDS OK")].filter(Boolean);
console.log(`(Vici's checks from ${dir})`);
if (failed) { console.log(`\n${failed} checks failed.`); process.exit(1); }
console.log(`\nAll ${controls.length + standards.length} checks passed.\n${tokens.join("\n")}\nVICI OK`);
