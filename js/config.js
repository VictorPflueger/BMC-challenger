// Central configuration. Each value is documented in TECH_NOTES.md with its source and the date it was
// checked; the words that go with these values live in js/i18n/en.js and js/i18n/de.js.

export const APP = {
  id: "bmc",
  name: "Business Model Canvas Challenger",
  version: "0.1.0",
  url: "https://victorpflueger.github.io/BMC-challenger/"
};

// The page's content security policy, exactly as index.html's meta tag carries it (brief 5.1);
// tests/policy.mjs compares the two. A live run reaches api.anthropic.com with the person's own key;
// nothing else can be reached.
export const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'none'";

// The sister prototypes' fixed rate for the cost meter: 1 US dollar = 0.894 euros (brief 5.5).
export const FX_USD_EUR = 0.894;

// Every browser storage key, under this tool's own prefix: all of Victor's sites share the
// victorpflueger.github.io origin, so no key may collide with a sister's (rh., dq., sa., swot., …).
// Nothing a person enters or a run produces is ever stored (brief 5.9). What may persist: Vici's theme
// choice ("vc-theme", shared by all of Victor's pages), the language choice below, and Vici's own note
// that the guide has opened in this tab ("vc-guide:<path>#<id>" in session storage).
const P = `${APP.id}.`;
export const STORAGE = Object.freeze({
  lang: `${P}lang`
});
