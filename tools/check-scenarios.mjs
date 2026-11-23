// The scenario checker (brief 7, AC-06). Every recorded run, in both languages, against the rules a live
// run must pass and the figures frozen when it was written. A problem names its kind:
//   schema        the scenario breaks its contract (schemas/index.js Scenario) in either language;
//   guard         an answer breaks a guardrail of brief 6.7, such as naming a block, item, issue, signal or
//                 option that isn't there, or the recorded choices name one;
//   language      a text a person reads lacks its English or its German, or one is a copy of the other;
//   placeholders  the two languages of a text cite different facts;
//   audit         prose fails the fact audit (js/facts.js) or writes a dash as punctuation;
//   figure        a figure of the recorded run no longer matches data/reference.js;
//   source        a fact or a signal is missing from DATA_SOURCES.md;
//   key           something is shaped like an API key;
//   thinking      a thinking block, or its signature, was recorded;
//   play          a run does not play to the end along the recorded choices or one of the others tried.
// It plays every scenario along the recorded choices and four others: every issue accepted, the first
// option everywhere, the last option everywhere, and an advantage wherever there is one.
// Usage: node tools/check-scenarios.mjs        each problem, then SCENARIOS CHECKED; exit 1 on any
//        import { checkScenario } from "../tools/check-scenarios.mjs"   (tests/scenarios.mjs)
// Adapted from the Sovereignty Assessment's js/runs_check.js and tools/check-runs.mjs (PLAN.md §14).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mod = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const { SCENARIOS } = await mod("data/scenarios/index.js");
const { REFERENCE } = await mod("data/reference.js");
const { localise, buildRun, recordedChoices, isPair, STEPS } = await mod("js/run.js");
const { validate } = await mod("js/schema.js");
const { CONTRACTS } = await mod("schemas/index.js");
const G = await mod("js/guards.js");
const { placeholders } = await mod("js/facts.js");
const { stepWords, barWords, tileWords, writerText } = await mod("js/story.js");
const { estimateRun } = await mod("js/estimate.js");
const { itemIds } = await mod("js/canvas.js");

const LANGS = ["en", "de"];
const DATA_SOURCES = () => fs.readFileSync(path.join(ROOT, "DATA_SOURCES.md"), "utf8");

/** Every value of a source with where it stands: [path, value]. */
function* walk(value, at = "") {
  yield [at, value];
  if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* walk(v, `${at}[${i}]`);
  else if (value && typeof value === "object" && !isPair(value)) for (const [k, v] of Object.entries(value)) yield* walk(v, at ? `${at}.${k}` : k);
}

const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
// An API key's shape, outside the addresses of sources: the Sovereignty Assessment's pattern for an
// Anthropic key ("sk-ant-…"), another provider's ("sk-proj-…"), or a long unbroken run of letters and digits
// such as a token. A thinking block, as that checker finds one: its type, or a field of its own.
const KEY_SHAPES = [/sk-ant-[A-Za-z0-9_-]{6,}/, /\bsk-[a-z]{2,}-[A-Za-z0-9_-]{12,}/, /(?<![\w/.-])(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{40,}(?![\w-])/];
const THINKING = [/"(thinking|redacted_thinking|reasoning|think|signature)"\s*:/, /"type"\s*:\s*"(thinking|redacted_thinking)"/];

/** The evidence the fact audit reads for one language of a run: the signals and the canvas entered. */
function evidenceOf(sc) {
  return {
    titles: sc.answers.signals.map((s) => s.title),
    texts: [...Object.values(sc.entered.blocks).flat().map((it) => it.text), ...sc.answers.signals.map((s) => s.summary)],
    urls: sc.answers.signals.map((s) => s.url)
  };
}

/** The choices tried besides the recorded ones, each a name and the presenter's { removed, decisions }. */
export function otherChoices(sc) {
  const responses = sc.answers.responses;
  const all = (pickOne) => new Map(responses.map((r) => [r.issue, pickOne(r)]));
  const advantage = (r) => { const i = r.options.findIndex((o) => o.kind === "advantage"); return i < 0 ? 0 : i; };
  return [
    ["every issue accepted", { removed: new Set(), decisions: all(() => "accept") }],
    ["the first option everywhere", { removed: new Set(), decisions: all(() => 0) }],
    ["the last option everywhere", { removed: new Set(), decisions: all((r) => r.options.length - 1) }],
    ["an advantage wherever there is one", { removed: new Set(), decisions: all(advantage) }]
  ];
}

/** Plays one run to the end in one language: every step's words, the tiles and the summary filled in. */
export function playProblems(sc, choices, lang) {
  const out = [];
  let run;
  try { run = buildRun(sc, choices); } catch (e) { return [`the run does not build: ${e.message}`]; }
  for (const [k, v] of Object.entries(run.facts)) if (v !== null && typeof v === "number" && !Number.isFinite(v)) out.push(`the fact ${k} is ${v}`);
  let estimate;
  try { estimate = estimateRun(sc, run); } catch (e) { return [...out, `the cost estimate does not work: ${e.message}`]; }
  for (let step = 0; step < STEPS.length; step++) {
    const ctx = { sc, run, lang, step, reached: STEPS.length - 1, applied: step === STEPS.length - 1, selectedIssue: "I1", estimate, scenarios: [sc] };
    let texts;
    try { texts = [stepWords(ctx), barWords(ctx), tileWords(ctx)].flatMap((o) => [...walk(o)].map(([, v]) => v).filter((v) => typeof v === "string")); } catch (e) { out.push(`${STEPS[step]} does not play: ${e.message}`); continue; }
    const bad = texts.filter((s) => /undefined|NaN|\{\{|\{[a-z]+\}/.test(s));
    if (bad.length) out.push(`${STEPS[step]}: ${bad[0].slice(0, 80)}`);
  }
  for (const [where, text] of G.proseOf("summary", sc.answers.summary)) {
    const filled = writerText(text, run, lang);
    if (/\{\{fact:/.test(filled)) out.push(`the summary's ${where} keeps a placeholder: ${filled.slice(0, 80)}`);
  }
  return out;
}

/**
 * Every problem of one scenario, as [kind, text]. src: the scenario as data/scenarios writes it, in both
 * languages; options: { reference, dataSources } to check against something else, such as a planted copy.
 */
export function checkScenario(src, { reference = REFERENCE[src?.id], dataSources = DATA_SOURCES() } = {}) {
  const problems = [];
  const add = (kind, text) => problems.push([kind, `${src?.id || "?"}: ${text}`]);

  // ---- what the source holds, before it is read in a language ------------------------------------------
  for (const [at, v] of walk(src)) {
    if (v && typeof v === "object" && !Array.isArray(v) && ("en" in v || "de" in v) && !isPair(v)) add("language", `${at} lacks ${"en" in v ? "its German" : "its English"} or holds more than the two texts`);
    if (isPair(v)) {
      if (!v.en.trim() || !v.de.trim()) add("language", `${at} has an empty ${v.en.trim() ? "German" : "English"} text`);
      else if (v.en === v.de && words(v.en) > 3) add("language", `${at} is the same in both languages: "${v.en.slice(0, 60)}"`);
      const a = placeholders(v.en).sort().join();
      const b = placeholders(v.de).sort().join();
      if (a !== b) add("placeholders", `${at} cites ${a || "nothing"} in English and ${b || "nothing"} in German`);
    }
  }
  const json = JSON.stringify(src);
  if (THINKING.some((re) => re.test(json))) add("thinking", "a thinking block or its signature");
  const text = json.replace(/https?:\/\/[^"\s]+/g, "");
  const shaped = KEY_SHAPES.map((re) => text.match(re)).find(Boolean);
  if (shaped) add("key", `something shaped like a key: ${shaped[0].slice(0, 10)}…`);

  // ---- each language: the contract, the guardrails, the fact audit and the plays --------------------------
  for (const lang of LANGS) {
    let sc;
    try { sc = localise(src, lang); } catch (e) { add("schema", `${lang}: it cannot be read: ${e.message}`); continue; }
    const v = validate(sc, CONTRACTS.Scenario, CONTRACTS);
    if (!v.valid) { for (const e of v.errors.slice(0, 6)) add("schema", `${lang}: ${e.path} ${e.message}`); continue; }
    let run;
    try { run = buildRun(sc, recordedChoices(sc)); } catch (e) { add("play", `${lang}: the recorded run does not build: ${e.message}`); continue; }
    const evidence = evidenceOf(sc);
    const canvas = run.completed;
    const results = [
      ["complete", G.completionProblems(sc.answers.completion, { entered: sc.entered, evidence })],
      ["challenge", G.issuesProblems({ issues: sc.answers.issues }, { canvas, signals: sc.answers.signals, evidence })],
      ["assess", G.impactsProblems(sc.answers.impacts, { issues: sc.answers.issues, sector: sc.company.sector, evidence })],
      ["adapt", G.responsesProblems({ responses: sc.answers.responses }, { issues: run.issues, canvas, evidence })],
      ["summary", G.summaryProblems(sc.answers.summary, { facts: Object.keys(run.facts), evidence })]
    ];
    for (const [step, r] of results) {
      for (const x of r.refusals) add("guard", `${lang} ${step}: ${x}`);
      for (const a of r.audit) add("audit", `${lang} ${step} ${a.where}: ${[...a.tokens, ...a.unknownFacts.map((k) => `{{fact:${k}}}`)].join(", ")}`);
      for (const n of r.notes) add("audit", `${lang} ${step} ${n}`);
    }
    // The recorded choices name what is there: AI items to remove, issues and their options.
    const ai = new Set([...itemIds(canvas)].filter((id) => canvas.blocks[id.replace(/-\d+$/, "")]?.find((it) => it.id === id)?.source === "ai"));
    for (const id of sc.choices.removed) if (!ai.has(id)) add("guard", `${lang} choices: ${id} is not an AI item of the completed canvas`);
    const responses = new Map(sc.answers.responses.map((r) => [r.issue, r]));
    for (const d of sc.choices.decisions) {
      const r = responses.get(d.issue);
      if (!r) add("guard", `${lang} choices: ${d.issue} is not an issue`);
      else if (d.choice !== "accept" && !(Number.isInteger(d.option) && r.options[d.option]?.kind === d.choice)) add("guard", `${lang} choices: ${d.issue} has no ${d.choice} option ${d.option}`);
    }
    for (const x of playProblems(sc, recordedChoices(sc), lang)) add("play", `${lang} recorded choices: ${x}`);
    for (const [name, choices] of otherChoices(sc)) for (const x of playProblems(sc, choices, lang)) add("play", `${lang} ${name}: ${x}`);

    // ---- the frozen figures ------------------------------------------------------------------------------
    if (!reference) add("figure", `${lang}: data/reference.js has no figures for this scenario`);
    else {
      const keys = new Set([...Object.keys(reference), ...Object.keys(run.facts)]);
      for (const k of keys) {
        const want = reference[k];
        const got = run.facts[k];
        const same = typeof want === "number" && typeof got === "number" ? Math.abs(want - got) <= 1e-6 * Math.max(1, Math.abs(want)) : want === got;
        if (!same) add("figure", `${lang}: ${k} is ${got === undefined ? "missing" : JSON.stringify(got)}, frozen at ${want === undefined ? "nothing" : JSON.stringify(want)}`);
      }
    }
  }

  // ---- DATA_SOURCES.md lists every fact and every source ----------------------------------------------
  for (const id of src?.facts || []) {
    const row = dataSources.split("\n").find((l) => l.startsWith(`| ${id} |`));
    if (!row) add("source", `the fact ${id} has no row in DATA_SOURCES.md`);
    else if (!/\d{4}-\d{2}-\d{2} \|\s*$/.test(row)) add("source", `the fact ${id} has no date read in DATA_SOURCES.md`);
  }
  for (const s of src?.answers?.signals || []) if (!dataSources.includes(s.url)) add("source", `the source ${s.url} is not in DATA_SOURCES.md`);
  return problems;
}

/** Every scenario, checked. Returns { problems, scenarios }. */
export function checkAll(scenarios = SCENARIOS) {
  return { problems: scenarios.flatMap((s) => checkScenario(s)), scenarios: scenarios.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { problems, scenarios } = checkAll();
  for (const [kind, text] of problems) console.log(`${kind.padEnd(12)} ${text}`);
  if (problems.length) { console.log(`\n${problems.length} problem(s) in ${scenarios} scenarios.`); process.exit(1); }
  console.log(`${scenarios} scenarios played in both languages along the recorded choices and four others; every check passed.\nSCENARIOS CHECKED`);
}
