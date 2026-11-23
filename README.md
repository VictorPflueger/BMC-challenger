# Business Model Canvas Challenger

Find where a business model breaks, and rebuild it.

This repository is at Phase 0: it holds the plan, [PLAN.md](PLAN.md), and nothing to run yet. The build starts with milestone M1 once Victor approves the plan, and the tool will be served at <https://victorpflueger.github.io/BMC-challenger/>.

## What it will do

A person names a company and fills in as much of its Business Model Canvas as they know. AI agents complete the nine blocks, mark the blocks under pressure in red and estimate what each issue costs a year, using the KPIs of the company's sector. For each issue they propose a way to mitigate it or turn it into an advantage, and they write a management summary. The person keeps or removes the AI's items and picks one response per issue. Code, not the model, computes every figure. The report downloads as a PDF, as an HTML file and as a JSON file for the Prototype Ideator.

## What is real and what is simulated

The simulation plays three fictional companies without a key. Their own figures are invented and illustrative; what they say about the world, such as a law or a price, is real and shows its source and the date it was read.

A live run takes your company and your own Claude API key. You choose the setting and a budget cap. The key and everything you enter stay in the tab's memory and are gone when you close or reload it, so you keep a result only by downloading it.

Public information only: never enter confidential, personal or otherwise protected data.

## The canvas

The Business Model Canvas comes from [Strategyzer.com](https://www.strategyzer.com) and is released under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). This tool adapts it, and the questions it asks of each block are its own.

## Part of a set of four

- Business Model Canvas Challenger, this repository
- [SWOT Challenger](https://github.com/VictorPflueger/SWOT-challenger)
- [PESTEL Challenger](https://github.com/VictorPflueger/PESTEL-challenger)
- [Prototype Ideator](https://github.com/VictorPflueger/PrototypeIdeator), which turns the three challengers' reports into prototype ideas

Built by Victor Pflüger: [LinkedIn](https://www.linkedin.com/in/victorpflueger), [website](https://victorpflueger.github.io/VIP/index.html).
