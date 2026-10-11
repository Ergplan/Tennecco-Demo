import { getClient } from "./clients"
import type { DataPoint, Source } from "./types"
import { NOT_SURE } from "./types"
import { providers } from "@/esgos/providers"

const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 })

export function fmtNumber(n: number, digits?: number) {
  if (digits === 0) return nf0.format(n)
  if (digits !== undefined) return new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
  return Math.abs(n) >= 100 ? nf0.format(n) : nf.format(n)
}

export function fmtAnswer(v: unknown): string {
  if (v === NOT_SURE) return "Not sure"
  if (v === true) return "Yes"
  if (v === false) return "No"
  if (Array.isArray(v)) return v.join(", ")
  if (typeof v === "number") return fmtNumber(v)
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    const o = v as { value: number; unit: string }
    return `${fmtNumber(o.value)} ${o.unit}`
  }
  return v === undefined || v === null ? "—" : String(v)
}

export function fmtDate(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function fmtTime(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export const SOURCE_NAMES: Record<Source, string> = {
  ergos: "ergOS",
  gst: "GST",
  mca: "MCA",
  hrms: "HRMS",
  erp: "ERP",
  ehs: "EHS",
  vault: "Vault",
  owner: "Owner",
  estimate: "Estimate",
  engine: "esgOS engine",
  brsr: "Filed BRSR",
  filing: "Company filing",
  maps: "Google Maps",
  file: "Client file",
}

const PROVIDER_FOR: Partial<Record<Source, keyof typeof providers>> = {
  ergos: "ergos",
  gst: "gst",
  mca: "mca",
  hrms: "hrms",
  erp: "erp",
  ehs: "ehs",
  vault: "vault",
}

// The UI reads each provider's mode flag and marks mock-backed values "(demo)".
export function isDemoSource(source: Source) {
  const key = PROVIDER_FOR[source]
  return key ? providers[key].mode === "mock" : false
}

export function sourceLabel(source: Source, mode?: string) {
  // Before listing, "filings" are regulator, rating-agency and registry records.
  const name = source === "filing" && getClient().preIpo ? "Public record" : SOURCE_NAMES[source]
  if (mode === "public" || mode === "live") return name
  return `${name}${isDemoSource(source) ? " (demo)" : ""}`
}

function shortName(name?: string) {
  if (!name) return ""
  const [first, ...rest] = name.split(" (")[0].split(" ")
  return rest.length ? `${first.charAt(0)}. ${rest.join(" ")}` : first
}

// One-line detail shown next to the badge: meter, extract date, document, owner.
export function sourceDetail(dp: DataPoint): string {
  switch (dp.source) {
    case "ergos":
      return [dp.meterId?.split(",")[0], dp.period].filter(Boolean).join(" · ")
    case "gst":
      return dp.sourceRef ?? ""
    case "mca":
      return dp.sourceRef ?? ""
    case "hrms":
      return dp.extractDate ? `extract ${dp.extractDate}` : dp.sourceRef ?? ""
    case "erp":
    case "ehs":
      return dp.sourceRef ?? ""
    case "vault":
      return dp.document ?? dp.sourceRef ?? ""
    case "owner":
      return [shortName(dp.confirmedBy ?? dp.owner), fmtDate(dp.confirmedAt)].filter(Boolean).join(" · ")
    case "estimate":
      return dp.sourceRef ?? "benchmark"
    case "engine":
    case "brsr":
    case "filing":
    case "maps":
    case "file":
      return dp.sourceRef ?? ""
  }
}

export function fmtDataPointValue(dp: DataPoint): { text: string; unit?: string } {
  const v = dp.value
  if (typeof v === "number") {
    // Filed values keep the precision they were printed with.
    if (dp.source === "brsr" || dp.source === "filing") return { text: Math.abs(v) >= 100 ? fmtNumber(v, 0) : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(v), unit: dp.unit }
    if (dp.unit === "%") return { text: fmtNumber(v, 0), unit: "%" }
    return { text: fmtNumber(v), unit: dp.unit }
  }
  return { text: fmtAnswer(v), unit: dp.unit }
}
