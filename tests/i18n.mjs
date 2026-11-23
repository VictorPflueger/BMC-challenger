// Both languages in the files (AC-03): en.js and de.js have the same keys, no empty value and the same
// placeholders; a text reads the same in both only where it is a name; every key the page asks for
// exists, and every key is asked for; index.html's English defaults are exactly the English texts of the
// keys they name; and no sentence a person sees is typed into the tool's own scripts instead of the
// dictionaries. English first and the switch without a reload are checked in the browser by
// tests/shell.mjs. Adapted from the Sovereignty Assessment's tests/i18n.mjs.
// Usage: node tests/i18n.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT } from "./lib/harness.mjs";
import { stringLiterals, looksLikeProse } from "./lib/strings.mjs";

const mod = (p) => import(pathToFileURL(path.join(APP_ROOT, p)).href);
const EN = (await mod("js/i18n/en.js")).default;
const DE = (await mod("js/i18n/de.js")).default;
const { BANDS } = await mod("js/risk.js");
const { BLOCKS } = await mod("js/canvas.js");
const read = (f) => fs.readFileSync(path.join(APP_ROOT, f), "utf8");
const files = (dir, ext) => fs.readdirSync(path.join(APP_ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`, ext) : e.name.endsWith(ext) ? [`${dir}/${e.name}`] : []));

const results = [];
const check = (ok, what, detail = "") => results.push({ ok, what, detail });

// ---- the two dictionaries ---------------------------------------------------------------------------
const en = Object.keys(EN);
const de = Object.keys(DE);
const onlyEn = en.filter((k) => !Object.hasOwn(DE, k));
const onlyDe = de.filter((k) => !Object.hasOwn(EN, k));
check(!onlyEn.length && !onlyDe.length && en.length > 0, `en.js and de.js have the same ${en.length} keys`, [...onlyEn.map((k) => `only in en: ${k}`), ...onlyDe.map((k) => `only in de: ${k}`)].join("; "));
check(en.join() === de.join(), "the keys stand in the same order in both files, so a reviewer reads them side by side");
const empty = [...en.filter((k) => typeof EN[k] !== "string" || !EN[k].trim()).map((k) => `en ${k}`), ...de.filter((k) => typeof DE[k] !== "string" || !DE[k].trim()).map((k) => `de ${k}`)];
check(!empty.length, "no empty value in either language", empty.join(", "));
const placeholders = (s) => [...String(s).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]).sort().join(",");
const uneven = en.filter((k) => Object.hasOwn(DE, k) && placeholders(EN[k]) !== placeholders(DE[k]));
check(!uneven.length, "the same placeholders in both languages", uneven.map((k) => `${k}: {${placeholders(EN[k])}} vs {${placeholders(DE[k])}}`).join("; "));
// A text that reads the same in both languages is fine for names; anything longer than a word is
// probably untranslated. These keys are the same in German on purpose.
const SAME_ALLOWED = new Map([
  ["app.name", "the tool's name"],
  ["p.byline.tip", "\"Website\" is German too"],
  ["p.step.start", "\"Start\" is German too"]
]);
const same = en.filter((k) => EN[k] === DE[k] && /\p{L}{4,}/u.test(EN[k]) && !/^[\p{Lu}\s-]+$/u.test(EN[k]) && !/^\{/.test(EN[k]));
const untranslated = same.filter((k) => !SAME_ALLOWED.has(k));
check(!untranslated.length, `every text is translated (the same in both only for ${SAME_ALLOWED.size} names)`, untranslated.map((k) => `${k}: "${EN[k]}"`).join("; "));
const sameStill = [...SAME_ALLOWED.keys()].filter((k) => EN[k] === DE[k]);
check(sameStill.length === SAME_ALLOWED.size, `each allowed same text is still the same, so the list stays short (${sameStill.length} of ${SAME_ALLOWED.size})`);
// German uses the formal address in the interface (Vici's writing guideline).
const informal = de.filter((k) => /\b(du|dich|dir|dein|deine|deinen|deinem|deiner)\b/i.test(DE[k]));
check(!informal.length, "the German texts address the reader as Sie", informal.join(", "));

// ---- every key the page asks for exists, and every key is asked for ---------------------------------------
// The tool's scripts: every module under js/ except the dictionaries. Those the page loads today are
// counted from js/main.js and js/lang.js; the formatting module joins them when the simulation arrives.
const reach = new Set();
const queue = ["js/main.js", "js/lang.js"];
while (queue.length) {
  const f = queue.shift();
  if (reach.has(f) || !fs.existsSync(path.join(APP_ROOT, f))) continue;
  reach.add(f);
  for (const m of read(f).matchAll(/(?:import|export)\s[^"']*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)) {
    const r = m[1] || m[2];
    if (r.startsWith(".")) queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(f), r)));
  }
}
const scripts = files("js", ".js").filter((f) => !/^js\/i18n\/(en|de)\.js$/.test(f)).sort();
check(reach.has("js/app.js") && reach.has("js/i18n/index.js") && reach.has("js/config.js"), `the page loads ${[...reach].filter((f) => !/i18n\/(en|de)\.js$/.test(f)).length} of the ${scripts.length} scripts from js/main.js on`);

const html = read("index.html");
const PREFIXES = new Set(en.map((k) => k.split(".")[0]));
const KEYLIKE = /^[a-z][A-Za-z]*(\.[A-Za-z0-9_-]+)+$/;
const used = new Set();
const unknown = [];
for (const f of scripts) {
  for (const lit of stringLiterals(read(f))) {
    if (!KEYLIKE.test(lit.value) || !PREFIXES.has(lit.value.split(".")[0])) continue;
    if (/\.(js|json|html|css|mjs|com|de|org|eu|io|net)$/.test(lit.value)) continue;
    // A key, or the stem of a family the code completes (a plural: stem.one, stem.other).
    const family = en.filter((k) => k.startsWith(`${lit.value}.`));
    if (Object.hasOwn(EN, lit.value)) used.add(lit.value);
    else if (family.length) for (const k of family) used.add(k);
    else unknown.push(`${f}:${lit.line} "${lit.value}"`);
  }
}
for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) used.add(m[1]);
for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const pair of m[1].split(";")) used.add(pair.split(":")[1].trim());
// Keys the code builds from a family and a value, with every value the family can take.
const FAMILIES = {
  "band.": { values: BANDS.map((b) => b.id), file: "js/format.js" }
};
const families = [];
for (const [prefix, { values, file }] of Object.entries(FAMILIES)) {
  if (!read(file).includes(`\`${prefix}\${`)) families.push(`${prefix}* is no longer built in ${file}`);
  for (const v of values) {
    used.add(prefix + v);
    if (!Object.hasOwn(EN, prefix + v)) unknown.push(`family ${prefix}${v}`);
  }
}
// The nine blocks: index.html names each block's name and question by key.
const blockKeys = BLOCKS.flatMap((b) => [`block.${b}.name`, `block.${b}.question`]);
const blocksMissing = blockKeys.filter((k) => !Object.hasOwn(EN, k) || !html.includes(`data-i18n="${k}"`));
check(!blocksMissing.length, `all ${BLOCKS.length} blocks have a name and a question in both languages, named in the page`, blocksMissing.join(", "));
check(!unknown.length && !families.length, `every key the page asks for exists (${used.size} keys asked for)`, [...unknown, ...families].join("; "));
const unused = en.filter((k) => !used.has(k));
check(!unused.length, "every key in the dictionaries is asked for", unused.join(", "));

// ---- index.html: the static defaults are the English texts -----------------------------------------
const staticWrong = [];
for (const m of html.matchAll(/<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>([^<]*)</g)) {
  const [, , key, text] = m;
  if (text !== EN[key]) staticWrong.push(`${key}: "${text}" ≠ "${EN[key]}"`);
}
for (const m of html.matchAll(/<[a-z0-9]+\b([^>]*)\bdata-i18n-attr="([^"]+)"([^>]*)>/g)) {
  const attrs = m[1] + m[3];
  for (const pair of m[2].split(";")) {
    const [attr, key] = pair.split(":").map((s) => s.trim());
    const value = (new RegExp(`\\b${attr}="([^"]*)"`).exec(attrs) || [])[1];
    if (value !== EN[key]) staticWrong.push(`${attr} of ${key}: "${value}" ≠ "${EN[key]}"`);
  }
}
const title = (/<title>([^<]*)<\/title>/.exec(html) || [])[1];
if (title !== EN["app.title"]) staticWrong.push(`<title> "${title}" ≠ "${EN["app.title"]}"`);
const staticCount = (html.match(/data-i18n="/g) || []).length + (html.match(/data-i18n-attr="/g) || []).length;
check(!staticWrong.length && staticCount >= 10, `index.html's ${staticCount} static defaults are the English texts of their keys`, staticWrong.join("; "));
check(/<html lang="en-GB"/.test(html), "the page is English until a script says otherwise (<html lang=\"en-GB\">)");

// ---- no sentence a person sees typed into the tool's own scripts ----------------------------------------
const ALLOWED = [
  ["js/main.js", "Script error.", "the browser's own text for an error in a script from another site, compared, never shown"],
  ["js/config.js", "Business Model Canvas Challenger", "APP.name, the tool's name in console tags and the handoff file; the page shows app.name from the dictionaries"]
];
const DEV_ONLY = /\bconsole\.(log|info|warn|error|debug)\(/;
function strays(file, src) {
  const found = [];
  for (const lit of stringLiterals(src)) {
    if (!looksLikeProse(lit.value)) continue;
    if (DEV_ONLY.test(lit.text)) continue;
    if (ALLOWED.some(([f, v]) => f === file && v === lit.value)) continue;
    found.push(`${file}:${lit.line} ${JSON.stringify(lit.value.slice(0, 70))}`);
  }
  return found;
}
// The positive control: a view with two typed sentences and the technical strings around them.
const PLANTED = `import { h } from "./view.js";
const regex = /["'][a-z]+["']/g; // a regular expression with quotes is not a string
export function view() {
  return h("div", { class: "vc-card vc-card--flat", "aria-label": "Choose a block first" },
    h("p", {}, "Every step of the agents appears here."),
    h("span", { class: "label" }, t("p.strip")), \`run-\${Date.now()}\`);
}`;
const caught = strays("planted.js", PLANTED);
check(caught.length === 2 && caught.some((c) => c.includes("Choose a block first")) && caught.some((c) => c.includes("Every step of the agents")),
  `the stray-string check catches typed sentences (positive control: ${caught.length} of 2 caught)`, caught.join("; "));
const OWN = scripts.filter((f) => f !== "js/schema.js");
const allStrays = OWN.flatMap((f) => strays(f, read(f)));
check(!allStrays.length, `no sentence typed into the tool's ${OWN.length} own scripts`, allStrays.join("; "));
const allowedStill = ALLOWED.filter(([f, v]) => stringLiterals(read(f)).some((l) => l.value === v));
check(allowedStill.length === ALLOWED.length, `each allowed literal still exists, so the list stays short (${allowedStill.length} of ${ALLOWED.length})`);

// ---- report -------------------------------------------------------------------------------------------
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} language checks passed.`);
if (!failed) console.log("I18N OK");
process.exit(failed ? 1 : 0);
