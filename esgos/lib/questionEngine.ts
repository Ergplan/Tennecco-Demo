// Data-driven question engine. Each question names the indicators it unlocks
// and the sources that suppress it. A suppressed question is never asked; the
// engine records the inferred answer with the suppressing source instead.

import type { AnswerValue, Site, SiteProfile, Source, SourceConnection, SourceKey } from "./types"
import { NOT_SURE } from "./types"

export type Answers = Record<string, AnswerValue>

export type Category = "operations" | "heat" | "water" | "waste" | "refrigerants" | "people" | "safety" | "permits"

// What connected sources know about one site.
export type SourceState = {
  siteType: Site["type"]
  ergos: { connected: boolean; steam: boolean; water: boolean; dg: boolean; loadProfile: boolean }
  erp: { connected: boolean; productMaster: boolean; fuelPurchases: boolean; fuels: string[] }
  hrms: { connected: boolean; covers: boolean }
  ehs: { connected: boolean; covers: boolean; wasteStreams: string[]; disposal?: string }
  vault: { connected: boolean; permit: boolean; fuelInvoices: boolean }
  // What the company's own filings already say about this site (public clients).
  filing?: { products?: string; ref?: string }
}

export type Suppression = { source: Source; ref: string; value: AnswerValue; label: string }

export type Question = {
  id: string
  category: Category
  text: (site: Site) => string
  type: "boolean" | "singleSelect" | "multiSelect" | "number" | "text"
  options?: string[]
  suggestions?: string[]
  units?: string[]
  unlocks: string[]
  suppressedBy?: (sources: SourceState) => boolean
  infer?: (sources: SourceState) => Suppression
  showWhen?: (answers: Answers) => boolean
  dependsOn?: string
  appliesTo: Site["type"][]
  estimatedSeconds: number
  ownerRole: "Plant head" | "EHS manager" | "HR manager" | "Office admin"
  mandatory?: (site: Site, s: SourceState, answers: Answers) => boolean
  hint?: string
  // Quantities are site-specific and never copied between profiles.
  copyable?: boolean
}

const isTrue = (v: AnswerValue | undefined) => v === true
const includes = (v: AnswerValue | undefined, x: string) => Array.isArray(v) && v.includes(x)

export const QUESTIONS: Question[] = [
  {
    id: "products",
    category: "operations",
    text: (s) => `What does ${s.name} make?`,
    type: "text",
    suggestions: ["Biscuits and cookies", "Packaged snacks", "Confectionery", "Rusks and bakery", "Dairy beverages"],
    unlocks: ["A.II.16"],
    suppressedBy: (s) => (s.erp.connected && s.erp.productMaster) || !!s.filing?.products,
    infer: (s) =>
      s.erp.connected && s.erp.productMaster
        ? { source: "erp", ref: "ERP product master", value: "From ERP product master", label: "Products" }
        : { source: "brsr", ref: s.filing?.ref ?? "Filed disclosures", value: s.filing!.products!, label: "Products" },
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "Plant head",
  },
  {
    id: "output",
    category: "operations",
    text: (s) => `What was ${s.name}'s annual production last year?`,
    type: "number",
    units: ["tonnes", "kL", "million packs"],
    unlocks: ["P6.E1.intensity", "P6.E7.scope1", "P6.E3.withdrawal"],
    suppressedBy: (s) => s.erp.connected && s.erp.fuelPurchases,
    infer: () => ({ source: "erp", ref: "ERP production postings", value: "From ERP production postings", label: "Production" }),
    appliesTo: ["factory"],
    estimatedSeconds: 4,
    ownerRole: "Plant head",
    mandatory: (_site, s, a) => s.ergos.steam || s.ergos.water || isTrue(a.boilers),
    hint: "Needed for every intensity metric in BRSR Core.",
    copyable: false,
  },
  {
    id: "continuity",
    category: "operations",
    text: (s) => `Does ${s.name} run continuously, in batches or seasonally?`,
    type: "singleSelect",
    options: ["Continuous", "Batch", "Seasonal"],
    unlocks: [],
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "Plant head",
  },
  {
    id: "boilers",
    category: "heat",
    text: (s) => `Does ${s.name} operate boilers or thermic fluid heaters?`,
    type: "boolean",
    unlocks: ["P6.E1.fuel"],
    suppressedBy: (s) => s.ergos.connected && s.ergos.steam,
    infer: () => ({ source: "ergos", ref: "Steam header meter", value: true, label: "Boilers" }),
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "Plant head",
  },
  {
    id: "boilerFuel",
    dependsOn: "boilers",
    category: "heat",
    text: () => "Which fuels do the boilers burn?",
    type: "multiSelect",
    options: ["PNG", "LPG", "Diesel", "Coal", "Biomass", "Other"],
    unlocks: ["P6.E1.fuel", "P6.E7.scope1"],
    showWhen: (a) => isTrue(a.boilers),
    suppressedBy: (s) => s.erp.connected && s.erp.fuelPurchases,
    infer: (s) => ({ source: "erp", ref: "ERP fuel purchases", value: s.erp.fuels, label: "Boiler fuels" }),
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "Plant head",
  },
  {
    id: "fuelQuantitySource",
    dependsOn: "boilers",
    category: "heat",
    text: () => "Where are fuel quantities recorded?",
    type: "singleSelect",
    options: ["ERP", "Invoices", "Logbook", "Not recorded"],
    unlocks: ["P6.E1.fuel"],
    showWhen: (a) => isTrue(a.boilers),
    suppressedBy: (s) => s.erp.connected && s.erp.fuelPurchases,
    infer: () => ({ source: "erp", ref: "ERP fuel purchases", value: "ERP", label: "Fuel quantities" }),
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "Plant head",
  },
  {
    id: "waterSource",
    category: "water",
    text: (s) => `Where does ${s.name}'s water come from?`,
    type: "multiSelect",
    options: ["Groundwater", "Municipal", "Surface", "Tanker", "Recycled"],
    unlocks: ["P6.E3.withdrawal"],
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "EHS manager",
  },
  {
    id: "waterMetered",
    category: "water",
    text: () => "Is water withdrawal metered?",
    type: "boolean",
    unlocks: ["P6.E3.withdrawal"],
    suppressedBy: (s) => s.ergos.connected && s.ergos.water,
    infer: () => ({ source: "ergos", ref: "Water withdrawal meter", value: true, label: "Water metered" }),
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "EHS manager",
  },
  {
    id: "discharge",
    category: "water",
    text: () => "Where does wastewater go?",
    type: "singleSelect",
    options: ["ETP onsite", "CETP", "Municipal", "ZLD"],
    unlocks: ["P6.E4", "P6.E5"],
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "EHS manager",
  },
  {
    id: "wasteStreams",
    category: "waste",
    text: (s) => `Which waste streams does ${s.name} generate?`,
    type: "multiSelect",
    options: ["Hazardous", "E-waste", "Plastic", "Bio-medical", "Other"],
    unlocks: ["P6.E9"],
    suppressedBy: (s) => s.ehs.connected && s.ehs.covers,
    infer: (s) => ({ source: "ehs", ref: "EHS waste register", value: s.ehs.wasteStreams, label: "Waste streams" }),
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "EHS manager",
  },
  {
    id: "wasteDisposal",
    dependsOn: "wasteStreams",
    category: "waste",
    text: () => "How is hazardous waste disposed?",
    type: "singleSelect",
    options: ["Authorised recycler", "TSDF", "Incineration", "Not tracked"],
    unlocks: ["P6.E9"],
    showWhen: (a) => includes(a.wasteStreams, "Hazardous"),
    suppressedBy: (s) => s.ehs.connected && s.ehs.covers,
    infer: (s) => ({ source: "ehs", ref: "EHS waste register", value: s.ehs.disposal ?? "TSDF", label: "Hazardous disposal" }),
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "EHS manager",
  },
  {
    id: "refrigeration",
    category: "refrigerants",
    text: (s) => `Does ${s.name} run significant refrigeration or HVAC?`,
    type: "boolean",
    unlocks: ["P6.E7.scope1"],
    appliesTo: ["factory", "warehouse"],
    estimatedSeconds: 3,
    ownerRole: "Plant head",
  },
  {
    id: "refrigerantLog",
    dependsOn: "refrigeration",
    category: "refrigerants",
    text: () => "Are refrigerant top-ups logged?",
    type: "boolean",
    unlocks: ["P6.E7.scope1"],
    showWhen: (a) => isTrue(a.refrigeration),
    appliesTo: ["factory", "warehouse"],
    estimatedSeconds: 3,
    ownerRole: "Plant head",
  },
  {
    id: "contractors",
    category: "people",
    text: (s) => `Are there contract workers at ${s.name}?`,
    type: "boolean",
    unlocks: ["A.IV.20"],
    appliesTo: ["factory", "warehouse"],
    estimatedSeconds: 3,
    ownerRole: "HR manager",
  },
  {
    id: "headcountSource",
    dependsOn: "contractors",
    category: "people",
    text: () => "Where is contract worker headcount kept?",
    type: "singleSelect",
    options: ["HRMS", "Contractor registers", "Spreadsheets"],
    unlocks: ["A.IV.20"],
    showWhen: (a) => isTrue(a.contractors),
    suppressedBy: (s) => s.hrms.connected && s.hrms.covers,
    infer: () => ({ source: "hrms", ref: "HRMS headcount extract", value: "HRMS", label: "Headcount" }),
    appliesTo: ["factory", "warehouse"],
    estimatedSeconds: 3,
    ownerRole: "HR manager",
  },
  {
    id: "incidents",
    category: "safety",
    text: () => "Are safety incidents logged at site level?",
    type: "boolean",
    unlocks: ["P3.E11"],
    suppressedBy: (s) => s.ehs.connected && s.ehs.covers,
    infer: () => ({ source: "ehs", ref: "EHS incident register", value: true, label: "Incidents" }),
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "EHS manager",
  },
  {
    id: "permits",
    category: "permits",
    text: () => "Are the CTO and CTE held, and is expiry tracked?",
    type: "singleSelect",
    options: ["Yes, tracked digitally", "Yes, on paper"],
    unlocks: ["P6.E13"],
    suppressedBy: (s) => s.vault.connected && s.vault.permit,
    infer: () => ({ source: "vault", ref: "CTO in document vault", value: "Yes, tracked digitally", label: "Permits" }),
    appliesTo: ["factory"],
    estimatedSeconds: 3,
    ownerRole: "EHS manager",
  },
  // Offices (and the warehouse) get a short set.
  {
    id: "officeOccupancy",
    category: "operations",
    text: (s) => `Is the ${s.name} ${s.type === "warehouse" ? "warehouse" : "office"} owned, leased or in a shared building?`,
    type: "singleSelect",
    options: ["Owned", "Leased", "Shared or co-working"],
    unlocks: [],
    appliesTo: ["office", "warehouse"],
    estimatedSeconds: 3,
    ownerRole: "Office admin",
  },
  {
    id: "officeBilling",
    category: "operations",
    text: () => "How is electricity billed here?",
    type: "singleSelect",
    options: ["Direct utility bill", "Through landlord", "Included in rent"],
    unlocks: ["P6.E1.elec"],
    appliesTo: ["office", "warehouse"],
    estimatedSeconds: 3,
    ownerRole: "Office admin",
  },
  {
    id: "officeHvac",
    category: "refrigerants",
    text: () => "Does the office run its own HVAC plant or DG backup?",
    type: "multiSelect",
    options: ["Own HVAC plant", "DG backup", "Neither — landlord runs both"],
    unlocks: ["P6.E7.scope1"],
    appliesTo: ["office"],
    estimatedSeconds: 3,
    ownerRole: "Office admin",
  },
  {
    id: "officeEwaste",
    category: "waste",
    text: () => "How is IT e-waste disposed?",
    type: "singleSelect",
    options: ["Authorised recycler", "Vendor buy-back", "Not tracked"],
    unlocks: ["P6.E9"],
    appliesTo: ["office"],
    estimatedSeconds: 3,
    ownerRole: "Office admin",
  },
]

export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]))

export const QUESTION_LABELS: Record<string, string> = {
  products: "Products",
  output: "Annual production",
  continuity: "Operating pattern",
  boilers: "Boilers",
  boilerFuel: "Boiler fuels",
  fuelQuantitySource: "Fuel records",
  waterSource: "Water sources",
  waterMetered: "Water metered",
  discharge: "Wastewater",
  wasteStreams: "Waste streams",
  wasteDisposal: "Hazardous disposal",
  refrigeration: "Refrigeration",
  refrigerantLog: "Refrigerant log",
  contractors: "Contract workers",
  headcountSource: "Headcount records",
  incidents: "Incident log",
  permits: "CTO and CTE",
  officeOccupancy: "Occupancy",
  officeBilling: "Electricity billing",
  officeHvac: "HVAC and DG",
  officeEwaste: "E-waste",
}

// ---------------------------------------------------------------------------
// Source state for a site, derived from connections and provider records

export type SiteSourceFacts = {
  meters: string[]
  ergosConnected: boolean
  completeness?: number
  erpProduct: boolean
  erpFuel: boolean
  erpFuels: string[]
  hrms: boolean
  ehs: { wasteStreams: string[]; disposal: string } | null
  permit: boolean
  fuelInvoices: boolean
}

export function sourceStateFor(site: Site, sources: Record<SourceKey, SourceConnection>, facts: SiteSourceFacts): SourceState {
  const on = (k: SourceKey) => sources[k]?.status === "connected" || sources[k]?.status === "partial"
  return {
    siteType: site.type,
    ergos: {
      connected: on("ergos") && facts.ergosConnected,
      steam: facts.meters.includes("steam"),
      water: facts.meters.includes("water"),
      dg: facts.meters.includes("dg"),
      loadProfile: facts.ergosConnected,
    },
    erp: { connected: on("erp"), productMaster: facts.erpProduct, fuelPurchases: facts.erpFuel, fuels: facts.erpFuels },
    hrms: { connected: on("hrms"), covers: facts.hrms },
    ehs: { connected: on("ehs"), covers: !!facts.ehs, wasteStreams: facts.ehs?.wasteStreams ?? [], disposal: facts.ehs?.disposal },
    vault: { connected: on("vault"), permit: facts.permit, fuelInvoices: facts.fuelInvoices },
    filing: site.products && site.foundVia.includes("brsr") ? { products: site.products, ref: site.sourceNote } : undefined,
  }
}

// ---------------------------------------------------------------------------
// Engine

export function isSuppressed(q: Question, s: SourceState) {
  return !!q.suppressedBy?.(s)
}

// Answers as the engine sees them: owner answers plus inferred values from suppressing sources.
export function effectiveAnswers(site: Site, s: SourceState, answers: Answers): Answers {
  const out: Answers = { ...answers }
  for (const q of QUESTIONS) {
    if (!q.appliesTo.includes(site.type)) continue
    if (isSuppressed(q, s) && q.infer) out[q.id] = q.infer(s).value
  }
  return out
}

export function suppressedFor(site: Site, s: SourceState): { question: Question; inferred: Suppression }[] {
  const answers = effectiveAnswers(site, s, {})
  return QUESTIONS.filter((q) => q.appliesTo.includes(site.type) && isSuppressed(q, s) && q.infer && (!q.showWhen || q.showWhen(answers))).map(
    (q) => ({ question: q, inferred: q.infer!(s) }),
  )
}

// Questions still to ask at a site, given current answers (branching evaluated live).
export function pendingQuestions(site: Site, s: SourceState, answers: Answers): Question[] {
  const eff = effectiveAnswers(site, s, answers)
  return QUESTIONS.filter(
    (q) =>
      q.appliesTo.includes(site.type) &&
      !isSuppressed(q, s) &&
      (!q.showWhen || q.showWhen(eff)) &&
      answers[q.id] === undefined,
  )
}

// Full ordered list of askable questions at a site (answered or not) for progress display.
export function askableQuestions(site: Site, s: SourceState, answers: Answers): Question[] {
  const eff = effectiveAnswers(site, s, answers)
  return QUESTIONS.filter((q) => q.appliesTo.includes(site.type) && !isSuppressed(q, s) && (!q.showWhen || q.showWhen(eff)))
}

export function nextQuestion(site: Site, s: SourceState, answers: Answers): Question | undefined {
  return pendingQuestions(site, s, answers)[0]
}

// Questions that may still be asked: unanswered, not suppressed, and either
// open now or behind a parent answer that hasn't been given yet.
export function expectedQuestions(site: Site, s: SourceState, answers: Answers): Question[] {
  const eff = effectiveAnswers(site, s, answers)
  return QUESTIONS.filter((q) => {
    if (!q.appliesTo.includes(site.type) || isSuppressed(q, s) || answers[q.id] !== undefined) return false
    if (!q.showWhen || q.showWhen(eff)) return true
    return !!q.dependsOn && eff[q.dependsOn] === undefined
  })
}

// Seconds of questions left for one site, counting branches that may still open.
export function remainingSeconds(site: Site, s: SourceState, answers: Answers): number {
  return expectedQuestions(site, s, answers).reduce((sum, q) => sum + q.estimatedSeconds, 0)
}

export function formatEstimate(seconds: number): string {
  if (seconds <= 0) return "Almost done"
  if (seconds < 60) return "Less than 1 min"
  return `~${Math.round(seconds / 60)} min remaining`
}

export function formatShort(seconds: number): string {
  if (seconds <= 0) return "nothing left"
  if (seconds < 60) return `~${Math.max(5, Math.round(seconds / 5) * 5)} sec`
  return `~${Math.round(seconds / 60)} min`
}

export function isNotSure(v: AnswerValue | undefined) {
  return v === NOT_SURE
}

// ---------------------------------------------------------------------------
// Copy-profile

export type CopyPlan = {
  templateId: string
  copy: Record<string, AnswerValue>
  ask: string[]
  secondsBefore: number
  secondsAfter: number
  reasons: string[]
}

type ProfileContext = {
  site: Site
  state: SourceState
  profile?: SiteProfile
  entityId?: string
}

function sameSuppression(q: Question, a: SourceState, b: SourceState) {
  return isSuppressed(q, a) === isSuppressed(q, b)
}

// Score how alike two sites are for reuse. A template must be the same type and
// share its source pattern: on ergOS or not, and the same steam and water meters.
export function similarity(target: ProfileContext, template: ProfileContext): number {
  if (target.site.type !== template.site.type) return -1
  if (target.site.type !== "factory") return -1
  if (target.state.ergos.connected !== template.state.ergos.connected) return -1
  if (target.state.ergos.steam !== template.state.ergos.steam || target.state.ergos.water !== template.state.ergos.water) return -1
  let score = 3
  if (target.entityId && target.entityId === template.entityId) score += 2
  if (target.site.state === template.site.state) score += 1
  if (target.state.erp.fuelPurchases === template.state.erp.fuelPurchases) score += 1
  if (target.state.ehs.covers === template.state.ehs.covers) score += 1
  if (target.state.hrms.covers === template.state.hrms.covers) score += 1
  return score
}

export function findTemplate(target: ProfileContext, completed: ProfileContext[]): ProfileContext | undefined {
  let best: ProfileContext | undefined
  let bestScore = 2
  for (const c of completed) {
    if (c.profile?.status !== "done") continue
    const sc = similarity(target, c)
    if (sc > bestScore) {
      best = c
      bestScore = sc
    }
  }
  return best
}

export function planCopy(target: ProfileContext, template: ProfileContext): CopyPlan {
  const tAnswers = template.profile?.answers ?? {}
  const copy: Record<string, AnswerValue> = {}
  for (const q of QUESTIONS) {
    if (!q.appliesTo.includes(target.site.type)) continue
    if (isSuppressed(q, target.state)) continue
    if (!sameSuppression(q, target.state, template.state)) continue
    if (q.copyable === false) continue
    const v = tAnswers[q.id]
    if (v === undefined || v === NOT_SURE) continue
    copy[q.id] = v
  }
  const before = remainingSeconds(target.site, target.state, target.profile?.answers ?? {})
  const merged = { ...copy, ...(target.profile?.answers ?? {}) }
  const askQs = expectedQuestions(target.site, target.state, merged)
  const after = remainingSeconds(target.site, target.state, merged)
  const reasons: string[] = []
  const t = target.state
  const m = template.state
  if (t.ehs.covers !== m.ehs.covers) reasons.push(t.ehs.covers ? "EHS registers cover this site" : "no EHS register here")
  if (t.hrms.covers !== m.hrms.covers) reasons.push(t.hrms.covers ? "HRMS covers this site" : "different payroll")
  if (t.erp.fuelPurchases !== m.erp.fuelPurchases) reasons.push(t.erp.fuelPurchases ? "ERP has fuel purchases" : "fuel not in ERP extract")
  if (t.ergos.steam !== m.ergos.steam) reasons.push(t.ergos.steam ? "steam metered" : "no steam meter")
  if (t.ergos.water !== m.ergos.water) reasons.push(t.ergos.water ? "water metered" : "no water meter")
  if (t.vault.permit !== m.vault.permit) reasons.push(t.vault.permit ? "permit on file" : "no permit on file")
  return { templateId: template.site.id, copy, ask: askQs.map((q) => q.id), secondsBefore: before, secondsAfter: after, reasons }
}

export const ENGINE_VERSION = "question-rules v1.3"
