// The parts the four tools share (brief 4.1) stay the same in all of them. Before a tool writes a shared
// part it fetches its siblings; if one has merged the part, it copies it byte for byte; otherwise it
// builds it so the next tool can copy it unchanged. The SWOT Challenger merged the first four (617b122),
// and this tool holds them unchanged. This suite compares every shared part this tool
// holds with the same file in each sibling checkout that has it: byte for byte, or the suite fails.
// A sibling without the part, or no checkout at all, is skipped and said, so the suite passes with a
// note while no sibling has built the part yet.
// The siblings: SWOT Challenger, PESTEL Challenger and Prototype Ideator, checked out next to this
// repository (../SWOT-challenger, ../PESTEL-challenger, ../PrototypeIdeator) or in the folder that
// SIBLINGS_DIR names. Prints PARITY OK.
// Usage: node tests/parity.mjs
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";

/** The shared parts, by path. The live client's arrive in 0.3.0: anthropic.js, sse.js, cost.js and keystore.js. */
const SHARED = ["js/risk.js", "data/kpis.js", "schemas/strategy-challenge-1.json", "schemas/strategy-challenge-1.js", "js/anthropic.js", "js/sse.js", "js/cost.js", "js/keystore.js"];
const SIBLINGS = ["SWOT-challenger", "PESTEL-challenger", "PrototypeIdeator"];

const base = process.env.SIBLINGS_DIR ? path.resolve(process.env.SIBLINGS_DIR) : path.resolve(APP_ROOT, "..");
const results = [];
const notes = [];
const check = (ok, what) => results.push([!!ok, what]);

const held = SHARED.filter((f) => existsSync(path.join(APP_ROOT, f)));
check(["js/risk.js", "data/kpis.js", "schemas/strategy-challenge-1.json", "schemas/strategy-challenge-1.js"].every((f) => held.includes(f)), `this tool holds ${held.length} of the ${SHARED.length} shared parts (${held.join(", ")})`);
const checkouts = SIBLINGS.map((name) => ({ name, dir: path.join(base, name) })).filter((s) => existsSync(path.join(s.dir, ".git")) || existsSync(path.join(s.dir, "README.md")));
if (!checkouts.length) notes.push(`no sibling checkout in ${base}: nothing to compare`);
for (const f of held) {
  const ours = readFileSync(path.join(APP_ROOT, f));
  const theirs = checkouts.filter((s) => existsSync(path.join(s.dir, f)));
  if (!theirs.length) { notes.push(`${f}: no sibling has it yet`); continue; }
  for (const s of theirs) {
    const same = readFileSync(path.join(s.dir, f)).equals(ours);
    check(same, `${f} is byte for byte the ${s.name}'s${same ? "" : " (it differs: copy the first merged version, or bring the change to every tool)"}`);
  }
}

for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
for (const n of notes) console.log(`SKIP  ${n}`);
const failed = results.filter(([ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} parity checks passed; ${checkouts.length} sibling checkout${checkouts.length === 1 ? "" : "s"} (${checkouts.map((s) => s.name).join(", ") || "none"}).`);
if (!failed) console.log("PARITY OK");
process.exit(failed ? 1 : 0);
