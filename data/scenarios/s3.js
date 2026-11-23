// S3 Auental Energie: a recorded run of the five agents, authored by hand from the facts in
// DATA_SOURCES.md (S3.1 to S3.5), read on 23 November 2026. The utility, its town and its own figures
// are fictional, and no real town is named; the laws, rules and rivals it meets are real and cited.
// Every text a person reads is a pair { en, de }; ids, numbers and blocks stand once. js/run.js
// localise() picks a language; the engine computes every figure at playback.
// tools/check-scenarios.mjs checks this file against the schemas, the guardrails and the fact audit.

const HEAT_PLAN = "https://www.ihk.de/hannover/hauptnavigation/innovation/energie/energiepolitik-recht/waermeplanung-6287230";
const BUILDINGS = "https://www.bdew.de/energie/gebaeudemodernisierungsgesetz-ist-beschlossen/";
const METERS = "https://bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260921_Rollout.html";
const DYNAMIC = "https://www.bundesnetzagentur.de/DE/Vportal/Energie/Vertragsarten/DynStromtarife/start.html";
const GRID_FEES = "https://bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260806_Agnes.html";
const RIVALS = "https://www.zfk.de/unternehmen/enpal-will-luecken-in-lokaler-waermeplanung-schliessen";

export default {
  id: "s3",
  source: "authored",
  as_of: "2026-11-23",
  facts: ["S3.1", "S3.2", "S3.3", "S3.4", "S3.5"],
  company: {
    name: "Auental Energie",
    sector: "energy_utilities",
    country: "DE",
    fictional: true,
    description: {
      en: "Municipal utility of a mid-sized town in Lower Saxony: power, gas, heat, water, the local grid and car charging",
      de: "Stadtwerk einer mittelgroßen Stadt in Niedersachsen: Strom, Gas, Wärme, Wasser, das örtliche Netz und Ladesäulen"
    },
    size: {
      en: "About 380 staff, €210m revenue a year, 48,000 power and 21,000 gas customers",
      de: "Rund 380 Beschäftigte, 210 Mio. € Umsatz im Jahr, 48.000 Strom- und 21.000 Gaskunden"
    }
  },
  // What "the team" entered: the value, segment and revenue blocks only.
  entered: {
    value: [
      { en: "Power, gas, heat and water from one local supplier", de: "Strom, Gas, Wärme und Wasser aus einer Hand vor Ort" },
      { en: "Service desk in the town centre", de: "Kundenzentrum in der Innenstadt" },
      { en: "Charging points for electric cars across town", de: "Ladesäulen für Elektroautos in der ganzen Stadt" }
    ],
    segments: [
      { en: "Households in the town and its villages", de: "Haushalte in der Stadt und ihren Ortsteilen" },
      { en: "Small businesses and the town's own buildings", de: "Kleine Betriebe und die stadteigenen Gebäude" }
    ],
    revenue: [
      { en: "Power and gas tariffs", de: "Strom- und Gastarife" },
      { en: "Grid fees", de: "Netzentgelte" },
      { en: "Water and heat charges", de: "Wasser- und Wärmeentgelte" }
    ]
  },
  answers: {
    completion: {
      sector: "energy_utilities",
      items: [
        { block: "partners", confidence: "high",
          text: { en: "The town council as owner", de: "Die Stadt als Eigentümerin" },
          basis: { en: "A municipal utility belongs to its town", de: "Ein Stadtwerk gehört seiner Stadt" } },
        { block: "partners", confidence: "medium",
          text: { en: "Local installers for heating and solar", de: "Örtliche Installateure für Heizung und Solar" },
          basis: { en: "Heat and solar at home need installers the utility can call on", de: "Wärme und Solar zu Hause brauchen Installateure, auf die das Stadtwerk zurückgreifen kann" } },
        { block: "activities", confidence: "high",
          text: { en: "Running the local power and gas grids", de: "Die örtlichen Strom- und Gasnetze betreiben" },
          basis: { en: "The team entered grid fees, so the utility runs the grid", de: "Das Team nennt Netzentgelte, also betreibt das Stadtwerk das Netz" } },
        { block: "activities", confidence: "high",
          text: { en: "Billing and customer service", de: "Abrechnung und Kundenservice" },
          basis: { en: "Every tariff needs metering, billing and service", de: "Jeder Tarif braucht Messung, Abrechnung und Service" } },
        { block: "activities", confidence: "medium",
          text: { en: "Planning the town's heat supply with the council", de: "Die Wärmeversorgung der Stadt mit der Verwaltung planen" },
          basis: { en: "Towns in Lower Saxony must present heat plans", de: "Städte in Niedersachsen müssen Wärmepläne vorlegen" } },
        { block: "resources", confidence: "high",
          text: { en: "Power, gas, heat and water networks", de: "Strom-, Gas-, Wärme- und Wassernetze" },
          basis: { en: "The services the team entered all run on local networks", de: "Die vom Team genannten Leistungen laufen alle über örtliche Netze" } },
        { block: "resources", confidence: "medium",
          text: { en: "Billing system in use for many years", de: "Seit vielen Jahren genutztes Abrechnungssystem" },
          basis: { en: "Utilities of this size often bill on systems that are many years old", de: "Stadtwerke dieser Größe rechnen oft mit Systemen ab, die viele Jahre alt sind" } },
        { block: "resources", confidence: "medium",
          text: { en: "Customer trust built over generations", de: "Über Generationen gewachsenes Kundenvertrauen" },
          basis: { en: "A local supplier with a service desk in the town centre", de: "Ein örtlicher Versorger mit Kundenzentrum in der Innenstadt" } },
        { block: "relationships", confidence: "high",
          text: { en: "Personal service at the desk and by phone", de: "Persönlicher Service im Kundenzentrum und am Telefon" },
          basis: { en: "The team entered a service desk in the town centre", de: "Das Team nennt ein Kundenzentrum in der Innenstadt" } },
        { block: "relationships", confidence: "medium",
          text: { en: "Long-standing customers who rarely switch", de: "Langjährige Kunden, die selten wechseln" },
          basis: { en: "Default supply in its own town brings loyal customers", de: "Die Grundversorgung in der eigenen Stadt bringt treue Kunden" } },
        { block: "channels", confidence: "high",
          text: { en: "Service desk and call centre", de: "Kundenzentrum und Callcenter" },
          basis: { en: "The value proposition names a service desk", de: "Das Wertangebot nennt ein Kundenzentrum" } },
        { block: "channels", confidence: "medium",
          text: { en: "Customer portal online", de: "Online-Kundenportal" },
          basis: { en: "Utilities offer tariffs and meter readings online", de: "Stadtwerke bieten Tarife und Zählerstände online an" } },
        { block: "costs", confidence: "high",
          text: { en: "Energy bought on the wholesale market", de: "Energieeinkauf am Großhandelsmarkt" },
          basis: { en: "A supplier of power and gas buys most of what it sells", de: "Ein Strom- und Gasversorger kauft das meiste, was er verkauft" } },
        { block: "costs", confidence: "high",
          text: { en: "Investment in the grids", de: "Investitionen in die Netze" },
          basis: { en: "The grids need upkeep and new capacity for heat pumps and cars", de: "Die Netze brauchen Erhalt und neue Kapazität für Wärmepumpen und Autos" } }
      ]
    },
    signals: [
      { url: HEAT_PLAN, title: "Kommunale Wärmeplanung: Kommunen sind gefordert", published: "2026-09-21", areas: ["segments", "revenue", "activities"],
        summary: { en: "Lower Saxony's climate law makes its regional and middle-order centres present heat plans by the end of 2026; other towns follow by 2028.", de: "Das niedersächsische Klimagesetz verpflichtet die Ober- und Mittelzentren, bis Ende 2026 Wärmepläne vorzulegen; die übrigen Kommunen folgen bis 2028." } },
      { url: BUILDINGS, title: "Gebäudemodernisierungsgesetz ist beschlossen", published: "2026-07-21", areas: ["value", "segments", "revenue"],
        summary: { en: "The new buildings law drops the renewables rule for new heating. New gas boilers stay allowed but must burn a rising bio share from 2029, and a green-gas quota for suppliers is to follow.", de: "Das neue Gebäudegesetz streicht die Erneuerbaren-Pflicht für neue Heizungen. Neue Gasheizungen bleiben erlaubt, müssen ab 2029 aber einen steigenden Bioanteil verbrennen, und eine Grüngasquote für Versorger soll folgen." } },
      { url: METERS, title: "Bundesnetzagentur veröffentlicht halbjährliche Erhebung im Messwesen", published: "2026-09-21", areas: ["resources", "activities"],
        summary: { en: "Only a small share of all metering points has a smart meter, and the regulator has opened proceedings against operators that missed the first quota.", de: "Nur ein kleiner Teil aller Messstellen hat ein intelligentes Messsystem, und die Bundesnetzagentur hat Verfahren gegen Betreiber eröffnet, die die erste Quote verfehlt haben." } },
      { url: DYNAMIC, title: "Dynamische Stromtarife", published: "", areas: ["revenue", "resources", "activities"],
        summary: { en: "Since 2025 every power supplier must offer a dynamic tariff; a customer who wants one needs a smart meter.", de: "Seit 2025 muss jeder Stromlieferant einen dynamischen Tarif anbieten; wer ihn nutzen will, braucht ein intelligentes Messsystem." } },
      { url: GRID_FEES, title: "Bundesnetzagentur startet Konsultation zur Reform der Netzentgeltsystematik Strom", published: "2026-08-06", areas: ["costs", "revenue", "resources"],
        summary: { en: "The regulator plans to decide the new grid-fee system at the end of 2026; it replaces today's rules from 2029.", de: "Die Bundesnetzagentur will das neue Netzentgeltsystem Ende 2026 festlegen; es löst die heutigen Regeln ab 2029 ab." } },
      { url: RIVALS, title: "Konkurrent bietet Stadtwerken Kooperation im Wärmesektor an", published: "2026-02-19", areas: ["value", "partners", "channels", "segments"],
        summary: { en: "Enpal offers municipal utilities heat pumps for homes outside heat networks: it plans, installs and maintains them, and the utility sells them locally. A utility in Lower Saxony is among the first partners.", de: "Enpal bietet Stadtwerken Wärmepumpen für Häuser außerhalb von Wärmenetzen an: Enpal plant, installiert und wartet sie, das Stadtwerk vertreibt sie vor Ort. Ein Stadtwerk in Niedersachsen gehört zu den ersten Partnern." } }
    ],
    issues: [
      { id: "I1", type: "customer", blocks: ["value", "segments", "revenue"], items: ["value-1", "segments-1", "revenue-1"], impact: 4, likelihood: 4, horizon: "1_to_3_years", evidence: [HEAT_PLAN, BUILDINGS], confidence: "medium",
        title: { en: "Gas customers drift away as the town's heat plan lands", de: "Gaskunden wandern ab, sobald der Wärmeplan der Stadt steht" },
        description: { en: "The town must present its heat plan by the end of 2026. Where it plans heat networks or heat pumps, gas customers leave, and a rising bio share makes new gas heating dearer from 2029.", de: "Die Stadt muss ihren Wärmeplan bis Ende 2026 vorlegen. Wo er Wärmenetze oder Wärmepumpen vorsieht, gehen Gaskunden, und ein steigender Bioanteil verteuert neue Gasheizungen ab 2029." },
        contradicts: { en: "Power and gas tariffs (Revenue streams)", de: "Strom- und Gastarife (Einnahmequellen)" } },
      { id: "I2", type: "finance", blocks: ["costs", "resources"], items: ["costs-2", "resources-1"], impact: 4, likelihood: 3, horizon: "1_to_3_years", evidence: [GRID_FEES], confidence: "medium",
        title: { en: "Grid investment comes years before the revenue", de: "Netzinvestitionen kommen Jahre vor den Erlösen" },
        description: { en: "Heat pumps and charging points need grid capacity now, while the new grid-fee system applies only from 2029. The utility pays first and earns later.", de: "Wärmepumpen und Ladesäulen brauchen jetzt Netzkapazität, das neue Netzentgeltsystem gilt aber erst ab 2029. Das Stadtwerk zahlt zuerst und verdient später." },
        contradicts: { en: "Investment in the grids (Cost structure)", de: "Investitionen in die Netze (Kostenstruktur)" } },
      { id: "I3", type: "technology", blocks: ["resources", "activities", "revenue"], items: ["resources-2", "activities-2"], impact: 3, likelihood: 4, horizon: "now", evidence: [DYNAMIC, METERS], confidence: "high",
        title: { en: "Dynamic tariffs that the old billing system can't handle", de: "Dynamische Tarife, die das alte Abrechnungssystem nicht kann" },
        description: { en: "Every supplier must offer a dynamic tariff, and customers with a smart meter can ask for one. Billing by the hour needs data the old system doesn't take.", de: "Jeder Lieferant muss einen dynamischen Tarif anbieten, und Kunden mit intelligentem Messsystem können ihn verlangen. Stündliche Abrechnung braucht Daten, die das alte System nicht verarbeitet." },
        contradicts: { en: "Billing system in use for many years (Key resources)", de: "Seit vielen Jahren genutztes Abrechnungssystem (Schlüsselressourcen)" } },
      { id: "I4", type: "competition", blocks: ["segments", "channels"], items: ["segments-1", "channels-1"], impact: 3, likelihood: 3, horizon: "1_to_3_years", evidence: [RIVALS], confidence: "medium",
        title: { en: "Solar and heat-pump firms win the homes the utility serves", de: "Solar- und Wärmepumpenfirmen gewinnen die Häuser, die das Stadtwerk versorgt" },
        description: { en: "Large installers sell solar, batteries and heat pumps to the same homes and now court municipal utilities as partners. Each home they win buys less power and no gas.", de: "Große Anbieter verkaufen Solar, Speicher und Wärmepumpen an dieselben Häuser und werben nun um Stadtwerke als Partner. Jedes Haus, das sie gewinnen, kauft weniger Strom und kein Gas." },
        contradicts: { en: "Households in the town and its villages (Customer segments)", de: "Haushalte in der Stadt und ihren Ortsteilen (Kundensegmente)" } },
      { id: "I5", type: "customer", blocks: ["value", "partners"], items: [], impact: 2, likelihood: 2, horizon: "1_to_3_years", evidence: ["general knowledge"], confidence: "medium",
        title: { en: "Local trust is not yet used for a heat service", de: "Lokales Vertrauen wird noch nicht für einen Wärmeservice genutzt" },
        description: { en: "Customers trust the utility, but the canvas offers them nothing for the heating they must replace. Others will sell it to them.", de: "Die Kunden vertrauen dem Stadtwerk, doch das Canvas bietet ihnen nichts für die Heizung, die sie ersetzen müssen. Andere werden sie ihnen verkaufen." },
        contradicts: { en: "Customer trust built over generations (Key resources)", de: "Über Generationen gewachsenes Kundenvertrauen (Schlüsselressourcen)" } }
    ],
    impacts: {
      baselines: [
        { value: 21000, unit: "#",
          name: { en: "Gas customers", de: "Gaskunden" },
          basis: { en: "As the team entered", de: "Wie vom Team genannt" } },
        { value: 350, unit: "€",
          name: { en: "Gas margin per customer a year", de: "Gasmarge je Kunde und Jahr" },
          basis: { en: "Typical for a municipal gas supplier", de: "Typisch für einen kommunalen Gasversorger" } },
        { value: 15000000, unit: "€",
          name: { en: "Grid investment a year", de: "Netzinvestitionen im Jahr" },
          basis: { en: "Upkeep plus new capacity for heat pumps and charging", de: "Erhalt plus neue Kapazität für Wärmepumpen und Ladesäulen" } }
      ],
      impacts: [
        { issue: "I1", monetisable: true, eur_year_low: 2000000, eur_year_high: 4000000, confidence: "medium", reason: "",
          kpis: [
            { id: "energy_utilities.customer_churn", direction: "up", change_low: 3, change_high: 6,
              basis: { en: "Gas customers leave where the heat plan offers other heat", de: "Gaskunden gehen, wo der Wärmeplan andere Wärme vorsieht" } },
            { id: "energy_utilities.gross_margin_per_mwh", direction: "down", change_low: 2, change_high: 5,
              basis: { en: "Fixed grid costs spread over less gas", de: "Feste Netzkosten verteilt auf weniger Gas" } }
          ],
          eur_basis: { en: "Margin of the gas customers likely to leave, plus gas-grid costs spread over fewer customers", de: "Marge der Gaskunden, die wahrscheinlich gehen, plus Gasnetzkosten verteilt auf weniger Kunden" } },
        { issue: "I2", monetisable: true, eur_year_low: 1500000, eur_year_high: 4000000, confidence: "low", reason: "",
          kpis: [
            { id: "general.ebit_margin", direction: "down", change_low: 0.5, change_high: 1.5,
              basis: { en: "Interest and depreciation on grid assets before the fees cover them", de: "Zinsen und Abschreibungen auf Netzanlagen, bevor die Entgelte sie decken" } }
          ],
          eur_basis: { en: "Financing cost of the grid investment until the new fees apply", de: "Finanzierungskosten der Netzinvestitionen, bis die neuen Entgelte gelten" } },
        { issue: "I3", monetisable: true, eur_year_low: 1000000, eur_year_high: 3000000, confidence: "low", reason: "",
          kpis: [
            { id: "energy_utilities.dynamic_tariff_share", direction: "down", change_low: 1, change_high: 4,
              basis: { en: "Customers who can't get a dynamic tariff from the utility", de: "Kunden, die beim Stadtwerk keinen dynamischen Tarif bekommen" } },
            { id: "energy_utilities.cost_to_serve", direction: "up", change_low: 5, change_high: 12,
              basis: { en: "Manual work-arounds in billing", de: "Manuelle Umwege in der Abrechnung" } }
          ],
          eur_basis: { en: "Customers who leave for suppliers with dynamic tariffs, and manual billing work", de: "Kunden, die zu Anbietern mit dynamischen Tarifen wechseln, und manuelle Abrechnungsarbeit" } },
        { issue: "I4", monetisable: true, eur_year_low: 1500000, eur_year_high: 4000000, confidence: "low", reason: "",
          kpis: [
            { id: "energy_utilities.customer_churn", direction: "up", change_low: 1, change_high: 3,
              basis: { en: "Homes with solar and a heat pump buy less from the utility", de: "Häuser mit Solar und Wärmepumpe kaufen weniger beim Stadtwerk" } }
          ],
          eur_basis: { en: "Power and gas margin of the homes rivals are likely to win", de: "Strom- und Gasmarge der Häuser, die Wettbewerber wahrscheinlich gewinnen" } },
        { issue: "I5", monetisable: true, eur_year_low: 300000, eur_year_high: 1000000, confidence: "low", reason: "",
          kpis: [
            { id: "energy_utilities.heat_customers", direction: "down", change_low: 100, change_high: 300,
              basis: { en: "Homes that buy their heat from others instead", de: "Häuser, die ihre Wärme stattdessen anderswo kaufen" } }
          ],
          eur_basis: { en: "Margin on a heat service the utility doesn't offer", de: "Marge auf einen Wärmeservice, den das Stadtwerk nicht anbietet" } }
      ]
    },
    responses: [
      { issue: "I1", options: [
        { kind: "mitigate", recommended: true, effort: "L", time_to_impact: "6_to_12_months", impact: 2, likelihood: 2, eur_year_low: 1000000, eur_year_high: 2500000,
          title: { en: "Offer every gas customer a planned switch to a heat pump or the heat network", de: "Jedem Gaskunden einen geplanten Umstieg auf Wärmepumpe oder Wärmenetz anbieten" },
          first_step: { en: "Sales maps the gas customers against the draft heat plan, street by street", de: "Der Vertrieb ordnet die Gaskunden Straße für Straße dem Entwurf des Wärmeplans zu" },
          owner: { en: "Sales", de: "Vertrieb" },
          changes: [
            { block: "value", action: "add", item: "", text: { en: "A switch plan for every gas customer", de: "Ein Umstiegsplan für jeden Gaskunden" } },
            { block: "revenue", action: "add", item: "", text: { en: "Heat contracts for customers who leave gas", de: "Wärmeverträge für Kunden, die das Gas verlassen" } }
          ] }
      ] },
      { issue: "I2", options: [
        { kind: "mitigate", recommended: true, effort: "M", time_to_impact: "6_to_12_months", impact: 2, likelihood: 2, eur_year_low: 500000, eur_year_high: 1500000,
          title: { en: "Stage grid investment with the heat plan and use public loans", de: "Netzinvestitionen mit dem Wärmeplan staffeln und Förderkredite nutzen" },
          first_step: { en: "Grid planning aligns its plan with the council's heat plan", de: "Die Netzplanung stimmt ihren Plan mit dem Wärmeplan der Stadt ab" },
          owner: { en: "Grid", de: "Netz" },
          changes: [
            { block: "activities", action: "add", item: "", text: { en: "Grid investment staged with the town's heat plan", de: "Netzinvestitionen gestaffelt nach dem Wärmeplan der Stadt" } },
            { block: "partners", action: "add", item: "", text: { en: "Public development bank for grid loans", de: "Förderbank für Netzkredite" } }
          ] }
      ] },
      { issue: "I3", options: [
        { kind: "mitigate", recommended: true, effort: "L", time_to_impact: "1_to_2_years", impact: 2, likelihood: 2, eur_year_low: 200000, eur_year_high: 800000,
          title: { en: "Replace billing with a system that handles dynamic tariffs", de: "Die Abrechnung durch ein System ersetzen, das dynamische Tarife kann" },
          first_step: { en: "IT tenders a billing system that takes hourly meter data", de: "Die IT schreibt ein Abrechnungssystem aus, das stündliche Messdaten verarbeitet" },
          owner: { en: "IT", de: "IT" },
          changes: [
            { block: "resources", action: "change", item: "resources-2", text: { en: "Billing system that handles dynamic tariffs", de: "Abrechnungssystem, das dynamische Tarife kann" } },
            { block: "costs", action: "add", item: "", text: { en: "Replacing the billing system", de: "Ablösung des Abrechnungssystems" } }
          ] },
        { kind: "advantage", recommended: false, effort: "M", time_to_impact: "6_to_12_months", impact: 0, likelihood: 3, eur_year_low: 500000, eur_year_high: 1500000,
          title: { en: "Launch a dynamic tariff with a smart meter as one offer", de: "Einen dynamischen Tarif mit intelligentem Messsystem als ein Angebot starten" },
          first_step: { en: "Sales and metering design one offer for homes with a heat pump or an electric car", de: "Vertrieb und Messstellenbetrieb gestalten ein Angebot für Haushalte mit Wärmepumpe oder E-Auto" },
          owner: { en: "Sales", de: "Vertrieb" },
          changes: [
            { block: "value", action: "add", item: "", text: { en: "Dynamic power tariff with a smart meter included", de: "Dynamischer Stromtarif mit intelligentem Messsystem inklusive" } }
          ] }
      ] },
      { issue: "I4", options: [
        { kind: "advantage", recommended: true, effort: "M", time_to_impact: "6_to_12_months", impact: 0, likelihood: 3, eur_year_low: 1000000, eur_year_high: 3000000,
          title: { en: "Partner with a solar and heat-pump firm and sell under the utility's name", de: "Mit einer Solar- und Wärmepumpenfirma kooperieren und unter eigenem Namen verkaufen" },
          first_step: { en: "Sales asks two installers for a partner offer under the utility's brand", de: "Der Vertrieb fragt zwei Anbieter nach einem Partnerangebot unter der Marke des Stadtwerks an" },
          owner: { en: "Sales", de: "Vertrieb" },
          changes: [
            { block: "partners", action: "add", item: "", text: { en: "Solar and heat-pump partner, sold under our name", de: "Solar- und Wärmepumpenpartner, verkauft unter unserem Namen" } },
            { block: "channels", action: "add", item: "", text: { en: "Advice visits at home with the partner", de: "Beratungsbesuche zu Hause mit dem Partner" } }
          ] },
        { kind: "mitigate", recommended: false, effort: "M", time_to_impact: "3_to_6_months", impact: 2, likelihood: 2, eur_year_low: 500000, eur_year_high: 1500000,
          title: { en: "Keep customers with bundles of power, heat and charging", de: "Kunden mit Paketen aus Strom, Wärme und Laden halten" },
          first_step: { en: "Product designs a bundle for homes with a heat pump or an electric car", de: "Das Produktteam entwirft ein Paket für Häuser mit Wärmepumpe oder E-Auto" },
          owner: { en: "Product", de: "Produktteam" },
          changes: [
            { block: "relationships", action: "add", item: "", text: { en: "Bundles of power, heat and charging", de: "Pakete aus Strom, Wärme und Laden" } }
          ] }
      ] },
      { issue: "I5", options: [
        { kind: "advantage", recommended: true, effort: "L", time_to_impact: "1_to_2_years", impact: 0, likelihood: 3, eur_year_low: 1000000, eur_year_high: 3000000,
          title: { en: "Sell heat as a service: a heat pump installed, run and billed by the utility", de: "Wärme als Service verkaufen: Wärmepumpe vom Stadtwerk installiert, betrieben, abgerechnet" },
          first_step: { en: "Product prices a monthly heat fee for a pilot street", de: "Das Produktteam kalkuliert eine monatliche Wärmegebühr für eine Pilotstraße" },
          owner: { en: "Product", de: "Produktteam" },
          changes: [
            { block: "value", action: "add", item: "", text: { en: "Heat as a service: a heat pump installed, run and billed by us", de: "Wärme als Service: eine Wärmepumpe, von uns installiert, betrieben und abgerechnet" } },
            { block: "revenue", action: "add", item: "", text: { en: "Monthly fee for heat as a service", de: "Monatliche Gebühr für Wärme als Service" } }
          ] }
      ] }
    ],
    summary: {
      headline: { en: "The heat plan and an old billing system put {{fact:at_stake}} a year at risk", de: "Wärmeplan und altes Abrechnungssystem setzen {{fact:at_stake}} im Jahr aufs Spiel" },
      situation: { en: "Auental Energie supplies power, gas, heat and water to a town that must present its heat plan by the end of 2026. Five issues put {{fact:pressure.before}} blocks under pressure.", de: "Auental Energie liefert Strom, Gas, Wärme und Wasser in eine Stadt, die bis Ende 2026 ihren Wärmeplan vorlegen muss. Fünf Schwachstellen setzen {{fact:pressure.before}} Bausteinen unter Druck." },
      findings: [
        { en: "Gas customers will drift away as the heat plan lands, worth {{fact:issue.I1.expected}} a year.", de: "Gaskunden werden abwandern, sobald der Wärmeplan steht; das sind {{fact:issue.I1.expected}} im Jahr." },
        { en: "The grid must grow before the new fee system pays for it.", de: "Das Netz muss wachsen, bevor das neue Entgeltsystem dafür zahlt." },
        { en: "Local trust is the utility's best asset, yet it sells no heat service.", de: "Das lokale Vertrauen ist das beste Kapital des Stadtwerks, doch es verkauft keinen Wärmeservice." }
      ],
      recommendation: { en: "Offer every gas customer a planned switch, replace the billing system and sell heat as a service with a partner. With the responses chosen, what is left a year comes to {{fact:left}}.", de: "Jedem Gaskunden einen geplanten Umstieg anbieten, das Abrechnungssystem ersetzen und mit einem Partner Wärme als Service verkaufen. Mit den gewählten Antworten bleiben im Jahr {{fact:left}}." },
      assumptions: [
        { en: "The council's heat plan names the streets for heat networks before the end of 2026.", de: "Der Wärmeplan der Stadt nennt die Straßen für Wärmenetze vor Ende 2026." },
        { en: "Gas customers prefer a plan from their own utility to an offer from a stranger.", de: "Gaskunden ziehen einen Plan ihres eigenen Stadtwerks dem Angebot eines Fremden vor." },
        { en: "A heat-pump partner accepts selling under the utility's name.", de: "Ein Partner für Wärmepumpen akzeptiert den Verkauf unter dem Namen des Stadtwerks." }
      ]
    }
  },
  // The recorded run kept every AI item and took the recommendation on every issue.
  choices: {
    removed: [],
    decisions: [
      { issue: "I1", choice: "mitigate", option: 0 },
      { issue: "I2", choice: "mitigate", option: 0 },
      { issue: "I3", choice: "mitigate", option: 0 },
      { issue: "I4", choice: "advantage", option: 0 },
      { issue: "I5", choice: "advantage", option: 0 }
    ]
  }
};
