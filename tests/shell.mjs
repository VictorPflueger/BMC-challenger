// The page in the browser (AC-03, and the shell of 0.1.0). It opens in English, also for a visitor whose
// browser is set to German; the switch to German and back changes every text without a reload and is
// remembered; ?lang= in the address wins over the remembered choice; the guide of the page's language
// opens by itself once per tab and again from the header; the header holds the three key figures, which
// say what they wait for; Play, the six steps and Run it live stand in the talk bar, disabled in 0.1.0,
// with the AI notice beside Run it live; the Strategyzer credit stands under the canvas in both
// languages; the dark theme starts as cleanly as the light one; nothing leaves this site; and a start that
// fails says so on the loading screen, in the page's language, with what to do.
// Usage: node tests/shell.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, launchBrowser, serveStatic, port, context, NETWORK_NOISE } from "./lib/harness.mjs";

const mod = (p) => import(pathToFileURL(path.join(APP_ROOT, p)).href);
const EN = (await mod("js/i18n/en.js")).default;
const DE = (await mod("js/i18n/de.js")).default;

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });

/** What the page shows for every text it names by key: [{ key, text, attr? }]. */
const shown = (page) => page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("[data-i18n]")) out.push({ key: el.dataset.i18n, text: el.textContent });
  for (const el of document.querySelectorAll("[data-i18n-attr]")) for (const pair of el.dataset.i18nAttr.split(";")) {
    const [attr, key] = pair.split(":").map((s) => s.trim());
    out.push({ key, attr, text: el.getAttribute(attr) });
  }
  out.push({ key: "app.title", text: document.title });
  return out;
});
const wrongTexts = (list, dict) => list.filter((x) => x.text !== dict[x.key]).map((x) => `${x.attr ? `${x.attr} of ` : ""}${x.key}: "${x.text}"`);
const visible = (page, sel) => page.locator(sel).first().isVisible();
const openGuides = (page) => page.evaluate(() => [...document.querySelectorAll("dialog[data-vc-guide][open]")].map((d) => d.id));
async function closeGuide(page) {
  if ((await openGuides(page)).length) {
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog[data-vc-guide][open]"), null, { timeout: 3000 }).catch(() => {});
  }
}

const server = await serveStatic(APP_ROOT, port(8960));
const browser = await launchBrowser();
try {
  // ---- a German browser's first visit ------------------------------------------------------------------
  const { context: ctx, outside } = await context(browser, { locale: "de-DE" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e}`));
  page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(`console: ${m.text()}`); });
  await page.goto(server.base);
  await page.waitForSelector("html[data-boot='ready']", { timeout: 15000 });
  await page.waitForSelector("#boot", { state: "detached", timeout: 3000 }).catch(() => {});
  check(!(await page.locator("#boot").count()), "the boot screen is gone once the page has started");

  const html = () => page.evaluate(() => ({ lang: document.documentElement.lang, data: document.documentElement.dataset.lang }));
  const first = await html();
  check(first.lang === "en-GB" && first.data === "en", `a German browser's first visit opens in English (lang="${first.lang}")`);
  const firstWrong = wrongTexts(await shown(page), EN);
  check(!firstWrong.length, "every text the page names by key is the English one", firstWrong.slice(0, 6).join("; "));
  check((await openGuides(page)).join() === "guide-en", `the English guide opens by itself on the first visit (${(await openGuides(page)).join(", ") || "none"})`);
  await closeGuide(page);
  check(await visible(page, '[data-vc-guide-open="guide-en"]') && !(await visible(page, '[data-vc-guide-open="guide-de"]')), "the header shows the English guide's button only");
  check(await page.getAttribute('.lang-option[data-lang="en"]', "aria-pressed") === "true" && await page.getAttribute('.lang-option[data-lang="de"]', "aria-pressed") === "false", "the language switch marks EN as chosen");

  // ---- the header, the talk bar and the canvas ---------------------------------------------------------------
  const tiles = await page.evaluate(() => [...document.querySelectorAll(".app-header .kpis .kpi.vc-stat[data-vc-kpi]")].map((el) => ({
    id: el.id, state: el.dataset.state, value: el.querySelector(".kpi-main")?.textContent, note: el.querySelector(".kpi-note")?.textContent,
    right: el.getBoundingClientRect().right, top: el.getBoundingClientRect().top
  })));
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  check(tiles.map((x) => x.id).join() === "kpi-stake,kpi-pressure,kpi-cost", `the header holds the three key figures (${tiles.map((x) => x.id).join(", ")})`);
  check(tiles.every((x) => x.state === "idle" && x.value === "…" && x.note), `before a run each figure shows "…" and what it waits for (${tiles.map((x) => `${x.value} ${x.note}`).join(" | ")})`);
  check(tiles.length === 3 && Math.max(...tiles.map((x) => x.right)) > width - 40 && Math.max(...tiles.map((x) => x.top)) < 80, "the figures stand at the top right");
  check((await page.textContent("#mode-text")) === "SIMULATION", "the header says SIMULATION");
  const talk = await page.evaluate(() => ({
    play: document.getElementById("play")?.disabled,
    steps: [...document.querySelectorAll("#steps .vc-step")].map((li) => ({ id: li.dataset.step, current: li.querySelector("button").getAttribute("aria-current"), disabled: li.querySelector("button").disabled })),
    live: document.getElementById("live")?.disabled,
    notice: document.getElementById("live")?.nextElementSibling?.matches(".vc-tag.vc-tag--feature.ai-notice") ? document.getElementById("live").nextElementSibling.textContent.trim() : null
  }));
  check(talk.steps.map((s) => s.id).join() === "start,complete,challenge,assess,adapt,summary", `the talk bar has the six steps in order (${talk.steps.map((s) => s.id).join(", ")})`);
  check(talk.steps[0]?.current === "step" && !talk.steps[0].disabled && talk.steps.slice(1).every((s) => s.disabled), "Start is the current step; the other five wait for 0.2.0");
  check(talk.play === true && talk.live === true, "Play and Run it live are there and disabled until the simulation and the live client arrive");
  check(talk.notice === EN["p.ai"] && await visible(page, ".ai-notice"), `the lilac AI notice stands beside Run it live ("${talk.notice}")`);
  const credit = await page.evaluate(() => {
    const c = document.querySelector(".stage .canvas + .credit");
    const links = c ? [...c.querySelectorAll("a")].map((a) => [a.textContent, a.href]) : [];
    return { text: c?.textContent.replace(/\s+/g, " ").trim(), links };
  });
  check(credit.links.some(([text, href]) => text === "Strategyzer.com" && href === "https://www.strategyzer.com/") && credit.links.some(([text, href]) => text === "CC BY-SA 3.0" && href === "https://creativecommons.org/licenses/by-sa/3.0/") && await visible(page, ".credit"),
    `the credit stands under the canvas: ${credit.text}`);
  check((await page.locator(".canvas .block[data-block]").count()) === 9, "the canvas has nine blocks");

  // ---- the switch: German without a reload -------------------------------------------------------------
  await page.evaluate(() => { window.__sameDocument = 42; });
  await page.click('.lang-option[data-lang="de"]');
  const second = await html();
  check(second.lang === "de" && second.data === "de", `the switch makes the page German (lang="${second.lang}")`);
  const deWrong = wrongTexts(await shown(page), DE);
  check(!deWrong.length, "every text the page names by key is the German one, the title included", deWrong.slice(0, 6).join("; "));
  const same = await page.evaluate(() => ({ marker: window.__sameDocument, navigations: performance.getEntriesByType("navigation").length }));
  check(same.marker === 42 && same.navigations === 1, "the page did not reload to switch");
  check(await visible(page, '[data-vc-guide-open="guide-de"]') && !(await visible(page, '[data-vc-guide-open="guide-en"]')), "the header now shows the German guide's button only");
  check(await page.getAttribute('.lang-option[data-lang="de"]', "aria-pressed") === "true", "the language switch marks DE as chosen");
  check((await page.evaluate(() => localStorage.getItem("bmc.lang"))) === "de", "the choice is remembered under bmc.lang");
  const deCredit = await page.evaluate(() => document.querySelector(".stage .canvas + .credit")?.textContent.replace(/\s+/g, " ").trim());
  check(deCredit?.startsWith(DE["p.credit.label"]) && deCredit.includes("Strategyzer.com"), `the credit stays under the canvas in German: ${deCredit}`);
  await page.click('[data-vc-guide-open="guide-de"]');
  check((await openGuides(page)).join() === "guide-de", "the header's button opens the German guide");
  await closeGuide(page);

  // ---- remembered, and ?lang= wins ---------------------------------------------------------------------
  await page.reload();
  await page.waitForSelector("html[data-boot='ready']", { timeout: 15000 });
  check((await html()).lang === "de", "a reload keeps German");
  check(!(await openGuides(page)).length, "a reload in the other language does not open the guide again in this tab");
  await page.goto(`${server.base}?lang=en`);
  await page.waitForSelector("html[data-boot='ready']", { timeout: 15000 });
  check((await html()).lang === "en-GB" && (await page.evaluate(() => localStorage.getItem("bmc.lang"))) === "en", "?lang=en in the address wins over the remembered German and becomes the choice");
  const backWrong = wrongTexts(await shown(page), EN);
  check(!backWrong.length, "and every text is English again", backWrong.slice(0, 6).join("; "));

  // ---- the dark theme ----------------------------------------------------------------------------------------
  await page.click("[data-vc-theme-toggle]");
  check((await page.evaluate(() => document.documentElement.dataset.theme)) === "dark", "the toggle turns the page dark");
  await page.reload();
  await page.waitForSelector("html[data-boot='ready']", { timeout: 15000 });
  check((await page.evaluate(() => document.documentElement.dataset.theme)) === "dark", "a reload keeps the dark theme, applied before the page is drawn");

  check(!outside.length, `no request left this site (${outside.length})`, outside.slice(0, 3).join(", "));
  check(!errors.length, "no errors in the page or its console", errors.slice(0, 4).join(" | "));
  await ctx.close();

  // ---- a start that fails ---------------------------------------------------------------------------------
  // A module that does not load: the loading screen says so in the page's language, names the part,
  // says what to do and stops spinning; the help about opening the page from a file stays hidden.
  for (const lang of ["en", "de"]) {
    const { context: fctx } = await context(browser);
    const fpage = await fctx.newPage();
    await fpage.route("**/js/app.js", (r) => r.abort("failed"));
    await fpage.goto(`${server.base}?lang=${lang}`);
    await fpage.waitForSelector('#boot[data-state="failed"]', { timeout: 10000 });
    const f = await fpage.evaluate(() => ({
      status: document.getElementById("boot-status").textContent,
      detail: document.getElementById("boot-detail").hidden ? "" : document.getElementById("boot-detail").textContent,
      spinning: getComputedStyle(document.querySelector("#boot .vc-spinner")).display !== "none",
      help: [...document.querySelectorAll("#boot .boot-help")].some((e) => !e.hidden && getComputedStyle(e).visibility === "visible")
    }));
    const D = lang === "en" ? EN : DE;
    check(f.status === D["p.boot.failed"] && f.detail.startsWith(D["p.boot.module"].split("{")[0]) && f.detail.includes("app.js") && !f.spinning && !f.help,
      `a start that fails says so in ${lang === "en" ? "English" : "German"}, names the part and how to recover, without a spinner or the file help`, JSON.stringify(f));
    await fctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} shell checks passed.`);
if (!failed) console.log("SHELL OK");
process.exit(failed ? 1 : 0);
