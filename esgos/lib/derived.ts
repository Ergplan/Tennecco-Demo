// Derived DataPoints: aggregates and counts computed from other DataPoints.
// They render through <Value /> like everything else; their provenance lists
// the component values they were computed from.

import type { DataPoint, ProviderMode, Source } from "./types"
import { getClient } from "./clients"
import type { DemoState } from "./store"
import { inBoundary } from "./selectors"
import { GAP_RULES_VERSION } from "./gapEngine"
import { PERIOD, TODAY } from "./demoData"

export function derived(
  id: string,
  label: string,
  value: unknown,
  opts: { unit?: string; source?: Source; sourceRef?: string; components?: string[]; period?: string; indicator?: string; note?: string; mode?: ProviderMode } = {},
): DataPoint {
  return {
    id: `derived:${id}`,
    indicator: opts.indicator ?? "derived",
    label,
    scope: {},
    value,
    unit: opts.unit,
    period: opts.period ?? "As of " + TODAY,
    source: opts.source ?? "engine",
    sourceRef: opts.sourceRef,
    evidenceState: "linked",
    components: opts.components,
    note: opts.note,
    mode: opts.mode ?? "mock",
  }
}

type S = Pick<DemoState, "sites" | "energy" | "meters" | "connect" | "dataPoints">

export function groupEnergy(state: S) {
  const sites = inBoundary(state).filter((s) => state.connect.siteStatus[s.id] === "connected" && state.energy[s.id])
  const total = sites.reduce((sum, s) => sum + state.energy[s.id].annualMWh, 0)
  const re = sites.reduce((sum, s) => sum + state.energy[s.id].annualMWh * state.energy[s.id].renewableShare, 0)
  const grid = sites.reduce((sum, s) => sum + state.energy[s.id].annualMWh * state.energy[s.id].shares.grid, 0)
  const completeness = total ? sites.reduce((sum, s) => sum + state.energy[s.id].annualMWh * state.energy[s.id].completeness, 0) / total : 0
  const elecIds = sites.map((s) => `dp:${s.id}:elec.annual`)
  const steamSites = sites.filter((s) => (state.meters[s.id] ?? []).some((m) => m.type === "steam"))
  const waterSites = sites.filter((s) => (state.meters[s.id] ?? []).some((m) => m.type === "water"))
  const fromFile = sites.some((s) => state.energy[s.id].sourceLabel)
  const src: Source = fromFile ? "file" : "ergos"
  const ref = fromFile ? `Sum of ${sites.length} plants in the ${state.energy[sites.find((s) => state.energy[s.id].sourceLabel)!.id].sourceLabel}` : `Sum of ${sites.length} ergOS site summaries`
  // A listed client's ergOS values come from its own imported export, not the sample mocks.
  const mode: ProviderMode = getClient().kind === "public" ? "live" : "mock"
  return {
    sites,
    total: derived("group:elec", "Annual electricity", Math.round(total), { unit: "MWh", source: src, mode, sourceRef: ref, components: elecIds, period: PERIOD, indicator: "P6.E1.elec" }),
    re: derived("group:re", "Renewable share", total ? Math.round((re / total) * 100) : 0, { unit: "%", source: src, mode, sourceRef: "Energy-weighted across " + sites.length + " sites", components: sites.map((s) => `dp:${s.id}:elec.re`), period: PERIOD, indicator: "P6.E1.elec" }),
    grid: derived("group:grid", "Grid share", total ? Math.round((grid / total) * 100) : 0, { unit: "%", source: src, mode, sourceRef: "Energy-weighted across " + sites.length + " sites", components: sites.map((s) => `dp:${s.id}:elec.grid`), period: PERIOD, indicator: "P6.E1.elec" }),
    completeness: derived("group:completeness", "Data completeness", Math.round(completeness * 100), { unit: "%", source: src, mode, sourceRef: fromFile ? "Energy-weighted share of months from readings" : "Energy-weighted interval completeness", components: sites.map((s) => `dp:${s.id}:completeness`), period: PERIOD }),
    connected: derived("group:connected", "Connected sites", sites.length, { source: src, mode, sourceRef: fromFile ? "Plants matched to the energy file" : "ergOS site matches", components: sites.map((s) => `dp:${s.id}:elec.annual`) }),
    steam: derived("group:steam", "Sites with steam metering", steamSites.length, { source: src, mode, sourceRef: "Validated steam header meters", components: steamSites.map((s) => `dp:${s.id}:steam`) }),
    water: derived("group:water", "Sites with water metering", waterSites.length, { source: src, mode, sourceRef: "Validated water withdrawal meters", components: waterSites.map((s) => `dp:${s.id}:water`) }),
  }
}

export function countValue(id: string, label: string, n: number, sourceRef: string, components?: string[], source: Source = "engine") {
  return derived(id, label, n, { source, sourceRef: sourceRef || GAP_RULES_VERSION, components })
}
