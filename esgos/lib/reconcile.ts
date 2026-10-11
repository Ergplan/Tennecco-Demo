// Reconciliation: merges ergOS, GST and pasted records into one footprint.
// Conflicts are raised only for real contradictions between sources.

import type { Site, SiteType } from "./types"
import type { ErgosSiteRecord, GstPremiseRecord } from "./demoData"
import { SITE_META } from "./demoData"
import { findCity } from "./geo"
import type { ParsedSite } from "@/esgos/providers/types"

const GENERIC = new Set(["aurelia", "tenneco", "federal", "mogul", "india", "private", "limited", "pvt", "ltd", "the", "and", "company", "co"])

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function distinctTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !GENERIC.has(w))
}

function metaFor(city: string, type: SiteType) {
  const m = SITE_META[city]
  return m && m.type === type ? m : undefined
}

function uniqueName(sites: Site[], name: string, type: SiteType) {
  if (!sites.some((s) => s.name === name)) return name
  const suffix = type === "office" ? "office" : type === "warehouse" ? "warehouse" : "plant"
  return `${name} ${suffix}`
}

export function mergeErgosRecord(sites: Site[], rec: ErgosSiteRecord): { sites: Site[]; siteId: string; isNew: boolean } {
  const existing = sites.find((s) => s.city === rec.city && s.type === "factory")
  if (existing) {
    if (existing.ergosSiteId === rec.ergosSiteId || existing.ergosCandidates?.includes(rec.ergosSiteId)) {
      return { sites, siteId: existing.id, isNew: false }
    }
    const candidates = [...(existing.ergosCandidates ?? (existing.ergosSiteId ? [existing.ergosSiteId] : [])), rec.ergosSiteId]
    const updated: Site = {
      ...existing,
      ergosSiteId: undefined,
      ergosCandidates: candidates,
      status: "candidate",
      conflict: {
        kind: "ergos-candidates",
        title: `Two ergOS records for ${existing.name}`,
        detail: `${candidates.join(" and ")} sit at the same address. One plant or two?`,
        resolved: false,
      },
    }
    return { sites: sites.map((s) => (s.id === existing.id ? updated : s)), siteId: existing.id, isNew: false }
  }
  const meta = metaFor(rec.city, "factory")
  const site: Site = {
    id: meta?.id ?? `site-p-${slug(rec.city)}`,
    name: meta?.name ?? rec.city,
    type: "factory",
    city: rec.city,
    state: rec.state,
    lat: rec.lat,
    lng: rec.lng,
    address: rec.address,
    ergosSiteId: rec.ergosSiteId,
    ownerRole: meta?.ownerRole ?? `Plant head, ${rec.city}`,
    status: "confirmed",
    foundVia: ["ergos"],
  }
  return { sites: [...sites, site], siteId: site.id, isNew: true }
}

function natureToType(n: GstPremiseRecord["natureOfBusiness"]): SiteType {
  if (n.startsWith("Factory")) return "factory"
  if (n.startsWith("Warehouse")) return "warehouse"
  return "office"
}

export function entityMismatch(premise: GstPremiseRecord, knownLegalNames: string[]): string | undefined {
  const own = distinctTokens(premise.legalName)
  const trade = premise.tradeName.toLowerCase()
  for (const other of knownLegalNames) {
    if (other === premise.legalName) continue
    const tokens = distinctTokens(other).filter((t) => !own.includes(t))
    if (tokens.some((t) => trade.includes(t))) return other
  }
  return undefined
}

export function mergeGstPremise(
  sites: Site[],
  premise: GstPremiseRecord,
  knownLegalNames: string[],
): { sites: Site[]; siteId: string; isNew: boolean } {
  const type = natureToType(premise.natureOfBusiness)
  const existing = sites.find((s) => s.city === premise.city && s.type === type)
  if (existing) {
    const updated: Site = {
      ...existing,
      foundVia: existing.foundVia.includes("gst") ? existing.foundVia : [...existing.foundVia, "gst"],
      gstin: premise.gstin,
      gstTradeName: premise.tradeName,
      address: existing.address ?? premise.address,
    }
    return { sites: sites.map((s) => (s.id === existing.id ? updated : s)), siteId: existing.id, isNew: false }
  }
  const city = findCity(premise.city) ?? findCity(premise.address)
  const meta = metaFor(premise.city, type)
  const base: Site = {
    id: meta?.id ?? `site-p-${slug(premise.city)}-${type}`,
    name: uniqueName(sites, meta?.name ?? premise.city, type),
    type,
    city: city?.city ?? premise.city,
    state: premise.state,
    lat: city?.lat ?? 22.5,
    lng: city?.lng ?? 79,
    address: premise.address,
    gstin: premise.gstin,
    gstTradeName: premise.tradeName,
    ownerRole: meta?.ownerRole ?? (type === "office" ? `Office admin, ${premise.city}` : `Site head, ${premise.city}`),
    status: "confirmed",
    foundVia: ["gst"],
  }
  const mismatch = entityMismatch(premise, knownLegalNames)
  if (mismatch) {
    base.status = "candidate"
    base.conflict = {
      kind: "entity-mismatch",
      title: `${base.name}'s GST entity looks wrong`,
      detail: `The GSTIN belongs to ${premise.legalName}, but the trade name is ${premise.tradeName}.`,
      resolved: false,
    }
  } else if (type === "factory") {
    base.status = "candidate"
    base.conflict = {
      kind: "not-metered",
      title: `${base.name} is registered for GST but not metered`,
      detail: `GST lists a factory at ${premise.address}. ergOS has no meters there. Is it operating?`,
      resolved: false,
    }
  }
  return { sites: [...sites, base], siteId: base.id, isNew: true }
}

export function mergeParsedSite(sites: Site[], parsed: ParsedSite): { sites: Site[]; siteId: string; isNew: boolean } {
  if (parsed.city) {
    const existing = sites.find((s) => s.city === parsed.city && s.type === parsed.type)
    if (existing) {
      const updated: Site = { ...existing, foundVia: existing.foundVia.includes("paste") ? existing.foundVia : [...existing.foundVia, "paste"] }
      return { sites: sites.map((s) => (s.id === existing.id ? updated : s)), siteId: existing.id, isNew: false }
    }
  }
  const meta = parsed.city ? metaFor(parsed.city, parsed.type) : undefined
  const name = uniqueName(sites, meta?.name ?? parsed.name, parsed.type)
  const site: Site = {
    id: meta?.id ?? `site-p-${slug(name)}-${sites.length}`,
    name,
    type: parsed.type,
    city: parsed.city ?? "",
    state: parsed.state ?? "",
    lat: parsed.lat ?? 22.5,
    lng: parsed.lng ?? 79,
    address: parsed.address ?? parsed.raw,
    gstin: parsed.gstin,
    ownerRole: meta?.ownerRole ?? (parsed.type === "office" ? `Office admin, ${name}` : parsed.type === "warehouse" ? `Warehouse manager, ${name}` : `Plant head, ${name}`),
    status: parsed.city ? "confirmed" : "candidate",
    foundVia: ["paste"],
    entityHint: parsed.entityHint,
  }
  if (!parsed.city) {
    site.conflict = {
      kind: "unplaced",
      title: `Where is "${parsed.name}"?`,
      detail: "I couldn't match a city in that line. Pick one so I can place it.",
      resolved: false,
    }
  }
  return { sites: [...sites, site], siteId: site.id, isNew: true }
}
