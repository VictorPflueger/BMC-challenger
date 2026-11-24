// What went wrong, in plain words and both languages (brief 5.8, PLAN.md §16.5). Every API error the
// shared client raises maps to one cause; the words come from the dictionaries, and anything shaped like
// a key is removed before a message reaches the screen or the console.

import { ApiError } from "./anthropic.js";
import { redactSecrets } from "./keystore.js";

/**
 * The cause of an error, as a dictionary key under "err.": key (401), cors (a 401 for an organisation
 * that doesn't allow calls from a browser), billing (402), permission (403), model (404), credit (400:
 * no credit left), limit (400: a spend limit the person set), invalid (another 400), spend (429 of the
 * tier's monthly cap, never retried), rate (429), busy (529), server (5xx), timeout, network, aborted.
 */
export function causeOf(e) {
  if (e?.name === "AbortError") return "aborted";
  if (!(e instanceof ApiError)) return "network";
  const msg = e.message || "";
  if (e.status === 401) return /CORS requests are not allowed/i.test(msg) ? "cors" : "key";
  if (e.status === 402 || e.type === "billing_error") return "billing";
  if (e.status === 403) return "permission";
  if (e.status === 404) return "model";
  if (e.status === 400) {
    if (/credit balance/i.test(msg)) return "credit";
    if (/usage limit/i.test(msg)) return "limit";
    return "invalid";
  }
  if (e.status === 429) return e.spendLimit ? "spend" : "rate";
  if (e.status === 529 || e.type === "overloaded_error") return "busy";
  if (e.type === "timeout_error" || e.status === 504) return "timeout";
  if (e.status >= 500) return "server";
  return "network";
}

/** The message for an error, in the run's language. t: the dictionary lookup (key, params, lang). */
export function messageOf(e, t, lang) {
  const cause = causeOf(e);
  const detail = e instanceof ApiError && cause === "invalid" ? redactSecrets(e.message).slice(0, 160) : "";
  return redactSecrets(t(`err.${cause}`, { detail }, lang));
}
