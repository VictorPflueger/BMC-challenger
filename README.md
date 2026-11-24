# Business Model Canvas Challenger

Find where a business model breaks, and rebuild it.

Live at <https://victorpflueger.github.io/BMC-challenger/>. This is version 0.2.0, the simulation: three fictional companies play through the six steps in English and German, with Play, the key figures and the talk track. Run it live arrives in 0.3.0 and the report in 0.4.0; [PLAN.md](PLAN.md) has the milestones.

## What it does

A person names a company and fills in as much of its Business Model Canvas as they know. AI agents complete the nine blocks, mark the blocks under pressure in red and estimate what each issue costs a year, using the KPIs of the company's sector. For each issue they propose a way to mitigate it or turn it into an advantage, and they write a management summary. The person keeps or removes the AI's items and picks one response per issue. Code, not the model, computes every figure. The report downloads as a PDF, as an HTML file and as a JSON file for the Prototype Ideator.

Three key figures stand at the top right: what the issues put at stake a year, how many of the nine blocks are under pressure, and what a live run of the same company would cost. They answer first: before anything plays, they show the company's figures, and after the decision each keeps its old value struck through beside the new one.

## What is real and what is simulated

The simulation plays three fictional companies without a key: Tidewell Lines, a container carrier; Arvento Drives, a maker of industrial drives; and Auental Energie, a municipal utility. Each is a run of the five agents written by hand and checked by the same rules a live run must pass. Their own figures are invented and illustrative; what they meet in the world, such as a law or a price, is real and shows its source and the date it was read ([DATA_SOURCES.md](DATA_SOURCES.md)). Any choice works: the engine computes every figure from the choices made, not from the recording.

A live run takes your company and your own Claude API key. You choose the setting and a budget cap. The key and everything you enter stay in the tab's memory and are gone when you close or reload it, so you keep a result only by downloading it. The browser remembers two choices and nothing else: the theme and the language.

Public information only: never enter confidential, personal or otherwise protected data.

## The canvas

The Business Model Canvas comes from [Strategyzer.com](https://www.strategyzer.com) and is released under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). This tool adapts it: the questions it asks of each block are its own. The credit stands under every canvas the tool draws; [DATA_SOURCES.md](DATA_SOURCES.md) quotes Strategyzer's terms.

## Run it

The tool is static HTML, CSS and JavaScript modules, with no build step and no dependency. Serve the folder over http, for example with `python -m http.server 8000`, and open <http://localhost:8000>. Browsers don't run its modules from a file. `?lang=de` opens it in German, `?guide=0` keeps the guide closed and `?scenario=s2&step=4` opens the second company at Adapt, played up to there with the recorded choices. Space plays and pauses; the arrow keys and a clicker move between the steps.

## Tests

`node tests/run-all.mjs` runs every suite; the browser suites need Playwright with Chromium. [tests/README.md](tests/README.md) explains the setup and what each suite proves. `node tools/check-scenarios.mjs` checks the three scenarios on their own. No test calls the real API.

## The documents

- [TECH_NOTES.md](TECH_NOTES.md): the facts the code rests on, each with its date, and the decisions in use
- [DESIGN.md](DESIGN.md): the screen, its colours and its words
- [DATA_SOURCES.md](DATA_SOURCES.md): the canvas's credit and the sources of the data
- [REVIEW.md](REVIEW.md): every file taken from Vici or a sister prototype, and why
- [vici/README.md](vici/README.md): the copy of Vici, Victor's design system, and its commit

## Part of a set of four

- Business Model Canvas Challenger, this repository
- [SWOT Challenger](https://github.com/VictorPflueger/SWOT-challenger)
- [PESTEL Challenger](https://github.com/VictorPflueger/PESTEL-challenger)
- [Prototype Ideator](https://github.com/VictorPflueger/PrototypeIdeator), which turns the three challengers' reports into prototype ideas

The three challengers share their risk rules (`js/risk.js`), their sector KPI library (`data/kpis.js`) and the schema of the file they hand to the Ideator (`schemas/strategy-challenge-1.json`).

## Author

Built by Victor Pflüger: [LinkedIn](https://www.linkedin.com/in/victorpflueger), [website](https://victorpflueger.github.io/VIP/index.html).
