// The report and its three downloads in Chromium (brief 9 and 9.1; PLAN.md §8; AC-09, AC-13, AC-20, AC-21).
// No test calls the real API: a live run answers from tests/lib/standin.mjs. Groups, each printing its line
// when every check holds:
//   pdf      each scenario in English and German prints through the page's own Save as PDF, and every page of
//            the PDF carries the footer the brief sets: "Created with Business Model Canvas Challenger" and the
//            address, "Built by Victor Pflüger · page x of y" (German "Erstellt mit …", "Erstellt von … · Seite
//            x von y"), once each; the cover comes first, the management summary opens page 2, every section
//            opens a page in the order of brief 9.1, About this report is part of the method page and stands on
//            the last page with the byline, and every page that shows a canvas carries the Strategyzer credit.
//            With Vici's margin-box rule taken out, the same check fails                         REPORT PDF OK
//   html     the HTML file: its policy loads nothing, no script, no event attribute, nothing that loads, under
//            400 KB; opened with the network shut it asks for nothing, keeps the report's light look (the bare
//            markup without its styles does not), holds every section, the figures and both credits, and
//            printed it carries the footer on every page                                        REPORT HTML OK
//   figures  with the recorded choices and with another, the decision changes the canvas as brief 6.6 says,
//            the tiles strike their old values through, and the report and the handoff file carry the tiles'
//            figures, which are the engine's                                                 REPORT FIGURES OK
//   ui       the Summary's bar, the dialog with every page at size and its downloads, the Ideator link in a
//            new tab, Ctrl+P at Summary, no screen promising the report for later                REPORT UI OK
//   names    the files are bmc-challenger-<company>-<YYYY-MM-DD>-<lang>, umlauts written out; the PDF takes
//            its name from the page's title while the print dialog is open                    REPORT NAMES OK
//   live     a live run's report names the mode, the model and the setting; research off gives the knowledge
//            cutoff, research on the sources with the dates read; a removal shows struck through; a run stopped
//            at its cap after Assess offers the report of what is done, with the notice on every printed page;
//            the JSON passes the check and the Ideator's reader; no download holds the key; a download ends
//            the leave-page warning; the browser keeps only the allowed keys                    REPORT LIVE OK
// Every page fails on a page error, a console error, a policy violation or a request to another host. Needs a
// ViciDesign checkout for its PDF reader (VICI_DIR or ../ViciDesign) and, for the Ideator's reader, a Prototype
// Ideator checkout (IDEATOR_DIR or ../PrototypeIdeator); both are required on GitHub Actions and with
// --require-vici and --require-ideator, else the suite says what it skipped.
// Usage: node tests/report.mjs [group…] [--require-vici] [--require-ideator]
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { APP_ROOT, ONLY, launchBrowser, serveStatic, NETWORK_NOISE, outDir, exit, viciDir, REQUIRE_VICI } from "./lib/harness.mjs";
import { install, live, KEY, s1Answers, answer } from "./lib/standin.mjs";
import { SCENARIOS, scenarioById } from "../data/scenarios/index.js";
import { localise, buildRun } from "../js/run.js";
import { handoffProblems } from "../js/handoff.js";
import { fileName } from "../js/report.js";
import { money } from "../js/risk.js";
import { fmtInt, fmtPressure } from "../js/format.js";
import { IDEATOR_URL } from "../js/config.js";
import EN from "../js/i18n/en.js";
import DE from "../js/i18n/de.js";

const DICT = { en: EN, de: DE };
const T = (lang, key, vars = {}) => DICT[lang][key].replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const GROUPS = ["pdf", "html", "figures", "ui", "names", "live"];
const LINES = { pdf: "REPORT PDF OK", html: "REPORT HTML OK", figures: "REPORT FIGURES OK", ui: "REPORT UI OK", names: "REPORT NAMES OK", live: "REPORT LIVE OK" };
const chosen = ONLY.length ? GROUPS.filter((g) => ONLY.includes(g)) : GROUPS;
const unknownGroups = ONLY.filter((g) => !GROUPS.includes(g));
if (unknownGroups.length) { console.log(`FAIL  unknown group ${unknownGroups.join(", ")}; the groups are ${GROUPS.join(", ")}`); exit(1); }

const VICI = viciDir();
if (!VICI) {
  console.log(`${REQUIRE_VICI ? "FAIL" : "SKIP"}  no ViciDesign checkout in VICI_DIR or next to this repository (../ViciDesign), so its PDF reader is missing`);
  exit(REQUIRE_VICI ? 1 : 0);
}
const { pdfPageTexts } = await import(pathToFileURL(path.join(VICI, "scripts", "lib", "pdf.mjs")).href);
const REQUIRE_IDEATOR = process.argv.includes("--require-ideator") || process.env.GITHUB_ACTIONS === "true";
const IDEATOR = [process.env.IDEATOR_DIR, path.resolve(APP_ROOT, "..", "PrototypeIdeator")].filter(Boolean).find((d) => existsSync(path.join(d, "js", "handoff.js")));
const readHandoff = IDEATOR ? (await import(pathToFileURL(path.join(IDEATOR, "js", "handoff.js")).href)).readHandoff : null;

const results = Object.fromEntries(GROUPS.map((g) => [g, []]));
let group = "";
const check = (ok, what) => results[group].push([!!ok, what]);

// The footer as brief 9 words it, written out here rather than read from the dictionaries.
const ADDRESS = "https://victorpflueger.github.io/BMC-challenger/";
const FOOT = {
  en: { start: `Created with Business Model Canvas Challenger\n${ADDRESS}`, end: (x, y) => `Built by Victor Pflüger · page ${x} of ${y}`, fixed: `Created with Business Model Canvas Challenger · ${ADDRESS}` },
  de: { start: `Erstellt mit Business Model Canvas Challenger\n${ADDRESS}`, end: (x, y) => `Erstellt von Victor Pflüger · Seite ${x} von ${y}`, fixed: `Erstellt mit Business Model Canvas Challenger · ${ADDRESS}` }
};
const CREDIT = { en: "The Business Model Canvas: Strategyzer.com · CC BY-SA 3.0", de: "Das Business Model Canvas: Strategyzer.com · CC BY-SA 3.0" };
// A PDF's text compared without white space, its ligatures read back as letters.
const fold = (s) => String(s ?? "").normalize("NFKC").replace(/\s+/gu, "");
const SECTIONS = (lang) => ["rp.sum.h", "rp.canvas.h", "rp.issues.h", "rp.matrix.h", "rp.resp.h", "rp.adapted.h", "rp.method.h"].map((k) => T(lang, k));
const today = () => new Date().toISOString().slice(0, 10);
const SC = (id, lang) => localise(scenarioById(id), lang);

const browser = await launchBrowser();
const server = await serveStatic(APP_ROOT, 9300 + Math.floor(Math.random() * 300));
const OUT = await outDir("report");

// ---- pages ----------------------------------------------------------------------------------------------
/** A page of the app at `query`, every foreign host blocked and recorded (or answered by the stand-in). */
async function openPage({ query = "", lang = "en", viewport = { width: 1280, height: 720 }, standin = null } = {}) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  await context.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`.trim()));
  });
  const external = [];
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|api\.anthropic\.com)/, (route) => { external.push(route.request().url()); route.abort("blockedbyclient"); });
  const api = standin ? await install(context, standin) : null;
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(`console: ${m.text()}`); });
  await page.goto(`${server.base}?guide=0&lang=${lang}${query ? `&${query}` : ""}`);
  await page.waitForSelector('html[data-boot="ready"]');
  return { page, context, errors, external, api };
}
async function closePage(p, label) {
  const csp = await p.page.evaluate(() => window.__csp).catch(() => []);
  const all = [...p.errors, ...csp, ...p.external];
  check(!all.length, `${label}: no page error, console error, policy violation or foreign host${all.length ? `: ${all.slice(0, 4).join(" | ")}` : ""}`);
  await p.context.close();
}
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, " ").trim()).catch(() => "");
/** Opens the report from the bar's primary action. */
async function openReport(page) {
  await page.click("#btn-cta");
  await page.waitForSelector("#report-dialog[open] #report .vc-report__page");
  await page.evaluate(() => Promise.all([...document.querySelectorAll("#report img")].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))));
}

/** Save as PDF the way a person does it: the button, with the print dialog stood in for; the page printed by Chromium. */
async function printVia(page, button = "#rp-pdf") {
  await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
  const titleBefore = await page.title();
  await page.click(button);
  const during = await page.evaluate(() => {
    const box = document.querySelector("body > [data-vc-print]");
    return { title: document.title, printed: window.__printed, copy: !!box?.querySelector(".vc-report"), marked: !!box?.hasAttribute("data-vc-margin-boxes") };
  });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  const after = await page.evaluate(() => ({ title: document.title, copy: !!document.querySelector("[data-vc-print]") }));
  return { pdf, titleBefore, during, after };
}

/** What each printed page says of its footer: the start once, its own number of the count, the notice. */
function footerProblems(buf, lang, { notice = "", fixed = "" } = {}) {
  const pages = pdfPageTexts(buf).map(fold);
  const start = fold(FOOT[lang].start);
  const problems = [];
  if (pages.length < 8) problems.push(`it printed ${pages.length} page(s), fewer than the report's eight sections`);
  pages.forEach((txt, i) => {
    const count = txt.split(start).length - 1;
    if (count !== 1) problems.push(`page ${i + 1} of ${pages.length} shows the footer's start ${count} times`);
    if (!txt.includes(fold(FOOT[lang].end(i + 1, pages.length)))) problems.push(`page ${i + 1} lacks "${FOOT[lang].end(i + 1, pages.length)}"`);
    if (notice && !txt.includes(fold(notice))) problems.push(`page ${i + 1} lacks the notice`);
    if (fixed && txt.includes(fold(fixed))) problems.push(`page ${i + 1} prints the fixed footer beside the margin boxes`);
  });
  const bodies = pages.map((txt, i) => txt.replace(fold(notice), "").replace(start, "").replace(fold(FOOT[lang].end(i + 1, pages.length)), ""));
  return { pages, bodies, problems };
}

/** A download from clicking `button`: { name, text }. */
async function download(page, button) {
  const [d] = await Promise.all([page.waitForEvent("download"), page.click(button)]);
  return { name: d.suggestedFilename(), text: await readFile(await d.path(), "utf8") };
}

/** The three tiles as the header shows them. */
const tiles = (page) => page.evaluate(() => Object.fromEntries(["stake", "pressure", "cost"].map((id) => {
  const el = document.getElementById(`kpi-${id}`);
  const was = el.querySelector(".vc-stat__was");
  return [id, { main: el.querySelector(".kpi-main")?.textContent.trim() || "", was: was && !was.hidden ? was.textContent.trim() : "", note: el.querySelector(".kpi-note")?.textContent.trim() || "" }];
})));
/** The three key figures on the report's second page. */
const reportFigures = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#report .report-figure")].map((f) => [f.dataset.kpi, {
  main: f.querySelector(".vc-stat__value > span")?.textContent.trim() || "",
  was: f.querySelector(".vc-stat__was")?.textContent.trim() || "",
  note: f.querySelector(".vc-stat__note")?.textContent.trim() || ""
}])));

// ---- PDF -------------------------------------------------------------------------------------------------
async function pdf() {
  for (const s of SCENARIOS) {
    for (const lang of ["en", "de"]) {
      const at = `${s.id} ${lang}`;
      const sc = SC(s.id, lang);
      const p = await openPage({ query: `scenario=${s.id}&step=5`, lang });
      await openReport(p.page);
      const headline = await text(p.page, "#report .report-headline");
      const aboutOnMethod = await p.page.evaluate(() => [...document.querySelectorAll("#report h5")].find((h) => h.closest(".report-imprint"))?.closest(".vc-report__page")?.classList.contains("report-page--method"));
      // Nothing may reach past a page's right edge: the browser would shrink the whole report to fit it, and
      // every page would print smaller than its rules say (a block's state did, before 0.4.0's fix). A wide
      // element planted on page 1 shows the measure catches it.
      const wide = await p.page.evaluate(() => {
        const past = () => {
          const out = [];
          for (const pg of document.querySelectorAll("#report .vc-report__page")) {
            const edge = pg.getBoundingClientRect().right;
            for (const el of pg.querySelectorAll("*")) {
              const b = el.getBoundingClientRect();
              if (b.width > 1 && b.right > edge + 0.5) out.push(`${String(el.className || el.tagName).slice(0, 40)}: ${Math.round(b.right - edge)} px`);
            }
          }
          return out;
        };
        const plant = Object.assign(document.createElement("span"), { textContent: "x" });
        plant.style.cssText = "display:inline-block;width:3000px";
        document.querySelector("#report .vc-report__page").append(plant);
        const caught = past().length > 0;
        plant.remove();
        return { caught, found: past() };
      });
      check(wide.caught && !wide.found.length, `${at}: nothing on a page reaches past its right edge, so the browser prints the report at full size${wide.found.length ? `: ${wide.found.slice(0, 4).join("; ")}` : ""}${wide.caught ? "" : " (the planted wide element was not caught)"}`);
      const r = await printVia(p.page);
      check(r.during.printed === 1 && r.during.copy && r.during.marked, `${at}: Save as PDF opens the print dialog once, on the report's print copy, marked for the margin boxes`);
      const { pages, bodies, problems } = footerProblems(r.pdf, lang, { fixed: FOOT[lang].fixed });
      await writeFile(path.join(OUT, `${s.id}-${lang}.pdf`), r.pdf);
      check(!problems.length, `${at}: each of the ${pages.length} pages carries "${FOOT[lang].start.split("\n")[0]}", the address and "${FOOT[lang].end("x", "y")}", once${problems.length ? `: ${problems.slice(0, 4).join("; ")}` : ""}`);
      const cover = bodies[0] || "";
      check(cover.startsWith(fold("Business Model Canvas Challenger")) && cover.includes(fold(T(lang, "rp.title", { company: sc.company.name }))) && cover.includes(fold(T(lang, "rp.ai"))) && cover.includes(fold(T(lang, "p.fictional"))) && cover.includes(fold(T(lang, "rp.mode.sim"))),
        `${at}: page 1 is the cover: the tool, "${T(lang, "rp.title", { company: sc.company.name })}", the mode, "${T(lang, "rp.ai")}" and "${T(lang, "p.fictional")}"`);
      check(bodies[1]?.startsWith(fold(T(lang, "rp.sum.h"))) && headline.length > 20 && bodies[1].includes(fold(headline)), `${at}: the management summary opens page 2, with the Writer's headline`);
      const opens = SECTIONS(lang).map((h) => bodies.findIndex((b) => b.startsWith(fold(h))));
      check(opens.every((x, i) => x > 0 && (i === 0 || x > opens[i - 1])), `${at}: each section opens a page, in the order of brief 9.1 (pages ${opens.map((x) => x + 1).join(", ")})`);
      const canvases = [opens[1], opens[5]];
      check(canvases.every((k) => k > 0 && bodies[k].includes(fold(CREDIT[lang]))), `${at}: both canvas pages carry "${CREDIT[lang]}" (pages ${canvases.map((k) => k + 1).join(" and ")})`);
      const last = bodies.at(-1) || "";
      check(aboutOnMethod && last.includes(fold(T(lang, "rp.about.h"))) && last.includes(fold(T(lang, "rp.about.generated"))) && last.includes(fold(T(lang, "rp.public"))) && last.includes(fold(T(lang, "p.byline.label"))) && last.includes(fold("Victor Pflüger")),
        `${at}: "${T(lang, "rp.about.h")}" closes the method page, and the last page carries it with the byline, the public-information sentence and "${T(lang, "rp.about.generated").slice(0, 40)}…"`);
      check(r.after.title === r.titleBefore && !r.after.copy, `${at}: when the print dialog closes, the page's title comes back and the print copy goes`);
      await closePage(p, `${at} PDF`);
    }
  }
  // Control: without Vici's margin-box rule the footer check must fail, or it proves nothing.
  const p = await openPage({ query: "scenario=s2&step=5", lang: "en" });
  await openReport(p.page);
  const dropped = await p.page.evaluate(() => {
    let n = 0;
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (let i = rules.length - 1; i >= 0; i--) if (rules[i] instanceof CSSPageRule && rules[i].selectorText === "vc-report") { sheet.deleteRule(i); n += 1; }
    }
    return n;
  });
  const r = await printVia(p.page);
  const control = footerProblems(r.pdf, "en");
  check(dropped >= 1 && control.problems.length > 0, `control: with Vici's @page vc-report rule taken out (${dropped} rule), the footer check fails (${control.problems[0] || "it passed"})`);
  await closePage(p, "control");
}

// ---- HTML ------------------------------------------------------------------------------------------------
async function html() {
  for (const s of SCENARIOS) {
    for (const lang of ["en", "de"]) {
      const at = `${s.id} ${lang}`;
      const sc = SC(s.id, lang);
      const p = await openPage({ query: `scenario=${s.id}&step=5`, lang });
      await openReport(p.page);
      const figures = await reportFigures(p.page);
      const look = await p.page.evaluate(() => {
        const r = document.getElementById("report");
        const lk = (el) => { const st = getComputedStyle(el); return [st.fontSize, st.fontWeight, st.color, st.backgroundColor, st.borderTopColor].join(" "); };
        return { title: lk(r.querySelector(".vc-report__title")), figure: lk(r.querySelector(".report-figure")), block: lk(r.querySelector(".report-block[data-status]")), bare: r.outerHTML };
      });
      const file = await download(p.page, "#rp-html");
      await writeFile(path.join(OUT, file.name), file.text);
      const f = file.text;
      const kb = Buffer.byteLength(f) / 1024;
      check(f.startsWith("<!DOCTYPE html>") && /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">/.test(f) && kb < 400, `${at}: the file's policy is exactly default-src 'none'; style-src 'unsafe-inline'; img-src data:, and it weighs ${kb.toFixed(0)} KB, under 400`);
      const tags = [...f.matchAll(/<[a-z][^>]*>/gi)].map((m) => m[0]);
      const loads = [
        ...(/<script\b/i.test(f) ? ["a script"] : []),
        ...tags.filter((t) => /\son[a-z]+\s*=/i.test(t)).map((t) => `an event attribute in ${t.slice(0, 60)}`),
        ...tags.filter((t) => /^<(link|iframe|object|embed|video|audio|source|base)\b/i.test(t)).map((t) => t.slice(0, 60)),
        ...tags.filter((t) => /\s(src|srcset|poster|data)\s*=\s*"(?!data:)/i.test(t)).map((t) => t.slice(0, 80)),
        ...[...f.matchAll(/url\(\s*['"]?(?!data:)([^)'"]+)/gi)].map((m) => `url(${m[1]})`),
        ...(/@import|@font-face/i.test(f) ? ["@import or @font-face"] : [])
      ];
      check(!loads.length, `${at}: no script, no event attribute and nothing that loads${loads.length ? `: ${loads.slice(0, 4).join("; ")}` : ""}`);
      check(new RegExp(`<html lang="${lang === "de" ? "de" : "en-GB"}" data-theme="light"`).test(f), `${at}: the file is in the report's language and Vici's light theme`);
      const words = fold(f.replace(/<style[\s\S]*?<\/style>/i, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
      const missing = [...SECTIONS(lang), T(lang, "rp.title", { company: sc.company.name }), T(lang, "rp.about.h")].filter((h) => !words.includes(fold(h)));
      check(!missing.length, `${at}: the file holds every section${missing.length ? `; missing: ${missing.join(", ")}` : ""}`);
      const credits = words.split(fold(CREDIT[lang])).length - 1;
      check(Object.values(figures).length === 3 && Object.values(figures).every((x) => words.includes(fold(x.main))) && credits === 2, `${at}: and the key figures (${Object.values(figures).map((x) => x.main).join(", ")}) and the credit under both canvases (${credits})`);

      // Opened on its own, with the network shut: it asks for nothing and keeps the look.
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const asked = [];
      await ctx.route("**/*", (route) => { asked.push(route.request().url()); route.abort(); });
      const open = async (markup) => {
        const q = await ctx.newPage();
        const refused = [];
        q.on("console", (m) => { if (m.type() === "error") refused.push(m.text()); });
        await q.setContent(markup, { waitUntil: "load" });
        const seen = await q.evaluate(() => {
          const r = document.querySelector(".vc-report");
          const lk = (el) => { if (!el) return ""; const st = getComputedStyle(el); return [st.fontSize, st.fontWeight, st.color, st.backgroundColor, st.borderTopColor].join(" "); };
          return { title: lk(r.querySelector(".vc-report__title")), figure: lk(r.querySelector(".report-figure")), block: lk(r.querySelector(".report-block[data-status]")), h1: document.querySelectorAll("h1").length, sheet: getComputedStyle(r.querySelector(".vc-report__page")).backgroundColor, asks: CSS.supports("at-rule(@bottom-left)") };
        });
        return { q, seen, refused };
      };
      const opened = await open(f);
      check(!asked.length && !opened.refused.length, `${at}: opened with the network shut it asks for nothing${asked.length || opened.refused.length ? `: ${[...asked, ...opened.refused].slice(0, 3).join(" | ")}` : ""}`);
      const differ = ["title", "figure", "block"].filter((k) => opened.seen[k] !== look[k]);
      check(!differ.length && opened.seen.sheet === "rgb(255, 255, 255)" && opened.seen.h1 === 1, `${at}: it keeps the report's look, white sheets and one h1${differ.length ? `; differs: ${differ.map((k) => `${k} ${opened.seen[k]} instead of ${look[k]}`).join("; ")}` : ""}`);
      if (s.id === "s1" && lang === "en") {
        const planted = await open(f.replace("</body>", '<img src="https://example.org/planted.png" alt="planted"></body>'));
        check(asked.length > 0 || planted.refused.length > 0, `${at}: control: a picture from another host planted in the file is caught`);
        asked.length = 0;
        const bare = await open(`<!DOCTYPE html><html lang="en-GB"><body>${look.bare}</body></html>`);
        check(["title", "figure", "block"].some((k) => bare.seen[k] !== look[k]), `${at}: control: the bare markup without the file's styles fails the look test`);
      }
      // Printed: the footer on every page. A file has no script, so only an engine that answers @supports
      // at-rule() keeps its fixed footer out; the margin boxes carry the footer with the page number.
      const printed = await opened.q.pdf({ preferCSSPageSize: true, printBackground: true });
      const { pages, problems } = footerProblems(printed, lang, { fixed: opened.seen.asks ? FOOT[lang].fixed : "" });
      check(/@bottom-right/.test(f) && !problems.length, `${at}: printed, the file carries the footer with the page number on each of its ${pages.length} pages${problems.length ? `: ${problems.slice(0, 3).join("; ")}` : ""}`);
      await ctx.close();
      await closePage(p, `${at} HTML`);
    }
  }
}

// ---- FIGURES ---------------------------------------------------------------------------------------------
/**
 * At Adapt, chooses for every issue another card than the one preselected: the other option where the
 * Strategist offered two, else Accept for an option and the option for Accept. Then applies the decision.
 */
async function chooseOther(page) {
  const issues = await page.$$eval(".issue-tab", (els) => els.map((e) => e.dataset.issue));
  for (const id of issues) {
    await page.click(`.issue-tab[data-issue="${id}"]`);
    const cards = page.locator(".options__cards label.option");
    const checked = await cards.evaluateAll((all) => all.map((c) => c.querySelector("input").checked));
    await cards.nth(checked.indexOf(true) === 0 ? 1 : 0).click();
  }
  await page.click("#btn-cta");
  await page.waitForFunction(() => window.BMC.state.applied === true);
  await page.click("#btn-next");
  await page.waitForSelector('body[data-step="summary"]');
}

async function figures() {
  for (const s of SCENARIOS) {
    for (const way of ["recorded", "other"]) {
      const lang = way === "recorded" ? "en" : "de";
      const at = `${s.id} ${lang} ${way}`;
      const p = await openPage({ query: `scenario=${s.id}&step=${way === "recorded" ? 5 : 4}`, lang });
      if (way === "other") await chooseOther(p.page);
      // The engine on the same choices, in Node.
      const st = await p.page.evaluate(() => window.BMC.state);
      const sc = SC(s.id, lang);
      const run = buildRun(sc, { removed: new Set(st.removed), decisions: new Map(Object.entries(st.decisions)) });
      const tile = await tiles(p.page);
      const stake = money(run.before.atStake, lang);
      const left = money(run.after.left, lang);
      const pressure = [fmtPressure(run.before.pressure.before, 9, lang), fmtPressure(run.after.pressure.after, 9, lang)];
      check(tile.stake.was === stake && tile.stake.main === left && tile.pressure.was === pressure[0] && tile.pressure.main === pressure[1], `${at}: the tiles strike the old value through beside the new one, as the engine has them (${tile.stake.was} → ${tile.stake.main}, ${tile.pressure.was} → ${tile.pressure.main})`);
      await openReport(p.page);
      const fig = await reportFigures(p.page);
      const same = ["stake", "pressure", "cost"].every((k) => fig[k] && fig[k].main === tile[k].main && fig[k].was === tile[k].was && fig[k].note === tile[k].note);
      check(same, `${at}: the report's key figures are the tiles' (${["stake", "pressure", "cost"].map((k) => `${fig[k]?.was ? `${fig[k].was} → ` : ""}${fig[k]?.main}`).join(", ")})`);
      const method = await text(p.page, "#report .report-page--method");
      check(method.includes(T(lang, "rp.m.resilience", { before: fmtInt(run.before.resilience.before, lang), after: fmtInt(run.after.resilience.after, lang) })), `${at}: the method page gives resilience before and after as the engine has it (${fmtInt(run.before.resilience.before, lang)} and ${fmtInt(run.after.resilience.after, lang)})`);
      // Brief 6.6 on the report's adapted canvas: each chosen change in its block, marked Adapted.
      const items = await p.page.$$eval("#report .report-page--adapted .vc-item", (els) => els.map((e) => ({ block: e.closest("[data-block]").dataset.block, source: e.dataset.source, status: e.dataset.status || "", was: e.querySelector(".vc-item__was")?.textContent.trim() || "", text: e.querySelector(".vc-item__text").textContent.replace(/\s+/g, " ").trim(), tags: [...e.querySelectorAll(".vc-tag")].map((x) => x.textContent.trim()) })));
      // A change that names an item the review removed no longer applies (brief 6.6); the lead says so.
      const skipped = new Set(run.adapted.skipped.map((c) => `${c.block}|${c.action}|${c.item}|${c.text}`));
      const changes = run.options.flatMap((o) => (o.chosen === "accept" ? [] : o.list[o.chosen].changes)).filter((c) => !skipped.has(`${c.block}|${c.action}|${c.item}|${c.text}`));
      const shown = changes.every((c) => {
        if (c.action === "add") return items.some((x) => x.block === c.block && x.source === "added" && x.status === "addressed" && x.text === c.text && x.tags.includes(T(lang, "item.adapted")));
        if (c.action === "change") return items.some((x) => x.block === c.block && x.status === "addressed" && x.was && x.text.endsWith(c.text) && x.tags.includes(T(lang, "item.adapted")));
        return items.some((x) => x.block === c.block && x.status === "removed");
      });
      check(changes.length > 0 && shown, `${at}: each of the ${changes.length} chosen changes stands on the report's adapted canvas: an added item marked "${T(lang, "item.adapted")}", a changed one with its old text struck through above the new`);
      const file = await download(p.page, "#rp-json");
      const j = JSON.parse(file.text);
      const near = (a, b) => Math.abs(a - b) <= 1e-9;
      check(!handoffProblems(j).length && money(j.figures.at_stake_eur_year, lang) === tile.stake.was && money(j.figures.left_eur_year, lang) === tile.stake.main && near(j.figures.upside_eur_year, run.after.upside) && fmtPressure(j.figures.pressure.before, 9, lang) === tile.pressure.was && fmtPressure(j.figures.pressure.after, 9, lang) === tile.pressure.main && near(j.figures.score.before, run.before.resilience.before) && near(j.figures.score.after, run.after.resilience.after),
        `${at}: the handoff file carries the tiles' figures, the engine's numbers (${j.figures.at_stake_eur_year}, ${j.figures.left_eur_year}, ${j.figures.pressure.before} and ${j.figures.pressure.after} of 9)`);
      await closePage(p, `${at} figures`);
    }
  }
}

// ---- UI --------------------------------------------------------------------------------------------------
async function ui() {
  const p = await openPage({ query: "scenario=s1&step=5", lang: "en" });
  const bar = await p.page.evaluate(() => {
    const cta = document.getElementById("btn-cta");
    const second = document.getElementById("btn-second");
    return { kind: document.getElementById("bar").dataset.kind, title: document.querySelector("#bar .vc-callout__title")?.textContent.trim(), cta: cta?.textContent.trim(), attention: cta?.classList.contains("vc-attention"), primary: cta && !cta.classList.contains("vc-button--secondary"), second: second?.textContent.trim(), secondary: second?.classList.contains("vc-button--secondary"), hint: document.querySelector('#steps .vc-step[data-step="summary"] .vc-step__hint')?.textContent.trim(), buttons: document.querySelectorAll("#bar button").length };
  });
  check(bar.kind === "turn" && bar.title === EN["turn.title"] && bar.cta === EN["rp.cta"] && bar.attention && bar.primary && bar.second === EN["turn.end.action"] && bar.secondary && bar.buttons === 2 && bar.hint === EN["turn.title"],
    `at Summary the bar says "${EN["turn.title"]}" with one primary action, "${EN["rp.cta"]}", and "${EN["turn.end.action"]}" beside it; the step says "${EN["turn.title"]}"`);
  await openReport(p.page);
  const dlg = await p.page.evaluate(() => {
    const pages = [...document.querySelectorAll("#report > .vc-report__page")];
    const a = document.getElementById("rp-ideator");
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight; };
    return {
      title: document.getElementById("report-dialog-title").textContent,
      pages: pages.length, widths: pages.map((x) => Math.round(x.getBoundingClientRect().width)),
      pdf: document.getElementById("rp-pdf")?.textContent.trim(), pdfPrimary: !document.getElementById("rp-pdf")?.classList.contains("vc-button--secondary"),
      html: document.getElementById("rp-html")?.classList.contains("vc-button--secondary"), json: document.getElementById("rp-json")?.classList.contains("vc-button--secondary"),
      hint: document.getElementById("rp-pdf-hint")?.textContent.trim(), focus: document.activeElement?.id,
      link: a ? { href: a.href, target: a.target, rel: a.rel, words: a.textContent.trim() } : null,
      inView: ["rp-pdf", "rp-html", "rp-json", "rp-ideator"].every((id) => vis(document.getElementById(id)))
    };
  });
  check(dlg.title === T("en", "rp.dialog.title", { company: "Tidewell Lines" }) && dlg.pages === 8 && dlg.widths.every((w) => w >= 700), `"${EN["rp.cta"]}" opens the report dialog with its eight pages at size (${dlg.widths[0]} px wide)`);
  check(dlg.pdf === EN["rp.pdf"] && dlg.pdfPrimary && dlg.html && dlg.json && dlg.hint === EN["rp.pdf.hint"] && dlg.focus === "rp-pdf" && dlg.inView, `Save as PDF is the dialog's primary action with the hint "${EN["rp.pdf.hint"]}" and the focus; the HTML and JSON downloads stand beside it; all in view at 1280 × 720`);
  check(dlg.link && dlg.link.href === IDEATOR_URL && dlg.link.target === "_blank" && /\bnoopener\b/.test(dlg.link.rel) && dlg.link.words.startsWith(EN["rp.ideator"]), `"${EN["rp.ideator"]}" links to the Prototype Ideator in a new tab, rel noopener`);
  await p.page.keyboard.press("Escape");
  // Ctrl+P at Summary prints the report alone: the browser fires beforeprint and afterprint around its dialog.
  const ctrlP = await p.page.evaluate(() => {
    const title = document.title;
    window.dispatchEvent(new Event("beforeprint"));
    const during = { copy: !!document.querySelector("body > [data-vc-print] .vc-report"), title: document.title };
    window.dispatchEvent(new Event("afterprint"));
    return { during, after: { copy: !!document.querySelector("[data-vc-print]"), title: document.title === title } };
  });
  check(ctrlP.during.copy && ctrlP.during.title === fileName("Tidewell Lines", today(), "en", "") && !ctrlP.after.copy && ctrlP.after.title, "Ctrl+P at Summary prints the report alone, under the file's name, and the page comes back afterwards");
  await p.page.click("#btn-back");
  const elsewhere = await p.page.evaluate(() => { window.dispatchEvent(new Event("beforeprint")); const copy = !!document.querySelector("[data-vc-print]"); window.dispatchEvent(new Event("afterprint")); return copy; });
  check(!elsewhere, "Ctrl+P at another step prints the page as it is, without the report");
  await p.page.click("#btn-next");
  await p.page.click("#btn-second");
  const back = await p.page.evaluate(() => ({ step: window.BMC.state.step, reached: window.BMC.state.reached }));
  check(back.step === 0 && back.reached === 0, `"${EN["turn.end.action"]}" goes back to the start`);
  await closePage(p, "UI");
  // No screen, guide or dictionary still promises the report for a later version.
  const sources = [await readFile(path.join(APP_ROOT, "index.html"), "utf8"), JSON.stringify(EN), JSON.stringify(DE)].join("\n");
  const promise = sources.match(/arrives in (?:version )?0\.\d|kommt mit (?:Version )?0\.\d|in version 0\.4\.0/i);
  check(!promise, `no screen promises the report for a later version${promise ? ` ("${promise[0]}")` : ""}`);
}

// ---- NAMES -----------------------------------------------------------------------------------------------
async function names() {
  check(fileName("Müller & Söhne Straße", "2026-11-24", "de", "pdf") === "bmc-challenger-mueller-soehne-strasse-2026-11-24-de.pdf" && fileName("Auental Energie", "2026-11-24", "en", "") === "bmc-challenger-auental-energie-2026-11-24-en" && fileName("", "2026-11-24", "en", "json") === "bmc-challenger-company-2026-11-24-en.json",
    "file names: bmc-challenger-<company>-<YYYY-MM-DD>-<lang>, umlauts and ß written out, a missing name as company");
  for (const [id, lang] of [["s1", "en"], ["s3", "de"]]) {
    const p = await openPage({ query: `scenario=${id}&step=5`, lang });
    await openReport(p.page);
    const company = SC(id, lang).company.name;
    const html = await download(p.page, "#rp-html");
    const json = await download(p.page, "#rp-json");
    const r = await printVia(p.page);
    const base = fileName(company, today(), lang, "");
    check(html.name === `${base}.html` && json.name === `${base}.json` && r.during.title === base, `${id} ${lang}: ${base}.html and .json, and the PDF named ${base} while the print dialog is open`);
    await closePage(p, `${id} ${lang} names`);
  }
  // A live company with umlauts in its name.
  const p = await openPage({ standin: {} });
  await live.enter(p.page);
  await live.sample(p.page);
  await p.page.fill("#live-name", "Grüne Wärme GmbH");
  await live.openDialog(p.page);
  await live.start(p.page);
  await live.waitFor(p.page, "review");
  await p.page.click("#btn-cta");
  await live.waitFor(p.page, "decision", 30000);
  await p.page.click("#btn-cta");
  await live.waitFor(p.page, "done");
  await openReport(p.page);
  const json = await download(p.page, "#rp-json");
  check(json.name === `bmc-challenger-gruene-waerme-gmbh-${today()}-en.json`, `a live run of Grüne Wärme GmbH downloads ${json.name}`);
  await closePage(p, "live names");
}

// ---- LIVE ------------------------------------------------------------------------------------------------
/** S1's answers with one more change in the first issue's recommended option: it removes an AI item. */
function strategistWithRemoval() {
  const a = s1Answers();
  const responses = JSON.parse(JSON.stringify(a.strategist.responses));
  const r = responses.find((x) => x.issue === "I1");
  const k = Math.max(0, r.options.findIndex((o) => o.recommended));
  r.options[k].changes.push({ block: "channels", action: "remove", item: "channels-1", text: "" });
  return { responses };
}

async function liveGroup() {
  // A whole run, research off, with a removal among the chosen changes.
  {
    const p = await openPage({ standin: { script: (agent) => (agent === "strategist" ? answer(strategistWithRemoval()) : undefined) } });
    await live.full(p.page);
    const present = await p.page.evaluate(() => !!document.querySelector('#canvas [data-item="channels-1"]'));
    await openReport(p.page);
    const meta = await text(p.page, "#report .vc-report__meta");
    check(meta.includes(EN["rp.mode.live"]) && meta.includes("Haiku 5.5") && meta.includes(EN["live.preset.balanced"]) && meta.includes(`${EN["rp.research.off"]}`), `the cover names the live mode, the model and the setting (${meta.slice(meta.indexOf("Live"), meta.indexOf("Live") + 110)})`);
    const method = await text(p.page, "#report .report-page--method");
    check(method.includes(T("en", "rp.cutoff", { month: "June 2026" })), "research off: the method page says the agents knew the world up to June 2026");
    const gone = await p.page.evaluate(() => {
      const el = document.querySelector('#report .report-page--adapted [data-item="channels-1"]');
      return el ? { status: el.dataset.status, struck: getComputedStyle(el.querySelector(".vc-item__text")).textDecorationLine, tag: [...el.querySelectorAll(".vc-tag")].map((x) => x.textContent.trim()) } : null;
    });
    check(gone && gone.status === "removed" && /line-through/.test(gone.struck) && gone.tag.includes(EN["item.removed"]) && !present, `a removal stands struck through as "${EN["item.removed"]}" on the report's adapted canvas, and is gone from the canvas at Summary`);
    const json = await download(p.page, "#rp-json");
    const j = JSON.parse(json.text);
    const problems = handoffProblems(j);
    const read = readHandoff ? readHandoff(j, { file: json.name }) : null;
    check(!problems.length && j.mode === "live" && j.model === "claude-haiku-5-5" && j.company.fictional === false && (read ? read.ok : !REQUIRE_IDEATOR), `the live file passes the check${read ? " and the Ideator's reader" : " (no Ideator checkout, its reader skipped)"}, with mode live, its model and fictional false${problems.length ? `: ${problems[0]}` : ""}`);
    const html = await download(p.page, "#rp-html");
    const r = await printVia(p.page);
    const pdfText = pdfPageTexts(r.pdf).join("\n");
    check(![json.text, html.text, pdfText].some((x) => x.includes(KEY) || /sk-ant-/.test(x)), "no download holds the key: not the JSON, not the HTML file, not the PDF");
    const kept = await p.page.evaluate(async () => ({
      local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookie: document.cookie,
      dbs: (await indexedDB.databases()).length, caches: (await caches.keys()).length
    }));
    check(kept.local.every((k) => ["vc-theme", "bmc.lang"].includes(k)) && kept.session.every((k) => k.startsWith("vc-guide:")) && !kept.cookie && !kept.dbs && !kept.caches, `after the three downloads the browser keeps only the allowed keys (${[...kept.local, ...kept.session].join(", ") || "none"})`);
    const csp = await p.page.evaluate(() => window.__csp);
    check(![...p.errors, ...csp, ...p.external].length, `live run: no page error, console error, policy violation or foreign host${[...p.errors, ...csp, ...p.external].length ? `: ${[...p.errors, ...csp, ...p.external].slice(0, 3).join(" | ")}` : ""}`);
    // A download is a kept result: the browser no longer asks before the page closes.
    let asked = null;
    p.page.on("dialog", async (d) => { asked = d.type(); await d.dismiss(); });
    await p.page.close({ runBeforeUnload: true });
    await new Promise((res) => setTimeout(res, 500));
    check(asked === null, "after a download the browser no longer asks before the page closes");
    await p.context.close();
  }
  // Research on: the sources with the date they were read.
  {
    const p = await openPage({ standin: { research: true } });
    await live.full(p.page, { research: true });
    await openReport(p.page);
    const sources = await p.page.$$eval("#report .report-sources > li", (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
    const readOn = T("en", "rp.readOn", { date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) });
    check(sources.length > 0 && sources.every((x) => x.includes(readOn)), `research on: the method page lists ${sources.length} sources, each "${readOn}"`);
    await closePage(p, "live research");
  }
  // Stopped at the budget cap after Assess: the Analyst's answer reports 110,000 output tokens ($0.055), so the
  // Strategist's request no longer fits a cap of €0.05.
  {
    const p = await openPage({ standin: { usage: (agent) => (agent === "analyst" ? { input_tokens: 1000, output_tokens: 110000 } : {}) } });
    await live.enter(p.page);
    await live.sample(p.page);
    await live.openDialog(p.page);
    await live.start(p.page, { cap: 0.05 });
    await live.waitFor(p.page, "review");
    await p.page.click("#btn-cta");
    const st = await live.waitFor(p.page, "stopped", 30000);
    const bar = await p.page.evaluate(() => ({ cta: document.getElementById("btn-cta")?.textContent.trim(), second: document.getElementById("btn-second")?.textContent.trim() }));
    check(st.stopped?.cause === "cap" && st.reached === 3 && bar.cta === EN["rp.stopped.cta"] && bar.second === EN["live.again"], `stopped at the cap after Assess, the bar offers "${EN["rp.stopped.cta"]}" with "${EN["live.again"]}" beside it`);
    await openReport(p.page);
    const notice = T("en", "rp.notice.cap", { step: EN["p.step.assess"] });
    const r = await printVia(p.page);
    const { pages, problems } = footerProblems(r.pdf, "en", { notice, fixed: FOOT.en.fixed });
    await writeFile(path.join(OUT, "stopped-cap-en.pdf"), r.pdf);
    check(!problems.length, `every one of its ${pages.length} printed pages carries "${notice}" and the footer${problems.length ? `: ${problems.slice(0, 3).join("; ")}` : ""}`);
    const json = await download(p.page, "#rp-json");
    const j = JSON.parse(json.text);
    check(!handoffProblems(j).length && j.responses.every((x) => !x.chosen) && j.disclaimer.includes(notice), "its handoff file passes the check, with no response chosen and the stop in its disclaimer");
    await closePage(p, "live stopped");
  }
}

const RUNNERS = { pdf, html, figures, ui, names, live: liveGroup };
try {
  if (!readHandoff) console.log(`${REQUIRE_IDEATOR ? "FAIL" : "SKIP"}  no Prototype Ideator checkout in IDEATOR_DIR or ../PrototypeIdeator, so its reader is not tried`);
  for (const g of chosen) {
    group = g;
    try { await RUNNERS[g](); } catch (e) { check(false, `${g}: ${e.message.split("\n")[0]}`); }
  }
} finally {
  await browser.close();
  await server.close();
}
let failed = 0;
for (const g of chosen) {
  for (const [ok, what] of results[g]) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  const f = results[g].filter(([ok]) => !ok).length;
  failed += f;
  if (!f && results[g].length) console.log(LINES[g]);
}
if (!readHandoff && REQUIRE_IDEATOR) failed += 1;
if (failed) { console.log(`\n${failed} check(s) failed.`); exit(1); }
else { console.log(`\nAll ${chosen.reduce((n, g) => n + results[g].length, 0)} checks passed.`); exit(0); }
