# Design

Version 0.1.0. The tool is built on Vici, Victor's design system, copied unchanged into `vici/` at the commit [vici/README.md](vici/README.md) names. Vici's rules win unless this file says otherwise and why.

## Who it is for and where it is seen

A consulting partner shows the tool to a customer, often on a projector and without Victor, and a stranger tries it on their own company with their own Claude key. The page is an Operate surface, often read from across a room: it fits one screen, names everything in plain words and puts the canvas in the middle. Brand shows in the details.

## The screen

One screen, no page scroll, at 1280 × 720 and 1920 × 1080 (`tests/layout.mjs` measures both sizes in both themes and languages).

- The header holds the layout icon in a lilac hexagon, the name, the SIMULATION tag, How it works, the EN and DE switch, the theme toggle and, at the top right, the three key figures.
- Under it, one sentence says what the tool does and how real its data is, beside the byline.
- The talk bar holds Play, the six steps (Start, Complete, Challenge, Assess, Adapt, Summary) and Run it live, with "You are interacting with an AI system" in a lilac tag beside it.
- The canvas fills the rest in its classic layout on Vici's honeycomb ground: nine blocks, each with its name and the question it answers, and under it the credit "The Business Model Canvas: Strategyzer.com · CC BY-SA 3.0", both parts linked.
- A panel under the canvas says what this version holds. From 0.2.0 it carries the step's content and the Your turn bar.

In 0.1.0 nothing plays: Play, the steps after Start and Run it live are disabled, and the panel says when each arrives.

## Colour

Vici's tokens only, in both themes. Merlot marks the person's own choices (the chosen language, the current step); lilac marks what the AI wrote, suggested or estimated, and the AI notice. The block states of 0.2.0 add coral for under pressure, honey for watch and sage for adapted, each with a mark and a word as well, so no state rests on colour alone. Every pair the page draws meets 4.5:1 for text and 3:1 for marks; `tests/lib/prototype.mjs` lists them and `tests/tokens.mjs` measures them. The disabled controls of 0.1.0 are inactive, which WCAG exempts. Nothing is round: circles become hexagons (`tests/hexagon.mjs`).

## Words and languages

British English and German, plain words, short sentences, the formal Sie, numbers with units, as Vici's writing guideline asks; `tests/vici.mjs` runs its checks on the page, the dictionaries and these documents. English opens first; the switch changes every text at once without a reload. The screen shows names, never the ids of the data. "Turn into an advantage" names the response that uses an issue.

## The figures

Three tiles, each with a row in the guide's How it works chapter: At stake a year, Blocks under pressure and Session cost. Until a run has played, each shows an ellipsis and what it waits for, never a zero that could be read as a result. From 0.2.0 they answer first: the scenario's figures stand before anything plays. A figure computed from part of the issues says so in its value ("€5.7m on 4 of 5 issues"), and the old value stays struck through beside the new one after Adapt.

## What stayed and what went

The design review of the plan (PLAN.md §17) cut the Resilience tile, the method dialog, the language control in the live dialog, misplaced-item flags, the before-and-after toggle, "Save run as simulation" and the report's separate About page; `tests/lean.mjs` keeps them out. It kept the byline, the talk track, the key figures that answer first, both modes, nothing kept, public information only, the report with its footer, the budget cap, the AI notice, lilac for the AI and the Strategyzer credit under every canvas.
