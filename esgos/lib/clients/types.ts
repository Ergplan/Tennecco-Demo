// Client profiles. One profile is active at a time (?client= in the URL, or the
// menu). "sample" profiles run on seeded fictional data through the mock
// providers; "public" profiles run on a listed company's published disclosures
// (filed BRSR, annual report, registry), each value carrying its citation.

import type { AnswerValue, FiledEvidence, Group, Relationship, SiteType, StakeholderRole } from "../types"
import type { ImportedData } from "../imports"

export type ClientId = "tenneco" | "asianpaints" | "bikaji" | "haldiram" | "aurelia"

export type Citation = { title: string; url?: string; page?: string; publisher?: string; date?: string; note?: string }

export type PublicSite = {
  key: string
  id: string
  name: string
  type: SiteType
  // Where the site first shows up in public records.
  via: "registry" | "brsr" | "gst"
  address?: string
  geoQuery?: string
  city: string
  state: string
  // Approximate town-level position; Google Maps geocoding refines it.
  lat: number
  lng: number
  entityName: string
  products?: string
  capacity?: string
  capacityValue?: number
  capacityUnit?: string
  status?: "operating" | "commissioning" | "under-construction" | "unconfirmed"
  statusNote?: string
  // Ownership that the filings disagree on: raised at the boundary step.
  reviewNote?: string
  reviewSuggest?: string
  // Known only from a file the client shared (not public); pin placed by town.
  fromClientFile?: boolean
  approximatePin?: boolean
  ownerRole: string
  source: Citation
  moreSources?: Citation[]
  note?: string
}

export type PublicEntity = {
  id: string
  name: string
  shortName: string
  cin?: string
  relationship: Relationship
  holdingPct?: number
  country: string
  inBoundary: boolean | null
  note?: string
  source: Citation
  // A card standing for several small group companies (listed in members).
  aggregate?: boolean
  members?: { name: string; relationship: string; holdingPct?: number | null; country?: string | null }[]
}

export type PublicMetric = {
  key: string
  id: string
  indicator: string
  label: string
  fy: string
  value: number | string
  unit: string
  reported?: string
  source: Citation
  note?: string
}

export type PublicGst = { gstin: string; state: string; address?: string; source: Citation; siteKeys?: string[]; note?: string }

export type StakeholderSeed = {
  id: string
  name: string
  role: StakeholderRole
  siteId?: string
  email?: string
  phone?: string
  // Role known, person not on file yet (public clients).
  vacant?: boolean
  note?: string
}

// A plant energy workbook the client shared, summarised for the Connect screen.
export type EnergyFileSummary = {
  file: string
  providedBy: string
  period: string
  unit: string
  months: string[]
  totalKvah: number
  actualShare: number
  powerFactor: number
  mwhAssumed: number
  solar: { mwh: number; basis: string }
  greenShareAsComputed: number
  greenShareKwh: number
  kindLegend: Record<string, string>
  plants: { name: string; site: string; kvah: number; actualMonths: number; operatingMonths: number; kinds: string[]; monthly?: number[]; basis?: string }[]
  caveats: string[]
}

export type PreIpo = {
  status: string
  // When BRSR becomes mandatory, and why (SEBI LODR Reg 34(2)(f)).
  applicability: string
  plannedListing?: string
  peerId: ClientId
  peerNote: string
  revenueCr?: { fy: string; value: number; source: Citation; note?: string }
  // This company's own figures to set beside the peer's filed values, keyed by
  // the peer metric key (for example "p6.e1.D"). Only what the client has shared.
  ours?: Record<string, { value: number; unit: string; basis: string; estimate?: boolean }>
  // How the plants were found without a filed BRSR (seed step title, status line and narration).
  plantSources: { title: string; reading: string; narration: string }
  // The reporting-boundary question for a first BRSR.
  boundaryQuestion: string
  sources: Citation[]
}

export type ClientProfile = {
  id: ClientId
  kind: "public" | "sample"
  name: string
  shortName: string
  legalName: string
  sector: "paints" | "snacks" | "foods" | "auto"
  tagline: string
  listed?: { exchange: string; symbol: string; bse?: string }
  // Unlisted company preparing to list: no BRSR filed yet; readiness is ranked
  // against the listing date and compared with a listed peer.
  preIpo?: PreIpo
  label: string
  group: Group
  cin?: string
  registeredOffice?: string
  // Year of incorporation as on record (Section A Q3), where known.
  incorporated?: string
  reportingNote: string
  // Public profiles
  publicSites: PublicSite[]
  publicEntities: PublicEntity[]
  publicGst: PublicGst[]
  lastBrsr?: {
    fy: string
    filed?: string
    boundary?: string
    assurance?: { provider?: string | null; type?: string; source?: Citation }
    revenueCr?: Record<string, number>
    counts?: { plants?: number; offices?: number }
    metrics: PublicMetric[]
    source: Citation
  }
  // Gap-engine inputs already evidenced by the filed BRSR (keyed by input id).
  filedEvidence?: Partial<Record<string, FiledEvidence>>
  documentsUsed: Citation[]
  // Files the client has already shared, loaded as imports at the start.
  preloadedImports?: Partial<ImportedData>
  energyFile?: EnergyFileSummary
  notPublic: string[]
  // Shared
  stakeholders: StakeholderSeed[]
  defaultPaste: string
  profileOrder: string[]
  demoAnswers: Record<string, Record<string, AnswerValue>>
  scriptSkip: string[]
}
