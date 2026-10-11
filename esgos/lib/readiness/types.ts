// Readiness assessment: every BRSR question and the IFRS S1/S2 requirements,
// each with a status, a gap category, a priority and a place on the roadmap.

export type BrsrEntry = {
  id: string
  section: "A" | "B" | "C"
  part: string
  principle: string | null
  kind: "essential" | "leadership"
  number: string
  title: string
  text: string
  core: boolean
  coreAttribute: string | null
  valueChain: boolean
  owner: string
  dataType: "identity" | "policy" | "governance" | "quantitative" | "qualitative" | "value-chain"
  source: string
  sourceRef?: string
  addedOrChanged?: string | null
}

export type IssbEntry = {
  id: string
  standard: "IFRS S1" | "IFRS S2"
  pillar: string
  ref: string
  title: string
  requirement: string
  brsr: string[]
  coverage: "covered" | "partial" | "not"
  gap: string
  investorNote: string
  sourceRef?: string
  confidence?: string
}

export type CatalogueSource = { id: string; title: string; url?: string; publisher?: string; date?: string; readVia?: string }

export type Catalogue = { generatedAt: string; sources: CatalogueSource[]; brsr: BrsrEntry[]; issb: IssbEntry[] }

export type Status = "now" | "sync" | "open"

export type GapCategory = "Mandatory BRSR" | "BRSR Core" | "BRSR Leadership" | "ISSB incremental" | "Policy and governance" | "Implementation"

export type Priority = "Before listing" | "First BRSR year" | "After listing"

export type Effort = "S" | "M" | "L"

export type MilestoneId = "M1" | "M2" | "M3" | "M4" | "M5"

export type ReadinessItem = {
  id: string
  framework: "BRSR" | "ISSB" | "Implementation"
  ref: string
  title: string
  text: string
  status: Status
  how: string
  category: GapCategory
  gap: string
  owner: { role: string; person?: string }
  scores: { regulatory: number; investor: number; ipo: number; deferrable: boolean }
  score: number
  priority: Priority
  effort: Effort
  weeks: number
  dependsOn: string[]
  milestone: MilestoneId
  engineIds: string[]
  core: boolean
  kind: "essential" | "leadership" | "issb" | "implementation"
  coverage?: IssbEntry["coverage"]
  // What management interviews said about this item, and the recommendation that follows.
  interview?: { count: number; worst: "in-place" | "partial" | "not-in-place" | "na"; sources: string[] }
  // What the desktop document review found for this item.
  documents?: { count: number; worst: "adequate" | "partial" | "inadequate" | "missing"; sources: string[] }
  recommendation?: string
  pillar?: string
  principle?: string | null
}

export type Milestone = { id: MilestoneId; title: string; outcome: string; start: number; end: number }
