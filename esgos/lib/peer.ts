// A pre-IPO client's listed peer: its filed BRSR values, set beside the
// client's own figures and scaled by revenue where the client has none.

import { CLIENTS, getClient } from "./clients"
import type { ClientProfile, PublicMetric } from "./clients/types"
import type { DataPoint } from "./types"
import { filedDp } from "./filed"

export function peerClient(): ClientProfile | undefined {
  const c = getClient()
  return c.preIpo ? CLIENTS[c.preIpo.peerId] : undefined
}

export function peerMetric(key: string, fy?: string): PublicMetric | undefined {
  const b = peerClient()?.lastBrsr
  if (!b) return undefined
  return b.metrics.find((m) => m.key === key && m.fy === (fy ?? b.fy))
}

export function peerDp(m: PublicMetric): DataPoint {
  const peer = peerClient()
  return { ...filedDp(m, `${peer?.shortName ?? "Peer"}: ${m.label}, ${m.fy} (filed)`), id: `peer:${m.key}:${m.fy}` }
}

// The peer's value per ₹ crore of revenue, applied to this company's revenue.
// An order-of-magnitude reference only: product mix, boundary and processes differ.
export function atPeerIntensity(key: string): { value: number; perCr: number; peerRevenue: number; ourRevenue: number; fy: string } | undefined {
  const c = getClient()
  const m = peerMetric(key)
  const rev = peerMetric("a.revenue")
  const ours = c.preIpo?.revenueCr
  if (!m || !rev || !ours || typeof m.value !== "number" || typeof rev.value !== "number" || !rev.value) return undefined
  const perCr = m.value / rev.value
  return { value: perCr * ours.value, perCr, peerRevenue: rev.value, ourRevenue: ours.value, fy: m.fy }
}

// The rows a pre-IPO benchmark compares, as filed in the peer's BRSR.
export type PeerRow = { id: string; label: string; keys: string[]; unit: string; scale: boolean; pct?: boolean }

export const PEER_ROWS: PeerRow[] = [
  { id: "revenue", label: "Revenue from operations", keys: ["a.revenue"], unit: "₹ cr", scale: false },
  { id: "electricity", label: "Electricity (A + D)", keys: ["p6.e1.A", "p6.e1.D"], unit: "GJ", scale: true },
  { id: "fuel", label: "Fuel, non-renewable (E)", keys: ["p6.e1.E"], unit: "GJ", scale: true },
  { id: "energy", label: "Total energy", keys: ["p6.e1.total"], unit: "GJ", scale: true },
  { id: "reShare", label: "Renewable share of electricity", keys: ["p6.e1.A", "p6.e1.D"], unit: "%", scale: false, pct: true },
  { id: "scope1", label: "Scope 1 emissions", keys: ["p6.e7.scope1"], unit: "tCO2e", scale: true },
  { id: "scope2", label: "Scope 2 emissions", keys: ["p6.e7.scope2"], unit: "tCO2e", scale: true },
  { id: "water", label: "Water withdrawal", keys: ["p6.e3.withdrawal"], unit: "kL", scale: true },
  { id: "waste", label: "Waste generated", keys: ["p6.e9.total"], unit: "MT", scale: true },
  { id: "people", label: "Permanent employees and workers", keys: ["a.employees.permanent", "a.workers.permanent"], unit: "people", scale: true },
  { id: "ltifr", label: "LTIFR, workers", keys: ["p3.e11.ltifr.workers"], unit: "per million hours", scale: false },
  { id: "femaleWages", label: "Wages paid to women", keys: ["p5.e3b.femaleWages"], unit: "%", scale: false },
  { id: "msme", label: "Inputs from MSMEs", keys: ["p8.e4.msme"], unit: "%", scale: false },
]

export type PeerTableRow = { id: string; label: string; unit: string; peer: number; scaled?: number; ours?: { value: number; unit: string; estimate?: boolean; basis: string } }

// Plain numbers for the benchmark: the peer's filed value, the same per ₹ crore
// applied to this company's revenue, and what this company has shared.
export function peerTable(): PeerTableRow[] {
  const c = getClient()
  const out: PeerTableRow[] = []
  for (const row of PEER_ROWS) {
    const ms = row.keys.map((k) => peerMetric(k))
    if (ms.some((m) => !m || typeof m.value !== "number")) continue
    const vals = ms.map((m) => m!.value as number)
    const peer = row.pct ? Math.round((vals[0] / (vals[0] + vals[1])) * 1000) / 10 : vals.reduce((a, b) => a + b, 0)
    const parts = row.scale ? row.keys.map((k) => atPeerIntensity(k)) : []
    const scaled = row.scale && parts.every(Boolean) ? Math.round(parts.reduce((a, p) => a + p!.value, 0)) : undefined
    const o = row.id === "revenue" && c.preIpo?.revenueCr ? { value: c.preIpo.revenueCr.value, unit: "₹ cr", basis: `${c.preIpo.revenueCr.fy}, ${c.preIpo.revenueCr.source.title}` } : c.preIpo?.ours?.[row.id]
    out.push({ id: row.id, label: row.label, unit: row.unit, peer: Math.abs(peer) >= 100 ? Math.round(peer) : peer, scaled, ours: o })
  }
  return out
}

export function estimateDp(key: string, label: string, unit: string): DataPoint | undefined {
  const c = getClient()
  const peer = peerClient()
  const e = atPeerIntensity(key)
  if (!e || !peer) return undefined
  const digits = e.value >= 100 ? 0 : 2
  return {
    id: `peer-est:${key}`,
    indicator: peerMetric(key)?.indicator ?? "peer",
    label: `${c.shortName} ${label} at ${peer.shortName}'s intensity (estimate)`,
    scope: {},
    value: +e.value.toFixed(digits),
    unit,
    period: e.fy,
    source: "estimate",
    sourceRef: `${peer.shortName} ${e.fy} per ₹ cr × ${c.shortName} revenue`,
    evidenceState: "none",
    note: `${peer.shortName} filed ${fmt(peerMetric(key)!.value as number)} ${unit} on revenue of ₹${fmt(e.peerRevenue)} cr (${fmt(e.perCr, 2)} ${unit} per ₹ cr). × ${c.shortName} revenue ₹${fmt(e.ourRevenue)} cr (${c.preIpo?.revenueCr?.fy}, ${c.preIpo?.revenueCr?.source.title}). A reference for scale only, not ${c.shortName} data.`,
    mode: "public",
  }
}

function fmt(n: number, d = 0) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: d })
}
