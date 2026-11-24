# Data sources

Version 0.3.0. Where the tool's data comes from, with the date each source was read. The three simulated companies are fictional; the laws, prices and market facts they meet are real, each checked at its source on the day the scenario was written and listed below under "The scenarios' facts". `tools/check-scenarios.mjs` fails when a scenario cites a fact or a source this file lacks.

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

The three companies of the simulation are fictional, and so are their own figures: their size, their canvas and the euro ranges on their issues. A web search on 23 November 2026 found no company of those names; two have near names in other sectors or places, which PLAN.md §9 lists (decision D8).

## The scenarios' facts

Each scenario in `data/scenarios/` names the facts it rests on, and its red team cites these sources. All were read on 23 November 2026, the scenarios' as-of date; a scenario shows "Check for updates" 90 days later.

| Id | What the scenario takes from it | Source, as published | Read on |
|---|---|---|---|
| S1.1 | Ships at EU ports surrender allowances for 40% of 2024 emissions, 70% of 2025 and all from 2026; voyages between EU ports count in full, into or out of the EU half | [FAQ – Maritime transport in EU Emissions Trading System (ETS)](https://climate.ec.europa.eu/eu-action/transport-decarbonisation/reducing-emissions-shipping-sector/faq-maritime-transport-eu-emissions-trading-system-ets_en), updated 24 November 2025 | 2026-11-23 |
| S1.2 | Since 2025 ships above 5,000 GT at EU ports cut the greenhouse-gas intensity of their energy, 2% at first and 80% by 2050; container ships use shore power from 2030 | [Decarbonising maritime transport – FuelEU Maritime](https://transport.ec.europa.eu/transport-modes/maritime/decarbonising-maritime-transport-fueleu-maritime_en), no date | 2026-11-23 |
| S1.3 | Asia–Europe loops return to Suez after the war on Iran halted the return; a full return is expected by early 2027 | [Full Suez return for container carriers expected by Q1 2027](https://www.seatrade-maritime.com/containers/full-suez-return-for-container-carriers-expected-by-q1-2027), 14 October 2026 | 2026-11-23 |
| S1.4 | $4,176 per 40-foot container on 19 November 2026, down 3% for a fourth week and 126% above a year earlier | [World Container Index - 19 Nov](https://www.drewry.co.uk/WCI), 19 November 2026 | 2026-11-23 |
| S1.5 | Digital forwarders such as Flexport, Forto and Zencargo quote, book and track shipments on their own platforms | [Digital Freight Forwarder 2026](https://gofreight.com/blog/general/digital-freight-forwarder.html), 8 January 2026 | 2026-11-23 |
| S1.6 | The EU adopted CountEmissionsEU with EN ISO 14083 as the common method for counting the emissions of a transport service | [EU adopts clear and proportionate rules for transport emissions accounting](https://www.iru.org/node/18453), 28 April 2026 | 2026-11-23 |
| S2.1 | Users of connected products may access and share their data since 12 September 2025; new products give that access by design from 12 September 2026 | [Data Act: Next level as of 12 September 2026](https://www.dihk.de/en/service-portal/for-business-owners-and-entrepreneurs/data-act-next-level-as-of-12-september-2026-174716), 22 May 2026 | 2026-11-23 |
| S2.2 | Since 11 September 2026 makers report exploited vulnerabilities and severe incidents through ENISA's Single Reporting Platform | [Cyber Resilience Act - Reporting obligations](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting), updated 11 September 2026 | 2026-11-23 |
| S2.3 | The Machinery Regulation applies from 20 January 2027, with no transition, and replaces Directive 2006/42/EC | [The new European Machinery Regulation](https://www.baua.de/EN/Topics/Work-design/Machine-and-operational-safety/Machinery/Machinery-Directive-Revision), no date | 2026-11-23 |
| S2.4 | Power for small and medium industry costs about 16.7 ct/kWh in 2026, 0.9 ct less than in 2025 | [BDEW Strompreisanalyse April 2026](https://www.bdew.de/media/documents/BDEW_Strompreisanalyse_042026.pdf), 15 April 2026 | 2026-11-23 |
| S2.5 | 157 occupations short of skilled staff in 2025, against 183 in 2023 | [Fachkräfteengpassanalyse 2025](https://statistik.arbeitsagentur.de/DE/Statischer-Content/Statistiken/Themen-im-Fokus/Fachkraeftebedarf/Fachkraefteengpassanalyse/Fachkraefteengpassanalyse.html), no date | 2026-11-23 |
| S2.6 | US tariffs fall on the metal content of machinery, documented part by part | [Wende auf dem Markt für Maschinen in den USA](https://www.gtai.de/de/trade/usa/branchen/deutsche-maschinenbauer-bleiben-in-den-usa-auf-rekordkurs-1029242), 21 August 2026 | 2026-11-23 |
| S3.1 | Lower Saxony's regional centres present heat plans by the end of 2026, other towns by 2028; the buildings law of 10 July 2026 drops the 65% rule, and new gas boilers burn a rising bio share from 2029 | [Kommunale Wärmeplanung: Kommunen sind gefordert](https://www.ihk.de/hannover/hauptnavigation/innovation/energie/energiepolitik-recht/waermeplanung-6287230), 21 September 2026; [Gebäudemodernisierungsgesetz ist beschlossen](https://www.bdew.de/energie/gebaeudemodernisierungsgesetz-ist-beschlossen/), 21 July 2026 | 2026-11-23 |
| S3.2 | 5.9% of 54.1 million metering points had a smart meter on 30 June 2026; the regulator opened proceedings against 434 operators | [Halbjährliche Erhebung im Messwesen](https://bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260921_Rollout.html), 21 September 2026 | 2026-11-23 |
| S3.3 | Every power supplier must offer a dynamic tariff since 2025, for customers with a smart meter | [Dynamische Stromtarife](https://www.bundesnetzagentur.de/DE/Vportal/Energie/Vertragsarten/DynStromtarife/start.html), no date | 2026-11-23 |
| S3.4 | The new grid-fee system is to be decided at the end of 2026 and applies from 2029 | [Konsultation zur Reform der Netzentgeltsystematik Strom](https://bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260806_Agnes.html), 6 August 2026 | 2026-11-23 |
| S3.5 | Enpal offers municipal utilities a heat-pump partnership; a utility in Lower Saxony is among the first | [Konkurrent bietet Stadtwerken Kooperation im Wärmesektor an](https://www.zfk.de/unternehmen/enpal-will-luecken-in-lokaler-waermeplanung-schliessen), 19 February 2026 | 2026-11-23 |

The scenarios' prose quotes none of these numbers: the fact audit refuses figures in an agent's text, and code computes every figure the page shows.
