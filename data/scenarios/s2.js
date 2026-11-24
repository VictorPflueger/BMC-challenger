// S2 Arvento Drives: a recorded run of the five agents, authored by hand from the facts in
// DATA_SOURCES.md (S2.1 to S2.6), read on 23 November 2026. The company and its own figures are
// fictional; the rules, prices and markets it meets are real and cited with their sources.
// Every text a person reads is a pair { en, de }; ids, numbers and blocks stand once. js/run.js
// localise() picks a language; the engine computes every figure at playback.
// tools/check-scenarios.mjs checks this file against the schemas, the guardrails and the fact audit.

const DATA_ACT = "https://www.dihk.de/en/service-portal/for-business-owners-and-entrepreneurs/data-act-next-level-as-of-12-september-2026-174716";
const CRA = "https://digital-strategy.ec.europa.eu/en/policies/cra-reporting";
const MACHINERY = "https://www.baua.de/EN/Topics/Work-design/Machine-and-operational-safety/Machinery/Machinery-Directive-Revision";
const POWER = "https://www.bdew.de/media/documents/BDEW_Strompreisanalyse_042026.pdf";
const SKILLS = "https://statistik.arbeitsagentur.de/DE/Statischer-Content/Statistiken/Themen-im-Fokus/Fachkraeftebedarf/Fachkraefteengpassanalyse/Fachkraefteengpassanalyse.html";
const TARIFFS = "https://www.gtai.de/de/trade/usa/branchen/deutsche-maschinenbauer-bleiben-in-den-usa-auf-rekordkurs-1029242";

export default {
  id: "s2",
  source: "authored",
  as_of: "2026-11-23",
  facts: ["S2.1", "S2.2", "S2.3", "S2.4", "S2.5", "S2.6"],
  company: {
    name: "Arvento Drives",
    sector: "industrial_manufacturing",
    country: "DE",
    fictional: true,
    description: {
      en: "Family-owned maker of industrial drives and gearboxes in Baden-Württemberg, launching drives as a service",
      de: "Familiengeführter Hersteller von Industrieantrieben und Getrieben in Baden-Württemberg, der Antriebe als Service einführt"
    },
    size: {
      en: "About 1,400 staff, €320m revenue a year and 60,000 drives in the field",
      de: "Rund 1.400 Beschäftigte, 320 Mio. € Umsatz im Jahr und 60.000 Antriebe im Feld"
    }
  },
  // What "the team" entered: all nine blocks, thin on revenue and resources.
  entered: {
    partners: [
      { en: "Steel and casting suppliers in southern Germany", de: "Stahl- und Gusslieferanten in Süddeutschland" },
      { en: "Machine builders who fit our drives", de: "Maschinenbauer, die unsere Antriebe einbauen" }
    ],
    activities: [
      { en: "Designing and building drives and gearboxes", de: "Antriebe und Getriebe entwickeln und bauen" },
      { en: "Service and repairs at customer sites", de: "Service und Reparaturen beim Kunden" }
    ],
    resources: [
      { en: "Plant and test benches in Baden-Württemberg", de: "Werk und Prüfstände in Baden-Württemberg" }
    ],
    value: [
      { en: "Drives that run for decades with little service", de: "Antriebe, die jahrzehntelang mit wenig Service laufen" },
      { en: "Drives as a service, paid per operating hour", de: "Antriebe als Service, bezahlt je Betriebsstunde" }
    ],
    relationships: [
      { en: "Long relations with machine builders", de: "Langjährige Beziehungen zu Maschinenbauern" },
      { en: "Service contracts for large plants", de: "Serviceverträge für große Anlagen" }
    ],
    channels: [
      { en: "Direct sales to machine builders", de: "Direktvertrieb an Maschinenbauer" },
      { en: "Service technicians at the customer", de: "Servicetechniker beim Kunden" }
    ],
    segments: [
      { en: "Machine builders in Europe", de: "Maschinenbauer in Europa" },
      { en: "Operators of process plants", de: "Betreiber von Prozessanlagen" }
    ],
    costs: [
      { en: "Steel, castings and electronics", de: "Stahl, Guss und Elektronik" },
      { en: "Skilled staff in production and service", de: "Fachkräfte in Produktion und Service" }
    ],
    revenue: [
      { en: "Sale of drives and gearboxes", de: "Verkauf von Antrieben und Getrieben" }
    ]
  },
  answers: {
    completion: {
      sector: "industrial_manufacturing",
      items: [
        { block: "resources", confidence: "high",
          text: { en: "Installed base of connected drives that send operating data", de: "Installierte Basis vernetzter Antriebe, die Betriebsdaten senden" },
          basis: { en: "Billing per operating hour needs data from every drive", de: "Abrechnung je Betriebsstunde braucht Daten von jedem Antrieb" } },
        { block: "resources", confidence: "high",
          text: { en: "Service technicians in the main markets", de: "Servicetechniker in den Hauptmärkten" },
          basis: { en: "Service at customer sites needs technicians close to the plants", de: "Service beim Kunden braucht Techniker nahe an den Anlagen" } },
        { block: "revenue", confidence: "high",
          text: { en: "Fees per operating hour under service contracts", de: "Gebühren je Betriebsstunde aus Serviceverträgen" },
          basis: { en: "The value proposition sells drives as a service, paid per hour", de: "Das Wertangebot verkauft Antriebe als Service, bezahlt je Stunde" } },
        { block: "revenue", confidence: "medium",
          text: { en: "Spare parts and repairs", de: "Ersatzteile und Reparaturen" },
          basis: { en: "Drives that run for decades need parts and repairs", de: "Antriebe, die jahrzehntelang laufen, brauchen Teile und Reparaturen" } }
      ]
    },
    signals: [
      { url: DATA_ACT, title: "Data Act: Next level as of 12 September 2026", published: "2026-05-22", areas: ["value", "revenue", "resources"],
        summary: { en: "Since September 2025 users of connected products may see the data they generate and share it with third parties. From September 2026 new products must make that data available by design.", de: "Seit September 2025 dürfen Nutzer vernetzter Produkte die erzeugten Daten einsehen und an Dritte weitergeben. Ab September 2026 müssen neue Produkte diese Daten schon ab Werk bereitstellen." } },
      { url: CRA, title: "Cyber Resilience Act - Reporting obligations", published: "2026-09-11", areas: ["activities", "costs"],
        summary: { en: "Since September 2026 makers of products with software must report actively exploited vulnerabilities and severe incidents through ENISA's single reporting platform.", de: "Seit September 2026 müssen Hersteller von Produkten mit Software aktiv ausgenutzte Schwachstellen und schwere Vorfälle über die zentrale Meldeplattform der ENISA melden." } },
      { url: MACHINERY, title: "The new European Machinery Regulation", published: "", areas: ["activities", "value"],
        summary: { en: "The EU Machinery Regulation replaces the Machinery Directive for machines placed on the market from 20 January 2027, with no transition period.", de: "Die EU-Maschinenverordnung löst die Maschinenrichtlinie für Maschinen ab, die ab dem 20. Januar 2027 in Verkehr gebracht werden, ohne Übergangsfrist." } },
      { url: POWER, title: "BDEW-Strompreisanalyse April 2026: Haushalte und Industrie", published: "2026-04-15", areas: ["costs"],
        summary: { en: "Power for small and medium industry costs a little less in 2026 than in 2025 thanks to a subsidy on grid fees, though the war on Iran has lifted prices again at the margin.", de: "Strom für kleine und mittlere Industriebetriebe kostet 2026 etwas weniger als 2025 dank eines Zuschusses zu den Netzentgelten, doch der Krieg gegen Iran hat die Preise zuletzt wieder angehoben." } },
      { url: SKILLS, title: "Fachkräfteengpassanalyse 2025", published: "", areas: ["resources", "activities", "channels"],
        summary: { en: "The Federal Employment Agency counts fewer occupations with a skills shortage than two years before, but many skilled trades remain short.", de: "Die Bundesagentur für Arbeit zählt weniger Engpassberufe als zwei Jahre zuvor, doch viele Fachberufe bleiben knapp." } },
      { url: TARIFFS, title: "Wende auf dem Markt für Maschinen in den USA", published: "2026-08-21", areas: ["costs", "segments"],
        summary: { en: "US tariffs on steel and aluminium reach most German machinery sold to the US through the metal content of its parts, and suppliers must document that content part by part.", de: "US-Zölle auf Stahl und Aluminium treffen über den Metallgehalt der Teile die meisten deutschen Maschinen für die USA, und Lieferanten müssen diesen Gehalt Teil für Teil nachweisen." } }
    ],
    issues: [
      { id: "I1", type: "regulation", blocks: ["value", "revenue", "resources"], items: ["value-2", "revenue-2", "resources-2"], impact: 4, likelihood: 4, horizon: "now", evidence: [DATA_ACT], confidence: "medium",
        title: { en: "Customers' data rights open the operating data to rival service firms", de: "Datenrechte der Kunden öffnen die Betriebsdaten für fremde Servicefirmen" },
        description: { en: "Under the Data Act a plant operator may pass the drives' operating data to any service firm. Rivals can then service Arvento's drives without Arvento.", de: "Nach dem Data Act darf ein Anlagenbetreiber die Betriebsdaten der Antriebe an jede Servicefirma weitergeben. Wettbewerber können Arventos Antriebe dann ohne Arvento warten." },
        contradicts: { en: "Drives as a service, paid per operating hour (Value propositions)", de: "Antriebe als Service, bezahlt je Betriebsstunde (Wertangebote)" } },
      { id: "I2", type: "regulation", blocks: ["activities", "costs"], items: ["activities-1"], impact: 3, likelihood: 4, horizon: "now", evidence: [CRA], confidence: "high",
        title: { en: "Drives with software must report exploited vulnerabilities from now on", de: "Antriebe mit Software müssen ausgenutzte Schwachstellen ab sofort melden" },
        description: { en: "Connected drives count as products with software. Reporting duties apply since September 2026 and the product rules follow, yet no activity covers product security.", de: "Vernetzte Antriebe gelten als Produkte mit Software. Meldepflichten gelten seit September 2026, die Produktregeln folgen, doch keine Aktivität deckt Produktsicherheit ab." },
        contradicts: { en: "Designing and building drives and gearboxes (Key activities), with no word on security", de: "Antriebe und Getriebe entwickeln und bauen (Schlüsselaktivitäten), ohne ein Wort zur Sicherheit" } },
      { id: "I3", type: "competition", blocks: ["value", "segments", "revenue"], items: ["value-1", "segments-1", "revenue-1"], impact: 3, likelihood: 4, horizon: "1_to_3_years", evidence: ["general knowledge"], confidence: "medium",
        title: { en: "Low-cost standard gearboxes undercut the core range", de: "Günstige Standardgetriebe unterbieten das Kernsortiment" },
        description: { en: "Standard gearboxes from low-cost makers meet most machine builders' needs at a lower price. Drives built to last for decades earn their price only where plants demand it.", de: "Standardgetriebe günstiger Hersteller erfüllen die meisten Anforderungen der Maschinenbauer zu niedrigerem Preis. Antriebe, die jahrzehntelang halten, sind ihren Preis nur dort wert, wo Anlagen es verlangen." },
        contradicts: { en: "Drives that run for decades with little service (Value propositions)", de: "Antriebe, die jahrzehntelang mit wenig Service laufen (Wertangebote)" } },
      { id: "I4", type: "operations", blocks: ["resources", "activities", "channels"], items: ["resources-3", "activities-2", "channels-2"], impact: 4, likelihood: 3, horizon: "now", evidence: [SKILLS], confidence: "medium",
        title: { en: "Too few service technicians for operating-hour contracts", de: "Zu wenige Servicetechniker für Betriebsstundenverträge" },
        description: { en: "Paying per operating hour promises uptime, and uptime needs technicians on call. Skilled trades stay short, and the service team already covers the repairs.", de: "Bezahlung je Betriebsstunde verspricht Verfügbarkeit, und Verfügbarkeit braucht Techniker in Bereitschaft. Fachkräfte bleiben knapp, und das Serviceteam deckt schon die Reparaturen ab." },
        contradicts: { en: "Service technicians at the customer (Channels)", de: "Servicetechniker beim Kunden (Kanäle)" } },
      { id: "I5", type: "economy", blocks: ["costs", "segments"], items: ["costs-1"], impact: 2, likelihood: 4, horizon: "now", evidence: [TARIFFS], confidence: "medium",
        title: { en: "US tariffs on the metal content raise the price of every drive sold there", de: "US-Zölle auf den Metallgehalt verteuern jeden dort verkauften Antrieb" },
        description: { en: "Tariffs on steel and aluminium reach drives through their metal content, and each part's content must be documented. Steel and castings are the largest material costs.", de: "Zölle auf Stahl und Aluminium treffen Antriebe über ihren Metallgehalt, und der Gehalt jedes Teils muss nachgewiesen werden. Stahl und Guss sind die größten Materialkosten." },
        contradicts: { en: "Steel, castings and electronics (Cost structure)", de: "Stahl, Guss und Elektronik (Kostenstruktur)" } },
      { id: "I6", type: "consistency", blocks: ["relationships", "segments"], items: ["relationships-1", "segments-2"], impact: 2, likelihood: 2, horizon: "1_to_3_years", evidence: ["general knowledge"], confidence: "medium",
        title: { en: "Plant operators pay for the hours, but the relations are with machine builders", de: "Betreiber zahlen die Stunden, die Beziehungen bestehen aber zu Maschinenbauern" },
        description: { en: "The service model bills the plant operator per hour, yet sales and relations run through the machine builders who fit the drives. Nobody looks after the operator.", de: "Das Servicemodell rechnet je Stunde beim Anlagenbetreiber ab, doch Vertrieb und Beziehungen laufen über die Maschinenbauer, die die Antriebe einbauen. Um den Betreiber kümmert sich niemand." },
        contradicts: { en: "Long relations with machine builders (Customer relationships)", de: "Langjährige Beziehungen zu Maschinenbauern (Kundenbeziehungen)" } }
    ],
    impacts: {
      baselines: [
        { value: 4200, unit: "#",
          name: { en: "Drives sold a year", de: "Verkaufte Antriebe im Jahr" },
          basis: { en: "The revenue the team entered and a typical price per drive", de: "Der vom Team genannte Umsatz und ein typischer Preis je Antrieb" } },
        { value: 3000, unit: "#",
          name: { en: "Drives under operating-hour contracts", de: "Antriebe in Betriebsstundenverträgen" },
          basis: { en: "A launch phase with the large plants first", de: "Eine Startphase, zuerst mit den großen Anlagen" } },
        { value: 15, unit: "%",
          name: { en: "Share of sales to the US", de: "Anteil der Verkäufe in die USA" },
          basis: { en: "Typical for a mid-sized German drive maker", de: "Typisch für einen mittelgroßen deutschen Antriebshersteller" } }
      ],
      impacts: [
        { issue: "I1", monetisable: true, eur_year_low: 4000000, eur_year_high: 10000000, confidence: "low", reason: "",
          kpis: [
            { id: "industrial_manufacturing.recurring_revenue_share", direction: "down", change_low: 2, change_high: 6,
              basis: { en: "Service hours that move to rival firms", de: "Servicestunden, die zu fremden Firmen wandern" } },
            { id: "industrial_manufacturing.service_revenue_share", direction: "down", change_low: 3, change_high: 8,
              basis: { en: "Repairs and parts ordered through rivals", de: "Reparaturen und Teile, die über Wettbewerber bestellt werden" } }
          ],
          eur_basis: { en: "Service revenue on connected drives that rivals could take", de: "Serviceumsatz an vernetzten Antrieben, den Wettbewerber übernehmen könnten" } },
        { issue: "I2", monetisable: true, eur_year_low: 1000000, eur_year_high: 3000000, confidence: "medium", reason: "",
          kpis: [
            { id: "general.ebit_margin", direction: "down", change_low: 0.3, change_high: 0.8,
              basis: { en: "A product security team and the reporting process", de: "Ein Team für Produktsicherheit und der Meldeprozess" } }
          ],
          eur_basis: { en: "Staff and tools for product security, and the cost of a late report", de: "Personal und Werkzeuge für Produktsicherheit sowie die Kosten einer verspäteten Meldung" } },
        { issue: "I3", monetisable: true, eur_year_low: 3000000, eur_year_high: 8000000, confidence: "low", reason: "",
          kpis: [
            { id: "industrial_manufacturing.book_to_bill", direction: "down", change_low: 0.05, change_high: 0.15,
              basis: { en: "Machine builders order standard gearboxes elsewhere", de: "Maschinenbauer bestellen Standardgetriebe anderswo" } },
            { id: "general.gross_margin", direction: "down", change_low: 1, change_high: 3,
              basis: { en: "Price pressure on the standard range", de: "Preisdruck im Standardsortiment" } }
          ],
          eur_basis: { en: "Margin on the standard range at the price low-cost makers set", de: "Marge im Standardsortiment zum Preis, den günstige Hersteller setzen" } },
        { issue: "I4", monetisable: true, eur_year_low: 2000000, eur_year_high: 6000000, confidence: "low", reason: "",
          kpis: [
            { id: "industrial_manufacturing.technician_utilisation", direction: "up", change_low: 8, change_high: 15,
              basis: { en: "The same team covers repairs and contract hours", de: "Dasselbe Team deckt Reparaturen und Vertragsstunden ab" } },
            { id: "industrial_manufacturing.first_time_fix_rate", direction: "down", change_low: 5, change_high: 10,
              basis: { en: "Rushed visits fix less at the first attempt", de: "Gehetzte Einsätze lösen weniger beim ersten Versuch" } }
          ],
          eur_basis: { en: "Penalties for missed uptime under operating-hour contracts", de: "Strafen für verfehlte Verfügbarkeit in Betriebsstundenverträgen" } },
        { issue: "I5", monetisable: true, eur_year_low: 1000000, eur_year_high: 3000000, confidence: "medium", reason: "",
          kpis: [
            { id: "general.gross_margin", direction: "down", change_low: 0.3, change_high: 0.9,
              basis: { en: "Tariff cost on US sales that the price doesn't cover", de: "Zollkosten auf US-Verkäufe, die der Preis nicht deckt" } }
          ],
          eur_basis: { en: "US sales times the tariff on their metal content, less what customers pay", de: "US-Verkäufe mal der Zoll auf ihren Metallgehalt, abzüglich dessen, was Kunden zahlen" } },
        { issue: "I6", monetisable: false, eur_year_low: 0, eur_year_high: 0, confidence: "low",
          kpis: [
            { id: "general.customer_churn", direction: "up", change_low: 2, change_high: 5,
              basis: { en: "Operators without a direct contact switch service provider", de: "Betreiber ohne direkten Kontakt wechseln den Serviceanbieter" } }
          ],
          eur_basis: "",
          reason: { en: "Who pays for the operating hours is not settled yet, so the loss can't be priced", de: "Wer die Betriebsstunden zahlt, ist noch offen, daher lässt sich der Verlust nicht beziffern" } }
      ]
    },
    responses: [
      { issue: "I1", options: [
        { kind: "mitigate", recommended: true, effort: "M", time_to_impact: "6_to_12_months", impact: 2, likelihood: 2, eur_year_low: 2000000, eur_year_high: 5000000,
          title: { en: "Sell guaranteed uptime, which data alone can't deliver", de: "Garantierte Verfügbarkeit verkaufen, die Daten allein nicht liefern" },
          first_step: { en: "Service defines an uptime guarantee for the large plants", de: "Der Service definiert eine Verfügbarkeitsgarantie für die großen Anlagen" },
          owner: { en: "Service", de: "Service" },
          changes: [
            { block: "value", action: "change", item: "value-2", text: { en: "Guaranteed uptime per drive, paid per operating hour", de: "Garantierte Verfügbarkeit je Antrieb, bezahlt je Betriebsstunde" } }
          ] },
        { kind: "advantage", recommended: false, effort: "L", time_to_impact: "1_to_2_years", impact: 0, likelihood: 3, eur_year_low: 2000000, eur_year_high: 6000000,
          title: { en: "Open a data portal and charge partners for analytics", de: "Ein Datenportal öffnen und Partnern Analysen berechnen" },
          first_step: { en: "Digital builds a portal where operators share drive data with partners they choose", de: "Das Digitalteam baut ein Portal, über das Betreiber Antriebsdaten mit Partnern ihrer Wahl teilen" },
          owner: { en: "Digital", de: "Digitalteam" },
          changes: [
            { block: "resources", action: "change", item: "resources-2", text: { en: "Installed base data shared through a customer portal", de: "Daten der installierten Basis, geteilt über ein Kundenportal" } },
            { block: "revenue", action: "add", item: "", text: { en: "Analytics fees from partners using the drive data", de: "Analysegebühren von Partnern, die die Antriebsdaten nutzen" } }
          ] }
      ] },
      { issue: "I2", options: [
        { kind: "mitigate", recommended: true, effort: "M", time_to_impact: "under_3_months", impact: 2, likelihood: 2, eur_year_low: 300000, eur_year_high: 1000000,
          title: { en: "Set up product security and a reporting process", de: "Produktsicherheit und einen Meldeprozess aufbauen" },
          first_step: { en: "Engineering names a head of product security and registers on the reporting platform", de: "Die Entwicklung benennt eine Leitung für Produktsicherheit und registriert sich auf der Meldeplattform" },
          owner: { en: "Engineering", de: "Entwicklung" },
          changes: [
            { block: "activities", action: "add", item: "", text: { en: "Security updates and vulnerability reports for drive software", de: "Sicherheitsupdates und Schwachstellenmeldungen für Antriebssoftware" } },
            { block: "costs", action: "add", item: "", text: { en: "Product security team", de: "Team für Produktsicherheit" } }
          ] }
      ] },
      { issue: "I3", options: [
        { kind: "mitigate", recommended: true, effort: "M", time_to_impact: "6_to_12_months", impact: 2, likelihood: 3, eur_year_low: 1500000, eur_year_high: 4000000,
          title: { en: "Price the range by duty class and keep premium drives for demanding plants", de: "Das Sortiment nach Belastungsklassen bepreisen und Premiumantriebe für anspruchsvolle Anlagen halten" },
          first_step: { en: "Product management sorts the range into duty classes with their own prices", de: "Das Produktmanagement teilt das Sortiment in Belastungsklassen mit eigenen Preisen" },
          owner: { en: "Product management", de: "Produktmanagement" },
          changes: [
            { block: "value", action: "change", item: "value-1", text: { en: "Drives that run for decades, priced by duty class", de: "Antriebe, die jahrzehntelang laufen, nach Belastungsklasse bepreist" } }
          ] },
        { kind: "advantage", recommended: false, effort: "M", time_to_impact: "6_to_12_months", impact: 0, likelihood: 2, eur_year_low: 1000000, eur_year_high: 3000000,
          title: { en: "Buy in a standard gearbox and sell it with Arvento service", de: "Ein Standardgetriebe zukaufen und mit Arvento-Service verkaufen" },
          first_step: { en: "Purchasing asks two low-cost makers for a standard gearbox", de: "Der Einkauf fragt zwei günstige Hersteller nach einem Standardgetriebe an" },
          owner: { en: "Purchasing", de: "Einkauf" },
          changes: [
            { block: "partners", action: "add", item: "", text: { en: "Partner for low-cost standard gearboxes", de: "Partner für günstige Standardgetriebe" } },
            { block: "revenue", action: "add", item: "", text: { en: "Service contracts on partner gearboxes", de: "Serviceverträge für Partnergetriebe" } }
          ] }
      ] },
      { issue: "I4", options: [
        { kind: "mitigate", recommended: true, effort: "M", time_to_impact: "3_to_6_months", impact: 2, likelihood: 2, eur_year_low: 500000, eur_year_high: 2000000,
          title: { en: "Diagnose remotely first and send technicians only where needed", de: "Zuerst aus der Ferne diagnostizieren und Techniker nur bei Bedarf schicken" },
          first_step: { en: "Service opens a remote monitoring desk for the drives under contract", de: "Der Service richtet einen Fernüberwachungsplatz für die Antriebe unter Vertrag ein" },
          owner: { en: "Service", de: "Service" },
          changes: [
            { block: "activities", action: "change", item: "activities-2", text: { en: "Remote diagnosis, with site visits where needed", de: "Ferndiagnose, mit Einsätzen vor Ort nur bei Bedarf" } },
            { block: "resources", action: "add", item: "", text: { en: "Remote monitoring desk", de: "Fernüberwachungsplatz" } }
          ] }
      ] },
      { issue: "I5", options: [
        { kind: "mitigate", recommended: true, effort: "S", time_to_impact: "under_3_months", impact: 2, likelihood: 2, eur_year_low: 300000, eur_year_high: 1000000,
          title: { en: "Add a tariff clause to US contracts", de: "Eine Zollklausel in US-Verträge aufnehmen" },
          first_step: { en: "Sales adds the clause to every new US quote", de: "Der Vertrieb nimmt die Klausel in jedes neue US-Angebot auf" },
          owner: { en: "Sales", de: "Vertrieb" },
          changes: [
            { block: "revenue", action: "add", item: "", text: { en: "Tariff clause in US contracts", de: "Zollklausel in US-Verträgen" } }
          ] }
      ] },
      { issue: "I6", options: [
        { kind: "mitigate", recommended: true, effort: "S", time_to_impact: "3_to_6_months", impact: 1, likelihood: 2, eur_year_low: 0, eur_year_high: 0,
          title: { en: "Sign operating-hour contracts with plant operators directly", de: "Betriebsstundenverträge direkt mit den Anlagenbetreibern schließen" },
          first_step: { en: "Sales names an operator contact for each plant under contract", de: "Der Vertrieb benennt für jede Anlage unter Vertrag einen Kontakt beim Betreiber" },
          owner: { en: "Sales", de: "Vertrieb" },
          changes: [
            { block: "relationships", action: "add", item: "", text: { en: "Service agreements with plant operators", de: "Servicevereinbarungen mit Anlagenbetreibern" } }
          ] }
      ] }
    ],
    summary: {
      headline: { en: "At stake a year: {{fact:at_stake}}, led by customers' new data rights", de: "Im Jahr auf dem Spiel: {{fact:at_stake}}, angeführt von den neuen Datenrechten der Kunden" },
      situation: { en: "Arvento Drives is moving from selling drives to selling operating hours. Six issues touch the move, and {{fact:pressure.before}} blocks are under pressure.", de: "Arvento Drives geht vom Verkauf von Antrieben zum Verkauf von Betriebsstunden über. Sechs Schwachstellen betreffen diesen Schritt, und {{fact:pressure.before}} Bausteinen stehen unter Druck." },
      findings: [
        { en: "Customers may now share the drives' operating data with any service firm, which puts {{fact:issue.I1.expected}} a year of service revenue within rivals' reach.", de: "Kunden dürfen die Betriebsdaten der Antriebe jetzt an jede Servicefirma weitergeben; damit rücken {{fact:issue.I1.expected}} Serviceumsatz im Jahr in die Reichweite der Wettbewerber." },
        { en: "Operating-hour contracts promise uptime that the service team can't staff yet.", de: "Betriebsstundenverträge versprechen eine Verfügbarkeit, für die das Serviceteam noch nicht genug Personal hat." },
        { en: "Who pays for the hours is unclear: the plant operator pays, but Arvento's relations run through machine builders.", de: "Wer die Stunden zahlt, ist unklar: Der Anlagenbetreiber zahlt, doch Arventos Beziehungen laufen über die Maschinenbauer." }
      ],
      recommendation: { en: "Sell guaranteed uptime that data alone can't deliver, diagnose remotely before sending technicians and sign contracts with plant operators directly. With the responses chosen, what is left a year comes to {{fact:left}}.", de: "Garantierte Verfügbarkeit verkaufen, die Daten allein nicht liefern, zuerst aus der Ferne diagnostizieren und direkt mit den Anlagenbetreibern abschließen. Mit den gewählten Antworten bleiben im Jahr {{fact:left}}." },
      assumptions: [
        { en: "Plant operators use their data rights once a rival offers cheaper service.", de: "Anlagenbetreiber nutzen ihre Datenrechte, sobald ein Wettbewerber günstigeren Service anbietet." },
        { en: "Remote diagnosis solves most faults without a site visit.", de: "Ferndiagnose behebt die meisten Störungen ohne Einsatz vor Ort." },
        { en: "US customers accept a tariff clause in new contracts.", de: "US-Kunden akzeptieren eine Zollklausel in neuen Verträgen." }
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
      { issue: "I4", choice: "mitigate", option: 0 },
      { issue: "I5", choice: "mitigate", option: 0 },
      { issue: "I6", choice: "mitigate", option: 0 }
    ]
  }
};
