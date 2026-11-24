// The four decisions Victor left to the build after 0.2.0, settled with Vici first (TECH_NOTES §9):
//   1  the page loads Vici's vici-theme.js and the tool keeps no theme script of its own;
//   2  the canvas's targets follow Vici's density rule (tests/layout.mjs measures them);
//   3  an item's text is cut only by Vici's compact framework view, which js/app.js sets where the
//      canvas is tight, and the stylesheet clamps no line of its own;
//   4  German keeps "Fazit" and "Mindern", as the SWOT Challenger does.
// Each rule is first tried on a planted mistake it must catch. Node.js only. Prints DECISIONS OK.
// Usage: node tests/decisions.mjs
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";

const read = (f) => readFileSync(path.join(APP_ROOT, f), "utf8");
const results = [];
const check = (ok, what) => results.push([!!ok, what]);

const themeProblems = (html, hasOwn) => {
  const out = [];
  if (hasOwn) out.push("js/theme.js exists");
  if (!/<script src="vici\/dist\/vici-theme\.js"><\/script>/.test(html)) out.push("the page does not load vici/dist/vici-theme.js");
  if (/<script(?![^>]*\bsrc=)[^>]*>[^<]*localStorage/.test(html)) out.push("an inline theme line");
  return out;
};
const clampProblems = (css, app) => {
  const out = [];
  const own = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/(?:-webkit-)?line-clamp\s*:\s*[0-9]/g) || [];
  if (own.length) out.push(`the stylesheet clamps lines itself (${own.length})`);
  if (!/classList\.toggle\("vc-framework--compact"/.test(app)) out.push("js/app.js never sets Vici's vc-framework--compact on the canvas");
  return out;
};
const wordProblems = (de) => {
  const dict = Object.fromEntries([...de.matchAll(/^\s*"([^"]+)":\s*"([^"]*)"/gm)].map((m) => [m[1], m[2]]));
  const out = [];
  if (dict["p.step.summary"] !== "Fazit") out.push(`the last step is "${dict["p.step.summary"]}"`);
  if (dict["choice.mitigate"] !== "Mindern" || dict["choice.short.mitigate"] !== "Mindern") out.push(`mitigate is "${dict["choice.mitigate"]}"`);
  return out;
};
const notesProblems = (notes) => {
  const part = (notes.split("### The four decisions after 0.2.0")[1] || "").split(/\n## /)[0];
  const need = [["vici-theme.js", "the theme script"], ["vc-framework--compact", "the first line"], ["32 × 32 px", "the targets"], ["Fazit", "the German words"]];
  return part ? need.filter(([w]) => !part.includes(w)).map(([, what]) => `TECH_NOTES doesn't record ${what}`) : ["TECH_NOTES has no section on the four decisions"];
};

// ---- each rule catches what it is for --------------------------------------------------------------------
const goodHtml = '<script src="vici/dist/vici-theme.js"></script>';
check(themeProblems(goodHtml, false).length === 0 && themeProblems(goodHtml, true).length === 1
  && themeProblems('<script src="js/theme.js"></script>', false).length === 1
  && themeProblems(`${goodHtml}<script>try{localStorage.getItem('vc-theme')}catch{}</script>`, false).length === 1, "control: a theme script of the tool's own is caught");
check(clampProblems(".a { color: red; }", 'el.classList.toggle("vc-framework--compact", x)').length === 0
  && clampProblems(".canvas .vc-item__text { -webkit-line-clamp: 2; }", 'el.classList.toggle("vc-framework--compact", x)').length === 1
  && clampProblems("/* no -webkit-line-clamp: 2 here */", "").length === 1, "control: a line clamp of the tool's own, or no compact view, is caught");
check(wordProblems('  "p.step.summary": "Zusammenfassung",\n  "choice.mitigate": "Mindern",\n  "choice.short.mitigate": "Mindern",').length === 1
  && wordProblems('  "p.step.summary": "Fazit",\n  "choice.mitigate": "Abschwächen",\n  "choice.short.mitigate": "Mindern",').length === 1, "control: other German words are caught");
check(notesProblems("## 9. Decisions\n").length === 1, "control: TECH_NOTES without the section is caught");

// ---- the tool ---------------------------------------------------------------------------------------------
const t = themeProblems(read("index.html"), existsSync(path.join(APP_ROOT, "js/theme.js")));
check(!t.length, `1 the theme: Vici's vici-theme.js, no script of the tool's own${t.length ? ` (${t.join("; ")})` : ""}`);
const c = clampProblems(read("css/app.css"), read("js/app.js"));
check(!c.length, `3 the first line: Vici's compact framework view cuts it, no clamp of the tool's own${c.length ? ` (${c.join("; ")})` : ""}`);
const w = wordProblems(read("js/i18n/de.js"));
check(!w.length, `4 German: "Fazit" and "Mindern"${w.length ? ` (${w.join("; ")})` : ""}`);
const n = notesProblems(read("TECH_NOTES.md"));
check(!n.length, `TECH_NOTES records the four decisions${n.length ? ` (${n.join("; ")})` : ""}`);

for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
const failed = results.filter(([ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} decision checks passed`);
if (!failed) console.log("DECISIONS OK");
process.exit(failed ? 1 : 0);
