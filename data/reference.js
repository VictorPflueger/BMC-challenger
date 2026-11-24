// The reference figures of the three scenarios, frozen when they were written (23 November 2026): the
// engine's fact values for each recorded run, as js/engine.js factValues returns them, rounded to six
// places. tools/check-scenarios.mjs plays every recording again and fails when a figure moves, so a change
// to the engine, the KPI library or a scenario that changes what a presenter shows is a decision, not an
// accident. Both languages give the same figures. Amounts are euros a year; resilience is out of 100.

export const REFERENCE = Object.freeze({
  s1: Object.freeze({ at_stake: 32900000, left: 7775000, upside: 3150000, "resilience.before": 78.333333, "resilience.after": 91.666667, "pressure.before": 6, "pressure.after": 2, "issues.count": 6, "issues.priced": 6, "issue.I1.expected": 12600000, "issue.I1.band": "critical", "issue.I2.expected": 7000000, "issue.I2.band": "high", "issue.I3.expected": 8750000, "issue.I3.band": "high", "issue.I4.expected": 2750000, "issue.I4.band": "medium", "issue.I5.expected": 600000, "issue.I5.band": "low", "issue.I6.expected": 1200000, "issue.I6.band": "low" }),
  s2: Object.freeze({ at_stake: 13550000, left: 3190000, upside: 0, "resilience.before": 67.222222, "resilience.after": 90, "pressure.before": 7, "pressure.after": 3, "issues.count": 6, "issues.priced": 5, "issue.I1.expected": 4900000, "issue.I1.band": "critical", "issue.I2.expected": 1400000, "issue.I2.band": "high", "issue.I3.expected": 3850000, "issue.I3.band": "high", "issue.I4.expected": 2000000, "issue.I4.band": "high", "issue.I5.expected": 1400000, "issue.I5.band": "medium", "issue.I6.expected": null, "issue.I6.band": "low" }),
  s3: Object.freeze({ at_stake: 6445000, left: 2545000, upside: 2000000, "resilience.before": 73.888889, "resilience.after": 92.222222, "pressure.before": 7, "pressure.after": 2, "issues.count": 5, "issues.priced": 5, "issue.I1.expected": 2100000, "issue.I1.band": "critical", "issue.I2.expected": 1375000, "issue.I2.band": "high", "issue.I3.expected": 1400000, "issue.I3.band": "high", "issue.I4.expected": 1375000, "issue.I4.band": "medium", "issue.I5.expected": 195000, "issue.I5.band": "low" })
});
