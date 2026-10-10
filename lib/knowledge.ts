import type { Source } from "./sites"

// Public-domain facts on greening electricity for an HT industrial consumer in India, with
// emphasis on Karnataka. Each fact carries its source; ranges are indicative, not quotes.

export type Route = {
  id: string
  name: string
  how: string
  low: number
  high: number
  /** true when the figure is a premium on top of grid power, not a landed price */
  premium?: boolean
  pros: string
  cons: string
  color: string
  sources: Source[]
}

export const ROUTES: Route[] = [
  {
    id: "rooftop",
    name: "Rooftop / on-site solar",
    how: "A developer builds and owns it on Tenneco's roofs (RESCO) and sells the units; or Tenneco buys it (capex about ₹30–44/Wp).",
    low: 3.5,
    high: 3.75,
    pros: "Cheapest unit, behind the meter: no open-access charges, no paperwork to count it",
    cons: "Daytime only; limited by roof area (≈1.45 GWh a year per MWp in Bengaluru)",
    color: "#f2b632",
    sources: [{ label: "Mercom, C&I rooftop costs, 2025", url: "https://mercomindia.com/ci-units-shouldnt-delay-solar-adoption-hoping-equipment-costs-will-fall" }],
  },
  {
    id: "captive",
    name: "Group captive (open access)",
    how: "Tenneco holds ≥26% of a solar / wind SPV and consumes ≥51% of its output, wheeled over the grid.",
    low: 3.5,
    high: 4.5,
    pros: "Captive use pays no cross-subsidy surcharge or additional surcharge in Karnataka",
    cons: "Equity and a long contract; banking costs 8% in kind under KERC 2025",
    color: "#14995a",
    sources: [
      { label: "Open-access market note (vendor), 2026", url: "https://feeds.optenpower.com/blog/india-solar-open-access-market" },
      { label: "Captive rules reset, Power Line, Jun 2026", url: "https://powerline.net.in/2026/06/15/framework-reset-revised-rules-for-captive-power-plants/" },
    ],
  },
  {
    id: "thirdparty",
    name: "Third-party open-access PPA",
    how: "A developer sells green power to the plant under a long-term PPA, wheeled through KPTCL and BESCOM.",
    low: 5.0,
    high: 6.0,
    pros: "No equity; can be hybrid wind–solar or round-the-clock",
    cons: "Pays cross-subsidy surcharge and BESCOM's additional surcharge (₹0.40/kWh from Mar 2026)",
    color: "#2f80ed",
    sources: [
      { label: "Open-access market note (vendor), 2026", url: "https://feeds.optenpower.com/blog/india-solar-open-access-market" },
      { label: "Mercom: Karnataka halves additional surcharge", url: "https://mercomindia.com/karnataka-halves-additional-surcharge-for-open-access-power" },
    ],
  },
  {
    id: "gdam",
    name: "Green Day-Ahead Market (IEX)",
    how: "Buy green power on the exchange for the next day, under open access.",
    low: 3.59,
    high: 3.92,
    pros: "Flexible, no long contract; FY2025-26 average ₹3.59/kWh before charges",
    cons: "Price and volume vary daily; open-access charges come on top",
    color: "#7f56c2",
    sources: [{ label: "IEX power market update, Mar 2026", url: "https://nsearchives.nseindia.com/corporate/IEX_06042026071613_Signed_IEX_Media_Release_Power_Market_Update_Mar26.pdf" }],
  },
  {
    id: "greentariff",
    name: "DISCOM green tariff",
    how: "BESCOM supplies certified green power for part or all of the load, for at least a year.",
    low: 0.5,
    high: 0.5,
    premium: true,
    pros: "No new contract or infrastructure: a request to BESCOM",
    cons: "A premium of 50 paise/kWh on the normal tariff (KERC); no saving",
    color: "#8fd3ad",
    sources: [{ label: "KERC green tariff, The Print", url: "https://theprint.in/india/kerc-approves-increase-of-energy-charges-by-5-paise-per-unit/902373/" }],
  },
  {
    id: "rec",
    name: "Renewable Energy Certificates",
    how: "Buy and retire RECs (1 REC = 1 MWh) to cover units still bought from the grid.",
    low: 0.034,
    high: 0.038,
    premium: true,
    pros: "Cheapest way to close the last few percent: ₹340–380 per REC on IEX in 2026",
    cons: "Adds no new renewable capacity, so it carries the least weight with investors and RE100",
    color: "#9aa6b5",
    sources: [{ label: "Mercom, IEX REC prices, 2026", url: "https://www.mercomindia.com/iexs-electricity-trading-volume-rises-in-july" }],
  },
]

export const REFERENCE_PRICES = [
  { label: "BESCOM HT-2(a) energy charge", value: 6.6, note: "FY2026-27, before demand charges", source: { label: "KERC tariff order, Mar 2025", url: "https://odishabytes.com/karnataka-power-tariff-revamped-lower-energy-rates-higher-fixed-charges-from-apr-1/amp/" } },
  { label: "Green offer to the plant", value: 6.96, note: "plant note" },
  { label: "DISCOM rate agreed with the plant", value: 5.0, note: "plant note" },
]

export type RuleEvent = { date: string; title: string; text: string; tone: "national" | "karnataka"; source: Source }

export const RULES: RuleEvent[] = [
  {
    date: "Jun 2022",
    title: "Green Energy Open Access Rules",
    text: "Open access for green power from 100 kW (was 1 MW), approval in 15 days, monthly banking, a cap on the cross-subsidy surcharge, and a duty on DISCOMs to offer a green tariff.",
    tone: "national",
    source: { label: "Power Line", url: "https://powerline.net.in/2022/06/07/green-energy-open-access-rules-2022-notified/" },
  },
  {
    date: "May 2023",
    title: "Second amendment",
    text: "The 100 kW test can be met by adding up connections in the same DISCOM division; no limit for captive users.",
    tone: "national",
    source: { label: "Power Line", url: "https://powerline.net.in/2023/05/26/mop-notifies-electricity-promoting-renewable-energy-through-green-energy-open-access-second-amendment-rules-2023/" },
  },
  {
    date: "Jan 2025",
    title: "Karnataka High Court quashes the GEOA Rules in the state",
    text: "The central rules and KERC's 2022 green open-access regulations are struck down for Karnataka; banking continues in the interim.",
    tone: "karnataka",
    source: { label: "LiveLaw", url: "https://www.livelaw.in/amp/high-court/karnataka-high-court/karnataka-high-court-strikes-down-2022-green-energy-open-access-rules-central-government-280291" },
  },
  {
    date: "Apr 2025",
    title: "KERC Open Access Regulations 2025",
    text: "The regime that applies in Bengaluru now: open access above 100 kW, monthly banking with an 8% in-kind charge and no carry-forward, standby power at 125%.",
    tone: "karnataka",
    source: { label: "Renewable Watch", url: "https://renewablewatch.in/2025/04/25/karnataka-announces-open-access-regulations-2025/" },
  },
  {
    date: "Mar 2026",
    title: "BESCOM additional surcharge halved",
    text: "₹0.40/kWh on open-access units, down from ₹0.82; captive use is exempt.",
    tone: "karnataka",
    source: { label: "Mercom", url: "https://mercomindia.com/karnataka-halves-additional-surcharge-for-open-access-power" },
  },
  {
    date: "Jun 2026",
    title: "Captive rules revised",
    text: "Electricity (Amendment) Rules 2026 reportedly drop the proportional-consumption test for group captive and cap each user at its entitlement.",
    tone: "national",
    source: { label: "Power Line", url: "https://powerline.net.in/2026/06/15/framework-reset-revised-rules-for-captive-power-plants/" },
  },
]

export const COUNTING: { title: string; text: string; source: Source }[] = [
  {
    title: "Two Scope 2 numbers",
    text: "The GHG Protocol asks for both: location-based (every kWh at the grid factor) and market-based (what the contracts say). A green PPA only lowers the market-based figure.",
    source: { label: "GHG Protocol", url: "https://ghgprotocol.org/blog/top-ten-questions-about-scope-2-guidance" },
  },
  {
    title: "The PPA counts only with its certificates",
    text: "Renewable units count as zero-carbon when their attributes (or RECs) are transferred to Tenneco and retired. For Bengaluru's 27.5 lakh units a month, that is 2,750 RECs a month to evidence.",
    source: { label: "GHG Protocol Scope 2 quality criteria", url: "https://ghgprotocol.org/blog/top-ten-questions-about-scope-2-guidance" },
  },
  {
    title: "Grid factor: 0.710 tCO₂/MWh",
    text: "CEA CO₂ Baseline Database v21 (FY2024-25 weighted average) is the latest confirmed value; BRSR uses the latest CEA factor.",
    source: { label: "CEA v21 user guide", url: "https://cea.nic.in/wp-content/uploads/baseline/2025/12/User_Guide_V_21.0.pdf" },
  },
  {
    title: "BRSR Core is assured",
    text: "Energy footprint (total, % renewable, intensity) and GHG footprint sit in BRSR Core, which listed companies must have assured.",
    source: { label: "SEBI circular, Jul 2023", url: "https://ca2013.com/wp-content/uploads/2023/07/SEBI-Circular_12.07.2023.pdf" },
  },
  {
    title: "RE100's quality bar",
    text: "Plants commissioned or repowered within 15 years, bought within the same market. Rooftop and new captive capacity pass easily; old-plant certificates may not.",
    source: { label: "RE100 criteria update", url: "https://3degreesinc.com/insights/re100-technical-criteria-changes/" },
  },
]

export const EFFICIENCY = {
  text: "ISO 50001 sets up an energy management system with performance indicators and a baseline. In a US DOE study, ten facilities cut energy costs by 12% on average within 15 months. FMGIL already reports managing its sites to ISO 50001, so the first step is to measure what that system is delivering plant by plant.",
  source: { label: "US DOE ISO 50001 brochure", url: "https://www.energy.gov/sites/prod/files/2017/09/f36/ISO%2050001%20Brochure_0.pdf" },
}
