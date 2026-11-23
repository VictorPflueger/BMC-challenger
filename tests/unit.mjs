// The small modules, without a browser: the language module (English first, ?lang= wins and is stored,
// the stored choice next, placeholders, plurals, a missing key shows itself and is recorded), the
// formats in both languages (whole numbers, blocks under pressure, dates, a sum over part of the
// issues), the risk helpers at their edges, the canvas's nine blocks and the configuration (name,
// version, address, the dollar rate the guides state). The live client and the cost meter join with
// 0.3.0. Prints UNIT OK.
// Usage: node tests/unit.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT } from "./lib/harness.mjs";

// The language module reads and writes local storage and <html lang>: a stand-in for both.
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.document = { documentElement: { lang: "", dataset: {} }, querySelectorAll: () => [], title: "" };

const mod = (p) => import(pathToFileURL(path.join(APP_ROOT, p)).href);
const i18n = await mod("js/i18n/index.js");
const fmt = await mod("js/format.js");
const risk = await mod("js/risk.js");
const { worse } = await mod("js/engine.js");
const { BLOCKS, isBlock } = await mod("js/canvas.js");
const { APP, CSP, STORAGE, FX_USD_EUR } = await mod("js/config.js");
const html = readFileSync(path.join(APP_ROOT, "index.html"), "utf8");

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const nb = (s) => String(s).replace(/ | /g, " ");
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

// ---- the language ----------------------------------------------------------------------------------
check(i18n.initLang("") === "en" && document.documentElement.lang === "en-GB" && !store.has(STORAGE.lang), "with no address and no stored choice the page is English, and nothing is stored");
check(i18n.initLang("?lang=de") === "de" && store.get(STORAGE.lang) === "de" && document.documentElement.lang === "de", "?lang=de makes it German and becomes the stored choice");
check(i18n.initLang("") === "de", "the stored choice holds on the next visit");
check(i18n.initLang("?lang=en") === "en" && store.get(STORAGE.lang) === "en", "?lang=en wins over a stored German");
check(i18n.initLang("?lang=fr") === "en", "an unknown language in the address is ignored");
store.set(STORAGE.lang, "xx");
check(i18n.initLang("") === "en", "an unknown stored value falls back to English");
store.clear();
i18n.initLang("");
let heard = null;
const off = i18n.onLang((l) => { heard = l; });
i18n.setLang("de");
check(heard === "de" && i18n.getLang() === "de" && store.get(STORAGE.lang) === "de" && document.documentElement.dataset.lang === "de", "setLang switches, stores the choice and tells every listener");
off();
i18n.setLang("en");
check(heard === "de" && i18n.getLang() === "en", "an unsubscribed listener hears nothing more");
i18n.setLang("fr");
check(i18n.getLang() === "en", "setLang ignores an unknown language");
check(i18n.t("p.live") === "Run it live" && i18n.t("p.live", null, "de") === "Live starten", "t gives a key's text in the active language or the one asked for");
check(i18n.t("fig.pressure", { n: 7, of: 9 }) === "7 of 9" && i18n.t("fig.pressure", { n: 7 }) === "7 of {of}", "t fills placeholders and leaves an unfilled one visible");
check(i18n.tn("fig.partial", 1, { amount: "€1k", priced: 0, total: 1 }) === "€1k on 0 of 1 issue" && i18n.tn("fig.partial", 5, { amount: "€1k", priced: 4, total: 5 }, "de") === "€1k auf 4 von 5 Schwachstellen", "tn picks the plural form by the language's rules");
check(i18n.t("p.nothing.here") === "p.nothing.here" && i18n.missingKeys().includes("p.nothing.here"), "a missing key shows itself and is recorded for the tests");
check(i18n.locale("de") === "de-DE" && i18n.locale("en") === "en-GB" && i18n.locale("fr") === "en-GB", "locales: de-DE and en-GB");
check(i18n.dictionary("en") && i18n.dictionary("de") && i18n.dictionary("fr") === null, "both dictionaries are there");

// ---- the formats --------------------------------------------------------------------------------------
check(fmt.fmtInt(1122.5, "en") === "1,123" && nb(fmt.fmtInt(1122.5, "de")) === "1.123" && fmt.fmtInt(-2.5, "en") === "-3", "whole numbers: grouped in the language, rounded half away from zero");
check(fmt.fmtPressure(7, 9, "en") === "7 of 9" && fmt.fmtPressure(7, 9, "de") === "7 von 9", "blocks under pressure: 7 of 9, 7 von 9");
check(fmt.fmtDate("2026-11-23", "en") === "23 November 2026" && fmt.fmtDate("2026-11-23", "de") === "23. November 2026" && fmt.fmtDate("", "en") === "no date" && fmt.fmtDate("soon", "de") === "kein Datum", "dates with the month written out; no date says so");
check(fmt.fmtPartMoney(5_700_000, 4, 5, "en") === "€5.7m on 4 of 5 issues" && nb(fmt.fmtPartMoney(5_700_000, 4, 5, "de")) === "5,7 Mio. € auf 4 von 5 Schwachstellen" && fmt.fmtPartMoney(5_700_000, 5, 5, "en") === "€5.7m", "a sum over part of the issues says so; over all, just the amount");
check(fmt.fmtMoney(0, "en") === "€0" && nb(fmt.fmtMoney(0, "de")) === "0 €" && fmt.fmtMoney(-1500, "en") === "−€2k", "money at zero and below zero");

// ---- the risk helpers at their edges ---------------------------------------------------------------------
check(risk.BANDS.map((b) => `${b.id} ${b.min}-${b.max}`).join(", ") === "low 1-4, medium 5-9, high 10-15, critical 16-25", "the shared bands: low 1 to 4, medium 5 to 9, high 10 to 15, critical 16 to 25");
check(throws(() => risk.riskScore(0, 3)) && throws(() => risk.band(3, 6)) && throws(() => risk.riskScore(2.5, 3)) && throws(() => risk.probability("3")), "the score, the band and the probability refuse a value off the scale");
check(worse("low", "high") === "high" && worse("critical", "medium") === "critical" && worse(null, "low") === "low", "worse picks the worse band; nothing yet counts as better than low");
check(risk.roundHalfAway(2.5) === 3 && risk.roundHalfAway(-2.5) === -3 && risk.roundHalfAway(1.005, 2) === 1.01 && risk.roundHalfAway(0.1 + 0.2, 1) === 0.3 && risk.round9(0.1 + 0.2) === 0.3, "rounding is half away from zero, after rounding float noise to 1e-9");
check(risk.fixed(2.525, 2, "de") === "2,53" && risk.fixed(-2.525, 2) === "−2.53" && risk.fixed(-0.0001, 2) === "0.00", "fixed places with the language's decimal mark and a minus sign, never a minus zero");
check(throws(() => risk.expected(-1, 5, 3)) && throws(() => risk.expected(9, 5, 3)) && throws(() => risk.expected(1, 5, 6)), "the expected loss refuses a negative or reversed range and a likelihood off the scale");
check(Math.abs(risk.expected(1_000_000, 3_000_000, 4) - 1_400_000) < 1e-9, "the expected loss: the midpoint of the range times the likelihood's probability");

// ---- the canvas and the configuration ----------------------------------------------------------------------
check(BLOCKS.length === 9 && new Set(BLOCKS).size === 9 && Object.isFrozen(BLOCKS) && isBlock("value") && !isBlock("Value") && !isBlock("customers"), "the canvas has nine blocks, by id, frozen");
check(APP.id === "bmc" && APP.name === "Business Model Canvas Challenger" && /^\d+\.\d+\.\d+$/.test(APP.version) && APP.url === "https://victorpflueger.github.io/BMC-challenger/", `the tool's name, version ${APP.version} and address`);
check(/connect-src https:\/\/api\.anthropic\.com;/.test(CSP) && CSP.startsWith("default-src 'self';"), "the policy reaches api.anthropic.com and nothing else (tests/policy.mjs checks it whole)");
check(FX_USD_EUR === 0.894 && html.includes("€0.894 to the dollar") && html.includes("0,894 € je Dollar"), "the dollar rate is 0.894, as both guides state it");
check(Object.isFrozen(STORAGE) && Object.keys(STORAGE).join() === "lang", "the tool keeps one key of its own, the language");

// ---- report -------------------------------------------------------------------------------------------
for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
const failed = results.filter(([ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} unit checks passed.`);
if (!failed) console.log("UNIT OK");
process.exit(failed ? 1 : 0);
