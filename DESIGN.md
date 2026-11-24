# Design

Version 0.2.0. Built on Vici, Victor's design system, copied unchanged into `vici/` at the commit [vici/README.md](vici/README.md) names. Vici's rules win unless this file says otherwise and why.

## Who it is for and where it is seen

A consulting partner shows the tool to a customer, often on a projector and without Victor, and a stranger tries it alone. The page is an Operate surface read from across a room: one screen, plain words, the canvas in the middle.

## The screen

One screen, no page scroll, at 1280 × 720 and 1920 × 1080; `tests/layout.mjs` measures every step of every scenario at both sizes, in both themes and languages.

- The header: the layout icon in a lilac hexagon, the name, the SIMULATION tag, How it works, EN and DE, the theme toggle and the three key figures. Under it, one sentence beside the byline.
- The talk bar: Play, Back, the six steps, Next, then Run it live with "You are interacting with an AI system" in a lilac tag.
- The work area: the step's title, which answers one question with its figure; the canvas; the Strategyzer credit with "Fictional company, illustrative figures" beside it; the step's panel; the bar that says what happens next.

The canvas keeps its classic layout on every step. The panel takes the height its content needs and the canvas the rest, so a block shows its name, its state and as many items as fit, then "+2 more"; a click opens the block in full. A block keeps in view what the step is about: the AI's items at Complete, the items an issue names at Challenge and Assess, the changes later. At 1280 × 720 an item shows its first line, as the brief asks.

The panels: three company cards; how to review the AI's items, each with a remove switch on the canvas; the issues beside the selected one; the risk matrix beside the issue's KPI effects and euro range; one issue's options as cards, Accept beside them; findings, recommendation, assumptions and first steps. Where the person acts, the bar says "Your turn" or "Your decision".

Play stays 7 to 14 seconds on a step, by the reading time of its title and lead, and stops where the person acts. Space, the arrow keys and a clicker work, the address follows the presenter, and each step change moves the focus to the title.

## Colour

Vici's tokens only. Merlot marks the person's choices; lilac what the AI wrote or estimated. Coral marks under pressure, honey watch and sage adapted, each with a mark and a word. On the canvas a word its mark already says, such as "AI" beside an item's sparkle, stays for screen readers only; the legend and the block's tag carry it. Every pair meets 4.5:1 for text and 3:1 for marks (`tests/tokens.mjs`). Nothing is round (`tests/hexagon.mjs`).

## Words and languages

British English and German, plain words, short sentences, the formal Sie, numbers with units; `tests/vici.mjs` runs Vici's writing checks on every step and every scenario text. English opens first, and the switch changes every text without a reload. The screen shows names, never ids. In German the last step is Fazit and Mindern stands for mitigate.

## The figures

Three tiles, each explained in the guide: At stake a year, Blocks under pressure and Session cost. They answer first: a scenario's figures stand before anything plays. A sum over part of the issues says so ("on 5 of 6 issues"). After the decision the old value stays struck through beside the new one. Session cost estimates a live run of the same company. The talk track takes its figures from the first scenario's run.

## What stayed and what went

The plan's design review (PLAN.md §17) cut the Resilience tile, the method dialog, the live dialog's language control, misplaced-item flags, the before-and-after toggle, "Save run as simulation" and the report's About page; `tests/lean.mjs` keeps them out. In 0.2.0 the review of the AI's items moved onto the canvas, Assess and Adapt show one issue at a time, and the Summary adds the first steps of the chosen responses; TECH_NOTES.md §9 says why.
