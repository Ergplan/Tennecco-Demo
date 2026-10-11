// Seeded demo data for a fictional group: Aurelia Foods Group.
// No real company, person or registration is represented. Identifiers follow
// plausible Indian formats (CIN, PAN, GSTIN with a valid check digit) only.

import type {
  AnswerValue,
  DocumentRecord,
  EnergySummary,
  Group,
  LegalEntity,
  Meter,
  MeterType,
  SiteType,
} from "./types"
import { NOT_SURE } from "./types"
import { STATE_CODES } from "./geo"

export const DEMO_LABEL = "Demo data: Aurelia Foods Group"
export const DEMO_USER = "Ananya Rao"
export const DEMO_USER_ROLE = "Group ESG lead"
export const AGENT_ACTOR = "esgOS agent"
export const FISCAL_YEAR = "FY 2026-27"
export const PERIOD = "Apr 2026 – Mar 2027"
export const TODAY = "2026-10-11"

// ---------------------------------------------------------------------------
// GSTIN check digit (mod-36 Luhn variant used by GSTN)
const CODEPOINTS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
export function gstinCheckDigit(first14: string): string {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const v = CODEPOINTS.indexOf(first14[i])
    const product = v * (i % 2 === 0 ? 1 : 2)
    sum += Math.floor(product / 36) + (product % 36)
  }
  return CODEPOINTS[(36 - (sum % 36)) % 36]
}
export function makeGstin(state: string, pan: string, entityNo = "1"): string {
  const code = STATE_CODES[state] ?? "99"
  const first14 = `${code}${pan}${entityNo}Z`
  return first14 + gstinCheckDigit(first14)
}

// ---------------------------------------------------------------------------
export const GROUP: Group = {
  id: "grp-aurelia",
  name: "Aurelia Foods Group",
  pans: ["AABCA4821K", "AAKCA7315M", "AAHCA2290P", "AALCA6604Q"],
  fiscalYear: FISCAL_YEAR,
  period: PERIOD,
}

const PAN = {
  foods: "AABCA4821K",
  snacks: "AAKCA7315M",
  energy: "AAHCA2290P",
  logistics: "AALCA6604Q",
}

export const ENTITY_IDS = {
  foods: "ent-foods",
  snacks: "ent-snacks",
  energy: "ent-energy",
  logistics: "ent-logistics",
} as const

export const ENTITIES: LegalEntity[] = [
  {
    id: ENTITY_IDS.foods,
    name: "Aurelia Foods Limited",
    shortName: "Foods Ltd",
    cin: "L15490UP2004PLC028811",
    pan: PAN.foods,
    relationship: "holding",
    registeredOffice: "Sector 63, Noida, Uttar Pradesh",
    note: "Listed holding company",
    gstins: ["Uttar Pradesh", "Rajasthan", "Tamil Nadu", "Karnataka", "Delhi", "Haryana"].map((state) => ({
      gstin: makeGstin(state, PAN.foods),
      state,
    })),
  },
  {
    id: ENTITY_IDS.snacks,
    name: "Aurelia Snacks Private Limited",
    shortName: "Snacks Pvt",
    cin: "U15400MH2011PTC223344",
    pan: PAN.snacks,
    parentId: ENTITY_IDS.foods,
    relationship: "subsidiary",
    holdingPct: 100,
    registeredOffice: "Chakan, Pune, Maharashtra",
    gstins: ["Maharashtra", "Madhya Pradesh", "Telangana", "Haryana"].map((state) => ({
      gstin: makeGstin(state, PAN.snacks),
      state,
    })),
  },
  {
    id: ENTITY_IDS.energy,
    name: "Aurelia Energy Private Limited",
    shortName: "Energy Pvt",
    cin: "U40106RJ2016PTC054312",
    pan: PAN.energy,
    parentId: ENTITY_IDS.foods,
    relationship: "subsidiary",
    holdingPct: 74,
    registeredOffice: "Jaipur, Rajasthan",
    note: "Owns the open-access solar supplying group plants; no factory",
    gstins: [{ gstin: makeGstin("Rajasthan", PAN.energy), state: "Rajasthan" }],
  },
  {
    id: ENTITY_IDS.logistics,
    name: "Aurelia Logistics Private Limited",
    shortName: "Logistics JV",
    cin: "U63090WB2018PTC226781",
    pan: PAN.logistics,
    parentId: ENTITY_IDS.foods,
    relationship: "jv",
    holdingPct: 50,
    registeredOffice: "Dankuni, Kolkata, West Bengal",
    note: "50:50 joint venture",
    gstins: [{ gstin: makeGstin("West Bengal", PAN.logistics), state: "West Bengal" }],
  },
]

export function gstinFor(entityKey: keyof typeof PAN, state: string) {
  return makeGstin(state, PAN[entityKey])
}

// ---------------------------------------------------------------------------
// ergOS: metered sites, meters and FY energy summaries

export type ErgosSiteRecord = {
  ergosSiteId: string
  name: string
  city: string
  state: string
  address: string
  lat: number
  lng: number
  billingGstin: string
  dataSince: string
  meterCount: number
  label: string
}

export const ERGOS_SITES: ErgosSiteRecord[] = [
  { ergosSiteId: "ERG-NOI-01", name: "Noida Plant", city: "Noida", state: "Uttar Pradesh", address: "Plot C-41, Sector 63, Noida", lat: 28.6273, lng: 77.3725, billingGstin: gstinFor("foods", "Uttar Pradesh"), dataSince: "Apr 2022", meterCount: 6, label: "Noida Plant" },
  { ergosSiteId: "ERG-GNO-01", name: "Greater Noida Plant", city: "Greater Noida", state: "Uttar Pradesh", address: "Plot 7, Ecotech-III, Greater Noida", lat: 28.4744, lng: 77.504, billingGstin: gstinFor("foods", "Uttar Pradesh"), dataSince: "Jul 2022", meterCount: 5, label: "Greater Noida Plant" },
  { ergosSiteId: "ERG-MZN-01", name: "Muzaffarnagar Plant", city: "Muzaffarnagar", state: "Uttar Pradesh", address: "Begrajpur Industrial Area, Muzaffarnagar", lat: 29.4727, lng: 77.7085, billingGstin: gstinFor("foods", "Uttar Pradesh"), dataSince: "Jan 2024", meterCount: 2, label: "Muzaffarnagar Plant" },
  { ergosSiteId: "ERG-JPR-01", name: "Jaipur Plant", city: "Jaipur", state: "Rajasthan", address: "SP-18, Sitapura Industrial Area, Jaipur", lat: 26.7788, lng: 75.8458, billingGstin: gstinFor("foods", "Rajasthan"), dataSince: "Oct 2022", meterCount: 6, label: "Jaipur Plant" },
  { ergosSiteId: "ERG-PUN-01", name: "Pune Plant", city: "Pune", state: "Maharashtra", address: "MIDC Phase II, Chakan, Pune", lat: 18.7606, lng: 73.8636, billingGstin: gstinFor("snacks", "Maharashtra"), dataSince: "Apr 2022", meterCount: 6, label: "Pune Plant" },
  { ergosSiteId: "ERG-IDR-01", name: "Indore Plant", city: "Indore", state: "Madhya Pradesh", address: "Sector 3, Pithampur, Indore", lat: 22.6136, lng: 75.675, billingGstin: gstinFor("snacks", "Madhya Pradesh"), dataSince: "Feb 2023", meterCount: 5, label: "Indore Plant" },
  { ergosSiteId: "ERG-HYD-01", name: "Hyderabad Plant", city: "Hyderabad", state: "Telangana", address: "IDA Patancheru, Hyderabad", lat: 17.5326, lng: 78.2649, billingGstin: gstinFor("snacks", "Telangana"), dataSince: "Nov 2022", meterCount: 5, label: "Hyderabad Plant" },
  { ergosSiteId: "ERG-CHN-01", name: "Chennai Plant — Sriperumbudur", city: "Chennai", state: "Tamil Nadu", address: "SIPCOT Sriperumbudur, Chennai", lat: 12.9675, lng: 79.9419, billingGstin: gstinFor("foods", "Tamil Nadu"), dataSince: "Apr 2023", meterCount: 6, label: "Sriperumbudur Plant (interval meters)" },
  { ergosSiteId: "ERG-CHN-02", name: "Chennai — Sriperumbudur (bill import)", city: "Chennai", state: "Tamil Nadu", address: "SIPCOT Sriperumbudur, Chennai", lat: 12.9702, lng: 79.9388, billingGstin: gstinFor("foods", "Tamil Nadu"), dataSince: "Jun 2024", meterCount: 1, label: "Sriperumbudur (utility bill import)" },
  { ergosSiteId: "ERG-BLR-01", name: "Bengaluru Plant", city: "Bengaluru", state: "Karnataka", address: "Bommasandra Industrial Area, Bengaluru", lat: 12.8166, lng: 77.695, billingGstin: gstinFor("foods", "Karnataka"), dataSince: "Aug 2022", meterCount: 5, label: "Bengaluru Plant" },
]

const METER_LABELS: Record<MeterType, string> = {
  grid: "Grid incomer",
  solar: "Open-access solar",
  wind: "Open-access wind",
  rooftop: "Rooftop solar",
  dg: "DG set",
  steam: "Steam header",
  water: "Water withdrawal",
}

function meters(prefix: string, types: MeterType[], since: string): Meter[] {
  const code: Record<MeterType, string> = { grid: "INC", solar: "OAS", wind: "OAW", rooftop: "RTS", dg: "DG", steam: "STM", water: "WTR" }
  return types.map((t) => ({ id: `${prefix}-${code[t]}-01`, type: t, label: METER_LABELS[t], since }))
}

export const ERGOS_METERS: Record<string, Meter[]> = {
  "ERG-NOI-01": meters("NOI", ["grid", "solar", "rooftop", "dg", "steam", "water"], "Apr 2022"),
  "ERG-GNO-01": meters("GNO", ["grid", "solar", "rooftop", "dg", "steam", "water"], "Jul 2022"),
  "ERG-MZN-01": meters("MZN", ["grid", "rooftop"], "Jan 2024"),
  "ERG-JPR-01": meters("JPR", ["grid", "solar", "rooftop", "dg", "steam", "water"], "Oct 2022"),
  "ERG-PUN-01": meters("PUN", ["grid", "wind", "rooftop", "dg", "steam", "water"], "Apr 2022"),
  "ERG-IDR-01": meters("IDR", ["grid", "solar", "rooftop", "dg", "steam", "water"], "Feb 2023"),
  "ERG-HYD-01": meters("HYD", ["grid", "solar", "rooftop", "dg", "steam", "water"], "Nov 2022"),
  "ERG-CHN-01": meters("CHN", ["grid", "wind", "rooftop", "dg", "steam", "water"], "Apr 2023"),
  "ERG-CHN-02": meters("CHB", ["grid"], "Jun 2024"),
  "ERG-BLR-01": meters("BLR", ["grid", "wind", "solar", "rooftop", "dg"], "Aug 2022"),
}

function summary(
  ergosSiteId: string,
  annualMWh: number,
  shares: EnergySummary["shares"],
  peakMW: number,
  contractedMW: number,
  completeness: number,
  extra: Partial<EnergySummary> = {},
): Omit<EnergySummary, "siteId"> {
  const renewableShare = +(shares.openAccessSolar + shares.wind + shares.rooftop).toFixed(2)
  const tariff = 7.6 + (annualMWh % 7) / 10 // ₹/kWh, deterministic variation
  return {
    ergosSiteId,
    period: PERIOD,
    annualMWh,
    shares,
    renewableShare,
    peakMW,
    contractedMW,
    costCr: +((annualMWh * 1000 * tariff) / 1e7).toFixed(1),
    completeness,
    dgMWh: 0,
    dgDieselKL: 0,
    ...extra,
  }
}

export const ERGOS_ENERGY: Record<string, Omit<EnergySummary, "siteId">> = {
  "ERG-NOI-01": summary("ERG-NOI-01", 31200, { grid: 0.6, openAccessSolar: 0.26, wind: 0, rooftop: 0.08, exchange: 0.06 }, 6.3, 7.5, 0.98, { dgMWh: 410, dgDieselKL: 118, steamTonnes: 64800, waterKL: 212000, openAccessNote: "Open-access solar from Aurelia Energy Pvt Ltd (group captive)" }),
  "ERG-GNO-01": summary("ERG-GNO-01", 18400, { grid: 0.66, openAccessSolar: 0.22, wind: 0, rooftop: 0.07, exchange: 0.05 }, 3.9, 4.5, 0.97, { dgMWh: 260, dgDieselKL: 74, steamTonnes: 38100, waterKL: 131000, openAccessNote: "Open-access solar from Aurelia Energy Pvt Ltd (group captive)" }),
  "ERG-MZN-01": summary("ERG-MZN-01", 9800, { grid: 0.94, openAccessSolar: 0, wind: 0, rooftop: 0.06, exchange: 0 }, 2.1, 2.5, 0.96),
  "ERG-JPR-01": summary("ERG-JPR-01", 14600, { grid: 0.52, openAccessSolar: 0.38, wind: 0, rooftop: 0.1, exchange: 0 }, 3.0, 3.5, 0.99, { dgMWh: 150, dgDieselKL: 43, steamTonnes: 29400, waterKL: 98000, openAccessNote: "Open-access solar from Aurelia Energy Pvt Ltd (group captive)" }),
  "ERG-PUN-01": summary("ERG-PUN-01", 22800, { grid: 0.58, openAccessSolar: 0, wind: 0.24, rooftop: 0.06, exchange: 0.12 }, 4.6, 5.5, 0.96, { dgMWh: 300, dgDieselKL: 86, steamTonnes: 47500, waterKL: 164000, openAccessNote: "Third-party open-access wind (Maharashtra)" }),
  "ERG-IDR-01": summary("ERG-IDR-01", 12900, { grid: 0.71, openAccessSolar: 0.21, wind: 0, rooftop: 0.08, exchange: 0 }, 2.8, 3.2, 0.95, { dgMWh: 190, dgDieselKL: 55, steamTonnes: 26200, waterKL: 87000, openAccessNote: "Third-party open-access solar (Madhya Pradesh)" }),
  "ERG-HYD-01": summary("ERG-HYD-01", 16700, { grid: 0.62, openAccessSolar: 0.3, wind: 0, rooftop: 0.08, exchange: 0 }, 3.4, 4.0, 0.97, { dgMWh: 220, dgDieselKL: 63, steamTonnes: 33900, waterKL: 119000, openAccessNote: "Third-party open-access solar (Telangana)" }),
  "ERG-CHN-01": summary("ERG-CHN-01", 19500, { grid: 0.45, openAccessSolar: 0, wind: 0.41, rooftop: 0.07, exchange: 0.07 }, 4.1, 5.0, 0.93, { dgMWh: 280, dgDieselKL: 81, steamTonnes: 40200, waterKL: 142000, openAccessNote: "Third-party open-access wind (Tamil Nadu)" }),
  "ERG-CHN-02": summary("ERG-CHN-02", 18900, { grid: 1, openAccessSolar: 0, wind: 0, rooftop: 0, exchange: 0 }, 4.0, 5.0, 0.61, { openAccessNote: "Utility bills only; no interval data" }),
  "ERG-BLR-01": summary("ERG-BLR-01", 11300, { grid: 0.55, openAccessSolar: 0.2, wind: 0.18, rooftop: 0.07, exchange: 0 }, 2.5, 3.0, 0.98, { dgMWh: 140, dgDieselKL: 40, openAccessNote: "Third-party open-access wind and solar (Karnataka); electric ovens, no steam" }),
}

// ---------------------------------------------------------------------------
// GST registry (seeded records; demo mode)

export type GstPremiseRecord = {
  id: string
  gstin: string
  legalName: string
  tradeName: string
  state: string
  city: string
  address: string
  natureOfBusiness: "Factory / Manufacturing" | "Warehouse / Depot" | "Office / Sale Office"
  premiseType: "principal" | "additional"
}

const legal = (k: keyof typeof PAN) => ENTITIES.find((e) => e.pan === PAN[k])!.name

export const GST_PREMISES: GstPremiseRecord[] = [
  { id: "gst-noi", gstin: gstinFor("foods", "Uttar Pradesh"), legalName: legal("foods"), tradeName: "Aurelia Foods", state: "Uttar Pradesh", city: "Noida", address: "Plot C-41, Sector 63, Noida", natureOfBusiness: "Factory / Manufacturing", premiseType: "principal" },
  { id: "gst-gno", gstin: gstinFor("foods", "Uttar Pradesh"), legalName: legal("foods"), tradeName: "Aurelia Foods", state: "Uttar Pradesh", city: "Greater Noida", address: "Plot 7, Ecotech-III, Greater Noida", natureOfBusiness: "Factory / Manufacturing", premiseType: "additional" },
  { id: "gst-mzn", gstin: gstinFor("foods", "Uttar Pradesh"), legalName: legal("foods"), tradeName: "Aurelia Foods", state: "Uttar Pradesh", city: "Muzaffarnagar", address: "Begrajpur Industrial Area, Muzaffarnagar", natureOfBusiness: "Factory / Manufacturing", premiseType: "additional" },
  { id: "gst-jpr", gstin: gstinFor("foods", "Rajasthan"), legalName: legal("foods"), tradeName: "Aurelia Foods", state: "Rajasthan", city: "Jaipur", address: "SP-18, Sitapura Industrial Area, Jaipur", natureOfBusiness: "Factory / Manufacturing", premiseType: "principal" },
  { id: "gst-pun", gstin: gstinFor("snacks", "Maharashtra"), legalName: legal("snacks"), tradeName: "Aurelia Snacks", state: "Maharashtra", city: "Pune", address: "MIDC Phase II, Chakan, Pune", natureOfBusiness: "Factory / Manufacturing", premiseType: "principal" },
  { id: "gst-idr", gstin: gstinFor("snacks", "Madhya Pradesh"), legalName: legal("snacks"), tradeName: "Aurelia Snacks", state: "Madhya Pradesh", city: "Indore", address: "Sector 3, Pithampur, Indore", natureOfBusiness: "Factory / Manufacturing", premiseType: "principal" },
  { id: "gst-hyd", gstin: gstinFor("snacks", "Telangana"), legalName: legal("snacks"), tradeName: "Aurelia Snacks", state: "Telangana", city: "Hyderabad", address: "IDA Patancheru, Hyderabad", natureOfBusiness: "Factory / Manufacturing", premiseType: "principal" },
  { id: "gst-chn", gstin: gstinFor("foods", "Tamil Nadu"), legalName: legal("foods"), tradeName: "Aurelia Foods", state: "Tamil Nadu", city: "Chennai", address: "SIPCOT Sriperumbudur, Chennai", natureOfBusiness: "Factory / Manufacturing", premiseType: "principal" },
  { id: "gst-hsr", gstin: gstinFor("foods", "Tamil Nadu"), legalName: legal("foods"), tradeName: "Aurelia Foods", state: "Tamil Nadu", city: "Hosur", address: "SIPCOT Phase II, Hosur", natureOfBusiness: "Factory / Manufacturing", premiseType: "additional" },
  { id: "gst-blr", gstin: gstinFor("foods", "Karnataka"), legalName: legal("foods"), tradeName: "Aurelia Foods", state: "Karnataka", city: "Bengaluru", address: "Bommasandra Industrial Area, Bengaluru", natureOfBusiness: "Factory / Manufacturing", premiseType: "principal" },
  { id: "gst-kol", gstin: gstinFor("logistics", "West Bengal"), legalName: legal("logistics"), tradeName: "Aurelia Logistics", state: "West Bengal", city: "Kolkata", address: "NH-19, Dankuni, Kolkata", natureOfBusiness: "Warehouse / Depot", premiseType: "principal" },
  // Registered under the holding company's PAN although the trade name is the subsidiary's: the deliberate error.
  { id: "gst-ggn", gstin: gstinFor("foods", "Haryana"), legalName: legal("foods"), tradeName: "Aurelia Snacks — Gurugram Sales Office", state: "Haryana", city: "Gurugram", address: "Plot 112, Udyog Vihar Phase IV, Gurugram", natureOfBusiness: "Office / Sale Office", premiseType: "principal" },
]

// ---------------------------------------------------------------------------
// Pasted site list (prefilled in demo mode)

export const DEFAULT_PASTE = `Corporate office — Connaught Place, New Delhi
Noida plant — Sector 63, Noida`

// ---------------------------------------------------------------------------
// Corporate registry (MCA master data / AOC-1), seeded

export const MCA_TREE = ENTITIES.map((e) => ({
  entityId: e.id,
  name: e.name,
  cin: e.cin!,
  parentId: e.parentId,
  relationship: e.relationship!,
  holdingPct: e.holdingPct,
}))

// ---------------------------------------------------------------------------
// HRMS, ERP, EHS (deliberately partial coverage)

export const HRMS_EXTRACT_DATE = "30 Sep 2026"
// Headcount snapshot by site city (Foods Ltd sites only; Snacks Pvt runs a separate payroll)
export const HRMS_HEADCOUNT: Record<string, { permanent: number; contract: number }> = {
  Noida: { permanent: 612, contract: 240 },
  "Greater Noida": { permanent: 388, contract: 150 },
  Muzaffarnagar: { permanent: 214, contract: 96 },
  Jaipur: { permanent: 296, contract: 110 },
  Chennai: { permanent: 341, contract: 128 },
  Bengaluru: { permanent: 227, contract: 84 },
  Hosur: { permanent: 158, contract: 61 },
  "New Delhi": { permanent: 146, contract: 22 },
}

export const ERP_PLANT_CODES: Record<string, string> = {
  Noida: "NOI1",
  "Greater Noida": "GNO1",
  Muzaffarnagar: "MZN1",
  Jaipur: "JPR1",
  Pune: "PUN1",
  Indore: "IDR1",
  Hyderabad: "HYD1",
  Chennai: "CHN1",
  Bengaluru: "BLR1",
  Hosur: "HSR1",
}

// Fuel purchases and production postings are only extracted for three plant codes today.
export const ERP_FUEL: Record<string, { fuels: string[]; quantity: string; output: { value: number; unit: string } }> = {
  Noida: { fuels: ["PNG", "Diesel"], quantity: "2.41 million SCM PNG", output: { value: 41800, unit: "tonnes" } },
  "Greater Noida": { fuels: ["PNG"], quantity: "1.36 million SCM PNG", output: { value: 24600, unit: "tonnes" } },
  Pune: { fuels: ["PNG", "Diesel"], quantity: "1.78 million SCM PNG", output: { value: 30500, unit: "tonnes" } },
}

export const ERP_PRODUCTS: Record<string, string> = {
  Noida: "Biscuits and cookies",
  "Greater Noida": "Biscuits and cookies",
  Muzaffarnagar: "Rusks and bakery",
  Jaipur: "Packaged snacks",
  Pune: "Packaged snacks",
  Indore: "Packaged snacks",
  Hyderabad: "Packaged snacks",
  Chennai: "Biscuits and cookies",
  Bengaluru: "Confectionery",
  Hosur: "Confectionery",
}

export const EHS_REGISTERS: Record<string, { wasteStreams: string[]; disposal: string; incidents: number; ltifr: number }> = {
  Noida: { wasteStreams: ["Hazardous", "Plastic", "E-waste"], disposal: "TSDF", incidents: 3, ltifr: 0.41 },
  Hyderabad: { wasteStreams: ["Hazardous", "Plastic"], disposal: "Authorised recycler", incidents: 2, ltifr: 0.36 },
}

// ---------------------------------------------------------------------------
// Document vault

export type SeedDocument = Omit<DocumentRecord, "siteId"> & { city?: string }

export const SEED_DOCUMENTS: SeedDocument[] = [
  ...["Noida", "Greater Noida", "Jaipur", "Pune", "Indore", "Hyderabad"].map((city, i) => ({
    id: `doc-cto-${i}`,
    name: `CTO_${city.replace(/\s/g, "")}_Water_Air_2024-29.pdf`,
    kind: "permit" as const,
    topic: "Consent to Operate (Water and Air Acts)",
    city,
    period: "2024 – 2029",
    validTo: ["2029-03-31", "2028-09-30", "2029-06-30", "2028-12-31", "2029-01-31", "2028-11-30"][i],
  })),
  {
    id: "doc-png-noi",
    name: "PNG_invoices_Noida_FY2025-26 (12 files).zip",
    kind: "invoice",
    topic: "PNG invoices, 12 months",
    city: "Noida",
    period: PERIOD,
  },
  { id: "doc-ar", name: "Annual_Report_FY2025-26.pdf", kind: "report", topic: "Annual report (turnover, CSR, board, fines)", entityId: ENTITY_IDS.foods, period: PERIOD },
  { id: "doc-coc", name: "Code_of_Conduct_and_Anti-Bribery_Policy.pdf", kind: "policy", topic: "Code of conduct and anti-bribery", entityId: ENTITY_IDS.foods, period: "Adopted 2023" },
  { id: "doc-wb", name: "Whistleblower_Policy_and_FY26_Log.pdf", kind: "policy", topic: "Whistleblower and grievance", entityId: ENTITY_IDS.foods, period: PERIOD },
  { id: "doc-posh", name: "POSH_and_Equal_Opportunity_Policy.pdf", kind: "policy", topic: "POSH and equal opportunity", entityId: ENTITY_IDS.foods, period: "Adopted 2022" },
  { id: "doc-stat", name: "PF_ESIC_Annual_Returns_FY2025-26.pdf", kind: "report", topic: "PF and ESIC statutory returns", entityId: ENTITY_IDS.foods, period: PERIOD },
  { id: "doc-epr", name: "CPCB_EPR_Registration_Plastic_Packaging.pdf", kind: "certificate", topic: "EPR registration (plastic packaging)", entityId: ENTITY_IDS.foods, period: "Valid to Mar 2027" },
]

// ---------------------------------------------------------------------------
// Site seeds: ids, types and owners for the reconciled footprint

export const SITE_META: Record<string, { id: string; name: string; type: SiteType; ownerRole: string }> = {
  Noida: { id: "site-noida", name: "Noida", type: "factory", ownerRole: "Plant head, Noida" },
  "Greater Noida": { id: "site-gnoida", name: "Greater Noida", type: "factory", ownerRole: "Plant head, Greater Noida" },
  Muzaffarnagar: { id: "site-muzaffarnagar", name: "Muzaffarnagar", type: "factory", ownerRole: "Plant head, Muzaffarnagar" },
  Jaipur: { id: "site-jaipur", name: "Jaipur", type: "factory", ownerRole: "Plant head, Jaipur" },
  Pune: { id: "site-pune", name: "Pune", type: "factory", ownerRole: "Plant head, Pune" },
  Indore: { id: "site-indore", name: "Indore", type: "factory", ownerRole: "Plant head, Indore" },
  Hyderabad: { id: "site-hyderabad", name: "Hyderabad", type: "factory", ownerRole: "Plant head, Hyderabad" },
  Chennai: { id: "site-chennai", name: "Chennai", type: "factory", ownerRole: "Plant head, Chennai" },
  Bengaluru: { id: "site-bengaluru", name: "Bengaluru", type: "factory", ownerRole: "Plant head, Bengaluru" },
  Hosur: { id: "site-hosur", name: "Hosur", type: "factory", ownerRole: "Plant head, Hosur" },
  Kolkata: { id: "site-kolkata", name: "Kolkata", type: "warehouse", ownerRole: "Warehouse manager, Kolkata" },
  "New Delhi": { id: "site-delhi", name: "Delhi", type: "office", ownerRole: "Office admin, Delhi" },
  Gurugram: { id: "site-gurugram", name: "Gurugram", type: "office", ownerRole: "Office admin, Gurugram" },
}

// Preferred profiling order: richest site first so later sites can reuse its profile.
// Sites the scripted walkthrough skips.
export const SCRIPT_SKIP = ["site-delhi", "site-gurugram"]

export const PROFILE_ORDER = [
  "site-noida",
  "site-pune",
  "site-jaipur",
  "site-indore",
  "site-hyderabad",
  "site-chennai",
  "site-gnoida",
  "site-bengaluru",
  "site-muzaffarnagar",
  "site-hosur",
  "site-kolkata",
  "site-delhi",
  "site-gurugram",
]

// ---------------------------------------------------------------------------
// Presenter script: the answers a plant head would give in the walkthrough.
// Used only by the presenter shortcut (press D in demo mode) and the engine
// verification script. The UI never pre-selects these. In the scripted
// walkthrough the two offices are skipped ("Skip this site"), so their
// questions go to the office admins as tasks; the answers below are used only
// if the presenter answers them by hand.

export const DEMO_ANSWERS: Record<string, Record<string, AnswerValue>> = {
  "site-noida": {
    continuity: "Continuous",
    waterSource: ["Groundwater", "Municipal"],
    discharge: "ETP onsite",
    refrigeration: true,
    refrigerantLog: true,
    contractors: true,
  },
  "site-pune": {
    wasteStreams: ["Hazardous", "Plastic"],
    wasteDisposal: "Authorised recycler",
    incidents: true,
    headcountSource: "HRMS",
  },
  "site-gnoida": {
    wasteStreams: ["Hazardous", "Plastic", "E-waste"],
    wasteDisposal: "Not tracked",
    incidents: true,
  },
  "site-jaipur": {
    output: { value: 18400, unit: "tonnes" },
    boilerFuel: ["PNG"],
    fuelQuantitySource: "ERP",
    wasteStreams: ["Plastic", "Other"],
    incidents: true,
  },
  "site-indore": {
    output: { value: 12600, unit: "tonnes" },
    boilerFuel: ["PNG"],
    fuelQuantitySource: "ERP",
  },
  "site-hyderabad": {
    output: { value: 15200, unit: "tonnes" },
    boilerFuel: ["Biomass"],
    fuelQuantitySource: "ERP",
  },
  "site-chennai": {
    output: { value: 22900, unit: "tonnes" },
    boilerFuel: ["LPG"],
    fuelQuantitySource: "ERP",
    waterMetered: true,
    wasteStreams: ["Plastic", "E-waste"],
    incidents: true,
    permits: "Yes, on paper",
    continuity: "Continuous",
    waterSource: ["Groundwater"],
    discharge: "CETP",
    refrigeration: true,
    refrigerantLog: true,
    contractors: true,
  },
  "site-bengaluru": {
    boilers: false,
    waterMetered: true,
    output: { value: 9800, unit: "tonnes" },
    wasteStreams: ["Plastic", "E-waste"],
    incidents: true,
    permits: "Yes, tracked digitally",
    continuity: "Batch",
    waterSource: ["Municipal", "Tanker"],
    discharge: "Municipal",
    refrigeration: true,
    refrigerantLog: true,
    contractors: true,
  },
  "site-muzaffarnagar": {
    boilers: true,
    boilerFuel: ["Biomass", "Diesel"],
    fuelQuantitySource: "Not recorded",
    output: { value: 11200, unit: "tonnes" },
    waterMetered: false,
    wasteStreams: ["Plastic", "Other"],
    incidents: true,
    permits: "Yes, tracked digitally",
    continuity: "Seasonal",
    waterSource: ["Groundwater"],
    discharge: "ETP onsite",
    refrigeration: false,
    contractors: true,
  },
  "site-hosur": {
    output: NOT_SURE,
    continuity: "Continuous",
    boilers: true,
    boilerFuel: ["LPG"],
    fuelQuantitySource: NOT_SURE,
    waterSource: ["Municipal", "Tanker"],
    waterMetered: true,
    discharge: "CETP",
    wasteStreams: ["Plastic"],
    refrigeration: true,
    refrigerantLog: true,
    contractors: true,
    incidents: true,
    permits: NOT_SURE,
  },
  "site-kolkata": {
    officeOccupancy: "Leased",
    officeBilling: "Direct utility bill",
    refrigeration: true,
    refrigerantLog: true,
    contractors: true,
    headcountSource: "Contractor registers",
  },
  "site-delhi": {
    officeOccupancy: "Leased",
    officeBilling: "Through landlord",
    officeHvac: ["Neither — landlord runs both"],
    officeEwaste: "Vendor buy-back",
  },
  "site-gurugram": {
    officeOccupancy: "Shared or co-working",
    officeBilling: "Included in rent",
    officeHvac: ["Neither — landlord runs both"],
    officeEwaste: "Not tracked",
  },
}
