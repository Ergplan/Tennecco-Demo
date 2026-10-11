// Values from a public client's filed BRSR, as DataPoints that open their
// citation (document, page, value as printed).

import { getClient } from "./clients"
import type { PublicMetric } from "./clients/types"
import type { DataPoint } from "./types"

export function filedMetric(key: string, fy?: string): PublicMetric | undefined {
  const b = getClient().lastBrsr
  if (!b) return undefined
  return b.metrics.find((m) => m.key === key && m.fy === (fy ?? b.fy))
}

export function filedMetrics(indicator?: string, fy?: string): PublicMetric[] {
  const b = getClient().lastBrsr
  if (!b) return []
  return b.metrics.filter((m) => m.fy === (fy ?? b.fy) && (!indicator || m.indicator === indicator))
}

export function filedDp(m: PublicMetric, label?: string): DataPoint {
  return {
    id: `filed:${m.key}:${m.fy}`,
    indicator: m.indicator,
    label: label ?? `${m.label}, ${m.fy} (filed)`,
    scope: {},
    value: m.value,
    unit: m.unit,
    period: m.fy,
    source: "brsr",
    sourceRef: m.source.page ? `${m.source.page}` : m.source.title,
    document: m.source.url,
    evidenceState: "linked",
    note: [m.source.title + ".", m.reported && `As printed: ${m.reported}.`, m.note, m.source.note].filter(Boolean).join(" ") || undefined,
    mode: "public",
  }
}
