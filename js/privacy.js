// What is usually private, found in what a person entered before a live run (brief 5.10): e-mail
// addresses, phone numbers, IBANs and words such as "confidential", "internal", "vertraulich" and
// "intern". It warns and never blocks: the live dialog lists what it found, and the person removes it
// or starts the run because it is public (Vici's live-run dialog).

const KINDS = [
  ["email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  // An IBAN: two letters, two check digits, then 11 to 30 letters and digits, spaces allowed in fours.
  ["iban", /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g],
  // A phone number: a plus or a leading zero, then at least seven more digits with spaces, dots,
  // slashes, hyphens or brackets between them.
  ["phone", /(?:\+\d{1,3}|\b0)[\s./()-]*\d(?:[\s./()-]*\d){6,}/g],
  ["word", /\b(?:confidential|internal(?:ly)?|vertraulich\w*|intern(?:e|en|er|es)?|geheim\w*|secret|nda)\b/gi]
];

/**
 * The private-looking things in one text: [{ kind, sample }], each sample shortened so the warning
 * never repeats a whole address or number on screen.
 */
export function findPrivate(text) {
  const out = [];
  const s = String(text || "");
  for (const [kind, re] of KINDS) {
    for (const m of s.matchAll(re)) {
      const raw = m[0].trim();
      const sample = kind === "word" ? raw : `${raw.slice(0, 4)}…`;
      if (!out.some((o) => o.kind === kind && o.sample === sample)) out.push({ kind, sample });
    }
  }
  return out;
}

/**
 * Everything the person entered, checked: the company's details and every item, with where each
 * finding stands. fields: [{ where, text }]. Returns [{ kind, sample, where }].
 */
export function scanInputs(fields) {
  const found = [];
  for (const { where, text } of fields) for (const f of findPrivate(text)) found.push({ ...f, where });
  return found;
}
