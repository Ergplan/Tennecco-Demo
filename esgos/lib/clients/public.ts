// Builds a public client profile from its data pack (lib/clients/data/*.json).
// The packs hold only cited values from the company's filings; people are role
// placeholders unless the filing names them.

import type { Citation, ClientProfile, PublicEntity, PublicGst, PublicMetric, PublicSite, StakeholderSeed } from "./types"
import type { FiledEvidence, StakeholderRole } from "../types"
import { FISCAL_YEAR, PERIOD } from "../demoData"

export type PublicPack = {
  company: {
    legalName: string
    cin: string
    pan: string
    registeredOffice: string
    listing: { exchange: string; symbol: string; bse?: string }
    website?: string
    brsrContact?: string
    brsrOversight?: string
    boundaryAsReported?: string
    assurance: { provider: string | null; type: string; source: Citation }
    revenueCr: Record<string, number>
  }
  brsr: Citation & { fy: string; filed: string }
  sites: PublicSite[]
  entities: PublicEntity[]
  gst: PublicGst[]
  metrics: PublicMetric[]
  notPublic: string[]
}

const FACTORY_ROLES: StakeholderRole[] = ["Plant head", "EHS manager", "HR manager", "Energy manager"]
const OFFICE_ROLES: StakeholderRole[] = ["Office admin", "HR manager"]

// One vacant seat per role at each site, so "Not sure" can still be routed.
export function roleSeats(sites: PublicSite[]): StakeholderSeed[] {
  return sites.flatMap((s) =>
    (s.type === "factory" ? FACTORY_ROLES : OFFICE_ROLES).map((role, i) => ({
      id: `sh-${s.id}-${i}`,
      name: `${role}, ${s.name}`,
      role,
      siteId: s.id,
      vacant: true,
    })),
  )
}

// Short form for badges: the page if known, else the document title.
export function shortCite(c: Citation | undefined): string {
  if (!c) return ""
  if (c.page) return c.page
  return c.title.length > 64 ? c.title.slice(0, 61).trimEnd() + "…" : c.title
}

export function metricValue(p: Pick<ClientProfile, "lastBrsr">, key: string, fy?: string): PublicMetric | undefined {
  const all = p.lastBrsr?.metrics ?? []
  return all.find((m) => m.key === key && (!fy || m.fy === fy)) ?? undefined
}

export function buildPublicProfile(
  pack: PublicPack,
  meta: {
    id: ClientProfile["id"]
    name: string
    shortName: string
    sector: ClientProfile["sector"]
    tagline: string
    groupId: string
    reportingNote: string
    people: StakeholderSeed[]
    filedEvidence: Partial<Record<string, FiledEvidence>>
  },
): ClientProfile {
  const c = pack.company
  const plants = pack.metrics.find((m) => m.key === "a.plants" && m.fy === pack.brsr.fy)
  const offices = pack.metrics.find((m) => m.key === "a.offices" && m.fy === pack.brsr.fy)
  const factories = pack.sites.filter((s) => s.type === "factory")
  return {
    id: meta.id,
    kind: "public",
    name: meta.name,
    shortName: meta.shortName,
    legalName: c.legalName,
    sector: meta.sector,
    tagline: meta.tagline,
    listed: c.listing,
    label: `Public disclosures: ${c.legalName} (${c.listing.exchange}: ${c.listing.symbol})`,
    group: { id: meta.groupId, name: meta.name, pans: [c.pan], fiscalYear: FISCAL_YEAR, period: PERIOD },
    cin: c.cin,
    registeredOffice: c.registeredOffice,
    reportingNote: meta.reportingNote,
    publicSites: pack.sites,
    publicEntities: pack.entities,
    publicGst: pack.gst,
    lastBrsr: {
      fy: pack.brsr.fy,
      filed: pack.brsr.filed,
      boundary: c.boundaryAsReported,
      assurance: c.assurance,
      revenueCr: c.revenueCr,
      counts: { plants: typeof plants?.value === "number" ? plants.value : undefined, offices: typeof offices?.value === "number" ? offices.value : undefined },
      metrics: pack.metrics,
      source: { title: pack.brsr.title, url: pack.brsr.url, page: pack.brsr.page },
    },
    filedEvidence: meta.filedEvidence,
    documentsUsed: [{ title: pack.brsr.title, url: pack.brsr.url, page: pack.brsr.page }],
    notPublic: pack.notPublic,
    stakeholders: [...roleSeats(pack.sites), ...meta.people],
    defaultPaste: "",
    profileOrder: [...factories.map((s) => s.id), ...pack.sites.filter((s) => s.type !== "factory").map((s) => s.id)],
    demoAnswers: {},
    scriptSkip: [],
  }
}
