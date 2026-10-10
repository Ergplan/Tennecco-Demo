// Sample documents for the esgOS walkthrough. Bengaluru's volumes follow the plant note
// (33 lakh kWh a month: 27.5 lakh PPA, the rest from BESCOM); other values are
// illustrative and marked so on screen.

export type BillField = { label: string; value: string; confidence: number }

export type SampleBill = {
  id: string
  file: string
  kind: "Electricity · DISCOM" | "Electricity · PPA / wheeling" | "Fuel · PNG" | "Fuel · diesel" | "Water"
  issuer: string
  siteId: string
  period: string
  fields: BillField[]
  maps: string[]
  check?: { ok: boolean; text: string }
  illustrative: boolean
}

export const SAMPLE_BILLS: SampleBill[] = [
  {
    id: "bescom-blr",
    file: "BESCOM_HT_Sep-2026_FMGIL-Yelahanka.pdf",
    kind: "Electricity · DISCOM",
    issuer: "BESCOM",
    siteId: "fmgil-blr",
    period: "1–30 Sep 2026",
    fields: [
      { label: "Consumer / RR no.", value: "HT-xxxx (masked)", confidence: 0.99 },
      { label: "Tariff", value: "HT-2(a) industrial", confidence: 0.98 },
      { label: "Grid import", value: "5,50,000 kWh", confidence: 0.97 },
      { label: "Contract demand", value: "on bill", confidence: 0.95 },
      { label: "Energy charges", value: "₹27,50,000", confidence: 0.96 },
    ],
    maps: ["FMGIL › Bengaluru plant", "Scope 2 · purchased electricity", "BRSR P6 · Q1 energy, non-renewable"],
    check: { ok: true, text: "Period follows August's bill; kWh within 4% of the 12-month median" },
    illustrative: false,
  },
  {
    id: "ppa-blr",
    file: "PPA_wheeling_statement_Sep-2026.pdf",
    kind: "Electricity · PPA / wheeling",
    issuer: "Renewable generator (wheeled via KPTCL)",
    siteId: "fmgil-blr",
    period: "Sep 2026",
    fields: [
      { label: "Units wheeled (after banking)", value: "27,50,000 kWh", confidence: 0.97 },
      { label: "Source", value: "Wind / solar", confidence: 0.9 },
      { label: "RECs / attributes", value: "not attached", confidence: 0.86 },
    ],
    maps: ["FMGIL › Bengaluru plant", "BRSR P6 · Q1 energy, renewable", "Scope 2 market-based: needs certificates"],
    check: { ok: false, text: "No certificate evidence: counted renewable for energy, not yet zero in market-based Scope 2" },
    illustrative: false,
  },
  {
    id: "png-blr",
    file: "PNG_invoice_Sep-2026.pdf",
    kind: "Fuel · PNG",
    issuer: "City gas distributor",
    siteId: "fmgil-blr",
    period: "Sep 2026",
    fields: [
      { label: "Quantity", value: "42,000 SCM", confidence: 0.96 },
      { label: "GCV", value: "on invoice", confidence: 0.88 },
      { label: "Amount", value: "₹23,10,000", confidence: 0.95 },
    ],
    maps: ["FMGIL › Bengaluru plant", "Scope 1 · stationary combustion", "BRSR P6 · Q1 energy, non-renewable"],
    check: { ok: true, text: "Converted at the invoice GCV; IPCC 2006 factor applied" },
    illustrative: true,
  },
  {
    id: "tangedco-chennai",
    file: "TNPDCL_HT_Sep-2026_Oragadam.pdf",
    kind: "Electricity · DISCOM",
    issuer: "TNPDCL",
    siteId: "tcail-chennai",
    period: "Sep 2026",
    fields: [
      { label: "Tariff", value: "HT-I A industrial", confidence: 0.97 },
      { label: "Grid import", value: "28,400 kWh", confidence: 0.96 },
      { label: "Wheeled RE adjusted", value: "2,81,000 kWh", confidence: 0.93 },
    ],
    maps: ["TCAIL › Chennai plant", "Scope 2 · purchased electricity", "BRSR P6 · Q1 energy"],
    check: { ok: true, text: "91% renewable this month, in line with the PPA" },
    illustrative: true,
  },
  {
    id: "msedcl-chakan",
    file: "MSEDCL_HT_Sep-2026_Chakan-I.pdf",
    kind: "Electricity · DISCOM",
    issuer: "MSEDCL",
    siteId: "tcail-chakan1",
    period: "Sep 2026",
    fields: [
      { label: "Grid import", value: "2,05,000 kWh", confidence: 0.97 },
      { label: "Rooftop solar (net meter)", value: "71,800 kWh", confidence: 0.94 },
    ],
    maps: ["TCAIL › Chakan I", "Scope 2 · purchased electricity", "BRSR P6 · Q1 energy, renewable"],
    check: { ok: true, text: "Rooftop generation fits 920 kWp at a monsoon-month yield" },
    illustrative: true,
  },
  {
    id: "diesel-hosur",
    file: "HSD_purchase_Sep-2026_Hosur.xlsx",
    kind: "Fuel · diesel",
    issuer: "Fuel supplier",
    siteId: "taipl-hosur",
    period: "Sep 2026",
    fields: [
      { label: "Quantity", value: "3,200 litres", confidence: 0.99 },
      { label: "Use", value: "DG sets", confidence: 0.9 },
    ],
    maps: ["TAIPL › Hosur plant", "Scope 1 · stationary combustion", "BRSR P6 · Q1 energy, non-renewable"],
    check: { ok: false, text: "First diesel record for Hosur: who owns this site's data? Ask the plant head" },
    illustrative: true,
  },
]

/** FY2025-26 monthly shape for Bengaluru: illustrative months around the plant note's 33 lakh. */
export const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
const SHAPE = [1.02, 1.04, 0.99, 0.97, 0.98, 1.0, 0.96, 0.99, 1.01, 0.98, 1.02, 1.04]
export const BLR_MONTHLY = SHAPE.map((k) => Math.round(3_300_000 * k))
