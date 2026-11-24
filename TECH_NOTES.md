# Business Model Canvas Challenger: technical notes

Version 0.3.0, 24 November 2026. These notes hold the facts the code rests on, each with its source and the date it was read, and the decisions in use. The plan is [PLAN.md](PLAN.md); what was copied from the sister prototypes, and why, is in [REVIEW.md](REVIEW.md). Sections are cited from the code as "TECH_NOTES §n".

## 1. Models and prices

Read on 23 November 2026 at https://platform.claude.com/docs/en/about-claude/models/overview and https://platform.claude.com/docs/en/about-claude/pricing (PLAN.md §11, probes P1 and P2). US dollars per million tokens:

| Model | API id | Input | Output | Cache write (5 min) | Cache read |
|---|---|---|---|---|---|
| Haiku 5.5 | `claude-haiku-5-5` | $0.10 | $0.50 | $0.125 | $0.01 |
| Haiku 5.5, prompt over 100,000 tokens | | $0.50 | $2.50 | | |
| Sonnet 5.5 | `claude-sonnet-5-5` | $2 | $10 | $2.50 | $0.10 |
| Opus 5.5 | `claude-opus-5-5` | $4 | $20 | $5 | $0.20 |

Read again on 24 November 2026 at the same pages, for the live client: unchanged. The rest of the table, which the tool doesn't use: a cache write for one hour costs $0.20 with Haiku 5.5, $4 with Sonnet 5.5 and $8 with Opus 5.5; Haiku 5.5 with a prompt over 100,000 tokens costs $0.625 and $1 for the two cache writes and $0.05 for a cache read.

Web search costs $10 per 1,000 searches plus the tokens of its results; a search that fails is not billed. Every request stays far below 100,000 prompt tokens, so Haiku 5.5 keeps its lower price. The prices live in `js/config.js` (`MODELS`, `ANTHROPIC.webSearchUsdPer1000`).

In the simulation the Session cost tile estimates what a live run of the same company would cost at the default setting, Balanced (Haiku 5.5, medium effort) with research (`js/estimate.js`, §13). From 0.3.0 the estimate is built from the real prompts and schemas; for Tidewell Lines it comes to about $0.06, shown as "≈ €0.05" with the note "estimated for a live run". In a live run the tile shows the meter instead: what the run has spent, with the cap in its note.

The cost meter converts dollars at a fixed rate of 1 USD = 0.894 EUR, the sister prototypes' rate (brief 5.5), held in `js/config.js` as `FX_USD_EUR`. The sisters dropped Diagnostics, where the brief shows the rate, so the rate stands in both guides' row for Session cost (PLAN.md §16, item 12).

## 2. Verified API facts for the live client

Read on 23 November 2026 for the plan (PLAN.md §11) and read again on 24 November 2026 at each source below, before the live client was written. The live client of 0.3.0 rests on these:

| Fact | Source, read on 24 November 2026 |
|---|---|
| The ids `claude-haiku-5-5`, `claude-sonnet-5-5` and `claude-opus-5-5`; each model reads up to 1M tokens of context and writes up to 128K; their knowledge ends in June 2026, which a run without research says. Opus 5.5 always thinks. | https://platform.claude.com/docs/en/about-claude/models/overview |
| The prices of §1, unchanged; web search $10 per 1,000 searches, a failed search not billed. | https://platform.claude.com/docs/en/about-claude/pricing |
| `output_config.effort` takes low, medium, high, xhigh and max, with no beta header. Defaults: Haiku 5.5 medium, Sonnet 5.5 high, Opus 5.5 medium. | https://platform.claude.com/docs/en/build-with-claude/effort |
| Thinking left out means adaptive thinking. Haiku 5.5 accepts `thinking: {type: "disabled"}` at high effort or below; Sonnet 5.5 and Opus 5.5 answer 400 to it. Thinking is billed as output and counts toward `max_tokens`. | https://platform.claude.com/docs/en/build-with-claude/thinking |
| Structured outputs: `output_config.format` with type `json_schema`, no beta header, on all three models. A request holds at most 20 strict tools and, across its schemas, 24 optional and 16 union-typed parameters; every object needs `additionalProperties: false`; a schema too complex to compile fails within 180 s with "Schema is too complex for compilation"; a compiled grammar stays cached for 24 hours; citations and a prefilled answer don't combine with it. | https://platform.claude.com/docs/en/build-with-claude/structured-outputs |
| `/v1/messages/count_tokens` is free and accepts `output_config`, but refuses server tools such as web search, and its count is an estimate too. The budget counts four characters a token instead (§13), which needs no request. | https://platform.claude.com/docs/en/build-with-claude/token-counting |
| Web search: the tool `web_search_20250305` with `max_uses` (`web_search_20260209` adds dynamic filtering and `web_search_20260318` response inclusion); a turn the API pauses ends with `pause_turn`, and sending the conversation back unchanged continues it; an organisation without web search gets 400 invalid_request_error; a result carries url, title, encrypted_content and page_age. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool |
| Errors: 400 invalid_request_error (also "You have reached your specified API usage limits" for a limit the organisation set itself), 401 authentication_error (also "CORS requests are not allowed for this Organization"), 402 billing_error, 403 permission_error, 404 not_found_error, 409, 413 request_too_large, 429 rate_limit_error (a tier's spend cap carries `enforced_spend_limit_reached` and no retry-after), 500 api_error, 504 timeout_error and 529 overloaded_error; every answer carries a `request-id` header. | https://platform.claude.com/docs/en/api/errors |
| A rate limit answers 429 with `retry-after`, also for a ramp limit (`ramp_limit_exceeded`), and every answer carries the `anthropic-ratelimit-*` headers. | https://platform.claude.com/docs/en/api/rate-limits |
| A page reads the API's answers only with the header `anthropic-dangerous-direct-browser-access: true` (probe P3, from Chromium 157 on a local page); every request also sends `anthropic-version: 2023-06-01`. | PLAN.md §11, probe P3 |

The pages for PDF support, which the plan lists, don't apply: the tool takes no uploads (D12).

## 3. The security policy

`index.html` carries exactly the brief's policy (5.1) as its first tag after the character set, and `js/config.js` holds the same string as `CSP`; `tests/policy.mjs` compares them.

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'none'
```

With `connect-src` naming the API alone, the page cannot fetch its own files, so the data and the schemas ship as ES modules: `data/kpis.js` and `schemas/index.js`, which carries an exact copy of `schemas/strategy-challenge-1.json` (`tests/schemas.mjs` compares them). There is no inline script, style or handler; the theme script is Vici's `vici/dist/vici-theme.js` and the language script `js/lang.js`. The scenarios name their sources as constants of https addresses, shown as links a person opens and never fetched (`tests/policy.mjs`). The handoff schema names json-schema.org as its `$schema` identifier; nothing fetches it.

## 4. Nothing is kept

The key, everything a person enters and everything the agents create live in memory only, and are gone when the tab closes or reloads. Browser storage holds three things: Vici's theme choice (`vc-theme`, local storage), the language choice (`bmc.lang`, local storage) and Vici's note that the guide has opened in this tab (`vc-guide:<path>#<guide id>`, session storage). The address follows the presenter, as Vici's Presenting step by step asks: `js/app.js` writes the scenario and the step with `history.replaceState` and keeps a language the address already names; nothing a person enters or an agent writes goes there. `tests/storage.mjs` checks the code (local and session storage only in Vici's `vici-theme.js` and `vici.js`, `js/lang.js` and `js/i18n/index.js`, under those keys; that one address change; no IndexedDB, Cache API, cookie, service worker or `window.name` anywhere) and the browser after a visitor's clicks and a whole run played to the end. The key store is the shared `js/keystore.js`, which the Prototype Ideator merged first (ec368c3): the key lives in one module variable, never in storage, and is gone on reload (PLAN.md §16, item 11). From 0.3.0 `tests/storage.mjs` also runs a whole live run against the stand-in with a planted key, research and a decision of its own: afterwards the browser holds only the three entries (Vici's `storedKeyProblems` agrees), and the key is in no storage, no address the page opened, no request body, no console message and nothing in the DOM. Vici's `storageProblems` judges every script.

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

### The four decisions after 0.2.0

Victor left four open points of the M2 pull request to me on 24 November 2026, with one rule: when in doubt, Vici decides.

1. **The theme script.** The page loads Vici's `vici/dist/vici-theme.js`, and the tool keeps no theme script of its own.
2. **Targets on the canvas.** Vici's density rule decides: 40 px controls by default, the small control size of 32 px on dense screens, never below 32 px on a touch screen, 44 px as the comfortable touch minimum. So every target on the canvas (an item, the remove switch, a block's name and its "+2") is at least 32 × 32 px inside Vici's 2rem rows, and 44 px with a coarse pointer; every other control keeps 40 px. The brief's AC-14 asks 40 px of every target; the canvas follows Vici instead, and `tests/layout.mjs` measures both rules. The byline's links stay for M5, as Victor decided at M1.
3. **An item's first line.** Vici's framework view has a compact form that shows each item's first line, so the canvas uses it (`vc-framework--compact`, set where the canvas is tight, at 1280 × 720) and has no line clamp of its own. At 1920 × 1080 the canvas shows items in full, as Vici's framework view does; the block's dialog always does.
4. **German words.** "Fazit" for the last step and "Mindern" for mitigate stay. Vici names neither; the SWOT Challenger uses both words, and the PESTEL Challenger uses "Mindern" too.

### Where 0.3.0 departs from the plan, and why

- Vici's live-run dialog came from the SWOT Challenger: its pull request #36 merged into ViciDesign at 06:18 UTC on 24 November 2026, before this tool had built its own, so the tool uses Vici's pattern and built none (the plan had this tool add it).
- At 1280 × 720 (at least 961 px wide and at most 820 px high) the dialog puts the key and the research beside the setting and the cap in two columns, so it fits without scrolling and its start button and AI notice stay in view. Vici's own fit for short windows (ca9c552, from the Prototype Ideator: up to 94 % of the window, parts closer together) isn't enough for this dialog's longer notes: in one column its body still scrolls by 42 px in English and 60 px in German. With a private-data warning the dialog may grow taller than the window allows; then its body scrolls, as Vici's pattern says, with the warning, the start button and the notice in view.
- A run that stops says "What is done stays on screen". The report of 0.4.0 will carry the stop on every page (AC-09); until then the run's record keeps it.
- The page's CSS may run to 480 lines (`tests/lean.mjs`), up from 450, for the live screens.
- A guardrail the brief doesn't name: the Completer may not add an item that repeats one the team entered in the same block.
- In the review an AI item keeps its text, and the field to rewrite it stands under it with its basis and confidence. Replacing the text with the field left an item without text, which Vici's framework view refuses.
- In a live run the Session cost tile's note is "of your €0.50 cap" ("Ausgabegrenze 0,50 €"), one line at 1280 × 720, and before the start "measured once you start" ("gemessen ab dem Start"). A longer note took a second line and the header's extra height from the canvas.
- A fix of 0.2.0: a block's dialog without issues showed the word "null" under its items. `tests/vici.mjs` now looks for "null", "undefined" and "NaN" written as text on every screen.

## 10. The siblings and the shared parts

The brief's rule (4.1): before writing a shared part, fetch the siblings; if one has merged it, copy it byte for byte and name the commit. At 20:30 UTC on 23 November 2026 no sibling had a shared part, so this tool built its own. The SWOT Challenger merged its M1 at 20:44 UTC (617b122), a few minutes before this tool's M1 was pushed, with `js/risk.js`, `data/kpis.js`, `schemas/strategy-challenge-1.json` and `schemas/strategy-challenge-1.js`. Those four are its files now, copied unchanged from 617b122, and the engine, the formats and the tests moved onto them; `tests/kpis.mjs` is SWOT's too. The PESTEL Challenger (a223844) and the Prototype Ideator (0aefaf6) still held their plans only. `tests/parity.mjs` compares each shared part with every sibling checkout that has it, and CI checks out all three.

The live client is the Prototype Ideator's: it merged `js/anthropic.js`, `js/sse.js`, `js/cost.js` and `js/keystore.js` at 22:21 UTC on 23 November 2026 (ec368c3), and this tool copied them byte for byte from its main at 532e0f5 on 24 November. `tests/parity.mjs` compares the four with the Ideator. The SWOT Challenger's `js/cost.js` differs from the Ideator's; the suite prints that as DRIFT without failing, since the Ideator merged first, and Victor has the note.

## 11. Tests and CI

`.github/workflows/tests.yml` runs every suite on each push and pull request on ubuntu-24.04 with Node 22 and Playwright 1.56.0 in Chromium. It checks out ViciDesign beside the tool at the commit `vici/README.md` names (ca9c552), Victor's website (VIP) for the page icon, and the three siblings for `tests/parity.mjs`. `tools/check-scenarios.mjs` checks the three scenarios against their contract, the guardrails, the fact audit, the frozen figures in `data/reference.js` and DATA_SOURCES.md, and plays each along the recorded choices and four others; `tests/scenarios.mjs` proves it fails on a planted defect of each kind. `.github/workflows/live-site.yml` checks the published site after every Pages build.

No test calls the real API. `tests/lib/standin.mjs` stands in for it inside Chromium: it answers `https://api.anthropic.com/**` with the recorded answers of Tidewell Lines as a stream of server-sent events, in English or German, with the CORS headers a browser needs, and it can answer any request with an error, hold it, cut the connection, pause a search turn or report the usage a test needs. Eight suites drive a live run through it (`tests/README.md`), and `tests/storage.mjs`, `tests/layout.mjs` and `tests/vici.mjs` run one too. Victor runs the real live checks (G26 of M3); a probe that needs a key goes to him as one line for the browser console.

## 12. The live run

Run it live turns the page into a live run: LIVE on the tape, the Start form in the panel and the canvas open for entry, block by block, at most eight items of 90 characters each. "Start from Tidewell Lines's canvas" fills both from the scenario shown. The dialog (§13) starts six agents, one request each, in turn:

| Step | Agent | Reads | Answers with | `max_tokens`, least |
|---|---|---|---|---|
| Complete | Completer | the company and the canvas entered | Completion | 8,000, 3,000 |
| Challenge | Scout, with research on | the company and the completed canvas | Signals, through the strict tool `submit_signals` | 8,000, 3,000 |
| Challenge | Red team | the company, the canvas and the signals | Issues | 8,000, 4,000 |
| Assess | Analyst | the company, the canvas, the issues and the sector's KPI library | Impacts | 8,000, 4,000 |
| Adapt | Strategist | the company, the canvas, the issues and their impacts | Responses | 8,000, 4,000 |
| Summary | Writer | the company, the issues, the responses chosen and the facts code computed | Summary | 8,000, 2,000 |

Each request sends the model, `max_tokens`, the agent's prompt as `system` (`js/prompts.js`: the shared rules, then its own part, under 600 words each), one user message with what it reads as JSON, `output_config` with the effort and the step's schema, the setting's thinking and `stream: true`. The settings: Fast is Haiku 5.5 at low effort with thinking disabled; Balanced, the default, Haiku 5.5 at medium effort; Thorough, Sonnet 5.5 at medium effort; the last two leave thinking out, which means adaptive. Opus 5.5 isn't offered: it always thinks and costs twice Sonnet's price.

The run waits for the person twice. After Complete they keep, rewrite or remove the AI's items, and the Red team reads the rewritten text and none of the removed items. At Adapt they choose a response per issue, and Apply sets the Writer to work.

Code checks every answer against its schema (`js/schema.js`) and then the guardrails (`js/guards.js`, brief 6.7). An answer that fails goes back once with its problems listed; a second failure stops the run with what is done, and a run has two such repairs at most. The Writer's text that fails the fact audit twice shows with "Unchecked" instead of stopping. Code computes every figure from the answers (§5).

The run writes in the page's language when it starts and keeps it; if the page switches, the panel says so. Abort stops at once and keeps every step done. Clear everything empties the form, the canvas and the run and forgets the key. While a live result exists the browser asks before the page is left. The console has one line for each agent and the cost at the end, never the key.

## 13. Budget, errors and research

**The dialog.** It holds the key in memory, offers the three settings, research, the cap (€0.05 to €3.00 in steps of €0.05, €0.50 by default) and the acknowledgement, unticked at every opening, and shows the estimate. It lists what the person entered that looks private (an e-mail address, a phone number, an IBAN, words such as "confidential") and still lets the run start. It checks the key with the free GET `/v1/models` before the first message, which also confirms the setting's model; a key refused there (401, 403 or the CORS refusal) is forgotten. Inside a frame it refuses to work.

**The cap.** Before each request code takes its worst case: the request's characters over four as input tokens at the input price, `max_tokens` at the output price and $0.01 for each search it may make. If what is spent plus that passes the cap, the request goes with the step's least `max_tokens` if that fits; otherwise the run stops before it ("Stopped at your budget cap after Complete"), marks the rest not run and keeps what is done. The meter (`js/cost.js`) adds each answer's usage: input tokens times the input price, output tokens times the output price and $0.01 a search, at 0.894 € to the dollar.

**The estimate.** `js/estimate.js` builds each request from the real prompts, schemas and what each agent reads, at four characters a token. Its output is the recorded answer plus 1,500 tokens of thinking (none on Fast); research adds 20,000 tokens of results and five searches; a step takes 15, 25 or 40 s on the three settings. For Tidewell Lines: about €0.003 on Fast, €0.006 on Balanced and €0.12 on Thorough, and research adds about €0.05. Victor's measured runs replace these figures (G26 of M3).

**Errors.** `js/api_messages.js` turns every error into a sentence in both languages that says what happened and what to do, with nothing in it shaped like a key. A 429, a 500, 502, 503, 504 or 529 and a network failure are tried twice more, after 1.5 s and 4 s or after `retry-after` up to 20 s; a refused key, billing, missing credit, a spend cap or a usage limit never.

**Research.** With research on, the Scout's request carries `web_search_20250305` with five uses and the strict tool `submit_signals`; when the API pauses the turn, the conversation goes back unchanged, up to three requests in all. A signal counts only if its address came from this run's own search results; any other is dropped, and the console says so. An organisation without web search gets a 400; the run goes on without research and says so at Challenge. Without research the run says once that the model knows the world up to June 2026.
