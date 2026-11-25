# Business Model Canvas Challenger

Find where a business model breaks, and rebuild it.

Live at <https://victorpflueger.github.io/BMC-challenger/>. This is version 1.0.0: three fictional companies play in English and German without a key, Run it live puts five agents to work on your company, six with web research, with your own Claude API key, and every run ends in a report.

## What it does

A person names a company and fills in as much of its Business Model Canvas as they know. AI agents complete the nine blocks, mark those under pressure in red and estimate what each issue costs a year, in euros and in the sector's KPIs. For each issue they propose a way to mitigate it or turn it into an advantage, and they write a management summary. The person keeps or removes the AI's items and picks one response per issue. Code, not the model, computes every figure.

Three key figures stand top right: what the issues put at stake a year, how many of the nine blocks are under pressure, and what a live run of the company would cost. They answer first, before anything plays; after the decision each shows its old value struck through.

## What is real and what is simulated

The simulation plays three fictional companies without a key: Tidewell Lines, a container carrier; Arvento Drives, a maker of industrial drives; and Auental Energie, a municipal utility. Each is a run written by hand and checked by a live run's rules. Their own figures are invented and illustrative; what they meet in the world, such as a law or a price, is real and shows its source and the date it was read ([DATA_SOURCES.md](DATA_SOURCES.md)). Any choice works: the engine computes every figure from the choices made.

A live run takes your company and your own Claude API key. The key and everything you enter stay in the tab's memory and are gone when you close or reload it; you keep a result only by downloading it. The browser keeps the theme and the language, and for this tab alone that the guide has opened; nothing else.

Public information only: never enter confidential, personal or otherwise protected data.

## A live run

Run it live opens a form for the company and its canvas; "Start from Tidewell Lines's canvas" fills both. The dialog takes your key, a setting and a budget cap. The agents then work in turn, one request each: the Completer fills the gaps, the Scout reads recent news if you switch research on, the Red team finds the issues, the Analyst puts a figure on them, the Strategist proposes the responses and the Writer sums up. The run waits for you twice: to review the AI's items and to choose a response per issue.

Each request goes from your browser to `api.anthropic.com` alone, with your key, the company, the canvas and the earlier agents' answers. For a canvas the size of Tidewell Lines's, a run is estimated at under €0.01 on Fast and on Balanced, both Haiku 5.5, and about €0.12 on Thorough, Sonnet 5.5; research adds about €0.05 on Haiku and €0.10 on Sonnet, its five web searches included. The run stops before any request that could pass your cap; [TECH_NOTES.md](TECH_NOTES.md) §12 and §13 explain.

## The report

At Summary, Download the report shows every page, from the management summary to the method. You keep it as a PDF (your browser's Save as PDF, the footer on every page), an HTML file that opens offline or the JSON file the Prototype Ideator reads. A run stopped early gives the report of what is done, and every page says so ([TECH_NOTES.md](TECH_NOTES.md) §14).

## The canvas

The Business Model Canvas comes from [Strategyzer.com](https://www.strategyzer.com) and is released under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The questions it asks of each block are this tool's own. The credit stands under every canvas the tool draws, on screen and in the report; [DATA_SOURCES.md](DATA_SOURCES.md) quotes Strategyzer's terms.

## Run it

The tool is static HTML, CSS and JavaScript modules, with no build step or dependency. Serve the folder over http, for example with `python -m http.server 8000`; browsers don't run its modules from a file. `?lang=de` opens it in German, `?guide=0` keeps the guide closed and `?scenario=s2&step=4` opens the second company at Adapt. Space plays and pauses; the arrow keys and a clicker move between the steps, and the keyboard alone completes a run.

## Tests

`node tests/run-all.mjs` runs every suite, the browser suites with Playwright in Chromium; no test calls the real API. [tests/README.md](tests/README.md) explains each.

## The documents

- [TECH_NOTES.md](TECH_NOTES.md): the facts the code rests on, with dates, and the decisions in use
- [DESIGN.md](DESIGN.md): the screen, its colours and its words
- [DATA_SOURCES.md](DATA_SOURCES.md): the canvas's credit and the data's sources
- [REVIEW.md](REVIEW.md): every file taken from Vici or a sister prototype, and why
- [vici/README.md](vici/README.md): the copy of Vici, Victor's design system, and its commit
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md) and [DEMO_SCRIPT.de.md](DEMO_SCRIPT.de.md): five minutes for a presenter, in English and German

## Part of a set of four

- Business Model Canvas Challenger, this repository
- [SWOT Challenger](https://github.com/VictorPflueger/SWOT-challenger)
- [PESTEL Challenger](https://github.com/VictorPflueger/PESTEL-challenger)
- [Prototype Ideator](https://github.com/VictorPflueger/PrototypeIdeator), which turns the three challengers' reports into prototype ideas

The three challengers share their risk rules (`js/risk.js`), their sector KPI library (`data/kpis.js`) and the schema of the file they hand to the Ideator (`schemas/strategy-challenge-1.json`).

## Author

Built by Victor Pflüger: [LinkedIn](https://www.linkedin.com/in/victorpflueger), [website](https://victorpflueger.github.io/VIP/index.html).
