// S1 Tidewell Lines: a recorded run of the five agents, authored by hand from the facts in
// DATA_SOURCES.md (S1.1 to S1.6), read on 23 November 2026. The company and its own figures are
// fictional; the rules, routes and markets it meets are real and cited with their sources.
// Every text a person reads is a pair { en, de }; ids, numbers and blocks stand once. js/run.js
// localise() picks a language; the engine computes every figure at playback.
// tools/check-scenarios.mjs checks this file against the schemas, the guardrails and the fact audit.

const ETS = "https://climate.ec.europa.eu/eu-action/transport-decarbonisation/reducing-emissions-shipping-sector/faq-maritime-transport-eu-emissions-trading-system-ets_en";
const FUELEU = "https://transport.ec.europa.eu/transport-modes/maritime/decarbonising-maritime-transport-fueleu-maritime_en";
const SUEZ = "https://www.seatrade-maritime.com/containers/full-suez-return-for-container-carriers-expected-by-q1-2027";
const WCI = "https://www.drewry.co.uk/WCI";
const FORWARDERS = "https://gofreight.com/blog/general/digital-freight-forwarder.html";
const COUNT = "https://www.iru.org/node/18453";

export default {
  id: "s1",
  source: "authored",
  as_of: "2026-11-23",
  facts: ["S1.1", "S1.2", "S1.3", "S1.4", "S1.5", "S1.6"],
  company: {
    name: "Tidewell Lines",
    sector: "transport_logistics",
    country: "DE",
    fictional: true,
    description: {
      en: "Container carrier based in Bremen with Europe–Asia, transatlantic and feeder services",
      de: "Containerreederei aus Bremen mit Diensten Europa–Asien, über den Atlantik und im Feederverkehr"
    },
    size: {
      en: "About 40 ships, 1,900 staff and €1.8bn revenue a year",
      de: "Rund 40 Schiffe, 1.900 Beschäftigte und 1,8 Mrd. € Umsatz im Jahr"
    }
  },
  // What "the team" entered: five of nine blocks, without costs, channels, relationships and partners.
  entered: {
    activities: [
      { en: "Running the fleet to schedule", de: "Die Flotte nach Fahrplan betreiben" },
      { en: "Managing containers and moving empties", de: "Container steuern und Leercontainer zurückführen" }
    ],
    resources: [
      { en: "About 40 ships, owned and chartered", de: "Rund 40 Schiffe, eigene und gecharterte" },
      { en: "Container pool and terminal slots", de: "Containerpool und Terminal-Slots" }
    ],
    value: [
      { en: "Weekly Europe–Asia loops with fixed call days", de: "Wöchentliche Rundläufe Europa–Asien mit festen Anlauftagen" },
      { en: "Transatlantic service to the US East Coast", de: "Transatlantikdienst zur US-Ostküste" },
      { en: "Feeder links between North Sea hubs and the Baltic", de: "Feederverbindungen zwischen Nordsee-Hubs und Ostsee" }
    ],
    segments: [
      { en: "Large shippers with annual contracts", de: "Große Verlader mit Jahresverträgen" },
      { en: "Freight forwarders booking for smaller shippers", de: "Spediteure, die für kleinere Verlader buchen" }
    ],
    revenue: [
      { en: "Freight rates fixed for a year in contracts", de: "Für ein Jahr vertraglich feste Frachtraten" },
      { en: "Spot bookings at market rates", de: "Spotbuchungen zu Marktraten" }
    ]
  },
  answers: {
    completion: {
      sector: "transport_logistics",
      items: [
        { block: "partners", confidence: "high",
          text: { en: "Terminal operators at the main hub ports", de: "Terminalbetreiber in den wichtigsten Hub-Häfen" },
          basis: { en: "A line on these trades depends on berths and slots at its hub ports", de: "Eine Linie auf diesen Routen hängt an Liegeplätzen und Slots in ihren Hub-Häfen" } },
        { block: "partners", confidence: "high",
          text: { en: "Ship owners who charter vessels to the line", de: "Reeder, die Schiffe an die Linie verchartern" },
          basis: { en: "The team entered chartered ships among its resources", de: "Das Team nennt gecharterte Schiffe bei den Ressourcen" } },
        { block: "partners", confidence: "medium",
          text: { en: "Bunker suppliers for fuel and new fuels", de: "Bunkerlieferanten für Treibstoff und neue Kraftstoffe" },
          basis: { en: "Every voyage needs fuel, and EU rules push toward cleaner fuels", de: "Jede Reise braucht Treibstoff, und EU-Regeln drängen zu saubereren Kraftstoffen" } },
        { block: "channels", confidence: "medium",
          text: { en: "Sales offices in the main port cities", de: "Vertriebsbüros in den großen Hafenstädten" },
          basis: { en: "Carriers of this size usually sell contracts through their own offices", de: "Reedereien dieser Größe verkaufen Verträge meist über eigene Büros" } },
        { block: "channels", confidence: "medium",
          text: { en: "Online booking and tracking portal", de: "Online-Portal für Buchung und Sendungsverfolgung" },
          basis: { en: "Spot bookings at market rates are usually made online", de: "Spotbuchungen zu Marktraten laufen meist online" } },
        { block: "relationships", confidence: "high",
          text: { en: "Account managers for contract shippers", de: "Feste Ansprechpartner für Vertragsverlader" },
          basis: { en: "Annual contracts with large shippers need a named contact", de: "Jahresverträge mit großen Verladern brauchen eine feste Ansprechperson" } },
        { block: "relationships", confidence: "medium",
          text: { en: "Self-service for spot customers", de: "Self-Service für Spotkunden" },
          basis: { en: "Spot bookings carry too little margin for personal service", de: "Spotbuchungen tragen zu wenig Marge für persönliche Betreuung" } },
        { block: "costs", confidence: "high",
          text: { en: "Fuel bought at market prices", de: "Treibstoff zu Marktpreisen" },
          basis: { en: "Fuel is a carrier's largest variable cost", de: "Treibstoff ist der größte variable Kostenblock einer Reederei" } },
        { block: "costs", confidence: "high",
          text: { en: "Charter hire and port fees", de: "Chartermieten und Hafengebühren" },
          basis: { en: "The fleet includes chartered ships, and every call pays port fees", de: "Die Flotte enthält gecharterte Schiffe, und jeder Anlauf kostet Hafengebühren" } },
        { block: "costs", confidence: "high",
          text: { en: "Emission allowances for voyages to and from EU ports", de: "Emissionszertifikate für Reisen von und zu EU-Häfen" },
          basis: { en: "Shipping has been in the EU emissions trading system since 2024", de: "Die Schifffahrt ist seit 2024 im EU-Emissionshandel" } }
      ]
    },
    // What the Scout found with web research on: titles and dates as the sources publish them.
    signals: [
      { url: ETS, title: "FAQ – Maritime transport in EU Emissions Trading System (ETS)", published: "2025-11-24", areas: ["costs", "revenue"],
        summary: { en: "Ships calling at EU ports surrender allowances for their emissions, phased in until the full amount is due for 2026 emissions. Voyages between EU ports count in full, voyages into or out of the EU in part.", de: "Schiffe, die EU-Häfen anlaufen, geben Zertifikate für ihre Emissionen ab, stufenweise bis zur vollen Menge für die Emissionen von 2026. Reisen zwischen EU-Häfen zählen voll, Reisen in die EU oder aus ihr anteilig." } },
      { url: FUELEU, title: "Decarbonising maritime transport – FuelEU Maritime", published: "", areas: ["costs", "resources", "partners"],
        summary: { en: "Since 2025 large ships calling at EU ports must cut the greenhouse-gas intensity of the energy they use, step by step until 2050. From 2030 container ships at berth must use shore power in the ports the rules cover.", de: "Seit 2025 müssen große Schiffe, die EU-Häfen anlaufen, die Treibhausgasintensität ihrer Energie senken, Schritt für Schritt bis 2050. Ab 2030 müssen Containerschiffe am Liegeplatz in den erfassten Häfen Landstrom nutzen." } },
      { url: SUEZ, title: "Full Suez return for container carriers expected by Q1 2027", published: "2026-10-14", areas: ["value", "activities", "costs"],
        summary: { en: "Carriers are moving their Asia–Europe loops back through the Red Sea and the Suez Canal after the war on Iran halted the return. A full return is expected by early 2027.", de: "Die Reedereien verlegen ihre Asien-Europa-Dienste wieder durch Rotes Meer und Suezkanal, nachdem der Krieg gegen Iran die Rückkehr gestoppt hatte. Die volle Rückkehr wird bis Anfang 2027 erwartet." } },
      { url: WCI, title: "World Container Index - 19 Nov", published: "2026-11-19", areas: ["revenue", "segments"],
        summary: { en: "Drewry's index of container spot rates fell for a fourth week in November yet stays far above its level a year earlier. Drewry tells shippers to expect rates to keep swinging.", de: "Drewrys Index der Container-Spotraten fiel im November die vierte Woche in Folge und liegt doch weit über dem Vorjahr. Drewry rät Verladern, mit weiter schwankenden Raten zu rechnen." } },
      { url: FORWARDERS, title: "Digital Freight Forwarder 2026: What It Means, Who Leads, and What Customers Expect", published: "2026-01-08", areas: ["channels", "relationships", "segments"],
        summary: { en: "Digital forwarders such as Flexport, Forto and Zencargo quote, book and track shipments on their own platforms and own the shipper's relationship from end to end.", de: "Digitale Spediteure wie Flexport, Forto und Zencargo erstellen Angebote, buchen und verfolgen Sendungen auf eigenen Plattformen und halten die Beziehung zum Verlader von Anfang bis Ende." } },
      { url: COUNT, title: "EU adopts clear and proportionate rules for transport emissions accounting", published: "2026-04-28", areas: ["value", "relationships"],
        summary: { en: "The EU adopted CountEmissionsEU, which makes one method the common way to count the emissions of a transport service. Shippers can now ask carriers for figures they can compare.", de: "Die EU hat CountEmissionsEU beschlossen: Eine Methode wird zum gemeinsamen Weg, die Emissionen einer Transportleistung zu zählen. Verlader können von Reedereien nun vergleichbare Werte verlangen." } }
    ],
    issues: [
      { id: "I1", type: "regulation", blocks: ["costs", "revenue"], items: ["costs-3", "revenue-1"], impact: 4, likelihood: 4, horizon: "now", evidence: [ETS], confidence: "high",
        title: { en: "Emission allowances raise the cost of every European call", de: "Emissionszertifikate verteuern jeden Anlauf in Europa" },
        description: { en: "Voyages to and from EU ports need allowances for their emissions, in full from 2026 emissions on. Rates fixed for a year carry none of that cost.", de: "Reisen von und zu EU-Häfen brauchen Zertifikate für ihre Emissionen, ab den Emissionen von 2026 in voller Höhe. Für ein Jahr feste Raten tragen nichts von diesen Kosten." },
        contradicts: { en: "Freight rates fixed for a year in contracts (Revenue streams)", de: "Für ein Jahr vertraglich feste Frachtraten (Einnahmequellen)" } },
      { id: "I2", type: "operations", blocks: ["value", "activities"], items: ["value-1", "activities-1"], impact: 3, likelihood: 4, horizon: "now", evidence: [SUEZ], confidence: "medium",
        title: { en: "Routes that swing between Suez and the Cape break the fixed call days", de: "Routen zwischen Suez und Kap brechen die festen Anlauftage" },
        description: { en: "The Asia–Europe loops have switched between the Suez Canal and the Cape of Good Hope as the Red Sea closed and reopened. Each switch moves arrival days by a week or more.", de: "Die Asien-Europa-Dienste wechselten zwischen Suezkanal und Kap der Guten Hoffnung, als das Rote Meer schloss und wieder öffnete. Jeder Wechsel verschiebt die Ankunftstage um eine Woche oder mehr." },
        contradicts: { en: "Weekly Europe–Asia loops with fixed call days (Value propositions)", de: "Wöchentliche Rundläufe Europa–Asien mit festen Anlauftagen (Wertangebote)" } },
      { id: "I3", type: "economy", blocks: ["revenue", "segments"], items: ["revenue-1", "segments-1"], impact: 4, likelihood: 3, horizon: "now", evidence: [WCI], confidence: "medium",
        title: { en: "Freight rates swing while contract rates stay fixed for a year", de: "Frachtraten schwanken, Vertragsraten bleiben ein Jahr fest" },
        description: { en: "Spot rates have swung widely all year. Contracts fixed for a year leave the line exposed when costs rise or spot rates move away from contract levels.", de: "Die Spotraten schwankten das ganze Jahr stark. Für ein Jahr feste Verträge lassen die Linie ungeschützt, wenn Kosten steigen oder Spotraten sich vom Vertragsniveau entfernen." },
        contradicts: { en: "Large shippers with annual contracts (Customer segments)", de: "Große Verlader mit Jahresverträgen (Kundensegmente)" } },
      { id: "I4", type: "competition", blocks: ["channels", "segments"], items: ["channels-1", "segments-2"], impact: 3, likelihood: 3, horizon: "1_to_3_years", evidence: [FORWARDERS], confidence: "medium",
        title: { en: "Digital forwarders take over the smaller shippers' bookings", de: "Digitale Spediteure übernehmen die Buchungen kleinerer Verlader" },
        description: { en: "Digital forwarders quote, book and track on one platform and own the shipper. The line reaches smaller shippers only through forwarders and offices, so it competes on price alone.", de: "Digitale Spediteure bieten Angebot, Buchung und Verfolgung auf einer Plattform und halten den Verlader. Die Linie erreicht kleinere Verlader nur über Spediteure und Büros und konkurriert so allein über den Preis." },
        contradicts: { en: "Freight forwarders booking for smaller shippers (Customer segments)", de: "Spediteure, die für kleinere Verlader buchen (Kundensegmente)" } },
      { id: "I5", type: "sustainability", blocks: ["value", "relationships"], items: ["relationships-1"], impact: 2, likelihood: 2, horizon: "1_to_3_years", evidence: [COUNT], confidence: "medium",
        title: { en: "Shippers ask for emissions figures per container the line can't supply yet", de: "Verlader wollen Emissionswerte je Container, die die Linie noch nicht liefert" },
        description: { en: "With a common EU method to count transport emissions, shippers can compare carriers. The canvas offers no emissions figures, so the line risks losing tenders that ask for them.", de: "Mit einer gemeinsamen EU-Methode für Transportemissionen können Verlader Reedereien vergleichen. Das Canvas bietet keine Emissionswerte, also riskiert die Linie Ausschreibungen, die sie verlangen." },
        contradicts: { en: "The value propositions offer no emissions figures", de: "Die Wertangebote enthalten keine Emissionswerte" } },
      { id: "I6", type: "regulation", blocks: ["costs", "resources", "partners"], items: ["costs-1", "resources-1", "partners-3"], impact: 2, likelihood: 2, horizon: "over_3_years", evidence: [FUELEU], confidence: "medium",
        title: { en: "FuelEU tightens the fuel mix while fuel is bought at market prices", de: "FuelEU verschärft den Kraftstoffmix, doch gekauft wird zu Marktpreisen" },
        description: { en: "FuelEU Maritime lowers the allowed greenhouse-gas intensity step by step and asks for shore power at berth from 2030. Fleet and partners aren't set up for cleaner fuels or shore power yet.", de: "FuelEU Maritime senkt die erlaubte Treibhausgasintensität Schritt für Schritt und verlangt ab 2030 Landstrom am Liegeplatz. Flotte und Partner sind noch nicht auf sauberere Kraftstoffe oder Landstrom eingestellt." },
        contradicts: { en: "Fuel bought at market prices (Cost structure)", de: "Treibstoff zu Marktpreisen (Kostenstruktur)" } }
    ],
    impacts: {
      baselines: [
        { value: 1100000, unit: "TEU",
          name: { en: "Containers moved a year", de: "Bewegte Container im Jahr" },
          basis: { en: "The fleet the team entered, on its three kinds of service", de: "Die vom Team genannte Flotte auf ihren drei Diensten" } },
        { value: 60, unit: "%",
          name: { en: "Share of containers on voyages to or from EU ports", de: "Anteil der Container auf Reisen von oder zu EU-Häfen" },
          basis: { en: "Most loops start or end in North Sea and Baltic ports", de: "Die meisten Dienste beginnen oder enden in Nordsee- und Ostseehäfen" } },
        { value: 70, unit: "%",
          name: { en: "Share of volume under annual contracts", de: "Anteil des Volumens in Jahresverträgen" },
          basis: { en: "Large shippers with annual contracts carry most of the volume", de: "Große Verlader mit Jahresverträgen tragen den Großteil des Volumens" } }
      ],
      impacts: [
        { issue: "I1", monetisable: true, eur_year_low: 12000000, eur_year_high: 24000000, confidence: "medium", reason: "",
          kpis: [
            { id: "transport_logistics.ets_cost_per_teu", direction: "up", change_low: 15, change_high: 30,
              basis: { en: "Allowances for EU voyages spread over the containers on them", de: "Zertifikate für EU-Reisen, umgelegt auf die Container darauf" } },
            { id: "general.ebit_margin", direction: "down", change_low: 0.7, change_high: 1.3,
              basis: { en: "The cost the fixed rates don't recover, against revenue", de: "Die Kosten, die feste Raten nicht decken, gegen den Umsatz" } }
          ],
          eur_basis: { en: "Containers on EU voyages times the allowance cost per container the rates don't recover", de: "Container auf EU-Reisen mal die Zertifikatskosten je Container, die die Raten nicht decken" } },
        { issue: "I2", monetisable: true, eur_year_low: 6000000, eur_year_high: 14000000, confidence: "medium", reason: "",
          kpis: [
            { id: "transport_logistics.schedule_reliability", direction: "down", change_low: 10, change_high: 25,
              basis: { en: "Arrival days move by a week or more when a loop switches route", de: "Ankunftstage verschieben sich um eine Woche oder mehr, wenn ein Dienst die Route wechselt" } },
            { id: "transport_logistics.fuel_cost_per_teu", direction: "up", change_low: 20, change_high: 45,
              basis: { en: "The Cape route is longer and burns more fuel", de: "Die Route ums Kap ist länger und verbraucht mehr Treibstoff" } }
          ],
          eur_basis: { en: "Extra fuel and charter days on Cape voyages, and penalties for missed call days", de: "Zusätzlicher Treibstoff und Chartertage auf Kap-Reisen sowie Strafen für verpasste Anlauftage" } },
        { issue: "I3", monetisable: true, eur_year_low: 10000000, eur_year_high: 25000000, confidence: "low", reason: "",
          kpis: [
            { id: "transport_logistics.average_freight_rate", direction: "down", change_low: 50, change_high: 150,
              basis: { en: "The gap between contract rates and costs when the market moves", de: "Die Lücke zwischen Vertragsraten und Kosten, wenn der Markt sich bewegt" } }
          ],
          eur_basis: { en: "Contract volume times the gap between fixed rates and the market in a swing", de: "Vertragsvolumen mal die Lücke zwischen festen Raten und dem Markt in einer Schwankung" } },
        { issue: "I4", monetisable: true, eur_year_low: 3000000, eur_year_high: 8000000, confidence: "low", reason: "",
          kpis: [
            { id: "transport_logistics.online_booking_share", direction: "down", change_low: 5, change_high: 15,
              basis: { en: "Smaller shippers book through digital forwarders instead", de: "Kleinere Verlader buchen stattdessen über digitale Spediteure" } },
            { id: "general.gross_margin", direction: "down", change_low: 0.2, change_high: 0.5,
              basis: { en: "Forwarders buy the space at lower rates", de: "Spediteure kaufen den Platz zu niedrigeren Raten" } }
          ],
          eur_basis: { en: "Margin on the smaller shippers' volume that moves to forwarders' contracts", de: "Marge auf dem Volumen kleinerer Verlader, das in Verträge der Spediteure wandert" } },
        { issue: "I5", monetisable: true, eur_year_low: 1000000, eur_year_high: 3000000, confidence: "low", reason: "",
          kpis: [
            { id: "general.customer_churn", direction: "up", change_low: 1, change_high: 3,
              basis: { en: "Shippers that need emissions figures move volume at the next tender", de: "Verlader, die Emissionswerte brauchen, verlagern Volumen bei der nächsten Ausschreibung" } }
          ],
          eur_basis: { en: "Contract volume of shippers that report transport emissions, at the line's margin", de: "Vertragsvolumen der Verlader, die Transportemissionen berichten, zur Marge der Linie" } },
        { issue: "I6", monetisable: true, eur_year_low: 2000000, eur_year_high: 6000000, confidence: "low", reason: "",
          kpis: [
            { id: "transport_logistics.fuel_cost_per_teu", direction: "up", change_low: 5, change_high: 15,
              basis: { en: "Cleaner fuels cost more than the fuel bought today", de: "Sauberere Kraftstoffe kosten mehr als der heute gekaufte Treibstoff" } }
          ],
          eur_basis: { en: "Extra fuel cost or penalties once the intensity limits tighten", de: "Mehrkosten für Kraftstoff oder Strafzahlungen, sobald die Grenzwerte sinken" } }
      ]
    },
    responses: [
      { issue: "I1", options: [
        { kind: "mitigate", recommended: true, effort: "M", time_to_impact: "3_to_6_months", impact: 2, likelihood: 2, eur_year_low: 2000000, eur_year_high: 6000000,
          title: { en: "Pass the full allowance cost on through a published surcharge", de: "Die vollen Zertifikatskosten über einen veröffentlichten Zuschlag weitergeben" },
          first_step: { en: "Pricing sets a surcharge formula for the next quarter and tells contract shippers", de: "Das Pricing legt eine Zuschlagsformel für das nächste Quartal fest und informiert die Vertragsverlader" },
          owner: { en: "Commercial", de: "Vertrieb" },
          changes: [
            { block: "revenue", action: "add", item: "", text: { en: "Emissions surcharge per container, published monthly", de: "Emissionszuschlag je Container, monatlich veröffentlicht" } }
          ] },
        { kind: "mitigate", recommended: false, effort: "L", time_to_impact: "6_to_12_months", impact: 3, likelihood: 3, eur_year_low: 6000000, eur_year_high: 14000000,
          title: { en: "Move EU volume onto the ships with the lowest emissions", de: "EU-Volumen auf die Schiffe mit den niedrigsten Emissionen verlegen" },
          first_step: { en: "Fleet planning ranks the ships by emissions per container on each EU loop", de: "Die Flottenplanung ordnet die Schiffe nach Emissionen je Container auf jedem EU-Dienst" },
          owner: { en: "Fleet planning", de: "Flottenplanung" },
          changes: [
            { block: "activities", action: "add", item: "", text: { en: "Deploying the lowest-emission ships on EU loops", de: "Schiffe mit den niedrigsten Emissionen auf EU-Diensten einsetzen" } }
          ] }
      ] },
      { issue: "I2", options: [
        { kind: "mitigate", recommended: true, effort: "M", time_to_impact: "under_3_months", impact: 2, likelihood: 2, eur_year_low: 2000000, eur_year_high: 6000000,
          title: { en: "Publish a Suez and a Cape schedule and switch with notice", de: "Einen Suez- und einen Kap-Fahrplan veröffentlichen und mit Vorlauf wechseln" },
          first_step: { en: "Network planning drafts both schedules for the Asia–Europe loops", de: "Die Netzplanung entwirft beide Fahrpläne für die Asien-Europa-Dienste" },
          owner: { en: "Network planning", de: "Netzplanung" },
          changes: [
            { block: "value", action: "change", item: "value-1", text: { en: "Weekly Europe–Asia loops with a Suez and a Cape schedule", de: "Wöchentliche Rundläufe Europa–Asien mit Suez- und Kap-Fahrplan" } },
            { block: "activities", action: "add", item: "", text: { en: "Planning routes that can switch between Suez and the Cape", de: "Routen planen, die zwischen Suez und Kap wechseln können" } }
          ] }
      ] },
      { issue: "I3", options: [
        { kind: "mitigate", recommended: true, effort: "M", time_to_impact: "6_to_12_months", impact: 2, likelihood: 2, eur_year_low: 3000000, eur_year_high: 8000000,
          title: { en: "Index contract rates to a published freight index", de: "Vertragsraten an einen veröffentlichten Frachtindex koppeln" },
          first_step: { en: "Sales offers index clauses in the next round of contract talks", de: "Der Vertrieb bietet in der nächsten Vertragsrunde Indexklauseln an" },
          owner: { en: "Commercial", de: "Vertrieb" },
          changes: [
            { block: "revenue", action: "change", item: "revenue-1", text: { en: "Contract rates indexed to a published freight index", de: "An einen veröffentlichten Frachtindex gekoppelte Vertragsraten" } }
          ] }
      ] },
      { issue: "I4", options: [
        { kind: "mitigate", recommended: false, effort: "M", time_to_impact: "6_to_12_months", impact: 2, likelihood: 3, eur_year_low: 1500000, eur_year_high: 4000000,
          title: { en: "Open booking to digital forwarders through an interface", de: "Die Buchung über eine Schnittstelle für digitale Spediteure öffnen" },
          first_step: { en: "IT publishes a booking interface and signs two forwarders as pilots", de: "Die IT veröffentlicht eine Buchungsschnittstelle und gewinnt zwei Spediteure als Piloten" },
          owner: { en: "Digital", de: "Digitalteam" },
          changes: [
            { block: "channels", action: "add", item: "", text: { en: "Booking interface for digital forwarders", de: "Buchungsschnittstelle für digitale Spediteure" } }
          ] },
        { kind: "advantage", recommended: true, effort: "L", time_to_impact: "6_to_12_months", impact: 0, likelihood: 3, eur_year_low: 2000000, eur_year_high: 5000000,
          title: { en: "Win smaller shippers with instant quotes and booking online", de: "Kleinere Verlader mit Sofortangeboten und Online-Buchung gewinnen" },
          first_step: { en: "Digital adds instant quotes to the booking portal for the Baltic feeder links", de: "Das Digitalteam ergänzt das Buchungsportal um Sofortangebote für die Ostsee-Feeder" },
          owner: { en: "Digital", de: "Digitalteam" },
          changes: [
            { block: "channels", action: "change", item: "channels-2", text: { en: "Online booking with instant quotes and tracking", de: "Online-Buchung mit Sofortangebot und Sendungsverfolgung" } },
            { block: "segments", action: "add", item: "", text: { en: "Smaller shippers booking direct online", de: "Kleinere Verlader, die direkt online buchen" } }
          ] }
      ] },
      { issue: "I5", options: [
        { kind: "advantage", recommended: true, effort: "M", time_to_impact: "3_to_6_months", impact: 0, likelihood: 4, eur_year_low: 1000000, eur_year_high: 3000000,
          title: { en: "Sell an emissions statement per container to shippers", de: "Verladern eine Emissionsbescheinigung je Container verkaufen" },
          first_step: { en: "Sustainability builds the statement on the EU's common method for one loop", de: "Das Nachhaltigkeitsteam baut die Bescheinigung nach der gemeinsamen EU-Methode für einen Dienst auf" },
          owner: { en: "Sustainability", de: "Nachhaltigkeit" },
          changes: [
            { block: "value", action: "add", item: "", text: { en: "Emissions statement per container for shippers' reports", de: "Emissionsbescheinigung je Container für die Berichte der Verlader" } },
            { block: "revenue", action: "add", item: "", text: { en: "Fee for emissions statements", de: "Gebühr für Emissionsbescheinigungen" } }
          ] }
      ] },
      { issue: "I6", options: [
        { kind: "mitigate", recommended: true, effort: "L", time_to_impact: "1_to_2_years", impact: 1, likelihood: 2, eur_year_low: 500000, eur_year_high: 2000000,
          title: { en: "Pool FuelEU compliance and plan shore power for the fleet", de: "Die FuelEU-Erfüllung poolen und Landstrom für die Flotte planen" },
          first_step: { en: "Technical names the ships to fit with shore-power connections", de: "Die Technik bestimmt die Schiffe, die Landstromanschlüsse bekommen" },
          owner: { en: "Technical", de: "Technik" },
          changes: [
            { block: "partners", action: "add", item: "", text: { en: "Pooling partners for FuelEU compliance", de: "Pool-Partner für die FuelEU-Erfüllung" } },
            { block: "resources", action: "add", item: "", text: { en: "Shore-power connections on the ships for EU ports", de: "Landstromanschlüsse auf den Schiffen für EU-Häfen" } }
          ] }
      ] }
    ],
    summary: {
      headline: { en: "Emission costs and swinging routes put {{fact:at_stake}} a year at risk", de: "Emissionskosten und wechselnde Routen setzen {{fact:at_stake}} im Jahr aufs Spiel" },
      situation: { en: "Tidewell Lines sells fixed call days and rates fixed for a year, while its costs and routes move with the market and EU rules. Six issues put {{fact:pressure.before}} blocks under pressure.", de: "Tidewell Lines verkauft feste Anlauftage und für ein Jahr feste Raten, während Kosten und Routen mit dem Markt und den EU-Regeln schwanken. Sechs Schwachstellen setzen {{fact:pressure.before}} Bausteinen unter Druck." },
      findings: [
        { en: "Emission allowances are the largest single exposure at {{fact:issue.I1.expected}} a year, because contract rates carry none of the cost.", de: "Emissionszertifikate sind mit {{fact:issue.I1.expected}} im Jahr das größte Einzelrisiko, weil die Vertragsraten keine dieser Kosten tragen." },
        { en: "Rates and routes swing together: fixed contracts and fixed call days turn each swing into a loss.", de: "Raten und Routen schwanken gemeinsam: Feste Verträge und feste Anlauftage machen aus jeder Schwankung einen Verlust." },
        { en: "Shippers now count transport emissions the same way, which makes an emissions statement per container something the line can sell.", de: "Verlader zählen Transportemissionen jetzt einheitlich; damit wird eine Emissionsbescheinigung je Container zu etwas, das die Linie verkaufen kann." }
      ],
      recommendation: { en: "Pass allowance costs on through a published surcharge, index contract rates and plan both routes. With the responses chosen, what is left a year comes to {{fact:left}}.", de: "Zertifikatskosten über einen veröffentlichten Zuschlag weitergeben, Vertragsraten an einen Index koppeln und beide Routen planen. Mit den gewählten Antworten bleiben im Jahr {{fact:left}}." },
      assumptions: [
        { en: "Most loops start or end in EU ports, so most containers carry allowance costs.", de: "Die meisten Dienste beginnen oder enden in EU-Häfen, also tragen die meisten Container Zertifikatskosten." },
        { en: "Large shippers accept index clauses at the next contract round.", de: "Große Verlader akzeptieren Indexklauseln in der nächsten Vertragsrunde." },
        { en: "Shippers will pay for emissions figures they can use in their own reports.", de: "Verlader zahlen für Emissionswerte, die sie in ihren eigenen Berichten verwenden können." }
      ]
    }
  },
  // The recorded run took the agents' recommendation on every issue and kept every AI item.
  choices: {
    removed: [],
    decisions: [
      { issue: "I1", choice: "mitigate", option: 0 },
      { issue: "I2", choice: "mitigate", option: 0 },
      { issue: "I3", choice: "mitigate", option: 0 },
      { issue: "I4", choice: "advantage", option: 1 },
      { issue: "I5", choice: "advantage", option: 0 },
      { issue: "I6", choice: "mitigate", option: 0 }
    ]
  }
};
