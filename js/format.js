// Numbers, money and dates through Intl, in the active language (en-GB or de-DE; brief 5.11), and the
// words of the engine's results. Computed values stay at full precision; only these functions round,
// once, half away from zero (brief 6.5). Money follows js/risk.js: €5.8m, €600k, €950 and
// 5,8 Mio. €, 600 Tsd. €, 950 €. A figure computed from part of the issues says so in its value:
// "€5.7m on 4 of 5 issues" (Vici's rule for figures on part of the data).

import { locale, getLang, t, tn } from "./i18n/index.js";
import { formatEur, roundHalfAway } from "./risk.js";

const cache = new Map();
function nf(lang, digits = 0) {
  const key = `${lang}|${digits}`;
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(locale(lang), { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  return cache.get(key);
}

/** An amount in euros: €5.8m, €600k, €950; 5,8 Mio. €, 600 Tsd. €, 950 €. */
export function fmtMoney(value, lang = getLang()) {
  return formatEur(value, lang);
}

/** An amount summed over part of the issues says so: "€5.7m on 4 of 5 issues"; over all, just the amount. */
export function fmtPartMoney(value, priced, total, lang = getLang()) {
  const amount = formatEur(value, lang);
  return priced < total ? tn("fig.partial", total, { amount, priced, total }, lang) : amount;
}

/** A whole number with the language's grouping, rounded half away from zero: 79, 1,122 or 1.122. */
export function fmtInt(value, lang = getLang()) {
  return nf(lang).format(roundHalfAway(Number(value)));
}

/** Blocks under pressure: "7 of 9", "7 von 9". */
export function fmtPressure(n, of, lang = getLang()) {
  return t("fig.pressure", { n: fmtInt(n, lang), of: fmtInt(of, lang) }, lang);
}

/** A date with the month written out: "23 November 2026" or "23. November 2026". */
export function fmtDate(iso, lang = getLang()) {
  const text = String(iso ?? "");
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00` : text);
  if (Number.isNaN(d.getTime())) return t("fig.noDate", null, lang);
  return d.toLocaleDateString(locale(lang), { day: "numeric", month: "long", year: "numeric" });
}

/** The words of every fact key of an engine result (js/engine.js assess), in one language. */
export function factTexts(result, lang = getLang()) {
  const texts = {
    at_stake: fmtPartMoney(result.atStake, result.priced, result.count, lang),
    left: fmtPartMoney(result.left, result.priced, result.count, lang),
    upside: fmtMoney(result.upside, lang),
    "resilience.before": fmtInt(result.resilience.before, lang),
    "resilience.after": fmtInt(result.resilience.after, lang),
    "pressure.before": fmtPressure(result.pressure.before, result.pressure.of, lang),
    "pressure.after": fmtPressure(result.pressure.after, result.pressure.of, lang),
    "issues.count": fmtInt(result.count, lang),
    "issues.priced": fmtInt(result.priced, lang)
  };
  for (const r of result.issues) {
    texts[`issue.${r.id}.expected`] = r.before.expected === null ? t("fig.noEuros", null, lang) : fmtMoney(r.before.expected, lang);
    texts[`issue.${r.id}.band`] = t(`band.${r.before.band}`, null, lang);
  }
  return texts;
}
