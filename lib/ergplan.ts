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
  costToday: number // ₹ / yr
  costPlan: number
  greenToday: number // 0–1
  greenPlan: number
  levers: string[]
}

const WIND_SHARE_OF_HYBRID = 0.65 // wind-heavy hybrids carry the night load

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
  const costPlan =
    (p.ppaMWh * PRICES.ppa + rooftop * PRICES.rooftop + captive * (p.siteId === "fmgil-blr" ? 4.8 : captiveT) + gdam * PRICES.gdamLanded + greenTariff * (discomT + PRICES.greenTariffPremium)) * 1000

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
    costToday,
    costPlan,
    greenToday: E ? (p.ppaMWh + p.rooftopMWh) / E : 0,
    greenPlan: 1,
    levers,
  }
}

export const PLANS: PlantPlan[] = PLANT_ENERGY.map(planFor)
export const planOf = (siteId: string) => PLANS.find((p) => p.siteId === siteId)!

export function totals(list: PlantPlan[]) {
  const E = list.reduce((a, p) => a + p.annualMWh, 0)
  const greenToday = list.reduce((a, p) => a + p.greenToday * p.annualMWh, 0)
  const costToday = list.reduce((a, p) => a + p.costToday, 0)
  const costPlan = list.reduce((a, p) => a + p.costPlan, 0)
  return {
    E,
    greenToday: E ? greenToday / E : 0,
    costToday,
    costPlan,
    avgToday: E ? costToday / (E * 1000) : 0,
    avgPlan: E ? costPlan / (E * 1000) : 0,
    saving: costToday - costPlan,
    co2Avoided: ((E - greenToday) * 0.71),
  }
}

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

export type DayBlock = { demand: number; discom: number; solar: number; wind: number; iex: number; banked: number; surplus: number }

/**
 * A typical weekday in 15-minute blocks (kW) for a mix spread over the year. Renewable
 * power above the load in a block is banked (KERC: monthly, 8% in kind) and drawn back in
 * the blocks where renewables fall short, before any DISCOM power.
 */
export function typicalDay(mix: Mix, annualMWh: number): DayBlock[] {
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
  const raw = demand.map((d, i) => ({ d, s: ns(i) * share(mix.solar), w: nw(i) * share(mix.wind), x: nc(i) * share(mix.iex) }))
  const surplusKWh = raw.reduce((a, r) => a + Math.max(0, r.s + r.w + r.x - r.d) / 4, 0) * 0.92
  const deficitKWh = raw.reduce((a, r) => a + Math.max(0, r.d - r.s - r.w - r.x) / 4, 0)
  const fill = deficitKWh > 0 ? Math.min(1, surplusKWh / deficitKWh) : 0
  return raw.map(({ d, s, w, x }) => {
    const re = s + w + x
    const k = re > d ? d / re : 1
    const deficit = Math.max(0, d - re)
    const banked = deficit * fill
    return { demand: d, wind: w * k, solar: s * k, iex: x * k, banked, discom: deficit - banked, surplus: Math.max(0, re - d) }
  })
}
