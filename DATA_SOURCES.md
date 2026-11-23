# Data sources

Version 0.1.0. Where the tool's data comes from, with the date each source was read. What the simulated companies say about the world (a law, a price, a market shift) joins this file with the scenarios in 0.2.0, each fact checked at source again on the day it is written; PLAN.md §9 lists the facts verified so far.

## The Business Model Canvas

The canvas is Strategyzer AG's. Its terms for the use of its tools, read on 23 November 2026 at https://strategyzer.com/legal/usage-of-our-tools, say the canvas is released under a Creative Commons licence and ask for this credit:

> The text and link Strategyzer.com should be clearly visible and legible under every canvas.

The same page calls it good business practice to contact Strategyzer AG before putting the canvas into software (decision D9: Victor writes to Strategyzer AG before client showings), and reserves the Value Proposition Canvas in software for Strategyzer's express permission, so this tool never uses it.

The canvas sheet Strategyzer publishes names its licence: the Creative Commons Attribution-Share Alike 3.0 Unported License, https://creativecommons.org/licenses/by-sa/3.0/ (read on 23 November 2026). The licence asks for credit, a link to it and a note that the work was changed. So every canvas this tool draws, on screen and in the report, carries "The Business Model Canvas: Strategyzer.com · CC BY-SA 3.0" under it, with Strategyzer.com linked to https://www.strategyzer.com and the licence linked; both guides add that the tool adapts the canvas and that the questions on each block are its own.

## The German names of the blocks

Read on 23 November 2026. The German edition's reading sample (Campus, 2011: https://www.campus.de/uploads/tx_campus/leseproben/9783593394749.pdf) names Kundensegmente and Wertangebote. The other seven names come from the German canvas templates of the IHK (https://www.ihk.de/blueprint/servlet/resource/blob/5132490/52a106707fc60b94e0aca105a4f44eda/business-model-canvas-vorlage-data.pdf) and the WKO (https://www.wko.at/oe/epu/canvas-formular.pdf): Schlüsselpartner, Schlüsselaktivitäten, Schlüsselressourcen, Kundenbeziehungen, Kanäle, Kostenstruktur and Einnahmequellen.

## The sector KPI library

`data/kpis.js`, shared by the set and written by the SWOT Challenger, names 115 KPIs for the twelve sectors of the brief and a general set. Their names and definitions are common practice in each sector, in English and German, and each says so as its source. The library holds no benchmark values, so no figure on screen comes from it: what an agent estimates says that it is an estimate and what it rests on.

## The exchange rate

The cost meter converts US dollars to euros at the fixed rate of 1 USD = 0.894 EUR that the sister prototypes use (brief 5.5). It is a convention for comparing sessions, not a market rate, and both guides state it.

## The fictional companies

The three companies of the simulation are fictional, and so are their own figures. A web search on 23 November 2026 found no company of those names; two have near names in other sectors or places, which PLAN.md §9 lists (decision D8).
