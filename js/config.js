// Central configuration. Each value is documented in TECH_NOTES.md with its source and the date it was
// checked; the words that go with these values live in js/i18n/en.js and js/i18n/de.js.

export const APP = {
  id: "bmc",
  name: "Business Model Canvas Challenger",
  version: "0.2.0",
  url: "https://victorpflueger.github.io/BMC-challenger/"
};

// The page's content security policy, exactly as index.html's meta tag carries it (brief 5.1);
// tests/policy.mjs compares the two. A live run reaches api.anthropic.com with the person's own key;
// nothing else can be reached.
export const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'none'";

// The sister prototypes' fixed rate for the cost meter: 1 US dollar = 0.894 euros (brief 5.5).
export const FX_USD_EUR = 0.894;

// Prices in US dollars per million tokens, read on 23 November 2026 at
// https://platform.claude.com/docs/en/about-claude/pricing (TECH_NOTES §1). Every request stays under
// 100,000 prompt tokens, so Haiku 5.5 keeps its lower price. A web search costs $10 per 1,000.
export const MODELS = Object.freeze({
  haiku: { id: "claude-haiku-5-5", label: "Haiku 5.5", input: 0.10, output: 0.50 },
  sonnet: { id: "claude-sonnet-5-5", label: "Sonnet 5.5", input: 2, output: 10 },
  opus: { id: "claude-opus-5-5", label: "Opus 5.5", input: 4, output: 20 }
});
export const WEB_SEARCH_USD = 0.01;

// The three settings of the live dialog (PLAN.md §10): each names its model and effort. Balanced is the
// default (D4). The simulation's session cost is estimated at Balanced, the setting a stranger gets.
export const SETTINGS = Object.freeze({
  fast: { model: "haiku", effort: "low", thinking: false },
  balanced: { model: "haiku", effort: "medium", thinking: true },
  thorough: { model: "sonnet", effort: "medium", thinking: true }
});
export const DEFAULT_SETTING = "balanced";

// The simulation (brief 7): the scenario that opens first, how long Play stays on a step (7 to 14
// seconds by the reading time of its title and lead), and when a scenario asks to be checked for updates.
export const SIM = Object.freeze({
  defaultScenario: "s1",
  playMinMs: 7000,
  playMaxMs: 14000,
  playBaseMs: 3000,
  playPerWordMs: 230,
  staleDays: 90
});

// Every browser storage key, under this tool's own prefix: all of Victor's sites share the
// victorpflueger.github.io origin, so no key may collide with a sister's (rh., dq., sa., swot., …).
// Nothing a person enters or a run produces is ever stored (brief 5.9). What may persist: Vici's theme
// choice ("vc-theme", shared by all of Victor's pages), the language choice below, and Vici's own note
// that the guide has opened in this tab ("vc-guide:<path>#<id>" in session storage).
const P = `${APP.id}.`;
export const STORAGE = Object.freeze({
  lang: `${P}lang`
});
