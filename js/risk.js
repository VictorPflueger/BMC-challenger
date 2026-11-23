// Risk arithmetic shared by the three challengers of the set (the Business Model Canvas, SWOT and
// PESTEL Challengers), and the money format the Prototype Ideator imports. It is meant to be the same
// file, byte for byte, in every repository of the set that has it (tests/parity.mjs compares them).
// Pure functions without imports, the DOM or the tool's own words, so Node tests load it directly.
//
// The rules (brief 6.3 and 6.5):
//   score         impact × likelihood, both on whole steps from 1 to 5
//   band          low 1 to 4, medium 5 to 9, high 10 to 15, critical 16 to 25
//   probability   likelihood 1 to 5 counts as 0.1, 0.3, 0.5, 0.7 and 0.9
//   expected      the midpoint of a euro range a year times the probability of its likelihood
//   money         from €1m in millions with one decimal (€5.8m, 5,8 Mio. €), from €1,000 in thousands
//                 (€600k, 600 Tsd. €), below that in euros; the unit is chosen after rounding, so
//                 €999,950 shows as €1.0m and €999.50 as €1k
// Values are computed at full precision and cleaned to 1e-9; only the display rounds, once, half away
// from zero.

export const BANDS = Object.freeze(["low", "medium", "high", "critical"]);
export const PROBABILITY = Object.freeze({ 1: 0.1, 2: 0.3, 3: 0.5, 4: 0.7, 5: 0.9 });

/** True for a whole step from 1 to 5. */
export function onScale(v) {
  return Number.isInteger(v) && v >= 1 && v <= 5;
}

function scale(v, what) {
  if (!onScale(v)) throw new RangeError(`${what} must be a whole number from 1 to 5, not ${v}`);
  return v;
}

/** Removes floating-point noise: the value to nine decimals. */
export function clean(x) {
  return Number(Number(x).toFixed(9));
}

/** Rounds half away from zero to `digits` decimals, after cleaning, so 0.9995 at three decimals is 1.0. */
export function roundHalfAway(x, digits = 0) {
  const f = 10 ** digits;
  const r = Math.round(clean(Math.abs(x) * f)) / f;
  return x < 0 && r !== 0 ? -r : r;
}

/** impact × likelihood. */
export function score(impact, likelihood) {
  return scale(impact, "impact") * scale(likelihood, "likelihood");
}

/** The band of impact and likelihood: low, medium, high or critical. */
export function band(impact, likelihood) {
  const s = score(impact, likelihood);
  return s <= 4 ? "low" : s <= 9 ? "medium" : s <= 15 ? "high" : "critical";
}

/** The rank of a band, 0 for low to 3 for critical; -1 for anything else. */
export function bandRank(name) {
  return BANDS.indexOf(name);
}

/** The worse of two bands; null counts as no band. */
export function worse(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return bandRank(b) > bandRank(a) ? b : a;
}

/** The probability a likelihood counts as. */
export function probability(likelihood) {
  return PROBABILITY[scale(likelihood, "likelihood")];
}

/** The expected euros a year of a range: its midpoint times the probability of its likelihood. */
export function expected(low, high, likelihood) {
  if (!Number.isFinite(low) || !Number.isFinite(high) || low < 0 || high < low) {
    throw new RangeError(`a euro range needs 0 <= low <= high, not ${low} to ${high}`);
  }
  return clean(((low + high) / 2) * probability(likelihood));
}

const LOCALE = { en: "en-GB", de: "de-DE" };
const formats = new Map();
function number(lang, digits) {
  const key = `${lang}|${digits}`;
  if (!formats.has(key)) {
    formats.set(key, new Intl.NumberFormat(LOCALE[lang] || LOCALE.en, { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  }
  return formats.get(key);
}

/**
 * An amount in euros as the tiles and the report write it: "€5.8m", "€600k", "€950" in English;
 * "5,8 Mio. €", "600 Tsd. €", "950 €" in German, with no-break spaces so it never splits.
 */
export function formatEur(value, lang = "en") {
  if (!Number.isFinite(value)) throw new RangeError(`not an amount: ${value}`);
  const de = lang === "de";
  const sign = value < 0 ? "−" : "";
  const v = Math.abs(value);
  const nb = " ";
  const euros = roundHalfAway(v);
  if (euros < 1000) {
    const n = number(lang, 0).format(euros);
    return de ? `${sign}${n}${nb}€` : `${sign}€${n}`;
  }
  const thousands = roundHalfAway(v / 1e3);
  if (thousands < 1000) {
    const n = number(lang, 0).format(thousands);
    return de ? `${sign}${n}${nb}Tsd.${nb}€` : `${sign}€${n}k`;
  }
  const n = number(lang, 1).format(roundHalfAway(v / 1e6, 1));
  return de ? `${sign}${n}${nb}Mio.${nb}€` : `${sign}€${n}m`;
}
