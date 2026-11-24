// The simulation in Chromium (AC-05, AC-07; gate G5). Each scenario plays offline, without a key, in
// both languages: the header says SIMULATION, "Fictional company, illustrative figures" stands under the
// canvas, and no request leaves the site. Before anything runs, the key figures answer with the engine's
// figures. A presenter then plays the run with other choices than the recording: an AI item removed,
// the first issue accepted and the second given its other option. The tiles, the canvas's block states
// and the summary agree with the engine for those choices, and the tiles strike the old value through
// beside the new one. On every step of every scenario in both languages, every issue at Challenge and
// Assess, no block is named in the other language. A scenario more than 90 days past its as-of date says to
// check for updates.
// Usage: node tests/presenter.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, launchBrowser, serveStatic, port, context, NETWORK_NOISE, exit } from "./lib/harness.mjs";

const mod = (p) => import(pathToFileURL(path.join(APP_ROOT, p)).href);
const { SCENARIOS } = await mod("data/scenarios/index.js");
const { localise, buildRun, recommended } = await mod("js/run.js");
const { money } = await mod("js/risk.js");
const { fmtPressure } = await mod("js/format.js");
const { writerText } = await mod("js/story.js");
const EN = (await mod("js/i18n/en.js")).default;
const DE = (await mod("js/i18n/de.js")).default;

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });
const nb = (s) => String(s ?? "").replace(/ /g, " ").trim();

const server = await serveStatic(APP_ROOT, port(9360));
const browser = await launchBrowser();
try {
  for (const src of SCENARIOS) for (const lang of ["en", "de"]) {
    const D = lang === "en" ? EN : DE;
    const at = `${src.id} ${lang === "en" ? "English" : "German"}`;
    const { context: ctx, outside } = await context(browser, { locale: lang === "en" ? "en-GB" : "de-DE" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
    await page.goto(`${server.base}?scenario=${src.id}&lang=${lang}&guide=0`);
    await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
    await page.waitForSelector("#boot", { state: "detached", timeout: 5000 }).catch(() => {});
    const stepIs = (name) => page.waitForSelector(`body[data-step="${name}"]`, { timeout: 10000 });
    const tiles = () => page.evaluate(() => Object.fromEntries(["kpi-stake", "kpi-pressure", "kpi-cost"].map((id) => {
      const el = document.getElementById(id);
      const was = el.querySelector(".vc-stat__was");
      return [id, { value: el.querySelector(".kpi-main").textContent, was: was && !was.hidden ? was.textContent : "", struck: !!was && was.tagName === "S" && !was.hidden, note: el.querySelector(".kpi-note").textContent }];
    })));

    // ---- before anything runs ------------------------------------------------------------------------
    const sc = localise(src, lang);
    const before = buildRun(sc, { removed: new Set(), decisions: new Map() }).before;
    const t0 = await tiles();
    const shell = await page.evaluate(() => ({ mode: document.getElementById("mode-text").textContent, fictional: document.querySelector(".fictional")?.textContent.trim(), visible: !!document.querySelector(".fictional")?.getClientRects().length, key: [...document.querySelectorAll('input[type="password"], input[autocomplete="off"][name*="key" i]')].some((i) => i.getClientRects().length > 0) }));
    check(shell.mode === "SIMULATION" && shell.fictional === D["p.fictional"] && shell.visible && !shell.key, `${at}: the header says SIMULATION, "${D["p.fictional"]}" stands under the canvas, and nothing asks for a key`, JSON.stringify(shell));
    check(nb(t0["kpi-stake"].value) === nb(money(before.atStake, lang)) && nb(t0["kpi-pressure"].value) === nb(fmtPressure(before.pressure.before, before.pressure.of, lang)) && /^≈ /.test(t0["kpi-cost"].value) && !t0["kpi-stake"].struck,
      `${at}: before anything runs the tiles show the engine's figures (${nb(t0["kpi-stake"].value)}, ${nb(t0["kpi-pressure"].value)}, ${nb(t0["kpi-cost"].value)})`, JSON.stringify(t0));

    // ---- a run with other choices than the recording ------------------------------------------------------
    await page.click("#btn-cta");
    await stepIs("complete");
    if (await page.evaluate(() => window.BMC.playing)) await page.click("#play");
    const toggle = page.locator("#canvas .item-toggle:visible").first();
    const removedId = await toggle.evaluate((b) => b.closest("[data-item]").dataset.item);
    await toggle.click();
    await page.click("#btn-cta");
    await stepIs("challenge");
    if (await page.evaluate(() => window.BMC.playing)) await page.click("#play");
    for (const name of ["assess", "adapt"]) { await page.click("#btn-next"); await stepIs(name); }
    // The first issue accepted, the second given the option the recording did not take.
    const decisions = new Map();
    const choose = async (issue, key) => {
      await page.click(`.adapt .issue-tab[data-issue="${issue}"]`);
      const cards = page.locator(".options__cards label.option");
      await (key === "accept" ? page.locator('.options__cards label.option[data-kind="accept"]') : cards.nth(key)).click();
      decisions.set(issue, key);
    };
    await choose("I1", "accept");
    const r2 = sc.answers.responses.find((r) => r.issue === "I2");
    await choose("I2", r2.options.length > 1 ? 1 - recommended(sc, "I2") : "accept");
    await page.click("#btn-cta");
    await page.waitForFunction(() => window.BMC.state.applied, null, { timeout: 5000 });
    await page.click("#btn-next");
    await stepIs("summary");

    const run = buildRun(sc, { removed: new Set([removedId]), decisions });
    const t1 = await tiles();
    check(nb(t1["kpi-stake"].value) === nb(money(run.after.left, lang)) && t1["kpi-stake"].struck && nb(t1["kpi-stake"].was) === nb(money(run.before.atStake, lang)),
      `${at}: after the decision the stake tile shows what is left, ${nb(t1["kpi-stake"].value)}, with ${nb(t1["kpi-stake"].was)} struck through beside it`, JSON.stringify(t1["kpi-stake"]));
    check(nb(t1["kpi-pressure"].value) === nb(fmtPressure(run.after.pressure.after, run.after.pressure.of, lang)) && t1["kpi-pressure"].struck && nb(t1["kpi-pressure"].was) === nb(fmtPressure(run.before.pressure.before, run.before.pressure.of, lang)),
      `${at}: the pressure tile shows ${nb(t1["kpi-pressure"].value)} with ${nb(t1["kpi-pressure"].was)} struck through`, JSON.stringify(t1["kpi-pressure"]));
    // The canvas: each block's state as the engine has it after the decision; a block the responses
    // changed and no longer under pressure reads "Adapted".
    const changed = new Set(Object.values(run.adapted.compare.blocks).flat().filter((it) => it.status).map((it) => it.block));
    const want = Object.fromEntries(run.after.blocks.map((b) => {
      const s = b.after.state === "clear" ? null : b.after.state;
      return [b.id, changed.has(b.id) && s !== "pressure" ? "addressed" : s];
    }));
    const got = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#canvas .block")].map((b) => [b.dataset.block, b.dataset.status || null])));
    const wrong = Object.keys(want).filter((b) => want[b] !== got[b]);
    check(!wrong.length, `${at}: every block's state on the canvas agrees with the engine for these choices`, wrong.map((b) => `${b}: ${got[b]} not ${want[b]}`).join(", "));
    const gone = await page.locator(`#canvas [data-item="${removedId}"]`).count();
    check(gone === 0, `${at}: the AI item the person removed (${removedId}) is gone from the adapted canvas`);
    // The summary: the recommendation with this run's figures, and the first steps of the chosen responses.
    const panel = nb(await page.textContent("#panel"));
    const rec = nb(writerText(sc.answers.summary.recommendation, run, lang));
    const steps = run.options.filter((o) => o.chosen !== "accept").map((o) => o.list[o.chosen].first_step);
    const listed = await page.evaluate(() => [...document.querySelectorAll("#panel .first-steps > li")].map((li) => li.firstChild.textContent));
    check(panel.includes(rec) && JSON.stringify(listed) === JSON.stringify(steps) && !steps.includes(sc.answers.responses[0].options[recommended(sc, "I1")].first_step),
      `${at}: the summary gives this run's figures and the first steps of the responses chosen, not the recorded ones`, `${rec.slice(0, 60)} | ${listed.length} steps`);
    check(!outside.length && !errors.length, `${at}: no request left the site and nothing failed`, [...outside, ...errors].slice(0, 3).join(" | "));
    await ctx.close();
  }

  // ---- each language speaks only itself (G8 of M5) -------------------------------------------------------
  // On every step of every scenario, and at Challenge and Assess with every issue selected in turn, no
  // block is named in the other language: not in the text a person sees or a screen reader reads, and not
  // in a name or a title, outside an element marked with the other language (the EN and DE buttons, the
  // other guide). Before 1.0.0 the issue's "Bausteine" row named its blocks in English on a German page.
  {
    const names = (D) => Object.keys(D).filter((k) => /^block\.[a-z]+\.name$/.test(k)).map((k) => D[k]);
    const scan = ({ other, otherLang }) => {
      const hits = new Set();
      const skip = (el) => !el || !!el.closest(`[lang|="${otherLang}"], dialog:not([open]), [hidden], template, script, style`) || (typeof el.checkVisibility === "function" && !el.checkVisibility());
      const look = (text, where) => { for (const n of other) if (text.includes(n)) hits.add(`${n} (${where})`); };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!skip(node.parentElement)) look(node.textContent, node.parentElement.className?.toString().split(" ")[0] || node.parentElement.tagName.toLowerCase());
      }
      for (const el of document.querySelectorAll("[aria-label], [title], [alt]")) {
        if (skip(el)) continue;
        for (const a of ["aria-label", "title", "alt"]) if (el.hasAttribute(a)) look(el.getAttribute(a), `${a} on ${el.tagName.toLowerCase()}`);
      }
      return [...hits];
    };
    const leaks = [];
    let screens = 0;
    let planted = false;
    for (const src of SCENARIOS) for (const lang of ["en", "de"]) {
      const arg = { other: names(lang === "en" ? DE : EN), otherLang: lang === "en" ? "de" : "en" };
      const { context: ctx } = await context(browser, { locale: lang === "en" ? "en-GB" : "de-DE" });
      const page = await ctx.newPage();
      for (let step = 0; step <= 5; step += 1) {
        await page.goto(`${server.base}?scenario=${src.id}&lang=${lang}&guide=0&step=${step}`);
        await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
        await page.waitForSelector("#boot", { state: "detached", timeout: 5000 }).catch(() => {});
        if (await page.evaluate(() => window.BMC.playing)) await page.click("#play");
        const switches = step === 2 ? ".issue-pick" : step === 3 ? ".issue-tab" : null;
        const count = switches ? await page.locator(switches).count() : 0;
        for (let i = 0; i <= count; i += 1) {
          if (i > 0) await page.locator(switches).nth(i - 1).click();
          screens += 1;
          for (const hit of await page.evaluate(scan, arg)) leaks.push(`${src.id} ${lang} step ${step}${i ? ` issue ${i}` : ""}: ${hit}`);
        }
        // The control: the row as 0.4.0 wrote it, planted on a German Challenge, must be caught.
        if (lang === "de" && step === 2 && src.id === "s1") {
          planted = (await page.evaluate((a) => {
            const dd = document.createElement("dd");
            dd.textContent = "Cost structure, Revenue streams";
            document.querySelector("#panel .facts").append(dd);
            return a;
          }, arg)) && (await page.evaluate(scan, arg)).some((x) => x.startsWith("Cost structure"));
          await page.evaluate(() => document.querySelector("#panel .facts dd:last-child").remove());
        }
      }
      await ctx.close();
    }
    check(planted, "languages: control: the issue's blocks written in English on a German page, as 0.4.0 wrote them, are caught");
    check(!leaks.length && screens > 60, `languages: no block named in the other language on ${screens} screens (every step of the three scenarios in both languages, every issue at Challenge and Assess)`, leaks.slice(0, 6).join("; "));
  }

  // ---- a scenario past its date --------------------------------------------------------------------------
  for (const [date, stale] of [["2026-12-03T12:00:00", false], ["2027-03-01T12:00:00", true]]) {
    const { context: ctx } = await context(browser);
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(date));
    await page.goto(`${server.base}?scenario=s1&lang=en&guide=0`);
    await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
    const tag = await page.evaluate(() => { const el = document.getElementById("stale"); return { hidden: el.hidden || !el.getClientRects().length, text: el.textContent.trim() }; });
    check(stale ? !tag.hidden && /check for updates/i.test(tag.text) : tag.hidden, `on ${date.slice(0, 10)} a scenario as of 2026-11-23 ${stale ? `says "${tag.text}"` : "says nothing about its date"}`, JSON.stringify(tag));
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} presenter checks passed.`);
if (!failed) console.log("PRESENTER OK");
exit(failed ? 1 : 0);
