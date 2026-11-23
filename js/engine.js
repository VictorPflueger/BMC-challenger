// The engine: every figure the page, the report and the handoff file show, computed by code from the
// agents' structured answers and the person's decisions (brief 6.5). The model never writes a figure
// that the page then shows as fact. Pure functions on plain data; js/format.js words the results.
//
//   expected a year    an issue's euro range midpoint times the probability of its likelihood
//   at stake a year    the sum over the issues that have a euro range ("on 4 of 5 issues" when not all do)
//   after a decision   mitigate: the residual impact, likelihood and range count; advantage: the loss
//                      stays and the upside (midpoint times probability) is added; accept: as it is
//   left a year        the sum after the decision; upside a year: the sum of the chosen advantages
//   block health       100, minus each touching issue's band penalty (low 5, medium 10, high 20,
//                      critical 35), never below 0; resilience is the mean of the nine
//   block state        under pressure when its worst band is medium or higher, watch when only low
//                      issues touch it, clear when none do

import { band, bandRank, worse, score, probability, expected, clean } from "./risk.js";
import { BLOCKS, isBlock } from "./canvas.js";

export const PENALTY = Object.freeze({ low: 5, medium: 10, high: 20, critical: 35 });
export const CHOICES = Object.freeze(["mitigate", "advantage", "accept"]);

/** The state of a block from the worst band touching it: "pressure", "watch" or "clear". */
export function blockState(worst) {
  if (!worst) return "clear";
  return bandRank(worst) >= bandRank("medium") ? "pressure" : "watch";
}

function checkIssue(i) {
  if (!i || typeof i.id !== "string" || !i.id) throw new TypeError("an issue needs an id");
  if (!Array.isArray(i.blocks) || !i.blocks.length || !i.blocks.every(isBlock)) throw new RangeError(`issue ${i.id} names a block that does not exist`);
}

/** The decisions as a map from issue id to decision; a missing decision accepts the issue. */
function decisionMap(decisions) {
  const map = new Map();
  for (const d of Array.isArray(decisions) ? decisions : Object.entries(decisions || {}).map(([issue, v]) => ({ issue, ...v }))) {
    if (!CHOICES.includes(d.choice)) throw new RangeError(`unknown choice "${d.choice}" for ${d.issue}`);
    map.set(d.issue, d);
  }
  return map;
}

/**
 * Prices the issues, applies the decisions and scores the nine blocks.
 * issues: [{ id, impact, likelihood, blocks: [block ids], monetisable (true unless false),
 *            eur_year_low, eur_year_high }]
 * decisions: [{ issue, choice, impact?, likelihood?, eur_year_low?, eur_year_high? }] or a map by issue
 *            id; mitigate carries the residual impact, likelihood and range, advantage the upside's
 *            likelihood and range.
 */
export function assess(issues, decisions = []) {
  const chosen = decisionMap(decisions);
  const rows = issues.map((i) => {
    checkIssue(i);
    const monetisable = i.monetisable !== false;
    const before = {
      score: score(i.impact, i.likelihood),
      band: band(i.impact, i.likelihood),
      probability: probability(i.likelihood),
      expected: monetisable ? expected(i.eur_year_low, i.eur_year_high, i.likelihood) : null
    };
    const d = chosen.get(i.id) || { choice: "accept" };
    let after = { ...before };
    let upside = null;
    if (d.choice === "mitigate") {
      after = {
        score: score(d.impact, d.likelihood),
        band: band(d.impact, d.likelihood),
        probability: probability(d.likelihood),
        expected: monetisable ? expected(d.eur_year_low, d.eur_year_high, d.likelihood) : null
      };
    } else if (d.choice === "advantage") {
      upside = expected(d.eur_year_low, d.eur_year_high, d.likelihood);
    }
    return { id: i.id, blocks: [...i.blocks], monetisable, choice: d.choice, before, after, upside };
  });
  const sum = (xs) => clean(xs.reduce((a, b) => a + b, 0));
  const priced = rows.filter((r) => r.monetisable);
  const blocks = BLOCKS.map((id) => {
    const touching = rows.filter((r) => r.blocks.includes(id));
    const health = (side) => Math.max(0, 100 - touching.reduce((a, r) => a + PENALTY[r[side].band], 0));
    const worst = (side) => touching.reduce((w, r) => worse(w, r[side].band), null);
    return {
      id,
      issues: touching.map((r) => r.id),
      before: { health: health("before"), worst: worst("before"), state: blockState(worst("before")) },
      after: { health: health("after"), worst: worst("after"), state: blockState(worst("after")) }
    };
  });
  const mean = (side) => clean(blocks.reduce((a, b) => a + b[side].health, 0) / blocks.length);
  const pressure = (side) => blocks.filter((b) => b[side].state === "pressure").length;
  return {
    issues: rows,
    count: rows.length,
    priced: priced.length,
    atStake: sum(priced.map((r) => r.before.expected)),
    left: sum(priced.map((r) => r.after.expected)),
    upside: sum(rows.filter((r) => r.upside !== null).map((r) => r.upside)),
    blocks,
    resilience: { before: mean("before"), after: mean("after") },
    pressure: { before: pressure("before"), after: pressure("after"), of: blocks.length }
  };
}

/**
 * The fact keys the Writer's placeholders and the tiles read (brief 6.5), as numbers: at_stake, left,
 * upside, resilience.before and .after, pressure.before and .after, issues.count, issues.priced,
 * issue.<id>.expected (null without a euro range) and issue.<id>.band.
 */
export function factValues(result) {
  const facts = {
    at_stake: result.atStake,
    left: result.left,
    upside: result.upside,
    "resilience.before": result.resilience.before,
    "resilience.after": result.resilience.after,
    "pressure.before": result.pressure.before,
    "pressure.after": result.pressure.after,
    "issues.count": result.count,
    "issues.priced": result.priced
  };
  for (const r of result.issues) {
    facts[`issue.${r.id}.expected`] = r.before.expected;
    facts[`issue.${r.id}.band`] = r.before.band;
  }
  return facts;
}
