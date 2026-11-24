// Nothing is kept (brief 5.3, standing requirement 6; AC-02 in part). The API key, everything a person
// enters and everything the agents create live in memory only. The browser may keep three things:
// Vici's theme choice ("vc-theme"), the language choice ("bmc.lang") and Vici's note that the guide has
// opened in this tab ("vc-guide:<path>#<guide id>", in session storage). Checked two ways:
//   static   every use of a storage API in the code: local and session storage only in the modules that
//            keep those three, under those keys; IndexedDB, the Cache API, cookies, service workers,
//            the storage manager and window.name nowhere. The address follows the presenter, as Vici's
//            "Presenting step by step" asks, so a link opens the same scenario at the same step: one
//            history.replaceState in js/app.js, which writes the scenario and the step and keeps a language
//            given in the address. Nothing a person enters or an agent writes goes there;
//   browser  the page, used as a visitor uses it (guide, theme, language, reload, a whole run played with
//            an item removed and another answer chosen), keeps only those keys with their expected values,
//            no database, cache, cookie or service worker, and its address names nothing but the scenario,
//            the step, the language and the guide.
//   live     a whole live run against the stand-in (lib/standin.mjs) with a planted key, research and a
//            decision other than the one recommended, then its report saved as PDF, HTML and JSON (0.4.0),
//            leaves only those keys (Vici's storedKeyProblems agrees), and the key is in no storage, no
//            address the page opened, no request body, no downloaded file, no console message and nothing
//            in the DOM; a reload forgets the key and the run.
// Vici's storageProblems() also judges every script (G15 of M3). Each scanner and the judge first prove
// on planted examples that they catch what they look for. Vici's functions come from a ViciDesign
// checkout (VICI_DIR, or ../ViciDesign); without one the suite says so and skips them, unless
// --require-vici is given or it runs on GitHub Actions.
// Usage: node tests/storage.mjs [--static] [--require-vici]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, launchBrowser, serveStatic, port, context, KEYS, REQUIRE_VICI, viciDir } from "./lib/harness.mjs";
import { install, live, KEY } from "./lib/standin.mjs";

const passes = [];
const failures = [];
const check = (ok, what) => (ok ? passes : failures).push(what);
const read = (f) => fs.readFileSync(path.join(APP_ROOT, f), "utf8");
const files = (dir, ext) => fs.readdirSync(path.join(APP_ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`, ext) : e.name.endsWith(ext) ? [`${dir}/${e.name}`] : []));
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

// ---- the rule ----------------------------------------------------------------------------------------
const THEME = "vc-theme";
const LANG = "bmc.lang";
const GUIDE = /^vc-guide:\/[^#\s]*#guide-(en|de)$/;

// Where local and session storage may be used, and the keys each place may name.
const ALLOWED = {
  "vici/dist/vici-theme.js": { local: [THEME] },
  "js/lang.js": { local: [LANG], session: ["vc-guide:"] },
  "js/i18n/index.js": { local: ["STORAGE.lang"] },
  "vici/dist/vici.js": { local: ["key"], session: ["key"] }
};

// Storage APIs and address changes, as they stand in code.
const APIS = [
  ["local storage", /\blocalStorage\b/],
  ["session storage", /\bsessionStorage\b/],
  ["IndexedDB", /\bindexedDB\b|\bIDB[A-Z][A-Za-z]*\b/],
  ["the Cache API", /\bcaches\s*\.\s*(open|match|keys|has|delete)\b|\bCacheStorage\b/],
  ["cookies", /\bdocument\s*\.\s*cookie\b|\bcookieStore\b/],
  ["a service worker", /\bserviceWorker\b/],
  ["Web SQL", /\bopenDatabase\b/],
  ["the storage manager", /\bnavigator\s*\.\s*storage\b|\bStorageManager\b/],
  ["window.name", /\b(?:window|self|globalThis)\s*\.\s*name\s*=(?!=)/],
  ["the address", /\bhistory\s*\.\s*(pushState|replaceState)\b|\blocation\s*\.\s*(hash|search|href|pathname)\s*=(?!=)|\blocation\s*\.\s*(assign|replace)\s*\(/]
];

/** Every storage API or address change in a script: [[name, line]]. */
function uses(js) {
  const out = [];
  stripComments(js).split("\n").forEach((line, i) => {
    for (const [name, re] of APIS) if (re.test(line)) out.push([name, i + 1]);
  });
  return out;
}

/** The first argument of every local or session storage call: [[kind, key]]. */
function keys(js) {
  return [...stripComments(js).matchAll(/\b(local|session)Storage\s*\.\s*(?:getItem|setItem|removeItem)\(\s*([^,)]+)/g)].map((m) => [m[1], m[2].trim()]);
}
// js/lang.js builds the guide note's key with seen(lang); a check below holds seen() to that key.
const keyName = (arg) => arg.replace(/^["'`]|["'`]$/g, "").replace(/^\(?\s*"vc-guide:"[\s\S]*$/, "vc-guide:").replace(/^seen\([\s\S]*$/, "vc-guide:");

/** What a visitor's browser holds, judged against the rule. Returns a list of problems. */
function judge(state) {
  const problems = [];
  for (const [k, v] of Object.entries(state.local)) {
    if (k === THEME) { if (!["light", "dark"].includes(v)) problems.push(`local ${k}=${v}`); }
    else if (k === LANG) { if (!["en", "de"].includes(v)) problems.push(`local ${k}=${v}`); }
    else problems.push(`local ${k}`);
  }
  for (const [k, v] of Object.entries(state.session)) if (!GUIDE.test(k) || v !== "1") problems.push(`session ${k}=${v}`);
  if (state.databases.length) problems.push(`IndexedDB ${state.databases.join(", ")}`);
  if (state.caches.length) problems.push(`caches ${state.caches.join(", ")}`);
  if (state.cookie || state.cookies.length) problems.push(`cookies ${state.cookie || state.cookies.join(", ")}`);
  if (state.workers) problems.push(`${state.workers} service worker(s)`);
  if (state.name) problems.push(`window.name=${state.name}`);
  return problems;
}

// ---- self-tests ----------------------------------------------------------------------------------------
{
  const empty = { local: {}, session: {}, databases: [], caches: [], cookie: "", cookies: [], workers: 0, name: "" };
  const planted = [
    [uses('localStorage.setItem("x", "1");').some(([n]) => n === "local storage"), "local storage"],
    [uses("window.sessionStorage.getItem(k);").some(([n]) => n === "session storage"), "session storage"],
    [uses('const r = indexedDB.open("runs");').some(([n]) => n === "IndexedDB"), "IndexedDB"],
    [uses('const c = await caches.open("v1");').some(([n]) => n === "the Cache API"), "the Cache API"],
    [uses('document.cookie = "k=v";').some(([n]) => n === "cookies"), "a cookie"],
    [uses('navigator.serviceWorker.register("sw.js");').some(([n]) => n === "a service worker"), "a service worker"],
    [uses("await navigator.storage.getDirectory();").some(([n]) => n === "the storage manager"), "the private file system"],
    [uses("window.name = JSON.stringify(run);").some(([n]) => n === "window.name"), "window.name"],
    [uses('history.replaceState(null, "", "?key=" + k);').some(([n]) => n === "the address"), "an address change"],
    [uses('location.hash = "#run";').some(([n]) => n === "the address"), "a hash change"],
    [uses('if (location.hash === "#x") go(); // localStorage.setItem("x")').length === 0, "a comparison and a comment pass"],
    [keys('localStorage.setItem("bmc.key", k)').map(([, k]) => keyName(k)).join() === "bmc.key", "a storage key"],
    [judge(empty).length === 0, "an empty browser passes"],
    [judge({ ...empty, local: { [THEME]: "dark", [LANG]: "de" }, session: { "vc-guide:/#guide-en": "1" } }).length === 0, "the three allowed entries pass"],
    [judge({ ...empty, local: { "bmc.key": "sk-ant-x" } }).length === 1, "a stray local key"],
    [judge({ ...empty, local: { [LANG]: "sk-ant-x" } }).length === 1, "a stray value under an allowed key"],
    [judge({ ...empty, session: { "bmc.run": "{}" } }).length === 1, "a stray session key"],
    [judge({ ...empty, databases: ["runs"], caches: ["v1"], cookie: "k=v", workers: 1, name: "x" }).length === 5, "a database, a cache, a cookie, a worker and window.name"]
  ];
  for (const [ok, what] of planted) check(ok, `self-test: ${what}`);
}

// ---- static --------------------------------------------------------------------------------------------
const scripts = [...files("js", ".js"), ...files("data", ".js"), ...files("schemas", ".js"), "vici/dist/vici.js", "vici/dist/vici-theme.js"];
const found = scripts.flatMap((f) => uses(read(f)).map(([name, line]) => ({ f, name, line })));
const storageOnly = (u) => u.name === "local storage" || u.name === "session storage";
// The presenter's one address change: js/app.js, history.replaceState(null, "", u) in syncUrl().
const app = stripComments(read("js/app.js"));
const sync = (/function syncUrl\(\) \{([\s\S]*?)\n  \}/.exec(app) || [])[1] || "";
const presenter = (u) => u.name === "the address" && u.f === "js/app.js" && /history\.replaceState\(null, "", u\)/.test(app.split("\n")[u.line - 1]);
const banned = found.filter((u) => !storageOnly(u) && !presenter(u));
check(!banned.length, `no IndexedDB, Cache API, cookie, service worker, storage manager or window.name in ${scripts.length} scripts, and no address change but the presenter's${banned.length ? `: ${banned.map((u) => `${u.name} (${u.f}:${u.line})`).join(", ")}` : ""}`);
const addressCalls = found.filter((u) => u.name === "the address");
const setNames = [...sync.matchAll(/searchParams\.set\("([a-z]+)"/g)].map((m) => m[1]);
check(addressCalls.length === 1 && presenter(addressCalls[0]) && /history\.replaceState/.test(sync) && setNames.join() === "scenario,step,lang" && /if \(u\.searchParams\.has\("lang"\)\)/.test(sync), `the address changes in one place, js/app.js syncUrl(), which sets only ${setNames.join(", ") || "nothing"} and the language only when the address already names it (${addressCalls.length} call)`);
const outside = found.filter((u) => storageOnly(u) && !ALLOWED[u.f]);
check(!outside.length, `local and session storage only in ${Object.keys(ALLOWED).join(", ")}${outside.length ? `; also ${outside.map((u) => `${u.f}:${u.line}`).join(", ")}` : ""}`);
for (const [f, allowed] of Object.entries(ALLOWED)) {
  const js = read(f);
  const named = keys(js).map(([kind, arg]) => [kind === "local" ? "local" : "session", keyName(arg)]);
  const strays = named.filter(([kind, k]) => !(allowed[kind] || []).includes(k));
  const kinds = new Set(found.filter((u) => u.f === f && storageOnly(u)).map((u) => (u.name === "local storage" ? "local" : "session")));
  const wrongKind = [...kinds].filter((k) => !allowed[k]);
  check(named.length > 0 && !strays.length && !wrongKind.length, `${f} names only ${Object.entries(allowed).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ")} (${named.length} calls${strays.length ? `; stray ${strays.map(([k, n]) => `${k} ${n}`).join(", ")}` : ""}${wrongKind.length ? `; uses ${wrongKind.join(", ")} storage` : ""})`);
}
// The two keys that Vici's file reaches through variables.
const vici = read("vici/dist/vici.js");
check(/var STORAGE_KEY = 'vc-theme';/.test(vici) && [...vici.matchAll(/storage(?:Get|Set)\(([^,)]+)/g)].every((m) => ["key", "STORAGE_KEY"].includes(m[1].trim())), "Vici keeps the theme under vc-theme and nothing else in local storage");
check([...vici.matchAll(/sessionStorage\.(?:getItem|setItem)\(([^,)]+)/g)].every((m) => m[1].trim() === "key") && /var key = 'vc-guide:' \+ window\.location\.pathname \+ '#' \+ dlg\.id;/.test(vici) && /sessionStorage\.setItem\(key, '1'\)/.test(vici), "Vici notes only vc-guide:<path>#<guide id> = 1 in session storage");
// js/config.js declares the tool's own keys: exactly one, the language.
const config = read("js/config.js");
const block = (/export const STORAGE = Object\.freeze\(\{([\s\S]*?)\}\);/.exec(config) || [])[1] || "";
const declared = [...block.matchAll(/(\w+):\s*`\$\{P\}([^`]+)`/g)].map((m) => [m[1], `${/id:\s*"([a-z]+)"/.exec(config)[1]}.${m[2]}`]);
check(declared.length === 1 && declared[0][0] === "lang" && declared[0][1] === LANG && /const P = `\$\{APP\.id\}\.`;/.test(config), `js/config.js declares one key of its own, ${LANG} (${declared.map(([k, v]) => `${k}=${v}`).join(", ") || "none"})`);
check(KEYS.lang === LANG && Object.keys(KEYS).length === 1, "the test harness names the same key");
check(/var seen = function \(l\) \{ return "vc-guide:" \+ window\.location\.pathname \+ "#guide-" \+ l; \};/.test(read("js/lang.js")) && /sessionStorage\.setItem\(seen\(lang\), "1"\)/.test(read("js/lang.js")), "js/lang.js notes the guide under Vici's key vc-guide:<path>#guide-<lang> = 1");
check(/localStorage\.getItem\("bmc\.lang"\)/.test(read("js/lang.js")) && /localStorage\.getItem\('vc-theme'\)/.test(read("vici/dist/vici-theme.js")) && /<script src="vici\/dist\/vici-theme\.js"><\/script>/.test(read("index.html")), "the early scripts read the same keys as the modules: js/lang.js and Vici's vici-theme.js, which index.html loads");
// The live client holds the key in a module variable: js/keystore.js touches no store at all.
check(!uses(read("js/keystore.js")).length && /^let key = null;$/m.test(stripComments(read("js/keystore.js"))), "js/keystore.js holds the key in one variable and touches no browser store");

// ---- Vici's rule -----------------------------------------------------------------------------------------
const vdir = viciDir();
const vlib = vdir ? await import(pathToFileURL(path.join(vdir, "scripts", "lib", "storage.mjs")).href) : null;
if (!vlib) {
  if (REQUIRE_VICI) check(false, "Vici's storage rule: no ViciDesign checkout in VICI_DIR or next to this repository");
  else console.log("SKIP  Vici's storageProblems and storedKeyProblems: no ViciDesign checkout in VICI_DIR or next to this repository");
} else {
  const { storageProblems, storedKeyProblems } = vlib;
  check(storageProblems({ "js/live.js": "localStorage.setItem('run', x)" }, { allow: [] }).length === 1 && storageProblems({ "js/x.js": "document.cookie = k" }).length === 1, "control: Vici's storageProblems catches storage in a module not allowed it and any cookie");
  check(storedKeyProblems({ local: ["bmc.key"], session: ["bmc.run"], cookie: "k=v" }, { prefix: "bmc" }).length === 3, "control: Vici's storedKeyProblems catches a stray local key, a stray session key and a cookie");
  const sources = Object.fromEntries([...scripts, "index.html"].map((f) => [f, read(f)]));
  const s = storageProblems(sources, { allow: Object.keys(ALLOWED) });
  check(!s.length, `Vici's storageProblems finds nothing in ${Object.keys(sources).length} files${s.length ? `: ${s.join("; ")}` : ""}`);
}

// ---- browser -------------------------------------------------------------------------------------------
async function inBrowser() {
  const server = await serveStatic(APP_ROOT, port(8740));
  const browser = await launchBrowser();
  try {
    const { context: ctx, outside: blocked } = await context(browser);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const state = async () => ({
      ...(await page.evaluate(async () => {
        const dump = (s) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)).map((k) => [k, s.getItem(k)]));
        return {
          local: dump(localStorage),
          session: dump(sessionStorage),
          databases: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [],
          caches: self.caches ? await caches.keys() : [],
          cookie: document.cookie,
          workers: navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0,
          name: window.name
        };
      })),
      cookies: (await ctx.cookies()).map((c) => c.name)
    });
    const ready = () => page.waitForSelector("html[data-boot='ready']", { timeout: 15000 });
    const closeGuide = async () => {
      const open = page.locator("dialog[data-vc-guide][open]");
      if (await open.count()) { await page.keyboard.press("Escape"); await page.waitForSelector("dialog[data-vc-guide][open]", { state: "detached", timeout: 3000 }).catch(() => {}); }
    };

    const first = server.base;
    await page.goto(first);
    await ready();
    const fresh = await state();
    check(Object.keys(fresh.session).length === 1 && GUIDE.test(Object.keys(fresh.session)[0]), `the first visit notes only that the guide opened (${Object.keys(fresh.session).join(", ") || "nothing"})`);
    await closeGuide();
    await page.click("[data-vc-theme-toggle]");
    await page.click('.lang-option[data-lang="de"]');
    await page.click('[data-vc-guide-open="guide-de"]');
    await closeGuide();
    await page.click('.lang-option[data-lang="en"]');
    const used = await state();
    check(used.local[THEME] === "dark" && used.local[LANG] === "en", `the theme and the language are remembered (${THEME}=${used.local[THEME]}, ${LANG}=${used.local[LANG]})`);
    const usedProblems = judge(used);
    check(!usedProblems.length, `after the guide, the theme and both languages the browser keeps only the allowed entries${usedProblems.length ? `: ${usedProblems.join(", ")}` : ""}`);
    const params = (u) => [...new URL(u).searchParams.keys()];
    const onlyPresenter = (u) => params(u).every((k) => ["scenario", "step", "lang", "guide"].includes(k));
    check(onlyPresenter(page.url()) && new URL(page.url()).searchParams.get("scenario") === "s1", `the address names the scenario shown and nothing else (${page.url()})`);

    const second = `${server.base}?lang=de`;
    await page.goto(second);
    await ready();
    await closeGuide();
    const reloaded = await state();
    const reloadedProblems = judge(reloaded);
    check(reloaded.local[LANG] === "de" && !reloadedProblems.length, `a visit with ?lang=de stores the language and nothing else${reloadedProblems.length ? `: ${reloadedProblems.join(", ")}` : ""}`);
    check(onlyPresenter(page.url()) && new URL(page.url()).searchParams.get("lang") === "de", `?lang=de stays in the address as it was given (${page.url()})`);

    // A whole run, played as a presenter plays it: the second company, an item removed, the challenge,
    // another answer than the one recommended, applied, and the summary. Then only the allowed entries
    // remain, and the address holds the scenario and the step.
    await page.goto(`${server.base}?scenario=s2`);
    await ready();
    await closeGuide();
    const at = (name) => page.waitForSelector(`body[data-step="${name}"]`, { timeout: 15000 });
    await page.click("#btn-cta");
    await at("complete");
    if (await page.evaluate(() => window.BMC.playing)) await page.click("#play");
    const toggle = page.locator("#canvas .item-toggle:visible").first();
    await toggle.waitFor({ timeout: 15000 });
    const removedText = await toggle.getAttribute("aria-label");
    await toggle.click();
    await page.click("#btn-cta");
    await at("challenge");
    for (const name of ["assess", "adapt"]) { await page.click("#btn-next"); await at(name); }
    // A person clicks the card of another option; the card is the radio's label.
    const cards = page.locator(".options__cards label.option");
    const checked = await cards.evaluateAll((all) => all.map((c) => c.querySelector("input").checked));
    const pick = checked.indexOf(false);
    let choseOther = pick >= 0;
    if (choseOther) {
      await cards.nth(pick).click();
      choseOther = await cards.nth(pick).locator("input").isChecked();
    }
    await page.click("#btn-cta");
    await page.click("#btn-next");
    await at("summary");
    const played = await state();
    const playedProblems = judge(played);
    const url = page.url();
    check(choseOther && !playedProblems.length && onlyPresenter(url) && new URL(url).searchParams.get("step") === "5", `a run played to the summary, an item removed and another answer chosen, keeps only the allowed entries and an address of scenario and step (${url}${playedProblems.length ? `; ${playedProblems.join(", ")}` : ""})`);
    const everything = JSON.stringify(played) + decodeURIComponent(url);
    const removedItem = (removedText || "").replace(/^[^:]+:\s*/, "");
    check(removedItem.length > 8 && !everything.includes(removedItem), `nothing of the run reaches storage or the address, such as the removed item "${removedItem.slice(0, 40)}"`);

    // The judge on the real page: a planted entry is found, then removed.
    await page.evaluate(() => { localStorage.setItem("bmc.planted", "x"); sessionStorage.setItem("bmc.run", "{}"); });
    const planted = judge(await state());
    check(planted.length === 2, `planted entries in the real browser are caught (${planted.join(", ")})`);
    await page.evaluate(() => { localStorage.removeItem("bmc.planted"); sessionStorage.removeItem("bmc.run"); });

    check(!blocked.length, `no request left this site (${blocked.length})`);
    check(!errors.length, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
    await ctx.close();
  } finally {
    await browser.close();
    await server.close();
  }
}

/** Everything the browser holds for the page: storage with values, databases, caches, cookies, workers. */
async function readState(page, ctx) {
  return {
    ...(await page.evaluate(async () => {
      const dump = (s) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)).map((k) => [k, s.getItem(k)]));
      return {
        local: dump(localStorage),
        session: dump(sessionStorage),
        databases: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [],
        caches: self.caches ? await caches.keys() : [],
        cookie: document.cookie,
        workers: navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0,
        name: window.name
      };
    })),
    cookies: (await ctx.cookies()).map((c) => c.name)
  };
}

/** Where a planted key could leak, each as text: the places a scan reads. */
const leaks = (places, secret) => Object.entries(places).filter(([, text]) => String(text).includes(secret)).map(([where]) => where);
{
  const clean = leaks({ storage: '{"vc-theme":"dark"}', console: "[BMC] Live run on claude-haiku-5-5" }, KEY);
  const caught = leaks({ storage: "{}", console: `oops ${KEY}`, dom: `<p data-k="${KEY}">` }, KEY);
  check(!clean.length && caught.join() === "console,dom", "self-test: the leak scan passes clean text and finds a planted key in a console line and a DOM attribute");
}

// ---- a live run --------------------------------------------------------------------------------------------
async function liveRun() {
  const server = await serveStatic(APP_ROOT, port(8760));
  const browser = await launchBrowser();
  try {
    const { context: ctx, outside: blocked } = await context(browser, { width: 1920, height: 1080 });
    const api = await install(ctx, { research: true });
    const page = await ctx.newPage();
    const consoleLines = [];
    const errors = [];
    const requests = [];
    page.on("console", (m) => consoleLines.push(`${m.type()}: ${m.text()}`));
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("request", (r) => requests.push({ url: r.url(), body: r.postData() || "" }));
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) requests.push({ url: f.url(), body: "" }); });
    await page.goto(`${server.base}?guide=0`);
    await page.waitForSelector("html[data-boot='ready']");

    // The run: the sample canvas, research on, the review kept, the challenge, another answer than
    // the recommended one for the first issue, applied, the summary.
    await live.enter(page);
    await live.sample(page);
    await live.openDialog(page);
    await live.start(page, { key: KEY, preset: "balanced", research: true });
    await live.waitFor(page, "review");
    await page.click("#btn-cta");
    await live.waitFor(page, "decision", 30000);
    const cards = page.locator(".options__cards label.option");
    const checked = await cards.evaluateAll((all) => all.map((c) => c.querySelector("input").checked));
    const pick = checked.indexOf(false);
    let choseOther = pick >= 0;
    if (choseOther) { await cards.nth(pick).click(); choseOther = await cards.nth(pick).locator("input").isChecked(); }
    await page.click("#btn-cta");
    const done = await live.waitFor(page, "done");
    const scout = api.calls.filter((c) => c.agent === "scout");
    check(done.reached === 5 && done.research?.ran === true && scout.length > 0 && choseOther, `a live run with research and a decision of its own reaches the summary (${api.calls.map((c) => c.agent).join(" ")})`);

    // Its report, downloaded three ways (0.4.0): the PDF through Save as PDF, the HTML file and the JSON file.
    await page.click("#btn-cta");
    await page.waitForSelector("#report-dialog[open] #report");
    await page.evaluate(() => { window.print = () => window.dispatchEvent(new Event("afterprint")); });
    await page.click("#rp-pdf");
    const files = [];
    for (const id of ["#rp-html", "#rp-json"]) {
      const [d] = await Promise.all([page.waitForEvent("download"), page.click(id)]);
      files.push(d.suggestedFilename());
      requests.push({ url: "", body: fs.readFileSync(await d.path(), "utf8") });
    }
    await page.keyboard.press("Escape");
    check(files.length === 2 && files.every((f) => /^bmc-challenger-.+-\d{4}-\d{2}-\d{2}-en\.(html|json)$/.test(f)), `the report leaves the page as its files (${files.join(", ")}), printed as PDF too`);

    // What the browser keeps.
    const st = await readState(page, ctx);
    const problems = judge(st);
    check(!problems.length, `after the live run the browser keeps only the allowed entries${problems.length ? `: ${problems.join(", ")}` : ""}`);
    const vlib = vdir ? await import(pathToFileURL(path.join(vdir, "scripts", "lib", "storage.mjs")).href) : null;
    if (vlib) {
      const p = vlib.storedKeyProblems({ local: Object.keys(st.local), session: Object.keys(st.session), databases: st.databases, caches: st.caches, cookie: st.cookie }, { prefix: "bmc" });
      check(!p.length, `Vici's storedKeyProblems finds nothing after the live run${p.length ? `: ${p.join("; ")}` : ""}`);
    }

    // Where the key could have gone.
    const dom = await page.evaluate(() => document.documentElement.outerHTML + "\n" + [...document.querySelectorAll("input, textarea, output")].map((el) => el.value ?? "").join("\n"));
    const sentTo = new Set(api.calls.map((c) => c.headers["x-api-key"]));
    const places = {
      "local or session storage": JSON.stringify([st.local, st.session]),
      "the address": page.url(),
      "an address the page opened": requests.map((r) => r.url).join("\n"),
      "a request body or a downloaded file": requests.map((r) => r.body).join("\n"),
      "a console message": consoleLines.join("\n"),
      "a page error": errors.join("\n"),
      "the DOM, its attributes or a field's value": dom
    };
    const found = leaks(places, KEY);
    check(sentTo.size === 1 && sentTo.has(KEY) && !found.length, `the key went only in the x-api-key header of ${api.calls.length} requests to api.anthropic.com and is in no storage, address, request body, downloaded file, console message or DOM attribute${found.length ? `; found in ${found.join(", ")}` : ""}`);
    check(consoleLines.some((l) => l.includes("Live run on claude-haiku-5-5")) && consoleLines.some((l) => l.includes("The Scout reported")), `the console scan reads the run's own lines (${consoleLines.length} lines)`);
    const issue = api.defaults.redteam.issues[0].title;
    const run = JSON.stringify([st.local, st.session]) + decodeURIComponent(page.url());
    check(issue.length > 12 && !run.includes(issue) && !run.includes(api.defaults.sc.company.name), `nothing of the run reaches storage or the address, such as the company or the issue "${issue.slice(0, 40)}"`);

    // The scan on the real page: a planted attribute and a console line are found, then removed.
    await page.evaluate((k) => { document.body.dataset.planted = k; console.log(`planted ${k}`); }, KEY);
    await page.waitForTimeout(100);
    const planted = leaks({ dom: await page.evaluate(() => document.documentElement.outerHTML), console: consoleLines.join("\n") }, KEY);
    check(planted.join() === "dom,console", `a key planted in the real page is caught in the DOM and the console (${planted.join(", ")})`);
    await page.evaluate(() => { delete document.body.dataset.planted; });

    // A reload ends everything: the key, the run, the form.
    page.on("dialog", (d) => d.accept());
    await page.reload();
    await page.waitForSelector("html[data-boot='ready']");
    const after = await page.evaluate(() => ({ mode: window.BMC.state.mode, live: window.BMC.state.live.status, reached: window.BMC.state.live.reached }));
    await live.enter(page);
    const form = await page.$eval("#live-name", (el) => el.value);
    await page.fill("#live-name", "Test company");
    await live.openDialog(page);
    const asks = await page.evaluate(() => !document.getElementById("live-key-row").hidden && document.getElementById("live-key-held").hidden && document.getElementById("live-key").value === "");
    const reloaded = judge(await readState(page, ctx));
    check(after.mode === "simulation" && after.live === "idle" && after.reached === 0 && form === "" && asks && !reloaded.length, `a reload forgets the key, the run and the form, and the browser still keeps only the allowed entries (${JSON.stringify(after)})`);

    check(!blocked.length, `no request of the live run left this site but the stand-in's api.anthropic.com (${blocked.length})`);
    check(!errors.length, `no page errors in the live run${errors.length ? `: ${errors.join(" | ")}` : ""}`);
    await ctx.close();
  } finally {
    await browser.close();
    await server.close();
  }
}

if (!process.argv.includes("--static")) { await inBrowser(); await liveRun(); }

for (const p of passes) console.log(`PASS  ${p}`);
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(`${passes.length}/${passes.length + failures.length} storage checks passed.`);
if (failures.length) process.exit(1);
console.log("STORAGE OK");
