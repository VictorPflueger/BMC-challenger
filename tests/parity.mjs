// The parts the four tools share (brief 4.1) stay the same in all of them. Before a tool writes a shared
// part it fetches its siblings; if one has merged the part, it copies it byte for byte; otherwise it
// builds it so the next tool can copy it unchanged. SOURCE names the sibling that merged each part
// first: the SWOT Challenger the first four (617b122), the Prototype Ideator the live client
// (ec368c3). This suite compares every shared part this tool holds with that sibling's copy, byte for
// byte, or fails. Another sibling whose copy differs from the first one has drifted from the set: the
// suite says so as DRIFT, for Victor to pass on, since this tool can't change that sibling.
// A sibling without the part, or no checkout at all, is skipped and said.
// The siblings: SWOT Challenger, PESTEL Challenger and Prototype Ideator, checked out next to this
// repository (../SWOT-challenger, ../PESTEL-challenger, ../PrototypeIdeator) or in the folder that
// SIBLINGS_DIR names. Prints PARITY OK.
// Usage: node tests/parity.mjs
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";

/** The shared parts, by path, each with the sibling that merged it first (TECH_NOTES §10). */
const SOURCE = {
  "js/risk.js": "SWOT-challenger", "data/kpis.js": "SWOT-challenger",
  "schemas/strategy-challenge-1.json": "SWOT-challenger", "schemas/strategy-challenge-1.js": "SWOT-challenger",
  "js/anthropic.js": "PrototypeIdeator", "js/sse.js": "PrototypeIdeator", "js/cost.js": "PrototypeIdeator", "js/keystore.js": "PrototypeIdeator"
};
const SHARED = Object.keys(SOURCE);
const SIBLINGS = ["SWOT-challenger", "PESTEL-challenger", "PrototypeIdeator"];

const base = process.env.SIBLINGS_DIR ? path.resolve(process.env.SIBLINGS_DIR) : path.resolve(APP_ROOT, "..");
const results = [];
const notes = [];
const check = (ok, what) => results.push([!!ok, what]);

const held = SHARED.filter((f) => existsSync(path.join(APP_ROOT, f)));
check(SHARED.every((f) => held.includes(f)), `this tool holds ${held.length} of the ${SHARED.length} shared parts (${held.join(", ")})`);
const checkouts = SIBLINGS.map((name) => ({ name, dir: path.join(base, name) })).filter((s) => existsSync(path.join(s.dir, ".git")) || existsSync(path.join(s.dir, "README.md")));
if (!checkouts.length) notes.push(`no sibling checkout in ${base}: nothing to compare`);
const drift = [];
for (const f of held) {
  const ours = readFileSync(path.join(APP_ROOT, f));
  const first = checkouts.find((s) => s.name === SOURCE[f]);
  if (!first || !existsSync(path.join(first.dir, f))) { notes.push(`${f}: no checkout of ${SOURCE[f]}, which merged it first`); continue; }
  const same = readFileSync(path.join(first.dir, f)).equals(ours);
  check(same, `${f} is byte for byte the ${first.name}'s, which merged it first${same ? "" : " (it differs: copy that version, or bring the change to every tool)"}`);
  for (const s of checkouts.filter((c) => c !== first && existsSync(path.join(c.dir, f)))) {
    if (!readFileSync(path.join(s.dir, f)).equals(readFileSync(path.join(first.dir, f)))) drift.push(`${f}: the ${s.name}'s copy differs from the ${first.name}'s, which merged it first`);
  }
}

for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
for (const n of notes) console.log(`SKIP  ${n}`);
for (const d of drift) console.log(`DRIFT ${d}`);
const failed = results.filter(([ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} parity checks passed; ${checkouts.length} sibling checkout${checkouts.length === 1 ? "" : "s"} (${checkouts.map((s) => s.name).join(", ") || "none"}).`);
if (!failed) console.log("PARITY OK");
process.exit(failed ? 1 : 0);
