import type { ErgosProvider } from "./types"
import type { EnergySummary, Meter, MeterType, Site } from "@/esgos/lib/types"
import { ERGOS_ENERGY, ERGOS_METERS, ERGOS_SITES, PERIOD, type ErgosSiteRecord } from "@/esgos/lib/demoData"
import { stableHash, wait } from "@/esgos/lib/mode"
import { getClient } from "@/esgos/lib/clients"
import { getImports, matchSiteName, type EnergyRow } from "@/esgos/lib/imports"

// Synthetic ergOS records for sites that arrive from a pasted list in
// live-prospect mode (?seed=paste). Deterministic per site name and city.
const synthetic = new Map<string, { record: ErgosSiteRecord; meters: Meter[]; energy: Omit<EnergySummary, "siteId"> }>()

function syntheticFor(site: Site) {
  const key = `${site.name}|${site.city}`
  const existing = [...synthetic.values()].find((s) => `${s.record.name}|${s.record.city}` === key)
  if (existing) return existing
  const h = stableHash(key)
  const id = `ERG-${(site.city || site.name).slice(0, 3).toUpperCase()}-${String(h % 90 + 10)}`
  const hasSteam = site.type === "factory" && h % 3 !== 0
  const hasWater = site.type === "factory" && h % 4 !== 1
  const types: MeterType[] = ["grid", h % 2 ? "solar" : "wind", "rooftop", "dg"]
  if (hasSteam) types.push("steam")
  if (hasWater) types.push("water")
  const code = id.slice(4, 7)
  const metersList: Meter[] = types.map((t) => ({
    id: `${code}-${t.toUpperCase().slice(0, 3)}-${String((h >> 3) % 9 + 1).padStart(2, "0")}`,
    type: t,
    label: t,
    since: "Apr 2023",
  }))
  const annualMWh = site.type === "warehouse" ? 1800 + (h % 1600) : 6000 + (h % 22000)
  const oa = h % 2 ? 0.12 + (h % 20) / 100 : 0
  const wind = h % 2 ? 0 : 0.1 + (h % 18) / 100
  const rooftop = 0.04 + (h % 5) / 100
  const exchange = 0.05
  const grid = +(1 - oa - wind - rooftop - exchange).toFixed(2)
  const energy: Omit<EnergySummary, "siteId"> = {
    ergosSiteId: id,
    period: PERIOD,
    annualMWh,
    shares: { grid, openAccessSolar: +oa.toFixed(2), wind: +wind.toFixed(2), rooftop: +rooftop.toFixed(2), exchange },
    renewableShare: +(oa + wind + rooftop).toFixed(2),
    peakMW: +(annualMWh / 5200).toFixed(1),
    contractedMW: +((annualMWh / 5200) * 1.2).toFixed(1),
    costCr: +((annualMWh * 1000 * 7.8) / 1e7).toFixed(1),
    completeness: 0.9 + (h % 9) / 100,
    dgMWh: Math.round(annualMWh * 0.012),
    dgDieselKL: Math.round(annualMWh * 0.0035),
    steamTonnes: hasSteam ? Math.round(annualMWh * 2.05) : undefined,
    waterKL: hasWater ? Math.round(annualMWh * 6.8) : undefined,
  }
  const record: ErgosSiteRecord = {
    ergosSiteId: id,
    name: `${site.name} (demo)`,
    city: site.city,
    state: site.state,
    address: site.address ?? site.city,
    lat: site.lat,
    lng: site.lng,
    billingGstin: site.gstin ?? "",
    dataSince: "Apr 2023",
    meterCount: metersList.length,
    label: `${site.name} (demo)`,
  }
  const entry = { record, meters: metersList, energy }
  synthetic.set(id, entry)
  return entry
}

function fromImport(row: EnergyRow, site?: Site) {
  const id = row.ergosSiteId
  const meterTypes = row.meters.filter((m): m is MeterType => ["grid", "solar", "wind", "rooftop", "dg", "steam", "water"].includes(m))
  const record: ErgosSiteRecord = {
    ergosSiteId: id,
    name: row.site,
    city: site?.city ?? row.site,
    state: site?.state ?? "",
    address: site?.address ?? row.site,
    lat: site?.lat ?? 0,
    lng: site?.lng ?? 0,
    billingGstin: site?.gstin ?? "",
    dataSince: row.period,
    meterCount: meterTypes.length,
    label: row.label ? `${row.site} (${row.label})` : `${row.site} (imported ergOS export)`,
  }
  const metersList: Meter[] = meterTypes.map((t) => ({ id: `${id}-${t.toUpperCase()}`, type: t, label: t, since: row.period }))
  const renewable = row.solarShare + row.windShare + row.rooftopShare
  const energy: Omit<EnergySummary, "siteId"> = {
    ergosSiteId: id,
    period: row.period,
    annualMWh: row.annualMWh,
    shares: { grid: row.gridShare, openAccessSolar: row.solarShare, wind: row.windShare, rooftop: row.rooftopShare, exchange: row.exchangeShare },
    renewableShare: +renewable.toFixed(3),
    peakMW: row.peakMW ?? 0,
    contractedMW: row.contractedMW ?? 0,
    costCr: 0,
    completeness: row.completeness,
    dgMWh: 0,
    dgDieselKL: row.dgDieselKL ?? 0,
    steamTonnes: row.steamTonnes,
    waterKL: row.waterKL,
    openAccessNote: row.note ?? "Imported from an ergOS export",
    sourceLabel: row.label,
    estimateBasis: row.basis,
  }
  return { record, meters: metersList, energy }
}

function lookup(ergosSiteId: string) {
  const record = ERGOS_SITES.find((r) => r.ergosSiteId === ergosSiteId)
  if (record && getClient().kind === "sample") return { record, meters: ERGOS_METERS[ergosSiteId] ?? [], energy: ERGOS_ENERGY[ergosSiteId] }
  const imported = getImports().energy.find((r) => r.ergosSiteId === ergosSiteId)
  if (imported) return fromImport(imported)
  return synthetic.get(ergosSiteId)
}

export const ergosMock: ErgosProvider = {
  mode: "mock",
  label: "ergOS",

  async *streamSites() {
    for (const record of getClient().kind === "sample" ? ERGOS_SITES : []) {
      await wait(380)
      yield record
    }
  },

  async matchSite(site) {
    await wait(520)
    // A client's imported ergOS export takes precedence.
    const rows = getImports().energy
    const imported =
      rows.find((r) => r.site.toLowerCase().trim() === site.name.toLowerCase().trim()) ??
      rows.find((r) => !r.exact && matchSiteName(r.site, [{ id: site.id, name: site.name, city: site.city }]))
    if (imported) return { status: "connected", candidates: [fromImport(imported, site).record] }
    if (getClient().kind === "public") return { status: "not-found", candidates: [] }
    if (site.ergosCandidates && site.ergosCandidates.length > 1 && !site.ergosSiteId) {
      return { status: "needs-review", candidates: site.ergosCandidates.map((id) => lookup(id)!.record) }
    }
    if (site.ergosSiteId) {
      const found = lookup(site.ergosSiteId)
      if (found) return { status: "connected", candidates: [found.record] }
    }
    // Live-prospect mode: pasted factories and warehouses get a deterministic demo record.
    const seededCity = ERGOS_SITES.some((r) => r.city === site.city)
    if (!seededCity && site.type !== "office" && !site.foundVia.includes("gst")) {
      const s = syntheticFor(site)
      return { status: "connected", candidates: [s.record] }
    }
    return { status: "not-found", candidates: [] }
  },

  async *streamMeters(ergosSiteId) {
    const found = lookup(ergosSiteId)
    for (const meter of found?.meters ?? []) {
      await wait(260)
      yield meter
    }
  },

  async energySummary(ergosSiteId) {
    await wait(200)
    const found = lookup(ergosSiteId)
    if (!found) throw new Error(`ergOS site ${ergosSiteId} not found`)
    return found.energy
  },

  describeCandidate(ergosSiteId) {
    return lookup(ergosSiteId)?.record
  },
}

export function ergosMetersFor(ergosSiteId: string): Meter[] {
  return lookup(ergosSiteId)?.meters ?? []
}
