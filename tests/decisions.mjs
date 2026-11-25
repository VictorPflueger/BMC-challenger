// The four decisions Victor left to the build after 0.2.0, settled with Vici first (TECH_NOTES §9):
//   1  the page loads Vici's vici-theme.js and the tool keeps no theme script of its own;
//   2  the canvas's targets follow Vici's density rule (tests/layout.mjs measures them);
//   3  an item's text is cut only by Vici's compact framework view, which js/app.js sets where the
//      canvas is tight, and the stylesheet clamps no line of its own;
//   4  German keeps "Fazit" and "Mindern", as the SWOT Challenger does.
// And Victor's three answers after 0.4.0 (TECH_NOTES §9), with the target rule 1.0.0 settled:
//   5  an issue the Analyst could not price keeps null euros in the handoff file, never 0;
//   6  an accepted issue's response is written as the PESTEL Challenger writes it: effort "S", an empty
//      first step and owner, chosen, once the person applied the decision;
//   7  a live result is thrown away only after Vici's destructive confirmation, with the safe choice
//      focused, and there is no undo;
//   8  TECH_NOTES records the answers and the target rule: 32 px on the canvas and the panel, 40 px for
//      every other control, Vici's guide as Vici draws it.
// Each rule is first tried on a planted mistake it must catch. Node.js only. Prints DECISIONS OK.
// Usage: node tests/decisions.mjs
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";
import { SCENARIOS } from "../data/scenarios/index.js";
import { localise, buildRun, recordedChoices } from "../js/run.js";
import { handoffFor, handoffProblems } from "../js/handoff.js";

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

/** 5 and 6: the handoff file of Tidewell Lines with I4 unpriced and I1 accepted, applied. */
const handoffOf = ({ unpriced = "I4", accept = "I1" } = {}) => {
  const sc = structuredClone(localise(SCENARIOS.find((x) => x.id === "s1"), "en"));
  const im = sc.answers.impacts.impacts.find((x) => x.issue === unpriced);
  Object.assign(im, { monetisable: false, eur_year_low: null, eur_year_high: null });
  const choices = recordedChoices(sc);
  choices.decisions.set(accept, "accept");
  return handoffFor({ sc, run: buildRun(sc, choices), lang: "en", mode: "simulation", applied: true });
};
const unpricedProblems = (file, id = "I4") => {
  const i = file.issues.find((x) => x.id === id);
  const out = [];
  if (!i) return [`no issue ${id}`];
  for (const k of ["eur_year_low", "eur_year_high", "eur_year_expected"]) if (i[k] !== null) out.push(`${id}'s ${k} is ${i[k]}, not null`);
  out.push(...handoffProblems(file).map((p) => `the file fails its check: ${p}`));
  return out;
};
const acceptProblems = (file, id = "I1") => {
  const r = file.responses.filter((x) => x.issue === id && x.kind === "accept");
  if (r.length !== 1) return [`${r.length} accept responses for ${id}`];
  const [a] = r;
  return [a.chosen === true ? null : "not chosen", a.effort === "S" ? null : `effort ${a.effort}`, a.first_step === "" ? null : "a first step", a.owner === "" ? null : "an owner"].filter(Boolean);
};
const discardProblems = (html, app) => {
  const out = [];
  const dialog = (html.match(/<dialog[^>]*id="discard-dialog"[\s\S]*?<\/dialog>/) || [""])[0];
  if (!dialog) return ["no question before a live result is thrown away"];
  if (!/autofocus/.test(dialog)) out.push("the safe choice is not focused");
  if (!/id="discard-go"[^>]*>|class="[^"]*vc-button--danger/.test(dialog)) out.push("no destructive button");
  if (!/discardDialog\.showModal\(\)/.test(app) || !/hasUnsavedResult\(\)/.test(app)) out.push("js/app.js does not ask while the result is unsaved");
  if (/\bundo(Discard|Clear|Result)\b|restoreResult/.test(app)) out.push("an undo for a thrown-away run");
  return out;
};
const answerProblems = (notes) => {
  const part = (notes.split("### The three answers after 0.4.0")[1] || "").split(/\n### |\n## /)[0];
  if (!part) return ["TECH_NOTES has no section on the three answers"];
  const need = [["null euros", "the unpriced issue"], ['effort "S"', "the accept response"], ["destructive confirmation", "the confirmation"]];
  const out = need.filter(([w]) => !part.includes(w)).map(([, what]) => `TECH_NOTES doesn't record ${what}`);
  const two = (notes.match(/2\. \*\*Targets\.\*\*[^\n]*/) || [""])[0];
  for (const w of ["32 × 32 px", "panel", "40 px", "guide", "24 px"]) if (!two.includes(w)) out.push(`the target rule doesn't say "${w}"`);
  return out;
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
{
  const zero = handoffOf();
  zero.issues.find((x) => x.id === "I4").eur_year_low = 0;
  const lost = handoffOf();
  lost.responses = lost.responses.filter((x) => !(x.issue === "I1" && x.kind === "accept"));
  const wrong = handoffOf();
  wrong.responses.find((x) => x.issue === "I1" && x.kind === "accept").effort = "M";
  check(unpricedProblems(zero).length > 0 && acceptProblems(lost).length > 0 && acceptProblems(wrong).length > 0, "control: an unpriced issue written as 0, a missing accept response and one of the wrong effort are caught");
  check(discardProblems('<dialog id="discard-dialog"><button id="discard-go">x</button></dialog>', "discardDialog.showModal(); hasUnsavedResult()").length === 1
    && discardProblems(read("index.html"), `${read("js/app.js")}\nfunction undoDiscard() {}`).length === 1, "control: a question without its focused safe choice, and an undo, are caught");
  check(answerProblems("## 9. Decisions\n").length === 1, "control: TECH_NOTES without the three answers is caught");
}

// ---- the tool ---------------------------------------------------------------------------------------------
const t = themeProblems(read("index.html"), existsSync(path.join(APP_ROOT, "js/theme.js")));
check(!t.length, `1 the theme: Vici's vici-theme.js, no script of the tool's own${t.length ? ` (${t.join("; ")})` : ""}`);
const c = clampProblems(read("css/app.css"), read("js/app.js"));
check(!c.length, `3 the first line: Vici's compact framework view cuts it, no clamp of the tool's own${c.length ? ` (${c.join("; ")})` : ""}`);
const w = wordProblems(read("js/i18n/de.js"));
check(!w.length, `4 German: "Fazit" and "Mindern"${w.length ? ` (${w.join("; ")})` : ""}`);
const n = notesProblems(read("TECH_NOTES.md"));
check(!n.length, `TECH_NOTES records the four decisions${n.length ? ` (${n.join("; ")})` : ""}`);

const u = unpricedProblems(handoffOf());
check(!u.length, `5 an issue the Analyst could not price keeps null euros in the handoff file, which passes its check${u.length ? ` (${u.join("; ")})` : ""}`);
const a = acceptProblems(handoffOf());
check(!a.length, `6 an accepted issue's response: chosen, effort "S", no first step, no owner${a.length ? ` (${a.join("; ")})` : ""}`);
const d = discardProblems(read("index.html"), read("js/app.js"));
check(!d.length, `7 a live result is thrown away only after Vici's confirmation, the safe choice focused, with no undo${d.length ? ` (${d.join("; ")})` : ""}`);
const r = answerProblems(read("TECH_NOTES.md"));
check(!r.length, `8 TECH_NOTES records the three answers and the target rule${r.length ? ` (${r.join("; ")})` : ""}`);
for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
const failed = results.filter(([ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} decision checks passed`);
if (!failed) console.log("DECISIONS OK");
process.exit(failed ? 1 : 0);
