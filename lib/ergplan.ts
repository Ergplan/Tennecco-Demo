// ergPLAN: what the bills say today, and the power-purchase plan that takes each plant to
// 100% green at a lower cost.
//
// Volumes and renewable shares come from lib/ergos (Bengaluru from the plant note; the
// rest from filings or illustrative). DISCOM landed tariffs and plan prices are indicative
// by state, to be replaced by each plant's own bills and developer quotes.

import { PLANT_ENERGY, type PlantEnergy } from "./ergos"
import { SITES } from "./sites"

/** Indicative landed HT industrial cost by state, ₹/kWh (energy + demand charges + duty). */
export const DISCOM_LANDED: Record<string, number> = {
  Karnataka: 7.6,
  Punjab: 6.9,
  "Himachal Pradesh": 5.6,
  Haryana: 7.6,
  Rajasthan: 7.8,
  "Madhya Pradesh": 7.6,
  Gujarat: 7.4,
  Maharashtra: 9.2,
  "Tamil Nadu": 8.0,
  Puducherry: 6.4,
}

/** Indicative landed group-captive wind–solar price by state, ₹/kWh (wheeling, banking). */
export const CAPTIVE_LANDED: Record<string, number> = {
  Karnataka: 4.8,
  Punjab: 5.4,
  "Himachal Pradesh": 5.2,
  Haryana: 5.3,
  Rajasthan: 4.9,
  "Madhya Pradesh": 5.0,
  Gujarat: 4.7,
  Maharashtra: 5.4,
  "Tamil Nadu": 4.9,
  Puducherry: 5.6,
}

export const PRICES = {
  ppa: 5.0, // existing PPAs, until the invoices are read
  rooftop: 3.75, // RESCO, public range ₹3.50–3.75
  gdamLanded: 4.8, // IEX green day-ahead ≈ ₹3.6 plus open-access charges
  greenTariffPremium: 0.5, // KERC-style premium on the DISCOM tariff
}

export type Mix = {
  discom: number
  solar: number // rooftop + solar part of PPA / captive
  wind: number // wind part of PPA / captive
  iex: number
  greenTariff: number
}

export type PlantPlan = {
  siteId: string
  name: string
  city: string
  state: string
  annualMWh: number
  today: Mix
  plan: Mix
  /** the same purchases, with the new captive re-shaped wind-heavy for when banking is cut */
  planStored: Mix
  costToday: number // ₹ / yr
  costPlan: number
  greenToday: number // 0–1
  greenPlan: number
  levers: string[]
  /** what the plan's renewable purchases cost a year, all of it paid for whether used or not */
  reCost: number
  discomT: number
}

const WIND_SHARE_OF_HYBRID = 0.65 // wind-heavy hybrids carry the night load
const WIND_SHARE_NO_BANKING = 0.8 // without banking, ergPLAN tilts new captive further to wind

export function planFor(p: PlantEnergy): PlantPlan {
  const site = SITES.find((s) => s.id === p.siteId)!
  const E = p.annualMWh
  const discomT = p.siteId === "fmgil-blr" ? 5.0 : DISCOM_LANDED[site.state] ?? 7.5
  const captiveT = CAPTIVE_LANDED[site.state] ?? 5.0

  // Today: existing PPA (hybrid), rooftop, the rest from the DISCOM.
  const today: Mix = {
    solar: p.rooftopMWh + p.ppaMWh * (1 - WIND_SHARE_OF_HYBRID),
    wind: p.ppaMWh * WIND_SHARE_OF_HYBRID,
    iex: 0,
    greenTariff: 0,
    discom: Math.max(0, E - p.ppaMWh - p.rooftopMWh),
  }
  const costToday = (today.discom * discomT + p.ppaMWh * PRICES.ppa + p.rooftopMWh * PRICES.rooftop) * 1000

  // Plan: keep what is green; add rooftop to ~12% of load, a wind–solar captive block up to
  // 85% renewable, green day-ahead power for 10% in cheap blocks, and the green tariff for the rest.
  const rooftop = Math.max(p.rooftopMWh, p.siteId === "fmgil-blr" ? 1450 : 0.12 * E)
  const gdam = p.siteId === "fmgil-blr" ? 0 : 0.1 * E
  const captive = Math.max(0, (p.siteId === "fmgil-blr" ? E : 0.85 * E) - p.ppaMWh - rooftop)
  const greenTariff = Math.max(0, E - p.ppaMWh - rooftop - captive - gdam)
  const plan: Mix = {
    solar: rooftop + (p.ppaMWh + captive) * (1 - WIND_SHARE_OF_HYBRID),
    wind: (p.ppaMWh + captive) * WIND_SHARE_OF_HYBRID,
    iex: gdam,
    greenTariff,
    discom: 0,
  }
  const planStored: Mix = {
    ...plan,
    solar: rooftop + p.ppaMWh * (1 - WIND_SHARE_OF_HYBRID) + captive * (1 - WIND_SHARE_NO_BANKING),
    wind: p.ppaMWh * WIND_SHARE_OF_HYBRID + captive * WIND_SHARE_NO_BANKING,
  }
  const reCost = (p.ppaMWh * PRICES.ppa + rooftop * PRICES.rooftop + captive * (p.siteId === "fmgil-blr" ? 4.8 : captiveT) + gdam * PRICES.gdamLanded) * 1000
  const costPlan = reCost + greenTariff * (discomT + PRICES.greenTariffPremium) * 1000

  const levers = [
    rooftop > p.rooftopMWh + 1 ? `Rooftop ${((rooftop - p.rooftopMWh) / 1450).toFixed(1)} MWp` : "",
    captive > 1 ? `Captive wind–solar ${(captive / 1000).toFixed(1)} GWh` : "",
    gdam > 1 ? `Green IEX ${(gdam / 1000).toFixed(1)} GWh` : "",
    greenTariff > 1 ? `Green tariff ${(greenTariff / 1000).toFixed(1)} GWh` : "",
  ].filter(Boolean)

  return {
    siteId: p.siteId,
    name: site.name,
    city: site.city,
    state: site.state,
    annualMWh: E,
    today,
    plan,
    planStored,
    costToday,
    costPlan,
    greenToday: E ? (p.ppaMWh + p.rooftopMWh) / E : 0,
    greenPlan: 1,
    levers,
    reCost,
    discomT,
  }
}

export const PLANS: PlantPlan[] = PLANT_ENERGY.map(planFor)
export const planOf = (siteId: string) => PLANS.find((p) => p.siteId === siteId)!

// ---------------------------------------------------------------- typical-day profile

const solar = (i: number) => {
  const h = i / 4
  return h < 6.25 || h > 18.5 ? 0 : Math.sin(((h - 6.25) / 12.25) * Math.PI) ** 1.6
}
const wind = (i: number) => {
  const h = i / 4
  return 0.6 + 0.4 * Math.sin(((h - 13) / 24) * 2 * Math.PI)
}
const load = (i: number) => {
  const h = i / 4
  let k = 1
  for (const c of [6, 14, 22]) if (h >= c && h < c + 0.5) k = 0.8
  if (h >= 12.5 && h < 13.25) k = Math.min(k, 0.9)
  return k
}
/** cheap blocks on the green day-ahead market: the solar hours */
const cheap = (i: number) => (solar(i) > 0.35 ? 1 : 0)

/** banking: the old regime; none: banking cut, surplus spills; bess: a battery shifts it */
export type StorageMode = "banking" | "none" | "bess"

/**
 * Battery storage, for when banking is restricted (KERC's 2025 regulations: monthly banking,
 * no carry-forward, 8% in kind). Four-hour system, 88% round trip; the adder is the cost of a
 * discharged kWh on a storage-as-a-service tariff (2-hour BESS tariffs of ₹1.48–2.8 lakh per
 * MW-month work out to ≈₹2.7–5.1/kWh at a cycle a day; four-hour systems sit at the low end),
 * capex ≈₹1.2 Cr/MWh (NTPC awards ₹1.12 Cr/MWh).
 */
export const BESS = { rte: 0.88, hours: 4, adder: 3.0, capexCrPerMWh: 1.2 }

export type DayBlock = {
  demand: number
  wind: number
  solar: number
  iex: number
  bessOut: number
  banked: number
  discom: number
  bessIn: number
  surplus: number
}

export type DaySummary = {
  dayKWh: number
  bessKWh: number
  bessKW: number
  dischargeKWh: number
  bankedKWh: number
  residualKWh: number
  spillKWh: number
}

/**
 * A typical weekday in 15-minute blocks (kW) for a mix spread over the year.
 * Banking: renewable power above the load is banked (8% kept in kind) and drawn back where
 * renewables fall short. BESS: the surplus charges a battery in time order and the battery
 * discharges into the shortfall; what it cannot hold spills. Either way the DISCOM covers
 * what is left.
 */
export function typicalDay(mix: Mix, annualMWh: number, mode: StorageMode = "banking"): { blocks: DayBlock[]; summary: DaySummary } {
  const N = 96
  const avgKW = (annualMWh * 1000) / 8760
  const demand = Array.from({ length: N }, (_, i) => avgKW * load(i))
  const dayKWh = demand.reduce((a, d) => a + d / 4, 0)
  const share = (x: number) => (annualMWh ? x / annualMWh : 0) * dayKWh
  const norm = (f: (i: number) => number) => {
    const s = Array.from({ length: N }, (_, i) => f(i)).reduce((a, b) => a + b / 4, 0) || 1
    return (i: number) => f(i) / s
  }
  const ns = norm(solar)
  const nw = norm(wind)
  const nc = norm(cheap)
  const raw = demand.map((d, i) => {
    const s = ns(i) * share(mix.solar)
    const w = nw(i) * share(mix.wind)
    const x = nc(i) * share(mix.iex)
    const re = s + w + x
    const k = re > d ? d / re : 1
    return { d, s: s * k, w: w * k, x: x * k, surplus: Math.max(0, re - d), deficit: Math.max(0, d - re) }
  })
  const surplusKWh = raw.reduce((a, r) => a + r.surplus / 4, 0)
  const deficitKWh = raw.reduce((a, r) => a + r.deficit / 4, 0)

  if (mode === "banking") {
    const fill = deficitKWh > 0 ? Math.min(1, (surplusKWh * 0.92) / deficitKWh) : 0
    const blocks = raw.map((r) => ({ demand: r.d, wind: r.w, solar: r.s, iex: r.x, bessOut: 0, banked: r.deficit * fill, discom: r.deficit * (1 - fill), bessIn: 0, surplus: r.surplus }))
    const bankedKWh = blocks.reduce((a, b) => a + b.banked / 4, 0)
    return { blocks, summary: { dayKWh, bessKWh: 0, bessKW: 0, dischargeKWh: 0, bankedKWh, residualKWh: deficitKWh - bankedKWh, spillKWh: 0 } }
  }

  if (mode === "none") {
    const blocks = raw.map((r) => ({ demand: r.d, wind: r.w, solar: r.s, iex: r.x, bessOut: 0, banked: 0, discom: r.deficit, bessIn: 0, surplus: r.surplus }))
    return { blocks, summary: { dayKWh, bessKWh: 0, bessKW: 0, dischargeKWh: 0, bankedKWh: 0, residualKWh: deficitKWh, spillKWh: surplusKWh } }
  }

  // Size the battery to move what it usefully can in a day, then run two days so the state of
  // charge at midnight is the steady one.
  const cap = Math.min(surplusKWh * BESS.rte, deficitKWh)
  const bessKWh = cap / Math.sqrt(BESS.rte) // usable energy plus the losses on the way out
  const bessKW = bessKWh / BESS.hours
  let soc = 0
  let blocks: DayBlock[] = []
  for (let pass = 0; pass < 2; pass++) {
    blocks = raw.map((r) => {
      let bessIn = 0
      let bessOut = 0
      if (r.surplus > 0) {
        bessIn = Math.min(r.surplus, bessKW, ((bessKWh - soc) * 4) / Math.sqrt(BESS.rte))
        soc += (bessIn / 4) * Math.sqrt(BESS.rte)
      } else if (r.deficit > 0) {
        bessOut = Math.min(r.deficit, bessKW, soc * 4 * Math.sqrt(BESS.rte))
        soc -= bessOut / 4 / Math.sqrt(BESS.rte)
      }
      return { demand: r.d, wind: r.w, solar: r.s, iex: r.x, bessOut, banked: 0, discom: r.deficit - bessOut, bessIn, surplus: r.surplus - bessIn }
    })
  }
  const dischargeKWh = blocks.reduce((a, b) => a + b.bessOut / 4, 0)
  const residualKWh = blocks.reduce((a, b) => a + b.discom / 4, 0)
  const spillKWh = blocks.reduce((a, b) => a + b.surplus / 4, 0)
  return { blocks, summary: { dayKWh, bessKWh, bessKW, dischargeKWh, bankedKWh: 0, residualKWh, spillKWh } }
}

/** A plant's plan, costed for a storage mode: renewables paid in full, the DISCOM's green tariff for
 *  whatever is still short, and the battery's adder on every discharged kWh. */
export const planMix = (p: PlantPlan, mode: StorageMode) => (mode === "banking" ? p.plan : p.planStored)

export function planEconomics(p: PlantPlan, mode: StorageMode) {
  const { summary: d } = typicalDay(planMix(p, mode), p.annualMWh, mode)
  const toAnnualMWh = (kWh: number) => (d.dayKWh ? (kWh / d.dayKWh) * p.annualMWh : 0)
  const residualMWh = toAnnualMWh(d.residualKWh)
  const dischargeMWh = toAnnualMWh(d.dischargeKWh)
  const cost = p.reCost + residualMWh * (p.discomT + PRICES.greenTariffPremium) * 1000 + (mode === "bess" ? dischargeMWh * BESS.adder * 1000 : 0)
  return {
    cost,
    residualMWh,
    dischargeMWh,
    spillMWh: toAnnualMWh(d.spillKWh),
    bankedMWh: toAnnualMWh(d.bankedKWh),
    bessMWh: d.bessKWh / 1000,
    bessMW: d.bessKW / 1000,
  }
}

/** Today's supply under a storage mode. The bills are the banking case; with banking cut,
 *  the surplus that used to be banked spills and the DISCOM fills the gap at its normal tariff
 *  (there is no battery today, so "bess" costs today the same as "none"). */
export function todayEconomics(p: PlantPlan, mode: StorageMode) {
  if (mode === "banking") return { cost: p.costToday, green: p.greenToday, extraMWh: 0 }
  const bank = typicalDay(p.today, p.annualMWh, "banking").summary
  const cut = typicalDay(p.today, p.annualMWh, "none").summary
  const extraMWh = cut.dayKWh ? ((cut.residualKWh - bank.residualKWh) / cut.dayKWh) * p.annualMWh : 0
  const lostGreen = cut.dayKWh ? cut.spillKWh / cut.dayKWh : 0
  return { cost: p.costToday + extraMWh * p.discomT * 1000, green: Math.max(0, p.greenToday - lostGreen), extraMWh }
}

export function totals(list: PlantPlan[], mode: StorageMode = "bess") {
  const E = list.reduce((a, p) => a + p.annualMWh, 0)
  const now = list.map((p) => todayEconomics(p, mode))
  const greenToday = list.reduce((a, p, i) => a + now[i].green * p.annualMWh, 0)
  const costToday = now.reduce((a, e) => a + e.cost, 0)
  const econ = list.map((p) => planEconomics(p, mode))
  const costPlan = econ.reduce((a, e) => a + e.cost, 0)
  return {
    E,
    greenToday: E ? greenToday / E : 0,
    costToday,
    costPlan,
    avgToday: E ? costToday / (E * 1000) : 0,
    avgPlan: E ? costPlan / (E * 1000) : 0,
    saving: costToday - costPlan,
    co2Avoided: (E - greenToday) * 0.71,
    spillMWh: econ.reduce((a, e) => a + e.spillMWh, 0),
    bessMWh: econ.reduce((a, e) => a + e.bessMWh, 0),
    bessMW: econ.reduce((a, e) => a + e.bessMW, 0),
    dischargeMWh: econ.reduce((a, e) => a + e.dischargeMWh, 0),
    residualMWh: econ.reduce((a, e) => a + e.residualMWh, 0),
  }
}
