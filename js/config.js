// Central configuration. Each value is documented in TECH_NOTES.md with its source and the date it was
// checked; the words that go with these values live in js/i18n/en.js and js/i18n/de.js. The shapes of
// ANTHROPIC and MODELS are the set's: the shared client (js/anthropic.js) and cost meter (js/cost.js),
// copied unchanged from the Prototype Ideator, read them.

export const APP = {
  id: "bmc",
  name: "Business Model Canvas Challenger",
  version: "1.0.0",
  url: "https://victorpflueger.github.io/BMC-challenger/"
};

// The byline's person and links, as Vici's profile (src/brand/profile.json) names them: the report's last
// page carries them, both links rel="author". The Prototype Ideator is where the handoff file goes next.
export const AUTHOR = Object.freeze({
  name: "Victor Pflüger",
  linkedin: "https://www.linkedin.com/in/victorpflueger",
  website: "https://victorpflueger.github.io/VIP/index.html",
  portrait: "vici/assets/brand/portrait-96.jpg"
});
export const IDEATOR_URL = "https://victorpflueger.github.io/PrototypeIdeator/";

// The credit under every canvas, on screen and in the report (PLAN.md §3): Strategyzer.com and the licence.
export const CREDIT = Object.freeze({
  strategyzer: "https://www.strategyzer.com",
  licence: "https://creativecommons.org/licenses/by-sa/3.0/"
});

// The page's content security policy, exactly as index.html's meta tag carries it (brief 5.1);
// tests/policy.mjs compares the two. A live run reaches api.anthropic.com with the person's own key;
// nothing else can be reached.
export const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'none'";

export const ANTHROPIC = {
  messagesUrl: "https://api.anthropic.com/v1/messages",
  modelsUrl: "https://api.anthropic.com/v1/models?limit=100",
  countTokensUrl: "https://api.anthropic.com/v1/messages/count_tokens",
  // The sister prototypes' version; 2026-10-21 is the newest, and the switch happens in all prototypes
  // together (brief 5.4, TECH_NOTES §2).
  apiVersion: "2023-06-01",
  // Without this header the browser blocks the call (CORS; probed on 23 November 2026, TECH_NOTES §2).
  browserHeader: "anthropic-dangerous-direct-browser-access",
  // The Scout's search (brief 5.7): the basic tool, five searches a run (the design review fixed five).
  webSearchTool: { type: "web_search_20250305", name: "web_search", max_uses: 5 },
  webSearchUsdPer1000: 10,
  consoleKeysUrl: "https://platform.claude.com/settings/keys",
  consoleWorkspacesUrl: "https://platform.claude.com/settings/workspaces"
};

// Prices in US dollars per million tokens, read again on 24 November 2026 at
// https://platform.claude.com/docs/en/about-claude/pricing (TECH_NOTES §1). The order is the set's, so
// the shared client and meter behave alike in every tool. Every request here stays under 100,000 prompt
// tokens, so Haiku 5.5 keeps its lower price; the meter prices the long tier anyway if one ever passes.
export const MODELS = [
  {
    id: "claude-sonnet-5-5", label: "Sonnet 5.5", hintKey: "model.hint.sonnet",
    effort: "medium", maxTokens: 8000,
    price: { input: 2.0, output: 10.0, cacheWrite: 2.5, cacheRead: 0.1 }
  },
  {
    id: "claude-haiku-5-5", label: "Haiku 5.5", hintKey: "model.hint.haiku",
    effort: "medium", maxTokens: 8000,
    price: { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01,
      longPrompt: { thresholdTokens: 100000, input: 0.5, output: 2.5, cacheWrite: 0.625, cacheRead: 0.05 } }
  },
  {
    id: "claude-opus-5-5", label: "Opus 5.5", hintKey: "model.hint.opus",
    effort: "medium", maxTokens: 8000,
    price: { input: 4.0, output: 20.0, cacheWrite: 5.0, cacheRead: 0.2 }
  }
];
export const modelById = (id) => MODELS.find((m) => m.id === id);

// The three settings of the live dialog (brief 5.4, PLAN.md §10): each names its model and effort.
// `thinking: null` leaves the field out, which means adaptive thinking; Sonnet 5.5 refuses
// { type: "disabled" }, so Thorough never sends it. Effort is always sent, as Sonnet 5.5 defaults to
// high. Balanced is the default (D4); the simulation's session cost is estimated at it.
export const PRESETS = [
  { id: "fast", model: "claude-haiku-5-5", effort: "low", thinking: { type: "disabled" } },
  { id: "balanced", model: "claude-haiku-5-5", effort: "medium", thinking: null },
  { id: "thorough", model: "claude-sonnet-5-5", effort: "medium", thinking: null }
];
export const DEFAULT_PRESET = "balanced";
export const presetById = (id) => PRESETS.find((p) => p.id === id) || PRESETS.find((p) => p.id === DEFAULT_PRESET);

// Each agent's output budget (brief 5.4: 8,000 a step until Victor's first live runs are measured). The
// minimum is what the budget cap may cut a request down to before it stops the run instead.
export const AGENT_TOKENS = {
  completer: { max: 8000, min: 3000 },
  scout: { max: 8000, min: 3000 },
  redteam: { max: 8000, min: 4000 },
  analyst: { max: 8000, min: 4000 },
  strategist: { max: 8000, min: 4000 },
  writer: { max: 8000, min: 2000 }
};

// A run sends at most its steps, two repairs and three research requests (PLAN.md §10, §16.6).
export const RUN = { repairs: 2, researchRequests: 3, idleMs: 90000 };

// The budget cap a person sets for one run, in euros (brief 5.3 and D4).
export const BUDGET = { minEur: 0.05, maxEur: 3.0, defaultEur: 0.5, stepEur: 0.05 };

// The estimate's assumptions, stated in the guide (brief 5.6): about four characters a token, an
// allowance for adaptive thinking, and what the Scout reads from its searches.
export const ESTIMATE = {
  charsPerToken: 4,
  thinkingTokens: { fast: 0, balanced: 1500, thorough: 1500 },
  researchInputTokens: 20000,
  // Seconds a step takes, to say how long a run lasts; replaced by Victor's measured runs.
  secondsPerStep: { fast: 15, balanced: 25, thorough: 40 }
};

// The models' reliable knowledge cutoff (models overview, read 24 November 2026): without research the
// run says once that the model knows the world up to this month.
export const KNOWLEDGE_CUTOFF = "2026-06";

// The sister prototypes' fixed rate for the cost meter: 1 US dollar = 0.894 euros (brief 5.5).
export const FX_USD_EUR = 0.894;

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
