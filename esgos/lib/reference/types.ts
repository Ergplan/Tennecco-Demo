// Regulatory reference library: BRSR, BRSR Core, GHG Protocol, Indian
// regulations and emission factors, compiled from primary sources with citations.

export type RefSource = { title: string; url?: string; publisher?: string; date?: string; primary?: boolean; page?: string }

export type RefEntry = {
  id: string
  framework: "BRSR" | "BRSR Core" | "GHG Protocol" | "Regulation" | "Emission factor" | "Applicability"
  ref: string
  title: string
  officialText?: string
  whatToReport?: string
  unit?: string
  core?: { attribute?: string; parameter?: string; measurement?: string } | null
  whyNeeded: string
  evidence?: string[]
  stakeholders?: string[]
  relatedQuestions?: string[]
  sources: RefSource[]
  confidence?: "verified" | "secondary" | "unverified"
  sector?: "paints" | "snacks" | "general"
}

export type QuestionWhy = { why: string; feeds?: string[]; regulations?: string[]; evidence?: string[]; stakeholders?: string[]; sectorNotes?: Partial<Record<"paints" | "snacks", string>> }

// Sector-specific questions the research suggests adding to a site profile.
export type SuggestedQuestion = { id: string; sector: "paints" | "snacks"; text: string; type: string; options?: string[]; why: string; feeds?: string[]; stakeholders?: string[] }

export type EmissionFactor = { id: string; item: string; value: number | null; unit: string; basis?: string; source?: RefSource; version?: string; notes?: string }

export type GwpRow = { gas: string; ar5?: number | null; ar6?: number | null; source?: RefSource }

export type ReferenceData = {
  generatedAt: string
  entries: RefEntry[]
  questions: Record<string, QuestionWhy>
  suggestedQuestions?: SuggestedQuestion[]
  emissionFactors: EmissionFactor[]
  gwp: GwpRow[]
}
