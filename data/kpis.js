// The sector KPI library (brief 6.4), shared by the set of four: the Business Model Canvas, SWOT and
// PESTEL Challengers and the Prototype Ideator. It is meant to be the same file, byte for byte, in every
// repository of the set that has it (tests/parity.mjs compares them).
//
// The agents measure an issue's impact in the KPIs of the company's sector and of "general": a carrier's
// issues land in cost per container moved, a utility's in customer churn. They pick KPIs by id; code then
// takes the name, unit and definition from here. A KPI outside the library is accepted only with a
// name, unit, direction and definition, and shows as "new".
//
// A KPI: { id: "<sector>.<name>", sector, name: { en, de }, unit, better: "higher" | "lower",
// definition: { en, de }, source }. The unit is a code from UNITS, which words it in both languages; the
// source is a standard's address or "common practice". The library holds definitions only, never
// benchmark values.

/** Units, by code, as each language writes them after a number. */
export const UNITS = Object.freeze({
  percent: { en: "%", de: "%" },
  points: { en: "points", de: "Punkte" },
  eur: { en: "€", de: "€" },
  eur_per_month: { en: "€ per month", de: "€ je Monat" },
  eur_per_customer: { en: "€ per customer", de: "€ je Kunde" },
  eur_per_vehicle: { en: "€ per vehicle", de: "€ je Fahrzeug" },
  eur_per_case: { en: "€ per case", de: "€ je Fall" },
  eur_per_teu: { en: "€ per TEU", de: "€ je TEU" },
  eur_per_mwh: { en: "€ per MWh", de: "€ je MWh" },
  eur_per_sqm: { en: "€ per m²", de: "€ je m²" },
  eur_per_gb: { en: "€ per GB", de: "€ je GB" },
  g_co2e_per_teu_km: { en: "g CO2e per TEU-km", de: "g CO2e je TEU-km" },
  g_co2_per_km: { en: "g CO2 per km", de: "g CO2 je km" },
  t_co2e_per_t: { en: "t CO2e per tonne", de: "t CO2e je Tonne" },
  t_co2e_per_unit: { en: "t CO2e per unit", de: "t CO2e je Einheit" },
  mwh_per_t: { en: "MWh per tonne", de: "MWh je Tonne" },
  minutes: { en: "minutes", de: "Minuten" },
  hours: { en: "hours", de: "Stunden" },
  days: { en: "days", de: "Tage" },
  months: { en: "months", de: "Monate" },
  count: { en: "number", de: "Anzahl" },
  ratio: { en: "ratio", de: "Verhältnis" },
  times_a_year: { en: "times a year", de: "mal im Jahr" },
  per_week: { en: "per week", de: "pro Woche" },
  per_month: { en: "per month", de: "pro Monat" },
  per_million_hours: { en: "per million hours", de: "je Million Stunden" }
});

/** The sectors: twelve and "general", which fits any company. */
export const SECTORS = Object.freeze([
  { id: "telecom", name: { en: "Telecommunications", de: "Telekommunikation" } },
  { id: "transport_logistics", name: { en: "Transport and logistics", de: "Transport und Logistik" } },
  { id: "automotive_mobility", name: { en: "Automotive and mobility", de: "Automobil und Mobilität" } },
  { id: "industrial_manufacturing", name: { en: "Industrial manufacturing", de: "Industrie und Maschinenbau" } },
  { id: "energy_utilities", name: { en: "Energy and utilities", de: "Energie und Versorgung" } },
  { id: "retail_consumer", name: { en: "Retail and consumer goods", de: "Handel und Konsumgüter" } },
  { id: "banking", name: { en: "Banking", de: "Banken" } },
  { id: "insurance", name: { en: "Insurance", de: "Versicherungen" } },
  { id: "health_life_sciences", name: { en: "Health and life sciences", de: "Gesundheit und Life Sciences" } },
  { id: "public_sector", name: { en: "Public sector", de: "Öffentlicher Sektor" } },
  { id: "software_digital", name: { en: "Software and digital", de: "Software und Digitales" } },
  { id: "chemicals_materials", name: { en: "Chemicals and materials", de: "Chemie und Werkstoffe" } },
  { id: "general", name: { en: "Any company", de: "Jedes Unternehmen" } }
]);

const CP = "common practice";
const k = (id, en, de, unit, better, defEn, defDe, source = CP) =>
  Object.freeze({ id, sector: id.split(".")[0], name: Object.freeze({ en, de }), unit, better, definition: Object.freeze({ en: defEn, de: defDe }), source });

/** Every KPI, sector by sector. */
export const KPIS = Object.freeze([
  // general: the ten every company has (brief 6.4)
  k("general.revenue", "Revenue", "Umsatz", "eur", "higher", "Income from the sale of goods and services in a year", "Erlöse aus dem Verkauf von Waren und Leistungen in einem Jahr"),
  k("general.ebit_margin", "EBIT margin", "EBIT-Marge", "percent", "higher", "Earnings before interest and taxes as a share of revenue", "Ergebnis vor Zinsen und Steuern als Anteil am Umsatz"),
  k("general.gross_margin", "Gross margin", "Bruttomarge", "percent", "higher", "Revenue minus the direct cost of what was sold, as a share of revenue", "Umsatz abzüglich der direkten Kosten des Verkauften, als Anteil am Umsatz"),
  k("general.free_cash_flow", "Free cash flow", "Freier Cashflow", "eur", "higher", "Cash from operations minus capital spending, in a year", "Mittelzufluss aus dem laufenden Geschäft abzüglich der Investitionen, in einem Jahr"),
  k("general.customer_churn", "Customer churn", "Kundenabwanderung", "percent", "lower", "Share of customers lost in a year", "Anteil der Kunden, die in einem Jahr verloren gehen"),
  k("general.net_promoter_score", "Net Promoter Score", "Net Promoter Score", "points", "higher", "Share of customers who would recommend the company minus the share who would not, from −100 to 100", "Anteil der Kunden, die das Unternehmen empfehlen würden, minus Anteil derer, die es nicht täten, von −100 bis 100"),
  k("general.customer_acquisition_cost", "Customer acquisition cost", "Kundengewinnungskosten", "eur_per_customer", "lower", "Sales and marketing cost divided by the number of new customers won", "Vertriebs- und Marketingkosten geteilt durch die Zahl der gewonnenen Neukunden"),
  k("general.customer_lifetime_value", "Customer lifetime value", "Kundenlebenszeitwert", "eur_per_customer", "higher", "Margin a customer brings over the whole relationship", "Deckungsbeitrag, den ein Kunde über die gesamte Kundenbeziehung bringt"),
  k("general.staff_turnover", "Staff turnover", "Personalfluktuation", "percent", "lower", "Share of employees who leave in a year", "Anteil der Beschäftigten, die in einem Jahr ausscheiden"),
  k("general.co2_per_unit", "CO2 per unit of output", "CO2 je Leistungseinheit", "t_co2e_per_unit", "lower", "Greenhouse-gas emissions, in tonnes of CO2 equivalent, per unit the company produces or delivers", "Treibhausgasemissionen in Tonnen CO2-Äquivalent je erzeugter oder erbrachter Einheit"),

  // telecommunications
  k("telecom.arpu", "Average revenue per user", "Durchschnittsumsatz je Kunde", "eur_per_month", "higher", "Service revenue per subscriber and month", "Serviceumsatz je Kunde und Monat"),
  k("telecom.monthly_churn", "Monthly churn", "Monatliche Kündigungsquote", "percent", "lower", "Share of subscribers who cancel in a month", "Anteil der Kunden, die in einem Monat kündigen"),
  k("telecom.net_adds", "Net subscriber additions", "Netto-Kundenzuwachs", "count", "higher", "New subscribers minus cancellations in a period", "Neukunden abzüglich Kündigungen in einem Zeitraum"),
  k("telecom.network_availability", "Network availability", "Netzverfügbarkeit", "percent", "higher", "Share of the time the network delivers its services", "Anteil der Zeit, in der das Netz seine Dienste erbringt"),
  k("telecom.ebitda_margin", "EBITDA margin", "EBITDA-Marge", "percent", "higher", "Earnings before interest, taxes, depreciation and amortisation as a share of revenue", "Ergebnis vor Zinsen, Steuern und Abschreibungen als Anteil am Umsatz"),
  k("telecom.capex_to_sales", "Capital spending to revenue", "Investitionsquote", "percent", "lower", "Capital spending as a share of revenue", "Investitionen als Anteil am Umsatz"),
  k("telecom.fibre_take_up", "Fibre take-up", "Glasfaser-Buchungsquote", "percent", "higher", "Share of homes passed by fibre that buy a fibre connection", "Anteil der mit Glasfaser erschlossenen Haushalte, die einen Anschluss buchen"),
  k("telecom.cost_per_gb", "Network cost per gigabyte", "Netzkosten je Gigabyte", "eur_per_gb", "lower", "Network operating cost divided by the data carried", "Netzbetriebskosten geteilt durch die übertragene Datenmenge"),
  k("telecom.first_contact_resolution", "First-contact resolution", "Erstlösungsquote", "percent", "higher", "Share of customer requests solved at the first contact", "Anteil der Kundenanliegen, die beim ersten Kontakt gelöst werden"),
  k("telecom.time_to_repair", "Mean time to repair", "Mittlere Entstörungszeit", "hours", "lower", "Average hours from a fault report to the restored service", "Durchschnittliche Stunden von der Störungsmeldung bis zum wiederhergestellten Dienst"),

  // transport and logistics: the brief's starting points first
  k("transport_logistics.cost_per_teu", "Cost per container moved", "Kosten je bewegtem Container", "eur_per_teu", "lower", "Operating cost divided by the containers moved, counted in twenty-foot equivalent units (TEU)", "Betriebskosten geteilt durch die bewegten Container, gezählt in Standardcontainern (TEU)"),
  k("transport_logistics.freight_rate", "Average freight rate", "Durchschnittliche Frachtrate", "eur_per_teu", "higher", "Freight revenue per container carried", "Frachterlös je beförderten Container"),
  k("transport_logistics.schedule_reliability", "Schedule reliability", "Fahrplanzuverlässigkeit", "percent", "higher", "Share of vessel arrivals on schedule", "Anteil der Schiffsankünfte nach Fahrplan"),
  k("transport_logistics.vessel_utilisation", "Vessel utilisation", "Schiffsauslastung", "percent", "higher", "Containers carried as a share of the slots offered", "Beförderte Container als Anteil der angebotenen Stellplätze"),
  k("transport_logistics.fuel_cost_per_teu", "Fuel cost per container", "Treibstoffkosten je Container", "eur_per_teu", "lower", "Bunker fuel cost divided by the containers carried", "Bunkerkosten geteilt durch die beförderten Container"),
  k("transport_logistics.co2_per_teu_km", "CO2 per container-kilometre", "CO2 je Container-Kilometer", "g_co2e_per_teu_km", "lower", "Greenhouse-gas emissions per container moved one kilometre, counted as ISO 14083 sets out", "Treibhausgasemissionen je Container und Kilometer, gezählt nach ISO 14083"),
  k("transport_logistics.empty_container_cost", "Cost of moving empty containers", "Kosten für Leercontainer-Transporte", "eur", "lower", "Cost of repositioning empty containers to where cargo waits, in a year", "Kosten, leere Container dorthin zu bringen, wo Ladung wartet, in einem Jahr"),
  k("transport_logistics.on_time_delivery", "On-time delivery", "Liefertreue", "percent", "higher", "Share of shipments delivered within the promised window", "Anteil der Sendungen, die im zugesagten Zeitfenster ankommen"),
  k("transport_logistics.allowance_cost_per_teu", "Emission allowance cost per container", "Zertifikatskosten je Container", "eur_per_teu", "lower", "Cost of EU emission allowances divided by the containers carried on voyages they cover", "Kosten der EU-Emissionszertifikate geteilt durch die Container auf den erfassten Fahrten"),
  k("transport_logistics.digital_booking_share", "Share of digital bookings", "Anteil digitaler Buchungen", "percent", "higher", "Share of bookings made through online channels", "Anteil der Buchungen über Onlinekanäle"),

  // automotive and mobility
  k("automotive_mobility.vehicle_deliveries", "Vehicle deliveries", "Fahrzeugauslieferungen", "count", "higher", "Vehicles handed over to customers in a year", "An Kunden übergebene Fahrzeuge in einem Jahr"),
  k("automotive_mobility.revenue_per_vehicle", "Revenue per vehicle", "Umsatz je Fahrzeug", "eur_per_vehicle", "higher", "Automotive revenue divided by the vehicles delivered", "Automobilumsatz geteilt durch die ausgelieferten Fahrzeuge"),
  k("automotive_mobility.bev_share", "Share of battery-electric vehicles", "Anteil batterieelektrischer Fahrzeuge", "percent", "higher", "Battery-electric vehicles as a share of the vehicles sold", "Batterieelektrische Fahrzeuge als Anteil der verkauften Fahrzeuge"),
  k("automotive_mobility.fleet_co2", "Fleet CO2 emissions", "CO2-Flottenausstoß", "g_co2_per_km", "lower", "Average tailpipe CO2 of the cars sold, per kilometre", "Durchschnittlicher CO2-Ausstoß der verkauften Pkw je Kilometer"),
  k("automotive_mobility.warranty_cost_ratio", "Warranty cost ratio", "Gewährleistungsquote", "percent", "lower", "Warranty cost as a share of revenue", "Gewährleistungskosten als Anteil am Umsatz"),
  k("automotive_mobility.plant_utilisation", "Plant utilisation", "Werksauslastung", "percent", "higher", "Vehicles built as a share of the plants' capacity", "Gebaute Fahrzeuge als Anteil der Werkskapazität"),
  k("automotive_mobility.inventory_days", "Days of vehicle stock", "Reichweite des Fahrzeugbestands", "days", "lower", "Days of sales the vehicles in stock would cover", "Tage, die der Fahrzeugbestand beim aktuellen Absatz reicht"),
  k("automotive_mobility.software_service_share", "Share of software and service revenue", "Anteil Software- und Serviceerlöse", "percent", "higher", "Revenue from software, connected services and subscriptions as a share of revenue", "Erlöse aus Software, vernetzten Diensten und Abonnements als Anteil am Umsatz"),
  k("automotive_mobility.fleet_utilisation", "Fleet utilisation", "Flottenauslastung", "percent", "higher", "Hours a shared or rented vehicle is in use as a share of the hours it is available", "Stunden, in denen ein geteiltes oder vermietetes Fahrzeug genutzt wird, als Anteil der verfügbaren Stunden"),
  k("automotive_mobility.recall_rate", "Recall rate", "Rückrufquote", "percent", "lower", "Share of the vehicles sold that are recalled", "Anteil der verkauften Fahrzeuge, die zurückgerufen werden"),

  // industrial manufacturing: the brief's starting points first
  k("industrial_manufacturing.order_intake", "Order intake", "Auftragseingang", "eur", "higher", "Value of the new orders received in a period", "Wert der in einem Zeitraum eingegangenen Aufträge"),
  k("industrial_manufacturing.book_to_bill", "Book-to-bill ratio", "Book-to-Bill-Verhältnis", "ratio", "higher", "Order intake divided by revenue in the same period", "Auftragseingang geteilt durch den Umsatz desselben Zeitraums"),
  k("industrial_manufacturing.service_revenue_share", "Share of service revenue", "Serviceanteil am Umsatz", "percent", "higher", "Revenue from service, spare parts and repairs as a share of revenue", "Erlöse aus Service, Ersatzteilen und Reparaturen als Anteil am Umsatz"),
  k("industrial_manufacturing.recurring_revenue_share", "Share of recurring revenue", "Anteil wiederkehrender Erlöse", "percent", "higher", "Revenue from contracts that renew, such as service or operating-hour contracts, as a share of revenue", "Erlöse aus Verträgen, die sich erneuern, etwa Service- oder Betriebsstundenverträge, als Anteil am Umsatz"),
  k("industrial_manufacturing.on_time_delivery", "On-time delivery", "Liefertreue", "percent", "higher", "Share of orders delivered on the date promised", "Anteil der Aufträge, die zum zugesagten Termin geliefert werden"),
  k("industrial_manufacturing.connected_base_share", "Share of the installed base connected", "Anteil der vernetzten installierten Basis", "percent", "higher", "Machines in the field that send operating data, as a share of all those installed", "Maschinen im Feld, die Betriebsdaten senden, als Anteil aller installierten"),
  k("industrial_manufacturing.warranty_cost", "Warranty cost", "Gewährleistungskosten", "percent", "lower", "Cost of warranty claims as a share of revenue", "Kosten der Gewährleistungsfälle als Anteil am Umsatz"),
  k("industrial_manufacturing.technician_utilisation", "Technician utilisation", "Auslastung der Servicetechniker", "percent", "higher", "Billable hours as a share of the hours technicians are available", "Abrechenbare Stunden als Anteil der verfügbaren Technikerstunden"),
  k("industrial_manufacturing.oee", "Overall equipment effectiveness", "Gesamtanlageneffektivität", "percent", "higher", "Availability times performance times quality of a production line", "Verfügbarkeit mal Leistung mal Qualität einer Fertigungslinie"),
  k("industrial_manufacturing.mtbf", "Mean time between failures", "Mittlere Betriebsdauer zwischen Ausfällen", "hours", "higher", "Average operating hours of a product between two failures", "Durchschnittliche Betriebsstunden eines Produkts zwischen zwei Ausfällen"),

  // energy and utilities: the brief's starting points first
  k("energy_utilities.customer_churn", "Customer churn", "Kundenwechselquote", "percent", "lower", "Share of customers who switch to another supplier in a year", "Anteil der Kunden, die in einem Jahr den Anbieter wechseln"),
  k("energy_utilities.cost_to_serve", "Cost to serve per customer", "Kosten je Kunde", "eur_per_customer", "lower", "Billing, service and metering cost per customer, in a year", "Abrechnungs-, Service- und Messkosten je Kunde, in einem Jahr"),
  k("energy_utilities.gross_margin_per_mwh", "Gross margin per megawatt hour", "Bruttomarge je Megawattstunde", "eur_per_mwh", "higher", "Sales price minus procurement and grid cost, per megawatt hour sold", "Verkaufspreis abzüglich Beschaffungs- und Netzkosten, je verkaufter Megawattstunde"),
  k("energy_utilities.outage_minutes", "Minutes of grid outage per customer", "Ausfallminuten je Kunde", "minutes", "lower", "Average minutes a customer is without power in a year (SAIDI)", "Durchschnittliche Minuten, die ein Kunde im Jahr ohne Strom ist (SAIDI)"),
  k("energy_utilities.smart_meter_share", "Share of smart meters installed", "Anteil intelligenter Messsysteme", "percent", "higher", "Smart metering systems installed as a share of the metering points", "Eingebaute intelligente Messsysteme als Anteil der Messstellen"),
  k("energy_utilities.bad_debt", "Bad debt", "Forderungsausfälle", "percent", "lower", "Unpaid bills written off as a share of revenue", "Abgeschriebene unbezahlte Rechnungen als Anteil am Umsatz"),
  k("energy_utilities.heat_customers", "Heat customers connected", "Angeschlossene Wärmekunden", "count", "higher", "Buildings supplied by the utility's heat network or heat service", "Gebäude, die das Wärmenetz oder der Wärmedienst des Versorgers beliefert"),
  k("energy_utilities.dynamic_tariff_share", "Share of customers on dynamic tariffs", "Anteil der Kunden mit dynamischem Tarif", "percent", "higher", "Customers whose price follows the wholesale market, as a share of all customers", "Kunden, deren Preis dem Großhandelsmarkt folgt, als Anteil aller Kunden"),
  k("energy_utilities.renewable_share", "Share of renewable generation", "Anteil erneuerbarer Erzeugung", "percent", "higher", "Power from renewable sources as a share of the power generated", "Strom aus erneuerbaren Quellen als Anteil der erzeugten Strommenge"),
  k("energy_utilities.water_losses", "Water losses", "Wasserverluste", "percent", "lower", "Water fed into the network that never reaches a customer, as a share of the water supplied", "Wasser, das ins Netz eingespeist wird und nie beim Kunden ankommt, als Anteil der Abgabe"),

  // retail and consumer goods
  k("retail_consumer.like_for_like_growth", "Like-for-like sales growth", "Flächenbereinigtes Umsatzwachstum", "percent", "higher", "Sales growth of the stores open in both periods", "Umsatzwachstum der Geschäfte, die in beiden Zeiträumen geöffnet waren"),
  k("retail_consumer.sales_per_sqm", "Sales per square metre", "Umsatz je Quadratmeter", "eur_per_sqm", "higher", "Sales divided by the selling area, in a year", "Umsatz geteilt durch die Verkaufsfläche, in einem Jahr"),
  k("retail_consumer.average_basket", "Average basket", "Durchschnittlicher Warenkorb", "eur", "higher", "Average spend per purchase", "Durchschnittliche Ausgabe je Einkauf"),
  k("retail_consumer.conversion_rate", "Conversion rate", "Konversionsrate", "percent", "higher", "Share of visits that end in a purchase", "Anteil der Besuche, die mit einem Kauf enden"),
  k("retail_consumer.inventory_turnover", "Inventory turnover", "Lagerumschlag", "times_a_year", "higher", "Cost of goods sold divided by the average inventory, in a year", "Wareneinsatz geteilt durch den durchschnittlichen Lagerbestand, in einem Jahr"),
  k("retail_consumer.on_shelf_availability", "On-shelf availability", "Regalverfügbarkeit", "percent", "higher", "Share of products in stock on the shelf when customers look for them", "Anteil der Produkte, die im Regal stehen, wenn Kunden sie suchen"),
  k("retail_consumer.online_share", "Online share of sales", "Onlineanteil am Umsatz", "percent", "higher", "Sales through online channels as a share of sales", "Umsatz über Onlinekanäle als Anteil am Umsatz"),
  k("retail_consumer.return_rate", "Return rate", "Retourenquote", "percent", "lower", "Share of the items sold that come back", "Anteil der verkauften Artikel, die zurückkommen"),
  k("retail_consumer.markdown_rate", "Markdown rate", "Abschriftenquote", "percent", "lower", "Price reductions as a share of sales", "Preisabschriften als Anteil am Umsatz"),
  k("retail_consumer.repeat_purchase_rate", "Repeat purchase rate", "Wiederkaufrate", "percent", "higher", "Share of customers who buy again within a year", "Anteil der Kunden, die innerhalb eines Jahres erneut kaufen"),

  // banking
  k("banking.net_interest_margin", "Net interest margin", "Nettozinsmarge", "percent", "higher", "Interest income minus interest expense, as a share of interest-earning assets", "Zinserträge abzüglich Zinsaufwand, als Anteil der zinstragenden Aktiva"),
  k("banking.cost_income_ratio", "Cost-income ratio", "Aufwand-Ertrags-Relation", "percent", "lower", "Operating expenses as a share of operating income", "Verwaltungsaufwand als Anteil der operativen Erträge"),
  k("banking.cet1_ratio", "CET1 ratio", "Harte Kernkapitalquote", "percent", "higher", "Common equity tier 1 capital as a share of risk-weighted assets", "Hartes Kernkapital als Anteil der risikogewichteten Aktiva"),
  k("banking.npl_ratio", "Non-performing loan ratio", "NPL-Quote", "percent", "lower", "Loans in default or unlikely to be repaid, as a share of all loans", "Ausgefallene oder voraussichtlich nicht zurückgezahlte Kredite als Anteil aller Kredite"),
  k("banking.return_on_equity", "Return on equity", "Eigenkapitalrendite", "percent", "higher", "Net profit as a share of average equity", "Jahresüberschuss als Anteil des durchschnittlichen Eigenkapitals"),
  k("banking.cost_of_risk", "Cost of risk", "Risikokosten", "percent", "lower", "Loan loss provisions as a share of average loans", "Risikovorsorge als Anteil des durchschnittlichen Kreditvolumens"),
  k("banking.loan_growth", "Loan growth", "Kreditwachstum", "percent", "higher", "Growth of the loan book in a year", "Wachstum des Kreditbestands in einem Jahr"),
  k("banking.digital_active_share", "Digitally active customers", "Digital aktive Kunden", "percent", "higher", "Customers who used online or mobile banking in the last month, as a share of all customers", "Kunden, die im letzten Monat Online- oder Mobile-Banking genutzt haben, als Anteil aller Kunden"),
  k("banking.liquidity_coverage_ratio", "Liquidity coverage ratio", "Liquiditätsdeckungsquote", "percent", "higher", "High-quality liquid assets as a share of the net cash outflows over 30 days of stress", "Hochliquide Aktiva als Anteil der Nettoabflüsse über 30 Stresstage"),
  k("banking.fee_income_share", "Share of fee income", "Provisionsanteil", "percent", "higher", "Fee and commission income as a share of operating income", "Provisionserträge als Anteil der operativen Erträge"),

  // insurance
  k("insurance.combined_ratio", "Combined ratio", "Schaden-Kosten-Quote", "percent", "lower", "Claims and expenses as a share of earned premiums", "Schäden und Kosten als Anteil der verdienten Beiträge"),
  k("insurance.loss_ratio", "Loss ratio", "Schadenquote", "percent", "lower", "Claims as a share of earned premiums", "Schäden als Anteil der verdienten Beiträge"),
  k("insurance.expense_ratio", "Expense ratio", "Kostenquote", "percent", "lower", "Acquisition and administration costs as a share of earned premiums", "Abschluss- und Verwaltungskosten als Anteil der verdienten Beiträge"),
  k("insurance.gross_written_premiums", "Gross written premiums", "Gebuchte Bruttobeiträge", "eur", "higher", "Premiums written in a year, before reinsurance", "In einem Jahr gebuchte Beiträge vor Rückversicherung"),
  k("insurance.retention_rate", "Policy retention", "Bestandsfestigkeit", "percent", "higher", "Share of policies renewed at their due date", "Anteil der Verträge, die zum Ablauf verlängert werden"),
  k("insurance.solvency_ratio", "Solvency ratio", "Solvenzquote", "percent", "higher", "Own funds as a share of the capital Solvency II requires", "Eigenmittel als Anteil der nach Solvency II geforderten Kapitalanforderung"),
  k("insurance.claims_cycle_time", "Claims cycle time", "Schadenbearbeitungsdauer", "days", "lower", "Days from a claim's report to its settlement", "Tage von der Schadenmeldung bis zur Regulierung"),
  k("insurance.straight_through_share", "Straight-through processing", "Dunkelverarbeitungsquote", "percent", "higher", "Share of policies or claims processed without manual work", "Anteil der Verträge oder Schäden, die ohne manuelle Bearbeitung durchlaufen"),
  k("insurance.new_business_value", "Value of new business", "Neugeschäftswert", "eur", "higher", "Present value of the future profits from the policies written in a year", "Barwert der künftigen Gewinne aus den in einem Jahr abgeschlossenen Verträgen"),
  k("insurance.digital_sales_share", "Share of digital sales", "Anteil digitaler Abschlüsse", "percent", "higher", "Policies sold through online channels as a share of all policies sold", "Über Onlinekanäle abgeschlossene Verträge als Anteil aller Abschlüsse"),

  // health and life sciences
  k("health_life_sciences.pipeline_value", "Risk-adjusted pipeline value", "Risikoadjustierter Pipelinewert", "eur", "higher", "Expected value of the products in development, weighted by their chance of approval", "Erwarteter Wert der Produkte in Entwicklung, gewichtet mit ihrer Zulassungswahrscheinlichkeit"),
  k("health_life_sciences.time_to_market", "Time to market", "Zeit bis zur Markteinführung", "months", "lower", "Months from the start of development to market launch", "Monate vom Entwicklungsstart bis zur Markteinführung"),
  k("health_life_sciences.trial_enrolment", "Trial enrolment rate", "Rekrutierungsrate in Studien", "per_month", "higher", "Patients enrolled in clinical trials per month", "In klinische Studien aufgenommene Patienten pro Monat"),
  k("health_life_sciences.bed_occupancy", "Bed occupancy", "Bettenauslastung", "percent", "higher", "Bed days used as a share of the bed days available", "Belegte Betttage als Anteil der verfügbaren Betttage"),
  k("health_life_sciences.length_of_stay", "Average length of stay", "Durchschnittliche Verweildauer", "days", "lower", "Average days a patient stays in hospital", "Durchschnittliche Tage, die ein Patient im Krankenhaus bleibt"),
  k("health_life_sciences.readmission_rate", "Readmission rate", "Wiederaufnahmequote", "percent", "lower", "Share of patients readmitted within 30 days of discharge", "Anteil der Patienten, die binnen 30 Tagen nach Entlassung erneut aufgenommen werden"),
  k("health_life_sciences.right_first_time", "Right-first-time batches", "Chargen ohne Nacharbeit", "percent", "higher", "Share of production batches released without rework", "Anteil der Produktionschargen, die ohne Nacharbeit freigegeben werden"),
  k("health_life_sciences.supply_service_level", "Supply service level", "Lieferfähigkeit", "percent", "higher", "Share of orders delivered in full and on time", "Anteil der Aufträge, die vollständig und pünktlich geliefert werden"),
  k("health_life_sciences.appointment_wait", "Waiting time for an appointment", "Wartezeit auf einen Termin", "days", "lower", "Average days a patient waits for an appointment", "Durchschnittliche Tage, die ein Patient auf einen Termin wartet"),
  k("health_life_sciences.new_product_share", "Revenue from new products", "Umsatzanteil neuer Produkte", "percent", "higher", "Revenue from products launched in the last five years, as a share of revenue", "Umsatz mit Produkten, die in den letzten fünf Jahren eingeführt wurden, als Anteil am Umsatz"),

  // public sector
  k("public_sector.processing_time", "Processing time", "Bearbeitungsdauer", "days", "lower", "Days from an application to its decision", "Tage vom Antrag bis zur Entscheidung"),
  k("public_sector.services_online", "Share of services online", "Anteil online verfügbarer Leistungen", "percent", "higher", "Services that can be applied for online, as a share of all services", "Leistungen, die online beantragt werden können, als Anteil aller Leistungen"),
  k("public_sector.digital_uptake", "Digital uptake", "Nutzungsquote digitaler Angebote", "percent", "higher", "Share of applications filed online where an online form exists", "Anteil der online gestellten Anträge, wo es ein Onlineformular gibt"),
  k("public_sector.cost_per_case", "Cost per case", "Kosten je Fall", "eur_per_case", "lower", "Cost of a service divided by the cases it handles", "Kosten einer Leistung geteilt durch die bearbeiteten Fälle"),
  k("public_sector.user_satisfaction", "User satisfaction", "Zufriedenheit der Nutzenden", "percent", "higher", "Share of surveyed users satisfied with the service", "Anteil der befragten Nutzenden, die mit der Leistung zufrieden sind"),
  k("public_sector.case_backlog", "Case backlog", "Fallrückstand", "count", "lower", "Open cases older than the target processing time", "Offene Fälle, die älter sind als die angestrebte Bearbeitungsdauer"),
  k("public_sector.complete_first_time", "Applications complete first time", "Quote vollständiger Erstanträge", "percent", "higher", "Share of applications complete at their first submission", "Anteil der Anträge, die beim ersten Einreichen vollständig sind"),
  k("public_sector.vacancy_rate", "Vacancy rate", "Quote unbesetzter Stellen", "percent", "lower", "Unfilled posts as a share of all posts", "Unbesetzte Stellen als Anteil aller Stellen"),
  k("public_sector.service_availability", "Availability of online services", "Verfügbarkeit der Onlinedienste", "percent", "higher", "Share of the time the online services work", "Anteil der Zeit, in der die Onlinedienste funktionieren"),

  // software and digital
  k("software_digital.arr", "Annual recurring revenue", "Jährlich wiederkehrender Umsatz", "eur", "higher", "Subscription revenue a year, at the current contracts", "Abonnementumsatz eines Jahres auf Basis der laufenden Verträge"),
  k("software_digital.net_revenue_retention", "Net revenue retention", "Netto-Umsatzbindung", "percent", "higher", "Recurring revenue from last year's customers now, as a share of their recurring revenue a year ago", "Wiederkehrender Umsatz der Vorjahreskunden heute, als Anteil ihres wiederkehrenden Umsatzes vor einem Jahr"),
  k("software_digital.gross_revenue_churn", "Gross revenue churn", "Brutto-Umsatzabwanderung", "percent", "lower", "Recurring revenue lost to cancellations and downgrades in a year, as a share of recurring revenue", "Durch Kündigungen und Herabstufungen verlorener wiederkehrender Umsatz in einem Jahr, als Anteil am wiederkehrenden Umsatz"),
  k("software_digital.cac_payback", "Customer acquisition payback", "Amortisationsdauer der Kundengewinnung", "months", "lower", "Months of gross margin needed to earn back what winning a customer cost", "Monate Bruttomarge, die nötig sind, um die Kosten der Kundengewinnung zurückzuverdienen"),
  k("software_digital.stickiness", "Daily to monthly active users", "Täglich zu monatlich aktiven Nutzern", "percent", "higher", "Daily active users as a share of monthly active users", "Täglich aktive Nutzer als Anteil der monatlich aktiven Nutzer"),
  k("software_digital.uptime", "Service uptime", "Dienstverfügbarkeit", "percent", "higher", "Share of the time the service is available", "Anteil der Zeit, in der der Dienst verfügbar ist"),
  k("software_digital.rule_of_40", "Rule of 40 score", "Rule-of-40-Wert", "percent", "higher", "Revenue growth plus EBITDA margin, both in percent", "Umsatzwachstum plus EBITDA-Marge, beides in Prozent"),
  k("software_digital.deployment_frequency", "Deployment frequency", "Häufigkeit der Auslieferungen", "per_week", "higher", "Releases to production per week", "Auslieferungen in die Produktion pro Woche"),
  k("software_digital.time_to_value", "Time to value", "Zeit bis zum Nutzen", "days", "lower", "Days from signing to the customer's first productive use", "Tage von der Unterschrift bis zur ersten produktiven Nutzung beim Kunden"),
  k("software_digital.resolution_time", "Support resolution time", "Lösungszeit im Support", "hours", "lower", "Average hours from a support ticket to its solution", "Durchschnittliche Stunden von der Supportanfrage bis zur Lösung"),

  // chemicals and materials
  k("chemicals_materials.plant_utilisation", "Plant utilisation", "Anlagenauslastung", "percent", "higher", "Output as a share of the plants' capacity", "Produktion als Anteil der Anlagenkapazität"),
  k("chemicals_materials.energy_intensity", "Energy intensity", "Energieintensität", "mwh_per_t", "lower", "Energy used per tonne produced", "Energieeinsatz je produzierter Tonne"),
  k("chemicals_materials.raw_material_cost_share", "Raw material cost share", "Rohstoffkostenanteil", "percent", "lower", "Raw material cost as a share of revenue", "Rohstoffkosten als Anteil am Umsatz"),
  k("chemicals_materials.specialty_share", "Share of specialty products", "Anteil Spezialprodukte", "percent", "higher", "Revenue from specialty products as a share of revenue", "Umsatz mit Spezialprodukten als Anteil am Umsatz"),
  k("chemicals_materials.co2_per_tonne", "CO2 per tonne produced", "CO2 je produzierter Tonne", "t_co2e_per_t", "lower", "Greenhouse-gas emissions in tonnes of CO2 equivalent per tonne produced", "Treibhausgasemissionen in Tonnen CO2-Äquivalent je produzierter Tonne"),
  k("chemicals_materials.process_yield", "Process yield", "Prozessausbeute", "percent", "higher", "Good product as a share of the raw material put in", "Gutes Produkt als Anteil des eingesetzten Rohstoffs"),
  k("chemicals_materials.working_capital_days", "Net working capital in days", "Nettoumlaufvermögen in Tagen", "days", "lower", "Inventory plus receivables minus payables, in days of sales", "Vorräte plus Forderungen minus Verbindlichkeiten, in Umsatztagen"),
  k("chemicals_materials.lost_time_injuries", "Lost-time injury rate", "Unfallrate mit Ausfallzeit", "per_million_hours", "lower", "Injuries that stop work for at least a day, per million hours worked", "Unfälle mit mindestens einem Ausfalltag je Million Arbeitsstunden"),
  k("chemicals_materials.on_time_in_full", "On time in full", "Pünktlich und vollständig geliefert", "percent", "higher", "Share of orders delivered on time and in full", "Anteil der Aufträge, die pünktlich und vollständig geliefert werden"),
  k("chemicals_materials.recycled_content", "Recycled content", "Rezyklatanteil", "percent", "higher", "Recycled material as a share of the material used", "Rezyklat als Anteil des eingesetzten Materials")
]);

/** The KPIs an agent may choose from for a sector: the sector's own, then the general ones. */
export function kpisFor(sector) {
  return KPIS.filter((x) => x.sector === sector || x.sector === "general");
}

/** One KPI by id, or null. */
export function kpi(id) {
  return KPIS.find((x) => x.id === id) || null;
}
