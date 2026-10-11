// Core domain types for the esgOS demo. Names follow the build brief; extensions are additive.

export type Stage = "agent" | "seed" | "boundary" | "connect" | "profile" | "gaps" | "plan"

export const STAGES: Stage[] = ["agent", "seed", "boundary", "connect", "profile", "gaps", "plan"]

export const STAGE_LABELS: Record<Stage, string> = {
  agent: "Start",
  seed: "Seed",
  boundary: "Boundary",
  connect: "Connect",
  profile: "Profile",
  gaps: "Gaps",
  plan: "Plan",
}

// mock: seeded sample data; public: captured public record (filed BRSR, registry, GST search); live: real API
export type ProviderMode = "mock" | "live" | "public"

export type Group = {
  id: string
  name: string
  pans: string[]
  fiscalYear: string
  period: string
}

export type ReportingEntity = {
  entityId: string
  fiscalYear: string
  consolidation: Record<string, number>
}

export type Relationship = "holding" | "subsidiary" | "jv" | "associate"

export type StakeholderRole =
  | "Plant head"
  | "EHS manager"
  | "HR manager"
  | "Energy manager"
  | "Maintenance head"
  | "Finance controller"
  | "Procurement head"
  | "Company secretary"
  | "ESG lead"
  | "Office admin"
  | "IT / ERP owner"
  | "Quality head"

export type Stakeholder = {
  id: string
  name: string
  role: StakeholderRole
  // Role known, person not on file yet.
  vacant?: boolean
  note?: string
  siteId?: string
  email?: string
  phone?: string
  source: "client" | "owner" | "import"
}

export type LegalEntity = {
  id: string
  name: string
  shortName: string
  cin?: string
  pan?: string
  gstins: { gstin: string; state: string }[]
  parentId?: string
  relationship?: Relationship
  holdingPct?: number
  registeredOffice?: string
  note?: string
  // Stands for several small group companies (public clients).
  aggregate?: boolean
  members?: { name: string; relationship: string; holdingPct?: number | null; country?: string | null }[]
}

export type SiteType = "factory" | "office" | "warehouse"
export type SiteStatus = "candidate" | "confirmed" | "excluded"
export type FoundVia = "ergos" | "gst" | "paste" | "registry" | "brsr" | "maps"

export type ConflictKind = "not-metered" | "ergos-candidates" | "entity-mismatch" | "unplaced" | "commissioning" | "gst-only" | "location"

export type Conflict = {
  kind: ConflictKind
  title: string
  detail: string
  resolved: boolean
  resolution?: string
}

export type Site = {
  id: string
  name: string
  type: SiteType
  city: string
  state: string
  lat: number
  lng: number
  legalEntityId?: string
  gstin?: string
  ergosSiteId?: string
  ownerRole?: string
  status: "candidate" | "confirmed" | "excluded"
  // extensions
  address?: string
  foundVia: FoundVia[]
  conflict?: Conflict
  ergosCandidates?: string[]
  gstEntityId?: string
  gstTradeName?: string
  entityReview?: boolean
  entityHint?: string
  excludedReason?: string
  products?: string
  capacity?: string
  capacityValue?: number
  geocoded?: { formattedAddress: string; placeId: string; partial: boolean; at: string }
  sourceNote?: string
  geoQuery?: string
  // No address on record: the pin is placed by town only and is not geocoded.
  approximatePin?: boolean
  // Filings disagree on the owning entity; resolved at the boundary step.
  reviewNote?: string
  reviewSuggest?: string
}

export type Source =
  | "ergos"
  | "gst"
  | "mca"
  | "hrms"
  | "erp"
  | "ehs"
  | "vault"
  | "owner"
  | "estimate"
  | "engine"
  | "brsr"
  | "filing"
  | "maps"
  // A file the client shared (for example a plant energy workbook), read as given.
  | "file"

export type SourceKey = "ergos" | "hrms" | "erp" | "ehs" | "vault"

export type SourceStatus = "not_connected" | "connecting" | "connected" | "partial"

export type SourceConnection = {
  key: SourceKey
  label: string
  status: SourceStatus
  syncState: "synced" | "pending"
  coverage: string[]
  coverageNote?: string
  connectedAt?: string
  mode: ProviderMode
}

export type EvidenceState = "none" | "pending" | "linked"

export type DataPoint = {
  id: string
  indicator: string
  label?: string
  scope: { siteId?: string; entityId?: string }
  value: unknown
  unit?: string
  period: string
  source: Source
  sourceRef?: string
  evidenceState: EvidenceState
  owner?: string
  // extensions
  syncState?: "synced" | "pending"
  confirmedBy?: string
  confirmedAt?: string
  meterId?: string
  document?: string
  extractDate?: string
  components?: string[]
  note?: string
  mode?: ProviderMode
  questionId?: string
}

export type Task = {
  id: string
  siteId?: string
  question: string
  indicator: string
  ownerRole: string
  due: string
  status: "open" | "done"
  // extensions
  entityId?: string
  createdAt: string
  origin: "not-sure" | "skipped" | "output" | "plan" | "collection" | "closure"
  questionId?: string
  assignee?: { stakeholderId: string; name: string; role: string; email?: string }
}

export type GapResolution = "automatic" | "data" | "document" | "management"
export type IndicatorWeight = "core" | "essential" | "leadership"

export type Gap = {
  id: string
  indicator: string
  scope: { siteId?: string; entityId?: string }
  missingInput: string
  resolution: GapResolution
  weight: IndicatorWeight
  ownerRole: string
  title: string
  description: string
  // extensions
  blocks: string[]
  nextStep: string
  scopeLabel: string
  note?: string
}

export type AuditEvent = {
  id: string
  ts: string
  actor: string
  action: string
  target: string
  before?: unknown
  after?: unknown
  detail?: string
}

export type MeterType = "grid" | "solar" | "wind" | "rooftop" | "dg" | "steam" | "water"

export type Meter = {
  id: string
  type: MeterType
  label: string
  since: string
}

export type EnergySummary = {
  siteId: string
  ergosSiteId: string
  period: string
  annualMWh: number
  shares: { grid: number; openAccessSolar: number; wind: number; rooftop: number; exchange: number }
  renewableShare: number
  peakMW: number
  contractedMW: number
  costCr: number
  completeness: number
  dgMWh: number
  dgDieselKL: number
  steamTonnes?: number
  waterKL?: number
  openAccessNote?: string
  // Set when the figures come from a client's own file rather than ergOS meters.
  sourceLabel?: string
  // How the unmetered months were filled in (for example "connected load × hours × load factor").
  estimateBasis?: string
}

export type DocumentKind = "permit" | "invoice" | "policy" | "report" | "certificate"

export type DocumentRecord = {
  id: string
  name: string
  kind: DocumentKind
  topic: string
  siteId?: string
  entityId?: string
  period: string
  validTo?: string
  uploaded?: boolean
  uploadedAt?: string
}

export type AnswerValue = string | string[] | number | boolean | { value: number; unit: string }

export const NOT_SURE = "__not_sure__"

export type SiteProfile = {
  siteId: string
  status: "pending" | "active" | "done" | "skipped"
  answers: Record<string, AnswerValue>
  answeredBy: Record<string, { by: string; at: string; copiedFrom?: string }>
  history: string[]
  copiedFrom?: string
  copyOffer?: "pending" | "accepted" | "declined"
}

export type IndicatorStatus = "now" | "sync" | "open"

export type InputCoverage = {
  inputId: string
  status: IndicatorStatus
  scopeLabel: string
  scope: { siteId?: string; entityId?: string }
  via: string
}

export type IndicatorResult = {
  id: string
  status: IndicatorStatus
  inputs: InputCoverage[]
}

export type Phase = "idle" | "running" | "done"

// A gap-engine input already evidenced by a client's filed BRSR.
export type FiledEvidence = {
  status: "now" | "sync" | "open"
  via: string
  finding?: string
  nextStep?: string
  ownerRole?: string
  source?: { title: string; url?: string; page?: string }
}
