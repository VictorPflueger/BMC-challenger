# Business Model Canvas Challenger: technical notes

Version 0.2.0, 24 November 2026. These notes hold the facts the code rests on, each with its source and the date it was read, and the decisions in use. The plan is [PLAN.md](PLAN.md); what was copied from the sister prototypes, and why, is in [REVIEW.md](REVIEW.md). Sections are cited from the code as "TECH_NOTES §n".

## 1. Models and prices

Read on 23 November 2026 at https://platform.claude.com/docs/en/about-claude/models/overview and https://platform.claude.com/docs/en/about-claude/pricing (PLAN.md §11, probes P1 and P2). US dollars per million tokens:

| Model | API id | Input | Output | Cache write (5 min) | Cache read |
|---|---|---|---|---|---|
| Haiku 5.5 | `claude-haiku-5-5` | $0.10 | $0.50 | $0.125 | $0.01 |
| Haiku 5.5, prompt over 100,000 tokens | | $0.50 | $2.50 | | |
| Sonnet 5.5 | `claude-sonnet-5-5` | $2 | $10 | $2.50 | $0.10 |
| Opus 5.5 | `claude-opus-5-5` | $4 | $20 | $5 | $0.20 |

Web search costs $10 per 1,000 searches plus the tokens of its results. Every request stays below 100,000 prompt tokens, so Haiku 5.5 keeps its lower price. The input and output prices entered `js/config.js` (`MODELS`, `WEB_SEARCH_USD`) in 0.2.0 for the Session cost tile and were read again on 23 November 2026; check them again when the live client arrives in 0.3.0, and log that date here.

In the simulation the Session cost tile estimates what a live run of the same company would cost at the default setting, Balanced (Haiku 5.5, medium effort, thinking on) with research (`js/estimate.js`). Six requests, one per agent and one for research; each prompt is its instructions (about 1,200 tokens) plus the recorded answers it reads, at about four characters a token; each answer is the recorded one at the same rate, plus 1,500 tokens of thinking at medium effort; research adds five searches at $0.01 and 20,000 tokens of results. For Tidewell Lines that comes to about $0.06, shown as "≈ €0.05" with the note "estimated for a live run". The live client replaces the estimate with the metered cost.

The cost meter converts dollars at a fixed rate of 1 USD = 0.894 EUR, the sister prototypes' rate (brief 5.5), held in `js/config.js` as `FX_USD_EUR`. The sisters dropped Diagnostics, where the brief shows the rate, so the rate stands in both guides' row for Session cost (PLAN.md §16, item 12).

## 2. Verified API facts for the live client

Read on 23 November 2026 at the pages the project instructions list. The full table, with the probes, is PLAN.md §11. The ones the live client of 0.3.0 depends on:

- `output_config.effort` takes low, medium, high, xhigh and max; Haiku 5.5 defaults to medium, Sonnet 5.5 to high.
- Thinking left out means adaptive. Haiku 5.5 accepts thinking disabled at high effort or below; Sonnet 5.5 refuses disabled and accepts `between_tools`; Opus 5.5 always thinks.
- Structured outputs: `output_config.format` with `type: "json_schema"`, no beta header. A request may hold 24 optional and 16 union-typed parameters across its schemas and 20 strict tools.
- A page reads the API's answers only with the header `anthropic-dangerous-direct-browser-access: true` (probe P3, from Chromium 157 on a local page).
- Errors include 402 billing_error, a 400 for a reached usage limit, a 429 for the tier's spend cap (carrying `enforced_spend_limit_reached`, never retried) and 504 timeout_error.

## 3. The security policy

`index.html` carries exactly the brief's policy (5.1) as its first tag after the character set, and `js/config.js` holds the same string as `CSP`; `tests/policy.mjs` compares them.

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'none'
```

With `connect-src` naming the API alone, the page cannot fetch its own files, so the data and the schemas ship as ES modules: `data/kpis.js` and `schemas/index.js`, which carries an exact copy of `schemas/strategy-challenge-1.json` (`tests/schemas.mjs` compares them). There is no inline script, style or handler; the theme script is Vici's `vici/dist/vici-theme.js` and the language script `js/lang.js`. The scenarios name their sources as constants of https addresses, shown as links a person opens and never fetched (`tests/policy.mjs`). The handoff schema names json-schema.org as its `$schema` identifier; nothing fetches it.

## 4. Nothing is kept

The key, everything a person enters and everything the agents create live in memory only, and are gone when the tab closes or reloads. Browser storage holds three things: Vici's theme choice (`vc-theme`, local storage), the language choice (`bmc.lang`, local storage) and Vici's note that the guide has opened in this tab (`vc-guide:<path>#<guide id>`, session storage). The address follows the presenter, as Vici's Presenting step by step asks: `js/app.js` writes the scenario and the step with `history.replaceState` and keeps a language the address already names; nothing a person enters or an agent writes goes there. `tests/storage.mjs` checks the code (local and session storage only in Vici's `vici-theme.js` and `vici.js`, `js/lang.js` and `js/i18n/index.js`, under those keys; that one address change; no IndexedDB, Cache API, cookie, service worker or `window.name` anywhere) and the browser after a visitor's clicks and a whole run played to the end. The key store arrives in 0.3.0 as the shared `js/keystore.js`, merged first by the Prototype Ideator (ec368c3): the key lives in one module variable, never in storage (PLAN.md §16, item 11).

## 5. The engine

`js/risk.js` is the challengers' shared part, copied unchanged from the SWOT Challenger (§10): the bands, the probabilities, the expected values, the totals at stake, left and upside, the rounding and the money format. `js/engine.js` adds what only the canvas has, the nine blocks with their health and states, and calls the shared functions for every total. Both follow the brief (6.5) and PLAN.md §5:

- A score is impact times likelihood, both whole numbers from 1 to 5. Bands: low 1 to 4, medium 5 to 9, high 10 to 15, critical 16 to 25.
- Likelihood counts as probability 0.1, 0.3, 0.5, 0.7 and 0.9. The expected loss is the midpoint of the euro range times that probability; a range must satisfy 0 ≤ low ≤ high.
- Block health is 100 minus each touching issue's penalty (low 5, medium 10, high 20, critical 35), never below 0. A block is under pressure with an issue of medium band or worse, on watch with low issues only, otherwise clear.
- A missing decision means accept. Mitigate uses the residual impact, likelihood and range; turn into an advantage keeps the loss and adds the upside.
- Values stay at full precision, rounded to 1e-9, and are rounded once for display, half away from zero. The unit is chosen after rounding: €999,950 shows as €1.0m. Below €1,000 in euros, from €1,000 in thousands, from €1m in millions with one decimal; German writes 5,8 Mio. € with no-break spaces.
- A figure summed over part of the issues says so: "€5.7m on 4 of 5 issues".
- What a mitigation leaves of an issue is its residual, never more than the issue's own expected loss, as the shared `left()` counts it.
- The shared money format writes amounts from €1bn without a thousands separator: €1,250m reads €1250.0m, 1250,0 Mio. € in German. The tool takes it unchanged, and the boundary case in the fixture says so; a separator would be a change to all four tools at once.

The golden cases B0, B1 and B2 and the boundary cases are in `tests/fixtures/golden.json`; `tests/engine.mjs` holds every value to 1e-9 and every display string in both languages. B1 departs from the brief's table on purpose: after the decision, Key partners, Key resources and Cost structure still carry the mitigated issue at a low band, so they show Watch (PLAN.md §16, item 1).

## 6. Schemas and the validator

`schemas/strategy-challenge-1.json` is the handoff schema (brief 4.3), shared by all four tools, and `schemas/strategy-challenge-1.js` the same schema as a module the page can import; both are the SWOT Challenger's files, unchanged (§10). `schemas/index.js` hands the module on. The shared schema leaves two things open that the canvas needs, so the tool's own records hold them: an item's id carries its block (`value-2`), and an issue names only the nine blocks. Its tokens for the horizon, now, 1_to_3_years and over_3_years, are the tool's too, so an answer moves into the handoff file unchanged. The agents' output schemas in `schemas/index.js` keep to what structured outputs enforce: every field required, no union types, `additionalProperties: false`, and only the keywords type, properties, required, additionalProperties, items, enum and description. Lengths, ranges and patterns are checked in code by `js/schema.js`, the Sovereignty Assessment's validator. `tests/schemas.mjs` counts the optional and union-typed parameters of each request against the limits in §2.

## 7. The KPI library

`data/kpis.js`, shared and copied unchanged from the SWOT Challenger (§10), holds the twelve sectors of the brief and "general", 115 KPIs in all: 8 to 12 a sector and the ten general ones. Each KPI has an id ("transport_logistics.cost_per_teu"), a name and a definition in English and German, a unit as a symbol that reads the same in both languages (€/TEU, %), the direction that is better, and its source ("common practice" or a web address). `kpisFor(sector)` gives a sector's KPIs and then the general ones; `kpiById(id)` finds one. The library holds no benchmark values: a figure an agent estimates says so and what it rests on. `tests/kpis.mjs`, the SWOT Challenger's suite taken unchanged, checks it.

## 8. Two languages

English opens first, also for a browser set to German; `?lang=de` or `?lang=en` in the address wins and becomes the stored choice; a change re-renders without a reload (`js/i18n/index.js`, adapted from the Sovereignty Assessment). Every visible string lives in `js/i18n/en.js` and `js/i18n/de.js` under the same keys; the two How it works guides are written out in `index.html`, one per language, as Vici's guide expects. German block labels and their sources are in PLAN.md §3.

## 9. Decisions in use

| Id | Decision | Where it shows |
|---|---|---|
| D1 | Name "Business Model Canvas Challenger", subtitle "Find where a business model breaks, and rebuild it"; BMC never on screen | the header, the title and README |
| D2 | Vici's layout icon in a lilac hexagon | the header, the loading screen and `favicon.svg` |
| D3 | English and German from version 1 | both dictionaries and both guides |
| D9 | Build now with the Strategyzer credit; Victor writes to Strategyzer AG before client showings | the credit under the canvas and in the guides |
| D12 | No uploads in version 1 | the page takes none |

Victor's decisions of 23 November 2026: the plan is approved with its cuts and D1 to D14, Pages is enabled, and the `HYGIENE_TERMS` secret is skipped for now. CI runs the generic hygiene check; the full check runs locally with a term list kept outside the repository (`tests/README.md`).

One placement differs from the plan: PLAN.md §3 puts the note "Adapted from The Business Model Canvas by Strategyzer AG" in the guide's How it works chapter. That chapter's one table explains the key figures, so the note stands as a row of the What is real chapter, which lists where everything comes from.

### Where 0.2.0 departs from the plan, and why

Each of these makes the plan work at 1280 × 720 or keeps the set of four alike; none drops a feature.

- The review of the AI's items happens on the canvas: each AI item carries its remove switch, and the block's dialog shows it in full with its basis and confidence. A list in the panel took the height the canvas needed to show the items it lists.
- Assess and Adapt show one issue at a time, chosen with numbered switches; Adapt's options sit as cards in full above the bar, as Vici asks of a decision.
- A block that cannot show all its items keeps in view what the step is about, and at 1280 × 720 the wide blocks at the bottom put their name beside their items, so the items an issue names stay visible.
- On the canvas a word that the mark beside it already says (an item's "AI" beside its sparkle, a challenged item's band beside its warning mark, an added item's "Adapted" beside "Added") stays for screen readers only, and at 1280 × 720 so do the nouns of a block's tags ("2 · high"); the legend and the block's tag carry the meaning. Vici's `frameworkProblems` still finds every word.
- The Summary adds the first steps of the chosen responses, with owner and time, as the brief's report does ("code adds the next steps"); as many as fit stand in the panel, then "+2 more" opens them all.
- `time_to_impact` is one of five spans code words (under 3 months to over 2 years), not free text, so no figure the model writes reaches the screen.
- The scenarios are authored once in both languages, every text a pair, and `js/run.js` `localise()` gives each language the shape of the Scenario contract; the contract checks one language at a time.
- The sources of an issue show when they were published; the step's lead says when they were read, which is one date for all of them.
- "Fictional company, illustrative figures" stands beside the credit under the canvas, where every screen shows it, rather than beside the title.
- The fact audit is the Prototype Ideator's, unchanged: fractions in words are refused too, so the set of four judges a figure alike.
- The German step names are Start, Ergänzen, Hinterfragen, Bewerten, Anpassen and Fazit, and the responses Mindern, In einen Vorteil wenden and Akzeptieren: shorter words keep the stepper and Adapt's switches on one line.
- Play's own moves take the focus to the step's title too, as Vici's rule says of every step change; the live region speaks only when the decision is applied and the title changes in place.
- The tool's own theme script, copied from the sisters in 0.1.0, is gone: Vici's `vici/dist/vici-theme.js`, which the PESTEL Challenger merged into ViciDesign, does the same under a strict policy.
- `applyChanges` numbers an added item past every id its block ever held, so it never reuses the number of an AI item the person removed.

## 10. The siblings and the shared parts

The brief's rule (4.1): before writing a shared part, fetch the siblings; if one has merged it, copy it byte for byte and name the commit. At 20:30 UTC on 23 November 2026 no sibling had a shared part, so this tool built its own. The SWOT Challenger merged its M1 at 20:44 UTC (617b122), a few minutes before this tool's M1 was pushed, with `js/risk.js`, `data/kpis.js`, `schemas/strategy-challenge-1.json` and `schemas/strategy-challenge-1.js`. Those four are its files now, copied unchanged from 617b122, and the engine, the formats and the tests moved onto them; `tests/kpis.mjs` is SWOT's too. The PESTEL Challenger (a223844) and the Prototype Ideator (0aefaf6) still held their plans only. `tests/parity.mjs` compares each shared part with every sibling checkout that has it, and CI checks out all three.

## 11. Tests and CI

`.github/workflows/tests.yml` runs every suite on each push and pull request on ubuntu-24.04 with Node 22 and Playwright 1.56.0 in Chromium. It checks out ViciDesign beside the tool at the commit `vici/README.md` names (2759b7a), Victor's website (VIP) for the page icon, and the three siblings for `tests/parity.mjs`. `tools/check-scenarios.mjs` checks the three scenarios against their contract, the guardrails, the fact audit, the frozen figures in `data/reference.js` and DATA_SOURCES.md, and plays each along the recorded choices and four others; `tests/scenarios.mjs` proves it fails on a planted defect of each kind. `.github/workflows/live-site.yml` checks the published site after every Pages build. No test calls the real API.
