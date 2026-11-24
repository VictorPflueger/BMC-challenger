// The three scenarios of the simulation, in the order the Start screen shows them. Each is a recorded run
// authored by hand (brief 7), one file per company; tools/check-scenarios.mjs checks all three.
import s1 from "./s1.js";
import s2 from "./s2.js";
import s3 from "./s3.js";

export const SCENARIOS = Object.freeze([s1, s2, s3]);

/** The scenario with this id ("s1", "s2" or "s3"), or null. */
export function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id) || null;
}
