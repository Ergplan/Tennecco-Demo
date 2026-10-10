// Heat pump economics for the Bengaluru surface-treatment lines.
//
// The COP model is the one on jouleWise's Heat Pump Studio (Ergplan/websiterepo,
// lib/studios/heatpump.ts): anchored to COP 3.4 at 80 °C and 2.3 at 135 °C delivery from a
// ~30 °C source, then scaled by the ratio of Carnot limits for the actual source.

const REF_SOURCE_C = 30
const COP_AT_80 = 3.4
const COP_AT_135 = 2.3
export const PRACTICAL_CEILING_C = 120

const carnot = (sourceC: number, deliverC: number) => (deliverC + 273.15) / Math.max(1, deliverC - sourceC)

function refCop(deliverC: number) {
  const t = (deliverC - 80) / (135 - 80)
  return COP_AT_80 + (COP_AT_135 - COP_AT_80) * t
}

export function cop(sourceC: number, deliverC: number) {
  if (deliverC <= sourceC) return 0
  const scaled = refCop(deliverC) * (carnot(sourceC, deliverC) / carnot(REF_SOURCE_C, deliverC))
  return Math.max(1.2, Math.min(8, scaled))
}

export type Incumbent = {
  id: string
  name: string
  unit: string
  price: number
  /** useful heat per unit, after the heater or boiler, kWh-th */
  usefulKWhPerUnit: number
  /** kg CO2 per unit; null = electricity, uses the power emission factor */
  co2PerUnit: number | null
  note: string
}

// Fuel energy and CO2 per unit as on the jouleWise studio; LPG added for Indian plants.
export const INCUMBENTS: Incumbent[] = [
  { id: "elec", name: "Electric immersion heaters", unit: "kWh", price: 0, usefulKWhPerUnit: 0.95, co2PerUnit: null, note: "Priced at the plant's blended power tariff" },
  { id: "lpg", name: "LPG-fired heating", unit: "kg", price: 85, usefulKWhPerUnit: 12.8 * 0.8, co2PerUnit: 2.98, note: "12.8 kWh/kg, 80% burner + bath efficiency" },
  { id: "hsd", name: "Diesel (HSD) boiler", unit: "litre", price: 90, usefulKWhPerUnit: 10.0 * 0.8, co2PerUnit: 2.68, note: "10 kWh/l, 80% efficiency" },
  { id: "png", name: "Piped natural gas", unit: "SCM", price: 55, usefulKWhPerUnit: 10.4 * 0.82, co2PerUnit: 1.95, note: "10.4 kWh/SCM, 82% efficiency" },
]

export type ProcessPreset = {
  id: string
  name: string
  assessment: string
  feasibility: "good" | "check"
  bathC: number
  /** illustrative heat duty until the plant shares line data */
  dutyKW: number
  capexFactor: number
  why: string
}

// From the plant's initial feasibility note (Tenneco Bangalore Plant, Federal-Mogul Goetze).
// Bath temperatures are typical for these chemistries; duties are placeholders to be sized.
export const PROCESSES: ProcessPreset[] = [
  {
    id: "piston",
    name: "Piston phosphating",
    assessment: "Highly feasible, good savings potential",
    feasibility: "good",
    bathC: 75,
    dutyKW: 120,
    capexFactor: 1,
    why: "Bath and pre-clean stages sit well inside a heat pump's comfortable range.",
  },
  {
    id: "steelring",
    name: "Steel ring phosphating",
    assessment: "Highly feasible, but savings economics to be checked (will require higher capex)",
    feasibility: "check",
    bathC: 95,
    dutyKW: 150,
    capexFactor: 1.35,
    why: "Manganese-type phosphating runs near boiling: a bigger temperature lift, lower COP, a costlier machine.",
  },
  {
    id: "ringplating",
    name: "Ring plating / ring phosphating",
    assessment: "Highly feasible, good savings potential",
    feasibility: "good",
    bathC: 65,
    dutyKW: 100,
    capexFactor: 1,
    why: "Moderate bath temperatures give a high COP and the fastest payback.",
  },
]

export type HeatSource = { id: string; name: string; c: number; note: string }

export const SOURCES: HeatSource[] = [
  { id: "air", name: "Ambient air", c: 26, note: "Bengaluru air, around 20–33 °C through the year" },
  { id: "compressor", name: "Air-compressor cooling water", c: 40, note: "Heat the cooling tower throws away today" },
  { id: "rinse", name: "Warm rinse / effluent water", c: 35, note: "Recovered from overflow rinses" },
]

export type HeatInput = {
  sourceC: number
  bathC: number
  dutyKW: number
  hours: number
  incumbent: Incumbent
  fuelPrice: number
  powerTariff: number
  /** share of the heat pump's power that is renewable, 0–1 */
  greenShare: number
  gridEf: number
  capexPerKW: number
  capexFactor: number
  haasDiscount: number
}

export function heatCase(i: HeatInput) {
  const deliverC = i.bathC + 5 // approach across the bath heat exchanger
  const c = cop(i.sourceC, deliverC)
  const heatMWh = (i.dutyKW * i.hours) / 1000
  const isElec = i.incumbent.id === "elec"
  const unitPrice = isElec ? i.powerTariff : i.fuelPrice
  const costPerKWhToday = unitPrice / i.incumbent.usefulKWhPerUnit
  const co2PerKWhToday = isElec
    ? (i.gridEf * (1 - i.greenShare)) / i.incumbent.usefulKWhPerUnit
    : (i.incumbent.co2PerUnit ?? 0) / i.incumbent.usefulKWhPerUnit

  const hpPowerMWh = c > 0 ? heatMWh / c : 0
  const costPerKWhHp = c > 0 ? i.powerTariff / c : Infinity
  const co2PerKWhHp = c > 0 ? (i.gridEf * (1 - i.greenShare)) / c : 0

  const costToday = costPerKWhToday * heatMWh * 1000
  const costHp = costPerKWhHp * heatMWh * 1000
  const saving = costToday - costHp
  const co2Today = (co2PerKWhToday * heatMWh * 1000) / 1000
  const co2Hp = (co2PerKWhHp * heatMWh * 1000) / 1000
  const capex = i.dutyKW * i.capexPerKW * i.capexFactor
  const payback = saving > 0 ? capex / saving : Infinity
  const powerToday = isElec ? (heatMWh / i.incumbent.usefulKWhPerUnit) : 0
  const powerSavedMWh = powerToday - hpPowerMWh

  // Heat-as-a-Service: jouleWise funds, owns and runs the machine; Tenneco pays per kWh of
  // heat at a fixed discount to what that heat costs today.
  const haasTariff = costPerKWhToday * (1 - i.haasDiscount)
  const haasSaving = costToday - haasTariff * heatMWh * 1000

  return {
    deliverC,
    cop: c,
    lift: deliverC - i.sourceC,
    withinCeiling: deliverC <= PRACTICAL_CEILING_C,
    heatMWh,
    costPerKWhToday,
    costPerKWhHp,
    costToday,
    costHp,
    saving,
    savingPct: costToday > 0 ? saving / costToday : 0,
    co2Today,
    co2Hp,
    co2Avoided: co2Today - co2Hp,
    hpPowerMWh,
    powerSavedMWh,
    capex,
    payback,
    haasTariff,
    haasSaving,
  }
}
