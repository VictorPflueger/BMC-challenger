// A page opened from a file (Vici's partner review looks at it): browsers run no module from file://, so the
// page's program never starts there and the loading screen stays. Its help, hidden while a normal start
// takes its moment, shows after four seconds and says what to do, in the page's language.
//   file      opened from the file system, the help is hidden at first and shows after its wait, in the
//             page's language only (English first, German with ?lang=de), inside the window; it links the
//             live site with a 40 px target and names the command that serves the folder; the guide, which
//             Vici's plain script runs, still opens by itself and closes with Escape;
//   served    over http the program replaces the loading screen as the page starts: the help never shows,
//             even when the program arrives a second and a half late;
//   control   with its animation taken away the help never shows, so the visibility check can fail.
// Adapted from the PESTEL Challenger 1.0.0's tests/from-file.mjs (907b1c7), for this tool's loading screen.
// Usage: node tests/from-file.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, launchBrowser, serveStatic, port, outDir, exit } from "./lib/harness.mjs";

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });
const LIVE = "https://victorpflueger.github.io/BMC-challenger/";
const fileUrl = pathToFileURL(path.join(APP_ROOT, "index.html")).href;
const shots = await outDir("from-file");

/** The help as a person sees it: shown or not, which language, its link and the link's box. */
const look = (page) => page.evaluate(() => {
  const boot = document.getElementById("boot");
  if (!boot) return { present: false, started: document.documentElement.dataset.boot === "ready" };
  const shown = [...boot.querySelectorAll(".boot-help")].filter((p) => !p.hidden && getComputedStyle(p).visibility === "visible");
  const p = shown[0];
  const link = p?.querySelector("a");
  const r = link?.getBoundingClientRect();
  const box = p?.getBoundingClientRect();
  return {
    present: true,
    started: document.documentElement.dataset.boot === "ready",
    visible: shown.length > 0,
    inView: !!box && box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth,
    langs: shown.map((x) => x.getAttribute("data-boot-lang")),
    text: p?.textContent.trim() ?? "",
    href: link?.getAttribute("href") ?? "",
    target: r ? { w: Math.round(r.width), h: Math.round(r.height) } : { w: 0, h: 0 }
  };
});

const browser = await launchBrowser();
try {
  // ---- file: the help after its wait, in the page's language ------------------------------------------
  for (const [lang, query, words] of [["en", "", "Browsers don't run this page's program from a file"], ["de", "?lang=de", "Aus einer Datei führen Browser das Programm dieser Seite nicht aus"]]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.goto(`${fileUrl}${query}`);
    await page.waitForTimeout(700);
    const early = await look(page);
    // Vici's guide opens by itself here too; Escape closes it, as on the served page.
    const guideOpen = await page.evaluate(() => document.querySelector("dialog[open]")?.id || null);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(4200);
    const late = await look(page);
    const guideClosed = await page.evaluate(() => !document.querySelector("dialog[open]"));
    check(early.present && !early.visible, `file ${lang}: at first the help stays hidden (visible: ${early.visible})`);
    check(!late.started && late.visible && late.inView, `file ${lang}: the program never starts from a file, and after its wait the help shows in the window`, JSON.stringify(late));
    check(late.langs.join() === lang && late.text.includes(words) && late.text.includes("python -m http.server 8000"), `file ${lang}: it speaks ${lang} only and names the command that serves the folder ("${late.text.slice(0, 60)}…")`, JSON.stringify({ langs: late.langs, text: late.text }));
    check(late.href === LIVE && late.target.w >= 40 && late.target.h >= 40, `file ${lang}: it links the live site with a 40 px target (${late.href}, ${late.target.w} × ${late.target.h} px)`);
    check(guideOpen === `guide-${lang}` && guideClosed, `file ${lang}: the guide in ${lang} opens by itself and Escape closes it (${guideOpen})`);
    await page.screenshot({ path: path.join(shots, `from-file-${lang}.png`) });
    await context.close();
  }

  // ---- served: the program replaces the loading screen as the page starts ----------------------------------
  const { base, close } = await serveStatic(APP_ROOT, port(9431));
  try {
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      await page.goto(`${base}?guide=0`);
      await page.waitForSelector('html[data-boot="ready"]', { timeout: 15000 });
      await page.waitForTimeout(4500);
      const later = await look(page);
      check(later.started && (!later.present || !later.visible), "served: the page starts, and four and a half seconds later the help has never shown", JSON.stringify(later));
      await context.close();
    }
    {
      // The program a second and a half late: the help is still hidden while it waits, and gone once it starts.
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      await context.route("**/js/main.js", async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
      const page = await context.newPage();
      await page.goto(`${base}?guide=0`, { waitUntil: "commit" });
      await page.waitForSelector("#boot", { state: "attached", timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(900);
      const waiting = await look(page);
      await page.waitForSelector('html[data-boot="ready"]', { timeout: 15000 });
      await page.waitForTimeout(3500);
      const started = await look(page);
      check(waiting.present && !waiting.visible && started.started && (!started.present || !started.visible), `served late: while the program loads the help stays hidden (visible: ${waiting.visible}), and once it starts it never shows`, JSON.stringify({ waiting, started }));
      await context.close();
    }
  } finally {
    await close();
  }

  // ---- control: without its animation the help never shows, so the check above can fail --------------------
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.goto(fileUrl);
    // Through the CSS object model, which the page's policy allows where it refuses a style tag.
    await page.evaluate(() => { for (const p of document.querySelectorAll(".boot-help")) p.style.setProperty("animation", "none", "important"); });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(4600);
    const planted = await look(page);
    check(planted.present && !planted.visible, "control: with its animation taken away the help stays hidden, and the check sees it");
    await context.close();
  }
} finally {
  await browser.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks of the page opened from a file passed.`);
if (!failed) console.log("FROM FILE OK");
exit(failed ? 1 : 0);
