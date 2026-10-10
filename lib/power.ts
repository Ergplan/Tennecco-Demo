// Bengaluru plant (Federal-Mogul Goetze, Yelahanka): a route to 100% renewable electricity.
//
// Volumes and the two offered prices are the plant's own note (one month, ballpark).
// Everything else is a stated assumption with a public reference, adjustable on screen.

export const PLANT = {
  monthlyKWh: 3_300_000,
  ppaKWh: 2_750_000,
  offerGreenKWh: 280_000,
  offerGreenPrice: 6.96,
  discomKWh: 270_000,
  discomPrice: 5.0,
} as const

export const GRID_EF = 0.71 // tCO2/MWh, CEA CO2 Baseline Database v21 (FY2024-25)

export type PowerAssumptions = {
  /** the existing PPA's renewable attributes are transferred to Tenneco and retired */
  ppaVerified: boolean
  ppaPrice: number
  rooftopMWp: number
  rooftopYield: number // kWh per kWp per year
  rooftopPrice: number
  captivePrice: number
  greenTariffPremium: number
  recPremium: number
  efficiencyPct: number
}

export const DEFAULT_ASSUMPTIONS: PowerAssumptions = {
  ppaVerified: true,
  ppaPrice: 5.0,
  rooftopMWp: 1.0,
  rooftopYield: 1450,
  rooftopPrice: 3.75,
  captivePrice: 4.8,
  greenTariffPremium: 0.5,
  recPremium: 0.04,
  efficiencyPct: 0,
}

export type Lever = {
  id: string
  name: string
  short: string
  price: number
  /** kWh per month this lever can supply; Infinity = as much as needed */
  cap: number
  green: boolean
  color: string
  note: string
}

export type RouteId = "offered" | "joulewise"

export function levers(route: RouteId, a: PowerAssumptions, balanceKWh: number): Lever[] {
  const rooftopKWh = (a.rooftopMWp * 1000 * a.rooftopYield) / 12
  const attr: Lever[] = a.ppaVerified
    ? []
    : [
        {
          id: "ppa-attr",
          name: "Secure the PPA's renewable attributes (RECs retired for Tenneco)",
          short: "PPA attributes",
          price: a.ppaPrice + a.recPremium,
          cap: PLANT.ppaKWh,
          green: true,
          color: "#0f7a47",
          note: "A PPA counts as green in market-based Scope 2 only when its certificates are transferred and retired",
        },
      ]
  if (route === "offered") {
    return [
      ...attr,
      {
        id: "offer",
        name: `Green power offered at ₹${PLANT.offerGreenPrice.toFixed(2)}`,
        short: "Offered green",
        price: PLANT.offerGreenPrice,
        cap: PLANT.offerGreenKWh,
        green: true,
        color: "#5bbf8a",
        note: "As quoted to the plant: 2.8 lakh units a month",
      },
      {
        id: "green-tariff",
        name: "BESCOM green tariff on the rest",
        short: "DISCOM green tariff",
        price: PLANT.discomPrice + a.greenTariffPremium,
        cap: Infinity,
        green: true,
        color: "#8fd3ad",
        note: "KERC green tariff: a premium over the normal tariff for HT industry",
      },
    ]
  }
  return [
    ...attr,
    {
      id: "rooftop",
      name: "Rooftop solar on the plant (RESCO, no capex)",
      short: "Rooftop solar",
      price: a.rooftopPrice,
      cap: Math.min(rooftopKWh, balanceKWh),
      green: true,
      color: "#f2b632",
      note: "Behind the meter: no open-access charges; daytime only",
    },
    {
      id: "captive",
      name: "Group-captive solar–wind top-up",
      short: "Group captive",
      price: a.captivePrice,
      cap: Infinity,
      green: true,
      color: "#14995a",
      note: "Landed, with wheeling and KERC's 8% in-kind banking; captive use pays no cross-subsidy or additional surcharge",
    },
  ]
}

export type Block = { id: string; name: string; short: string; kWh: number; price: number; green: boolean; color: string }

export function scenario(route: RouteId, target: number, a: PowerAssumptions) {
  const total = PLANT.monthlyKWh * (1 - a.efficiencyPct / 100)
  const saved = PLANT.monthlyKWh - total
  const balance = Math.max(0, total - PLANT.ppaKWh)
  const ls = levers(route, a, balance)

  const blocks: Block[] = []
  const ppaGreen = a.ppaVerified
  let greenNeed = Math.max(0, target * total - (ppaGreen ? PLANT.ppaKWh : 0))
  // PPA volume is fixed; if its attributes are unverified the first lever upgrades it.
  let ppaGrey = ppaGreen ? 0 : PLANT.ppaKWh
  let balanceLeft = balance
  for (const l of ls) {
    if (greenNeed <= 0) break
    if (l.id === "ppa-attr") {
      const k = Math.min(greenNeed, PLANT.ppaKWh)
      blocks.push({ id: l.id, name: l.name, short: l.short, kWh: k, price: l.price, green: true, color: l.color })
      ppaGrey -= k
      greenNeed -= k
      continue
    }
    const k = Math.min(greenNeed, l.cap, balanceLeft)
    if (k <= 0) continue
    blocks.push({ id: l.id, name: l.name, short: l.short, kWh: k, price: l.price, green: true, color: l.color })
    balanceLeft -= k
    greenNeed -= k
  }
  const ppaBlock: Block = {
    id: "ppa",
    name: ppaGreen ? "Existing renewable PPA (wind/solar wheeling)" : "Existing PPA (attributes unverified)",
    short: "Existing PPA",
    kWh: ppaGreen ? PLANT.ppaKWh : ppaGrey,
    price: a.ppaPrice,
    green: ppaGreen,
    color: ppaGreen ? "#0f7a47" : "#9aa6b5",
  }
  const grey: Block = {
    id: "grid",
    name: `BESCOM supply at ₹${PLANT.discomPrice.toFixed(2)} (not green)`,
    short: "DISCOM, not green",
    kWh: balanceLeft,
    price: PLANT.discomPrice,
    green: false,
    color: "#b7c1ce",
  }
  const all = [ppaBlock, ...blocks, grey].filter((b) => b.kWh > 0.5)
  const monthlyCost = all.reduce((s, b) => s + b.kWh * b.price, 0)
  const greenKWh = all.filter((b) => b.green).reduce((s, b) => s + b.kWh, 0)
  const greyKWh = total - greenKWh
  return {
    route,
    total,
    saved,
    blocks: all,
    greenShare: total > 0 ? greenKWh / total : 0,
    monthlyCost,
    annualCost: monthlyCost * 12,
    blended: total > 0 ? monthlyCost / total : 0,
    scope2Market: (greyKWh * 12 * GRID_EF) / 1000,
    scope2Location: (total * 12 * GRID_EF) / 1000,
    reachable: greenNeed <= 1,
  }
}

/** The plant's own plan from its note: PPA + 2.8 lakh green at ₹6.96 + 2.7 lakh DISCOM at ₹5. */
export function plantPlan(a: PowerAssumptions) {
  return scenario("offered", (PLANT.ppaKWh + PLANT.offerGreenKWh) / PLANT.monthlyKWh, { ...a, ppaVerified: true, efficiencyPct: 0 })
}

export function baseShare(a: PowerAssumptions) {
  return a.ppaVerified ? PLANT.ppaKWh / (PLANT.monthlyKWh * (1 - a.efficiencyPct / 100)) : 0
}

export const lakh = (rs: number) => `₹${(rs / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 1 })} lakh`
export const crore = (rs: number) => `₹${(rs / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`
export const unitsLakh = (kWh: number) => `${(kWh / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh`
