// ergOS demo data for Tenneco's factories.
//
// Bengaluru's volume and renewable share are the plant note's. Chennai's and Chakan I's
// renewable shares follow TCAIL's FY2025-26 BRSR facts, with loads sized so TCAIL's
// renewable total matches its filed 9,925 GJ. Patiala's renewable volume is FMGIL's filed
// renewable energy less Bengaluru's PPA. Every other load is illustrative until the
// plant's meters or bills are connected. Intraday shapes are illustrative throughout.

export type Basis = "plant note" | "filed BRSR" | "derived from BRSR" | "illustrative"

export type PlantEnergy = {
  siteId: string
  annualMWh: number
  /** renewable supply a year: wheeled PPA / open access, and on-site rooftop */
  ppaMWh: number
  rooftopMWh: number
  loadBasis: Basis
  reBasis: Basis
  note: string
}

export const PLANT_ENERGY: PlantEnergy[] = [
  { siteId: "fmgil-blr", annualMWh: 39_600, ppaMWh: 33_000, rooftopMWh: 0, loadBasis: "plant note", reBasis: "plant note", note: "27.5 lakh units a month on the PPA; certificates to evidence" },
  { siteId: "fmgil-patiala", annualMWh: 42_000, ppaMWh: 31_229, rooftopMWh: 0, loadBasis: "illustrative", reBasis: "derived from BRSR", note: "FMGIL's filed renewable energy less Bengaluru's PPA" },
  { siteId: "tcail-chennai", annualMWh: 2_000, ppaMWh: 1_800, rooftopMWh: 0, loadBasis: "illustrative", reBasis: "filed BRSR", note: "Over 90% solar and wind through a PPA" },
  { siteId: "tcail-chakan1", annualMWh: 3_800, ppaMWh: 0, rooftopMWh: 870, loadBasis: "illustrative", reBasis: "filed BRSR", note: "920 kWp rooftop, about 870 MWh a year" },
  { siteId: "tcail-chakan2", annualMWh: 2_700, ppaMWh: 0, rooftopMWh: 0, loadBasis: "illustrative", reBasis: "illustrative", note: "" },
  { siteId: "tcail-pithampur", annualMWh: 2_000, ppaMWh: 0, rooftopMWh: 0, loadBasis: "illustrative", reBasis: "illustrative", note: "" },
  { siteId: "taipl-hosur", annualMWh: 9_000, ppaMWh: 0, rooftopMWh: 0, loadBasis: "illustrative", reBasis: "illustrative", note: "" },
  { siteId: "taipl-bawal", annualMWh: 4_500, ppaMWh: 0, rooftopMWh: 0, loadBasis: "illustrative", reBasis: "illustrative", note: "" },
  { siteId: "taipl-sanand", annualMWh: 3_500, ppaMWh: 0, rooftopMWh: 0, loadBasis: "illustrative", reBasis: "illustrative", note: "" },
  { siteId: "taipl-puducherry", annualMWh: 4_000, ppaMWh: 0, rooftopMWh: 0, loadBasis: "illustrative", reBasis: "illustrative", note: "" },
  { siteId: "fmbil-parwanoo", annualMWh: 6_000, ppaMWh: 0, rooftopMWh: 0, loadBasis: "illustrative", reBasis: "illustrative", note: "" },
  { siteId: "fmsil-chakan", annualMWh: 3_000, ppaMWh: 0, rooftopMWh: 0, loadBasis: "illustrative", reBasis: "illustrative", note: "" },
  { siteId: "fmps-bhiwadi", annualMWh: 4_000, ppaMWh: 0, rooftopMWh: 0, loadBasis: "illustrative", reBasis: "illustrative", note: "" },
]

export const energyOf = (siteId: string) => PLANT_ENERGY.find((p) => p.siteId === siteId)!

export type Block = { demand: number; ppa: number; rooftop: number; grid: number; iex: number; surplus: number }

const BLOCKS = 96

// Deterministic noise so the same plant draws the same day every time. Integer hashing
// (not Math.sin of large numbers) so the server and the browser agree to the last bit.
function noise(seed: number, i: number) {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i | 0, 0x85ebca77)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296
}

const hashId = (id: string) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0)

/** three-shift auto-components load: flat with dips at shift change and lunch */
function loadShape(i: number, seed: number, weekday: number) {
  const h = i / 4
  let k = 1
  for (const c of [6, 14, 22]) if (h >= c && h < c + 0.5) k = 0.78
  if (h >= 12.5 && h < 13.25) k = Math.min(k, 0.9)
  if (h >= 1 && h < 5) k *= 0.94
  const weekend = weekday === 0 ? 0.62 : weekday === 6 ? 0.88 : 1
  return k * weekend * (0.96 + noise(seed, i) * 0.08)
}

const solarShape = (i: number) => {
  const h = i / 4
  return h < 6.25 || h > 18.5 ? 0 : Math.sin(((h - 6.25) / 12.25) * Math.PI) ** 1.6
}
const windShape = (i: number, seed: number) => {
  const h = i / 4
  return 0.55 + 0.45 * Math.sin(((h - 13) / 24) * 2 * Math.PI) + (noise(seed + 7, Math.floor(i / 6)) - 0.5) * 0.3
}

/** one day of 15-minute blocks for a plant, in kW */
export function dayBlocks(p: PlantEnergy, weekday: number): Block[] {
  const seed = hashId(p.siteId) + weekday * 31
  const avgKW = (p.annualMWh * 1000) / 8760 / 0.93
  const demand = Array.from({ length: BLOCKS }, (_, i) => avgKW * loadShape(i, seed, weekday))
  const dayKWh = demand.reduce((a, d) => a + d / 4, 0)
  const ppaDayKWh = ((p.ppaMWh / p.annualMWh) || 0) * dayKWh
  const roofDayKWh = ((p.rooftopMWh / p.annualMWh) || 0) * dayKWh
  // PPA: wind-heavy hybrid; rooftop: solar only
  const hybrid = Array.from({ length: BLOCKS }, (_, i) => 0.45 * solarShape(i) + 0.55 * Math.max(0, windShape(i, seed)))
  const hybridSum = hybrid.reduce((a, b) => a + b / 4, 0) || 1
  const solarSum = Array.from({ length: BLOCKS }, (_, i) => solarShape(i)).reduce((a, b) => a + b / 4, 0) || 1
  return demand.map((d, i) => {
    const ppa = (hybrid[i] / hybridSum) * ppaDayKWh
    const rooftop = (solarShape(i) / solarSum) * roofDayKWh
    const re = ppa + rooftop
    const surplus = Math.max(0, re - d)
    const usedPpa = Math.min(ppa, Math.max(0, d - rooftop))
    const usedRoof = Math.min(rooftop, d)
    return { demand: d, ppa: usedPpa, rooftop: usedRoof, grid: Math.max(0, d - usedPpa - usedRoof), iex: 0, surplus }
  })
}

export function sumBlocks(list: Block[][]): Block[] {
  return Array.from({ length: BLOCKS }, (_, i) =>
    list.reduce<Block>(
      (a, b) => ({
        demand: a.demand + b[i].demand,
        ppa: a.ppa + b[i].ppa,
        rooftop: a.rooftop + b[i].rooftop,
        grid: a.grid + b[i].grid,
        iex: a.iex + b[i].iex,
        surplus: a.surplus + b[i].surplus,
      }),
      { demand: 0, ppa: 0, rooftop: 0, grid: 0, iex: 0, surplus: 0 },
    ),
  )
}

/** IEX day-ahead price shape, ₹/kWh: cheap solar hours, evening peak (illustrative) */
export const iexPrice = (i: number) => {
  const h = i / 4
  const solarDip = solarShape(i) * 2.6
  const evening = h >= 18 && h < 23 ? 3.8 * Math.sin(((h - 18) / 5) * Math.PI) : 0
  return 5.2 - solarDip + evening
}

export const DAYS = [
  { label: "Mon 5 Oct", weekday: 1 },
  { label: "Tue 6 Oct", weekday: 2 },
  { label: "Wed 7 Oct", weekday: 3 },
  { label: "Thu 8 Oct", weekday: 4 },
  { label: "Fri 9 Oct", weekday: 5 },
  { label: "Sat 10 Oct", weekday: 6 },
  { label: "Sun 11 Oct", weekday: 0 },
]

export function baselineOf(p: PlantEnergy) {
  const re = p.ppaMWh + p.rooftopMWh
  return { annual: p.annualMWh, re, share: p.annualMWh ? re / p.annualMWh : 0 }
}
