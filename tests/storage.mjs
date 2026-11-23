// Nothing is kept (brief 5.3, standing requirement 6; AC-02 in part). The API key, everything a person
// enters and everything the agents create live in memory only. The browser may keep three things:
// Vici's theme choice ("vc-theme"), the language choice ("bmc.lang") and Vici's note that the guide has
// opened in this tab ("vc-guide:<path>#<guide id>", in session storage). Checked two ways:
//   static   every use of a storage API in the code: local and session storage only in the modules that
//            keep those three, under those keys; IndexedDB, the Cache API, cookies, service workers,
//            the storage manager, window.name and changes to the address nowhere;
//   browser  the page, used as a visitor uses it (guide, theme, language, reload), keeps only those
//            keys with their expected values, no database, cache, cookie or service worker, and its
//            address stays as it was opened.
// After a live run with a planted key, only the allowed keys may remain: that part arrives with the
// live client in 0.3.0. Each scanner and the judge first prove on planted examples that they catch
// what they look for.
// Usage: node tests/storage.mjs [--static]
import fs from "node:fs";
import path from "node:path";
import { APP_ROOT, launchBrowser, serveStatic, port, context, KEYS } from "./lib/harness.mjs";

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
  "js/theme.js": { local: [THEME] },
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
const scripts = [...files("js", ".js"), ...files("data", ".js"), ...files("schemas", ".js"), "vici/dist/vici.js"];
const found = scripts.flatMap((f) => uses(read(f)).map(([name, line]) => ({ f, name, line })));
const storageOnly = (u) => u.name === "local storage" || u.name === "session storage";
const banned = found.filter((u) => !storageOnly(u));
check(!banned.length, `no IndexedDB, Cache API, cookie, service worker, storage manager, window.name or address change in ${scripts.length} scripts${banned.length ? `: ${banned.map((u) => `${u.name} (${u.f}:${u.line})`).join(", ")}` : ""}`);
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
check(/localStorage\.getItem\("bmc\.lang"\)/.test(read("js/lang.js")) && /localStorage\.getItem\("vc-theme"\)/.test(read("js/theme.js")), "the early scripts read the same keys as the modules");

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
    check(page.url() === first, `the address stays as it was opened (${page.url()})`);

    const second = `${server.base}?lang=de`;
    await page.goto(second);
    await ready();
    await closeGuide();
    const reloaded = await state();
    const reloadedProblems = judge(reloaded);
    check(reloaded.local[LANG] === "de" && !reloadedProblems.length, `a visit with ?lang=de stores the language and nothing else${reloadedProblems.length ? `: ${reloadedProblems.join(", ")}` : ""}`);
    check(page.url() === second, `?lang=de stays in the address as it was given (${page.url()})`);

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

if (!process.argv.includes("--static")) await inBrowser();

for (const p of passes) console.log(`PASS  ${p}`);
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(`${passes.length}/${passes.length + failures.length} storage checks passed.`);
if (failures.length) process.exit(1);
console.log("STORAGE OK");
