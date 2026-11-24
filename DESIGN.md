# Design

Version 0.4.0. Built on Vici, Victor's design system, copied unchanged into `vici/` ([vici/README.md](vici/README.md)). Vici's rules win unless this file says otherwise and why.

## Who it is for and where it is seen

Partners show it to customers, often on a projector and without Victor; strangers try it alone. It is an Operate surface read from across a room: one screen, plain words, the canvas in the middle.

## The screen

One screen, no page scroll, at 1280 × 720 and 1920 × 1080; `tests/layout.mjs` measures every step of every scenario and fourteen live screens at both sizes, in both themes and languages.

- The header: the layout icon in a lilac hexagon, the name, the SIMULATION tag, How it works, EN and DE, the theme toggle and the three key figures; under it, one sentence beside the byline.
- The talk bar: Play, Back, the six steps, Next, then Run it live with "You are interacting with an AI system" in a lilac tag.
- The work area: the step's title, which answers one question with its figure; the canvas; the Strategyzer credit and "Fictional company, illustrative figures"; the panel; the bar that says what happens next.

The canvas keeps its classic layout and takes the height the panel leaves: a block shows its name, its state and as many items as fit, then "+2 more", and a click opens it in full. At 1280 × 720 an item shows its first line (Vici's compact framework view).

The panels: the companies; the review of the AI's items; the issues; the risk matrix with an issue's KPIs and euros; one issue's options as cards; the summary. Where the person acts, the bar says "Your turn" or "Your decision"; at Summary its action is the report. Play stays 7 to 14 seconds a step and stops where the person acts.

A live run keeps this screen, with LIVE on the tape and no fictional label: a form for the company at Start, the person's items block by block, and Vici's live-run dialog, in two columns at 1280 × 720 so its start button stays in view. While an agent works, the bar names it beside Abort; a run that stops says why there.

## The report

A document, not a screen: A4 pages on white in both themes, on Vici's report pattern, the footer on every printed page. A dialog from the Summary's bar shows each page at size, Save as PDF as its main button, the two files beside it. Every state keeps its word beside its colour, so a page reads in grey.

## Colour

Vici's tokens only. Merlot marks the person's choices; lilac what the AI wrote or estimated. Coral marks under pressure, honey watch and sage adapted, each with a mark and a word. Every pair meets 4.5:1 for text and 3:1 for marks (`tests/tokens.mjs`). Nothing is round (`tests/hexagon.mjs`).

## Words and languages

British English and German, plain words, short sentences, the formal Sie, numbers with units; `tests/vici.mjs` runs Vici's writing checks on every screen, scenario text and report. English opens first, and the switch changes every text without a reload. The screen shows names, never ids.

## The figures

Three tiles, each explained in the guide: At stake a year, Blocks under pressure and Session cost. They answer first: a scenario's figures stand before anything plays. A sum over part of the issues says so, and after the decision the old value stays struck through beside the new one. Session cost estimates a live run of the same company; live, it meters the spend against the cap, and the other two show "…" until their agent answers.

## What stayed and what went

The plan's design review (PLAN.md §17) cut the Resilience tile, the method dialog, the live dialog's language control, misplaced-item flags, the before-and-after toggle, "Save run as simulation" and the report's About page; `tests/lean.mjs` keeps them out. In 0.2.0 the review of the AI's items moved onto the canvas, and Assess and Adapt show one issue at a time; 0.3.0 took Vici's live-run dialog as it is; 0.4.0 opens the report in a dialog. TECH_NOTES.md §9 and §14 say why.
