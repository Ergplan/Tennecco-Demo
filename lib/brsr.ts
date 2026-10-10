// Filed BRSR values (FY2025-26, with the prior year as restated in the same filing),
// read from the XBRL that each company filed with NSE. Parsed by the esgOS BRSR
// pipeline (Ergplan/esgOS, data/brsr). Units as filed: GJ, tCO2e, kilolitres, tonnes.

export type BrsrMetric = { value: number; py?: number; unit: string }

export type BrsrRecord = {
  entityId: string
  company: string
  symbol: string
  cin: string
  fy: string
  filed: string
  pdfUrl: string
  xbrlUrl: string
  turnoverInr: number
  netWorthInr: number
  employees: number
  workers: number
  energyTotal: BrsrMetric
  energyRenewable: BrsrMetric
  energyNonRenewable: BrsrMetric
  scope1: BrsrMetric
  scope2: BrsrMetric
  waterWithdrawal: BrsrMetric
  waterConsumption: BrsrMetric
  waterDischarge: BrsrMetric
  wasteTotal: BrsrMetric
  wasteRecovered: BrsrMetric
  ltifrWorkers: BrsrMetric
  msmeSourcingPct: number
  womenBoardPct: number
  missing: string[]
}

export const BRSR: Record<string, BrsrRecord> = {
  fmgil: {
    entityId: "fmgil",
    company: "Federal-Mogul Goetze (India) Limited",
    symbol: "NSE: FMGOETZE",
    cin: "L74899DL1954PLC002452",
    fy: "FY2025-26",
    filed: "3 Sep 2026",
    pdfUrl: "https://nsearchives.nseindia.com/corporate/BRSR_505744_02092026234800.pdf",
    xbrlUrl: "https://nsearchives.nseindia.com/corporate/xbrl/BRSR_1117_WebXMLFile_20260903_000049426.xml",
    turnoverInr: 19_241_200_000,
    netWorthInr: 13_622_800_000,
    employees: 548,
    workers: 4764,
    energyTotal: { value: 656_686, py: 604_494, unit: "GJ" },
    energyRenewable: { value: 231_223, py: 192_710, unit: "GJ" },
    energyNonRenewable: { value: 425_463, py: 411_784, unit: "GJ" },
    scope1: { value: 6243.49, py: 5658.65, unit: "tCO2e" },
    scope2: { value: 60_084.39, py: 59_827.8, unit: "tCO2e" },
    waterWithdrawal: { value: 468_674, py: 453_295, unit: "kL" },
    waterConsumption: { value: 167_262, py: 313_654, unit: "kL" },
    waterDischarge: { value: 301_711.67, py: 267_638.77, unit: "kL" },
    wasteTotal: { value: 6801.36, py: 7977.23, unit: "t" },
    wasteRecovered: { value: 5390.81, py: 6432.17, unit: "t" },
    ltifrWorkers: { value: 0.89, py: 0.54, unit: "per million hours" },
    msmeSourcingPct: 15.2,
    womenBoardPct: 12.5,
    missing: ["Scope 3 emissions"],
  },
  tcail: {
    entityId: "tcail",
    company: "Tenneco Clean Air India Limited",
    symbol: "NSE: TENNIND",
    cin: "L29308TN2018FLC126510",
    fy: "FY2025-26",
    filed: "6 Aug 2026",
    pdfUrl: "https://nsearchives.nseindia.com/corporate/TENNECO_06082026231114_Tenneco_Clean_Air_India_-_BRSR_2025-26_Signed.pdf",
    xbrlUrl: "https://nsearchives.nseindia.com/corporate/xbrl/BRSR_26440_WebXMLFile_20260806_232109570.xml",
    turnoverInr: 22_885_200_000,
    netWorthInr: 60_380_680_000,
    employees: 425,
    workers: 2105,
    energyTotal: { value: 43_017.64, py: 40_975.6, unit: "GJ" },
    energyRenewable: { value: 9925.24, py: 4328.67, unit: "GJ" },
    energyNonRenewable: { value: 33_092.4, py: 36_646.93, unit: "GJ" },
    scope1: { value: 375.69, py: 557.73, unit: "tCO2e" },
    scope2: { value: 5141.28, py: 6031.49, unit: "tCO2e" },
    waterWithdrawal: { value: 39_174, py: 35_843, unit: "kL" },
    waterConsumption: { value: 17_807.92, py: 20_665.8, unit: "kL" },
    waterDischarge: { value: 21_366.08, py: 15_177.2, unit: "kL" },
    wasteTotal: { value: 1721.57, py: 1722.1, unit: "t" },
    wasteRecovered: { value: 1718.07, py: 1719.52, unit: "t" },
    ltifrWorkers: { value: 0.28, py: 0, unit: "per million hours" },
    msmeSourcingPct: 52.12,
    womenBoardPct: 12.5,
    missing: ["Scope 3 emissions"],
  },
}

export const GJ_PER_MWH = 3.6

export function renewableShare(r: BrsrRecord, year: "cy" | "py" = "cy") {
  const re = year === "cy" ? r.energyRenewable.value : (r.energyRenewable.py ?? 0)
  const tot = year === "cy" ? r.energyTotal.value : (r.energyTotal.py ?? 0)
  return tot > 0 ? re / tot : 0
}

/** tCO2e (Scope 1 + 2) per ₹ crore of turnover */
export function ghgIntensityPerCrore(r: BrsrRecord) {
  return (r.scope1.value + r.scope2.value) / (r.turnoverInr / 1e7)
}

export function change(m: BrsrMetric) {
  if (m.py === undefined || m.py === 0) return null
  return (m.value - m.py) / m.py
}
