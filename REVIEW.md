# Review of what was taken

Version 0.1.0. Every file this tool took from Vici or a sister prototype, how and why (brief 5.4). The plan's file-by-file reuse map is PLAN.md, Appendix A; this list holds what the repository carries now. The sources, read on 23 November 2026:

- ViciDesign at 484b49a (v1.0.0 on `main`), Victor's design system
- the Sovereignty Assessment 2.0.0 at 35c0dea: the newest live client and the bilingual build
- the Data Quality Agent 2.2.0 at 831f050: the presenter (steps, Play, key figures, live dialog)
- the SWOT Challenger at 617b122, its M1: the first of the set to merge the shared parts

## Copied unchanged

| File | From | Why |
|---|---|---|
| `vici/` (19 files, listed in its README) | ViciDesign | Standing requirement 1: Vici's files unchanged, at a named commit; `tests/vici.mjs` and `tests/vici-files.mjs` compare them byte for byte |
| `js/risk.js` | SWOT Challenger | Shared by the set (brief 4.1): bands, probabilities, expected values, the totals and the money format |
| `data/kpis.js` | SWOT Challenger | Shared: the sector KPI library |
| `schemas/strategy-challenge-1.json` and `schemas/strategy-challenge-1.js` | SWOT Challenger | Shared: the handoff schema, and the same as a module the page can import |
| `tests/kpis.mjs` | SWOT Challenger | The checks of the shared KPI library, the same in every tool that holds it |
| `js/theme.js` | Sovereignty Assessment, the same in the Data Quality Agent | Applies the remembered theme before the page is drawn |
| `tests/tokens.mjs` | Sovereignty Assessment | Vici's colour checks, the same file in every prototype; this tool's pairs are in `tests/lib/prototype.mjs` |
| `tests/hexagon.mjs` | Data Quality Agent, the same in the Sovereignty Assessment | Vici's hexagon rule; this tool's tour is in `tests/lib/prototype.mjs` |
| `tests/vici-files.mjs` | Data Quality Agent | `vici/` holds exactly the files its README lists |
| `tests/hygiene.mjs` | Sovereignty Assessment | No client, prospect, contact or meeting named in a published file |
| `tests/lib/strings.mjs` | Sovereignty Assessment | The string tokenizer behind the language test |

## Copied with a new header

| File | From | Why |
|---|---|---|
| `js/schema.js` | Sovereignty Assessment | A JSON Schema validator without dependencies, for every answer, scenario and handoff file |

## Adapted

| File | From | What changed, and why |
|---|---|---|
| `index.html` | Vici's blank starter page, with the Data Quality Agent's presenter shell and the Sovereignty Assessment's two guides | This tool's header with three key figures, its talk bar of six steps, the canvas of nine blocks with the Strategyzer credit, a status panel for 0.1.0, and a guide per language |
| `css/app.css` | The shells of both sisters | Their page grid, header, tiles, step bar and loading screen; the canvas grid in the classic layout is new |
| `js/main.js` | Sovereignty Assessment | Boots the page and reports a failed module on the loading screen; this tool's names |
| `js/lang.js` | Sovereignty Assessment | Picks the language before Vici starts; the key is `bmc.lang` |
| `js/i18n/index.js` | Sovereignty Assessment | Both languages without a reload; its log tag reads `APP.name` and its key `STORAGE.lang` |
| `js/config.js` | Sovereignty Assessment | The policy constant and the storage prefix; this tool's name, version and single storage key. Prices and models arrive with the live client in 0.3.0 |
| `js/format.js` | Sovereignty Assessment | Intl formats in both languages; money now follows the shared `js/risk.js`, and a sum over part of the issues says so |
| `tests/policy.mjs` | Data Quality Agent | This tool's policy; the storage checks moved to `tests/storage.mjs`, which is stricter (no key in session storage) |
| `tests/vici.mjs` | Sovereignty Assessment | This page's figures, controls and record ids; the scenario texts join in 0.2.0 |
| `tests/i18n.mjs` | Sovereignty Assessment | This tool's key families and the few texts that read the same in German |
| `tests/unit.mjs` | Sovereignty Assessment | Its stand-ins for storage and the document; this tool's modules |
| `tests/lean.mjs` | Sovereignty Assessment | This tool's limits (a shell of eight modules in 1,800 lines, `js/` in 6,500) and the design review's cuts |
| `tests/docs.mjs` | Sovereignty Assessment | This tool's documents, sections and named paths |
| `tests/live_site.mjs` | Sovereignty Assessment | This tool's files and start check on the published site |
| `tests/run-all.mjs` | Sovereignty Assessment | This tool's suites |
| `tests/page-icon.mjs` | Data Quality Agent, the same in the Sovereignty Assessment | The website's card is required from 1.0.0; until then a missing card is skipped and said |
| `tests/lib/harness.mjs` | Sovereignty Assessment | This tool's output folder, ports and storage key |
| `tests/lib/prototype.mjs` | Data Quality Agent | This tool's name, colour pairs, hexagon tour and page icon |
| `tests/README.md` | Sovereignty Assessment | This tool's suites and setup |
| `.github/workflows/tests.yml` and `live-site.yml` | Both sisters | ViciDesign at this tool's pin, VIP for the page icon, the three siblings for the parity test |

## Written for this tool

`js/engine.js`, `js/canvas.js`, `js/app.js`, the dictionaries, `schemas/index.js`, `favicon.svg` and the suites `engine`, `schemas`, `storage`, `shell`, `layout` and `parity` with their fixtures are new. The engine calls the shared `js/risk.js` for every total (TECH_NOTES §10).
