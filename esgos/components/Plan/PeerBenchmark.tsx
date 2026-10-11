"use client"

// Pre-IPO benchmark: the listed peer's filed BRSR values, the same values per
// ₹ crore of revenue applied to this company (an estimate for scale), and the
// figures this company has shared so far.

import { Info, Scale } from "lucide-react"
import { getClient } from "@/esgos/lib/clients"
import { atPeerIntensity, peerClient, peerMetric, PEER_ROWS, type PeerRow } from "@/esgos/lib/peer"
import type { DataPoint } from "@/esgos/lib/types"
import { Eyebrow } from "../common/ui"
import { Value } from "../common/Value"

type Row = PeerRow
const ROWS = PEER_ROWS

function peerValue(row: Row): DataPoint | undefined {
  const peer = peerClient()
  const ms = row.keys.map((k) => peerMetric(k))
  if (!peer || ms.some((m) => !m || typeof m.value !== "number")) return undefined
  const vals = ms.map((m) => m!.value as number)
  const value = row.pct ? Math.round((vals[0] / (vals[0] + vals[1])) * 1000) / 10 : vals.reduce((a, b) => a + b, 0)
  const m0 = ms[0]!
  return {
    id: `peer:${row.id}`,
    indicator: m0.indicator,
    label: `${peer.shortName}: ${row.label}, ${m0.fy} (filed)`,
    scope: {},
    value: Math.abs(value) >= 100 ? Math.round(value) : value,
    unit: row.unit,
    period: m0.fy,
    source: "brsr",
    sourceRef: [...new Set(ms.map((m) => m!.source.page).filter(Boolean))].join(", ") || m0.source.title,
    document: m0.source.url,
    evidenceState: "linked",
    note: row.keys.length > 1 ? `${row.pct ? "A ÷ (A + D)" : "Sum"} of ${ms.map((m) => `${m!.label} ${(m!.value as number).toLocaleString("en-IN")} ${m!.unit}`).join(" and ")}. ${m0.source.title}.` : `${m0.source.title}.${m0.note ? " " + m0.note : ""}`,
    mode: "public",
  }
}

function scaled(row: Row): DataPoint | undefined {
  if (!row.scale) return undefined
  const c = getClient()
  const peer = peerClient()
  const parts = row.keys.map((k) => atPeerIntensity(k))
  if (!peer || parts.some((p) => !p)) return undefined
  const value = parts.reduce((a, p) => a + p!.value, 0)
  const perCr = parts.reduce((a, p) => a + p!.perCr, 0)
  const p0 = parts[0]!
  return {
    id: `peer-est:${row.id}`,
    indicator: "peer",
    label: `${c.shortName} ${row.label.toLowerCase()} at ${peer.shortName}'s intensity (estimate)`,
    scope: {},
    value: Math.round(value),
    unit: row.unit,
    period: p0.fy,
    source: "estimate",
    sourceRef: `${peer.shortName} per ₹ cr × ${c.shortName} revenue`,
    evidenceState: "none",
    note: `${peer.shortName} ${p0.fy}: ${perCr.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${row.unit} per ₹ cr of revenue (₹${p0.peerRevenue.toLocaleString("en-IN")} cr). × ${c.shortName} revenue ₹${p0.ourRevenue.toLocaleString("en-IN")} cr (${c.preIpo?.revenueCr?.fy}). For scale only: product mix, plant age and boundary differ. Not ${c.shortName} data.`,
    mode: "public",
  }
}

function ours(row: Row): DataPoint | undefined {
  const c = getClient()
  const p = c.preIpo
  if (!p) return undefined
  if (row.id === "revenue" && p.revenueCr) {
    return {
      id: "ours:revenue",
      indicator: "A",
      label: `${c.shortName} revenue, ${p.revenueCr.fy}`,
      scope: {},
      value: p.revenueCr.value,
      unit: "₹ cr",
      period: p.revenueCr.fy,
      source: "filing",
      sourceRef: p.revenueCr.source.title,
      document: p.revenueCr.source.url,
      evidenceState: "linked",
      note: p.revenueCr.note,
      mode: "public",
    }
  }
  const o = p.ours?.[row.id]
  if (!o) return undefined
  return {
    id: `ours:${row.id}`,
    indicator: "P6",
    label: `${c.shortName}: ${row.label}`,
    scope: {},
    value: o.value,
    unit: o.unit,
    period: "CY 2025",
    source: "file",
    sourceRef: o.estimate ? "client file · includes estimates" : "client file",
    evidenceState: "pending",
    note: o.basis,
    mode: "live",
  }
}

export function PeerBenchmark() {
  const c = getClient()
  const peer = peerClient()
  if (!c.preIpo || !peer?.lastBrsr) return null
  const fy = peer.lastBrsr.fy
  return (
    <div className="mt-10">
      <Eyebrow className="flex items-center gap-2">
        <Scale size={13} /> Peer benchmark · {peer.name} ({peer.listed?.exchange}: {peer.listed?.symbol}), {fy} BRSR
      </Eyebrow>
      <p className="mt-1 max-w-3xl text-sm text-muted">{c.preIpo.peerNote}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] text-faint">
              <th className="py-2 pr-3 font-medium">Metric</th>
              <th className="py-2 pr-3 text-right font-medium">
                {peer.shortName} · filed {fy}
              </th>
              <th className="py-2 pr-3 text-right font-medium">{c.shortName} at {peer.shortName}&apos;s intensity</th>
              <th className="py-2 text-right font-medium">{c.shortName} · your data</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const pv = peerValue(r)
              if (!pv) return null
              const est = scaled(r)
              const o = ours(r)
              return (
                <tr key={r.id} className="border-b border-line align-top">
                  <td className="py-2.5 pr-3">{r.label}</td>
                  <td className="py-2.5 pr-3 text-right">
                    <Value dp={pv} size="sm" className="justify-end" detail={false} />
                  </td>
                  <td className="py-2.5 pr-3 text-right">{est ? <Value dp={est} size="sm" className="justify-end" detail={false} /> : <span className="text-xs text-faint">Not scaled</span>}</td>
                  <td className="py-2.5 text-right">{o ? <Value dp={o} size="sm" className="justify-end" detail={false} /> : <span className="text-xs text-faint">Not shared yet</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-faint">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          {peer.shortName}&apos;s values are as filed in its {fy} BRSR; each opens its page. The middle column scales them by revenue and is an estimate for scale only. {c.shortName}&apos;s energy is from the file you shared: calendar year 2025, not the April–March financial year, and converted from kVAh.
        </span>
      </p>
    </div>
  )
}
