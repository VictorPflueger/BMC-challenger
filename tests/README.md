# Tests

The tool needs none of this: it is static files. The tests run on Node.js 22 without dependencies; the browser suites also need Playwright with Chromium, and the Vici suite a checkout of ViciDesign next to the repository (`../ViciDesign`, or the folder in `VICI_DIR`). No test calls the real API or spends money: every request that leaves the local server is refused.

## What runs

`node tests/run-all.mjs` runs every suite in order and, when all eighteen pass, ends with `ALL SUITES PASSED (18 of 18)`. `node tests/run-all.mjs unit shell` runs only the named ones, and `--require-vici` fails the Vici suite without a ViciDesign checkout instead of skipping it, as GitHub Actions does. Each suite can also run on its own and prints its own success line, such as `ENGINE OK`.

| Suite | Kind | What it checks |
|---|---|---|
| `tokens` | Node | Vici's colours in both themes: every pair the page draws at its contrast, and how far the state colours stay apart under colour-vision deficiency (the page's pairs in `lib/prototype.mjs`) |
| `page-icon` | Node | `favicon.svg`, the header and the loading screen show the layout icon in a lilac cell; with Victor's website (VictorPflueger/VIP) next to the repository, its card has the same icon and kind, required from 1.0.0 |
| `vici-files` | Node | `vici/` holds exactly the files its README lists, unchanged from Vici |
| `i18n` | Node | English and German: the same keys in the same order, no empty value, the same placeholders, the formal Sie, every key the page asks for exists and every key is asked for, the static defaults in `index.html`, no sentence typed into the scripts |
| `unit` | Node | The language module, the formats in both languages, the risk helpers at their edges, the canvas's nine blocks and the configuration |
| `engine` | Node | The golden cases B0, B1 and B2 and the boundary cases within 1e-9 and in both languages (below) |
| `schemas` | Node | The handoff schema against the brief's example and planted breaks, the agents' output schemas within the API's limits, the twelve records |
| `kpis` | Node | The sector KPI library: the twelve sectors and the general set, 8 to 12 KPIs each, both languages, units, no benchmark values |
| `policy` | Node | The security policy exactly as the brief has it, in `index.html` and `js/config.js`; nothing loaded from another site; no inline script, style or handler |
| `lean` | Node | The presenter's modules and lines, no request before the live client, the hosts the code names, the design review's cuts, the documents' length |
| `hygiene` | Node | No private term and no e-mail address in any file the repository publishes (below) |
| `parity` | Node | The shared parts (`js/risk.js`, `data/kpis.js`, the handoff schema) equal every sibling checkout that has them |
| `docs` | Node | The documents' sections, length and version; every path they name and every section the code cites exists; REVIEW.md names every file taken from a sister |
| `storage` | Chromium | Nothing is kept: storage APIs only in the modules allowed, under the three allowed keys; in the browser, after the guide, the theme and both languages, only those entries, no database, cache, cookie or service worker, and the address unchanged (`--static` skips the browser) |
| `shell` | Chromium | English first for a German browser, the switch to German and back without a reload, the stored choice and `?lang=`, the guide on its own and from the header, the three figures waiting, the talk bar, the AI notice beside Run it live, the credit under the canvas, the dark theme |
| `layout` | Chromium | 1280 × 720 and 1920 × 1080 in both themes and both languages: one screen, the header in one band, the talk bar on one line, the blocks with room, nothing cut, the guide inside the window; a screenshot of each view |
| `vici` | Chromium | Vici's own checks (`guideProblems`, `bylineProblems`, `writingProblems`, `aiNoticeProblems`, `recordIdProblems`) on the page as served and as rendered in English and German, each first failing on a planted control; ViciDesign's guide check over http; the writing rules on the dictionaries, the KPI library and the docs; `vici/` equal to ViciDesign at the commit its README and the workflow name |
| `hexagon` | Chromium | Nothing round: the tool's files, and the rendered page in both themes through the guide, its talk track and the German page |

`tests/live_site.mjs` checks the published site after a Pages build (the "live site" workflow): the files it serves equal this checkout, and the page boots in both languages with its name, its figures and the credit.

## Setup for the browser suites

```
npm install -g playwright@1.56.0
npx playwright install chromium
git clone https://github.com/VictorPflueger/ViciDesign ../ViciDesign
NODE_PATH="$(npm root -g)" node tests/run-all.mjs
```

`PLAYWRIGHT_MODULE` points the suites at a Playwright folder, `CHROME_PATH` at another Chromium or Chrome, and `BMC_TEST_OUT` at the folder for screenshots (by default `bmc-challenger-tests` in the system's temporary folder). The parity suite looks for the siblings next to the repository (`../SWOT-challenger`, `../PESTEL-challenger`, `../PrototypeIdeator`) or in the folder `SIBLINGS_DIR` names.

## The private term list

`tests/hygiene.mjs` checks every published file against a private list of terms that must never appear in this public repository. The list never enters the repository. It is read from the `HYGIENE_TERMS` environment variable (a repository secret in CI), from the file `HYGIENE_TERMS_FILE` names, or from `../.hygiene-terms` next to the repository folder; one entry per line, "term<TAB>what it is". Without a list only the generic checks run and the suite says so: `HYGIENE GENERIC OK` instead of `HYGIENE OK`. The repository has no `HYGIENE_TERMS` secret yet, so CI runs the generic checks and each push runs the full check locally first.

## The golden cases

`fixtures/golden.json` holds the plan's golden cases B0 to B2 and the boundary cases as JSON (PLAN.md §5): the bands, the expected values, the block states and every display string in English and German. `engine` recomputes them. `fixtures/handoff-example.json` is the brief's example of the handoff file (4.3), which `schemas` validates.
