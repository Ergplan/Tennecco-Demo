"use client"

// Central demo state. Persisted to localStorage so a reload mid-demo recovers.
// Every user-visible change appends an AuditEvent (actor, timestamp, before, after).

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type {
  AnswerValue,
  AuditEvent,
  DataPoint,
  DocumentRecord,
  EnergySummary,
  Gap,
  Group,
  IndicatorResult,
  LegalEntity,
  Meter,
  Phase,
  ReportingEntity,
  Site,
  SiteProfile,
  SiteType,
  SourceConnection,
  SourceKey,
  Stage,
  Stakeholder,
  StakeholderRole,
  Task,
} from "./types"
import { NOT_SURE, STAGES } from "./types"
import { AGENT_ACTOR, DEMO_USER, DEMO_USER_ROLE, ENTITIES, GROUP, PERIOD, TODAY } from "./demoData"
import type { ErgosSiteRecord, GstPremiseRecord } from "./demoData"
import { mergeErgosRecord, mergeGstPremise, mergeParsedSite } from "./reconcile"
import type { EhsSiteRecord, ErpSiteRecord, HrmsSiteRecord, ParsedSite, RegistryNode } from "@/esgos/providers/types"
import type { Evaluation } from "./gapEngine"
import type { SeedMode } from "./mode"
import { findCity, type CityRecord } from "./geo"
import { QUESTION_BY_ID, QUESTION_LABELS } from "./questionEngine"
import { getClient, setActiveClient, type ClientId } from "./clients"
import type { PublicGst, PublicSite } from "./clients/types"
import { shortCite } from "./clients/public"
import type { GeocodeResult } from "@/esgos/providers/maps"
import { EMPTY_INTERVIEWS, answerKey, buildInterviewPlan, exampleAnswer, type Interview, type InterviewAnswer, type InterviewState } from "./interviews/plan"
import { GUIDE_BY_ID } from "./interviews/guides"
import { EMPTY_DOC_REVIEW, DOC_BY_ID, type DocReview, type DocReviewState } from "./documents/review"
import { EMPTY_REPORT_REVIEW, EMPTY_SESSION, canSignOff, type CheckId, type CheckResult, type ReportReviewState, type ReviewSession } from "./reportReview"
import { EMPTY_CLOSURE, type Baseline, type ClosureState, type Draft } from "./closure"
import { ANNUAL_BY_ID, type AnnualId, type AnnualValue } from "./collection/annual"
import { EMPTY_COLLECTION, METRIC_BY_ID, activeMetrics, appliesTo, cellKey, cellsFromEnergyFile, fyMonths, monthLabel, type Cell, type CellSource, type CollectionState, type MetricId } from "./collection/model"
import { exampleValue } from "./collection/calc"
import { EMPTY_IMPORTS, matchSiteName, setImports, type DocumentRow, type EhsRow, type EnergyRow, type ErpRow, type HeadcountRow, type ImportKind, type ImportedData, type PersonRow } from "./imports"
import { ALL_ROLES, personLabel } from "./stakeholders"
import { consolidatedUnder, decisionEntityIds, isBoundaryExcluded, isPublicClient, outsideReason } from "./boundary"
import { applyOrg, type OrgDetails } from "./org"

export type SeedProgress = {
  ergos: Phase
  gst: Phase
  paste: Phase
  registry: Phase
  brsr: Phase
  maps: Phase
  registryRecords: number
  brsrRecords: number
  mapsRecords: number
  reconciled: boolean
  ergosRecords: number
  ergosLocations: number
  gstRecords: number
  pasteRecords: number
  pasteNew: number
  pasteText: string
}

export type BoundaryProgress = {
  reportingChosen: boolean
  tree: Phase
  matching: Phase
  jvDecision?: "include" | "exclude"
  confirmed: boolean
}

export type ErgosLink = "pending" | "connecting" | "connected" | "needs-review" | "not-found"

export type EstimateDrop = { id: number; label: string; removed: number; beforeSec: number; afterSec: number }

export type ConnectProgress = {
  phase: Phase
  siteStatus: Record<string, ErgosLink>
  validated: Record<string, Meter["type"][]>
  drop?: EstimateDrop
}

export type AnalysisProgress = {
  phase: Phase
  stale?: boolean
  results: IndicatorResult[]
  counts?: Evaluation["counts"]
  gapCounts?: Evaluation["gapCounts"]
  ranAt?: string
}

export type Records = {
  hrms: Record<string, HrmsSiteRecord>
  erpProducts: Record<string, ErpSiteRecord>
  erpFuel: Record<string, ErpSiteRecord>
  ehs: Record<string, EhsSiteRecord>
  sourceNotes: Partial<Record<SourceKey, string>>
}

export type AgentMessage = { id: number; text: string; kind: "agent" | "reply" }

export type DemoState = {
  version: number
  stage: Stage
  maxStage: Stage
  seedMode: SeedMode
  clientId: ClientId
  // Organisation details from the gate, per client. Kept when the journey restarts.
  orgByClient: Partial<Record<ClientId, OrgDetails>>
  group: Group
  reportingEntity?: ReportingEntity
  entities: LegalEntity[]
  knownCompanies: { name: string; pan?: string }[]
  sites: Site[]
  sources: Record<SourceKey, SourceConnection>
  dataPoints: DataPoint[]
  tasks: Task[]
  gaps: Gap[]
  audit: AuditEvent[]
  // extensions
  documents: DocumentRecord[]
  stakeholders: Stakeholder[]
  imports: ImportedData
  energy: Record<string, EnergySummary>
  meters: Record<string, Meter[]>
  records: Records
  profiles: Record<string, SiteProfile>
  activeProfileSite?: string
  profileIntroDone: boolean
  understood?: { siteId: string; at: number }
  seed: SeedProgress
  journeyIntroDone: boolean
  boundary: BoundaryProgress
  connect: ConnectProgress
  analysis: AnalysisProgress
  plan: { issued: boolean; issuedAt?: string; issuedTasks: number }
  // Management interviews (plan, answers) for the readiness assessment.
  interviews: InterviewState
  // Desktop document review: outcome, file and notes per checklist document (per plant where it applies).
  docReview: DocReviewState
  // Test report review sessions with functional data owners.
  reportReview: ReportReviewState
  // Monthly data collection: plant × metric × month values, run as monthly cycles.
  collection: CollectionState
  // Closing the gaps after the gap analysis: steps, evidence, data requests and the baseline.
  closure: ClosureState
  // Answers drafted in the BRSR test report, by question.
  drafts: Record<string, Draft>
  agent: AgentMessage
  prefs: { theme: "dark" | "light"; muted: boolean; pace: "calm" | "brisk" }
}

export type ReferenceFocus = { questionId?: string; indicatorId?: string; entryId?: string; query?: string }

export type UiState = {
  provenance: DataPoint | null
  reference: ReferenceFocus | null
  importOpen: boolean
  importKind?: ImportKind
  // Organisation details: the gate on the start screen, or a drawer once saved.
  orgOpen: boolean
  auditOpen: boolean
  menuOpen: boolean
  siteFilter: SiteType | null
  gapSiteFilter: string | null
  showAllGaps: boolean
  // Gaps: the 48-indicator coverage check, the full BRSR readiness list, or the ISSB map.
  gapsTab: "results" | "coverage" | "documents" | "brsr" | "issb" | "interviews"
  // Plan: the foundation summary or the milestone roadmap.
  planTab: "foundation" | "roadmap" | "closure" | "collection" | "report" | "review" | "deliverables"
  // Close gaps: the item open in the detail panel and the route filter.
  closureFocus: string | null
  // Monthly collection: plant data or the company's annual figures, and the metric to open.
  collectionView: "monthly" | "annual"
  collectionMetric: MetricId | null
  // BRSR test report: the report or its data workbook, and the question in view.
  reportView: "report" | "workbook"
  reportFocus: string | null
  focusSiteId: string | null
  commandFocus: number
}

const DATA_ACTIONS = new Set([
  "exclude site",
  "include site",
  "confirm site",
  "resolve conflict",
  "change site type",
  "change site city",
  "reassign site entity",
  "JV boundary decision",
  "choose ergOS feed",
  "source connection",
  "upload document",
  "answer",
  "copy answer",
  "change answer",
  "back",
  "skip site",
  "accept copy-profile",
])

const now = () => new Date().toISOString()
let counter = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`

const SAMPLE_ACTOR = `${DEMO_USER} (${DEMO_USER_ROLE}, demo)`

// Who the audit trail records: the person named at the organisation gate.
export function actorUser(): string {
  const st = useStore.getState()
  const you = st.orgByClient?.[st.clientId]?.you
  if (you?.name) return `${you.name} (${you.designation})`
  return getClient().kind === "sample" ? SAMPLE_ACTOR : "You"
}

function initialSources(): Record<SourceKey, SourceConnection> {
  const base = (key: SourceKey, label: string): SourceConnection => ({
    key,
    label,
    status: "not_connected",
    syncState: "pending",
    coverage: [],
    mode: "mock",
  })
  return {
    ergos: base("ergos", "ergOS"),
    hrms: base("hrms", "HRMS"),
    erp: base("erp", "ERP"),
    ehs: base("ehs", "EHS"),
    vault: base("vault", "Document vault"),
  }
}

export function initialState(seedMode: SeedMode = "default"): DemoState {
  const client = getClient()
  return {
    version: 5,
    stage: "agent",
    maxStage: "agent",
    seedMode,
    clientId: client.id,
    orgByClient: {},
    group: client.group,
    reportingEntity: undefined,
    entities: [],
    knownCompanies: [],
    sites: [],
    sources: initialSources(),
    dataPoints: [],
    tasks: [],
    gaps: [],
    audit: [],
    documents: [],
    stakeholders: client.stakeholders.map((x) => ({ ...x, source: "client" as const })),
    imports: { ...EMPTY_IMPORTS, ...(client.preloadedImports ?? {}) },
    energy: {},
    meters: {},
    records: { hrms: {}, erpProducts: {}, erpFuel: {}, ehs: {}, sourceNotes: {} },
    profiles: {},
    activeProfileSite: undefined,
    profileIntroDone: false,
    understood: undefined,
    seed: {
      ergos: "idle",
      gst: "idle",
      paste: "idle",
      registry: "idle",
      brsr: "idle",
      maps: "idle",
      registryRecords: 0,
      brsrRecords: 0,
      mapsRecords: 0,
      reconciled: false,
      ergosRecords: 0,
      ergosLocations: 0,
      gstRecords: 0,
      pasteRecords: 0,
      pasteNew: 0,
      pasteText: "",
    },
    journeyIntroDone: false,
    boundary: { reportingChosen: false, tree: "idle", matching: "idle", confirmed: false },
    connect: { phase: "idle", siteStatus: {}, validated: {} },
    analysis: { phase: "idle", results: [] },
    plan: { issued: false, issuedTasks: 0 },
    interviews: EMPTY_INTERVIEWS,
    docReview: EMPTY_DOC_REVIEW,
    reportReview: EMPTY_REPORT_REVIEW,
    collection: EMPTY_COLLECTION,
    closure: EMPTY_CLOSURE,
    drafts: {},
    agent: { id: 0, text: "Let's start your ESG journey.", kind: "agent" },
    prefs: { theme: "dark", muted: true, pace: "calm" },
  }
}

const initialUi: UiState = {
  provenance: null,
  reference: null,
  importOpen: false,
  orgOpen: false,
  auditOpen: false,
  menuOpen: false,
  siteFilter: null,
  gapSiteFilter: null,
  showAllGaps: false,
  gapsTab: "coverage",
  planTab: "foundation",
  closureFocus: null,
  collectionView: "monthly",
  collectionMetric: null,
  reportView: "report",
  reportFocus: null,
  focusSiteId: null,
  commandFocus: 0,
}

type Actions = {
  // navigation and agent
  go: (stage: Stage) => void
  say: (text: string, kind?: AgentMessage["kind"]) => void
  reset: (seedMode?: SeedMode, clientId?: ClientId) => void
  setJourneyIntroDone: () => void
  saveOrg: (org: OrgDetails) => void
  getClientFy: () => string
  addStakeholder: (p: Omit<Stakeholder, "id" | "source"> & { source?: Stakeholder["source"] }) => Stakeholder
  assignTask: (taskId: string, stakeholderId: string) => void
  applyImport: (kind: ImportKind, rows: unknown[], fileName: string) => number
  setPref: (p: Partial<DemoState["prefs"]>) => void
  setUi: (p: Partial<UiState>) => void
  log: (action: string, target: string, before?: unknown, after?: unknown, detail?: string, actor?: string) => void
  upsertDataPoints: (dps: DataPoint[]) => void
  // seed
  setSeed: (p: Partial<SeedProgress>) => void
  addErgosRecord: (rec: ErgosSiteRecord) => void
  addGstPremise: (p: GstPremiseRecord) => void
  addParsedSite: (p: ParsedSite) => { isNew: boolean }
  addPublicSite: (site: PublicSite, via: "registry" | "brsr" | "gst") => void
  addPublicGst: (g: PublicGst) => void
  applyGeocode: (siteId: string, r: GeocodeResult) => void
  resolveConflict: (siteId: string, choice: string, extra?: { city?: CityRecord }) => void
  confirmSite: (siteId: string) => void
  excludeSite: (siteId: string, reason?: string) => void
  includeSite: (siteId: string) => void
  renameSite: (siteId: string, name: string) => void
  setSiteType: (siteId: string, type: SiteType) => void
  setSiteCity: (siteId: string, city: CityRecord) => void
  // boundary
  chooseReportingEntity: (name: string) => void
  setBoundary: (p: Partial<BoundaryProgress>) => void
  addRegistryNode: (node: RegistryNode) => void
  assignSiteEntity: (siteId: string, entityId: string, via: "gst" | "owner" | "paste" | "filing", ref?: string) => void
  setJvDecision: (d: "include" | "exclude") => void
  confirmBoundary: () => void
  // connect
  setConnect: (p: Partial<ConnectProgress>) => void
  setErgosLink: (siteId: string, link: ErgosLink) => void
  chooseErgosCandidate: (siteId: string, ergosSiteId: string) => void
  addValidatedMeter: (siteId: string, meter: Meter) => void
  setEnergy: (siteId: string, e: EnergySummary) => void
  setSource: (key: SourceKey, p: Partial<SourceConnection>) => void
  applyHrms: (coverage: HrmsSiteRecord[], note: string) => void
  applyErp: (products: ErpSiteRecord[], fuel: ErpSiteRecord[], note: string) => void
  applyEhs: (registers: EhsSiteRecord[], note: string) => void
  applyVault: (docs: DocumentRecord[], note: string) => void
  addDocument: (doc: DocumentRecord) => void
  recordDrop: (label: string, removed: number, beforeSec: number, afterSec: number) => void
  // profile
  setProfileIntroDone: () => void
  setActiveProfileSite: (siteId: string | undefined) => void
  ensureProfile: (siteId: string) => SiteProfile
  answer: (siteId: string, questionId: string, value: AnswerValue, opts?: { copiedFrom?: string; actor?: string }) => void
  notSure: (siteId: string, questionId: string, questionText: string, indicator: string, ownerRole: string, assigneeId?: string) => void
  back: (siteId: string) => string | undefined
  clearAnswer: (siteId: string, questionId: string) => void
  acceptCopy: (siteId: string, templateId: string, copy: Record<string, AnswerValue>) => void
  declineCopy: (siteId: string) => void
  completeSite: (siteId: string) => void
  skipSite: (siteId: string, pending: { id: string; text: string; indicator: string; ownerRole: string; assigneeId?: string }[]) => void
  reopenSite: (siteId: string) => void
  recordInferred: (siteId: string, dps: DataPoint[]) => void
  // analysis and plan
  setAnalysis: (p: Partial<AnalysisProgress>) => void
  pushResult: (r: IndicatorResult) => void
  finishAnalysis: (e: Evaluation) => void
  issuePlan: (tasks: Task[]) => void
  addTask: (t: Omit<Task, "id" | "createdAt" | "status" | "due"> & { due?: string }) => void
  // interviews
  planInterviews: () => void
  updateInterview: (id: string, p: Partial<Pick<Interview, "date" | "interviewee">>) => void
  answerInterview: (interviewId: string, questionId: string, p: Partial<Omit<InterviewAnswer, "at" | "by">>) => void
  completeInterview: (id: string, done: boolean) => void
  fillExampleInterview: (id: string) => void
  // desktop document review
  reviewDocument: (key: string, p: Partial<Omit<DocReview, "at" | "by">>) => void
  // test report review sessions
  updateSession: (owner: string, p: Partial<Pick<ReviewSession, "date" | "attendees" | "notes">> & { check?: [CheckId, CheckResult | undefined] }) => void
  holdSession: (owner: string, held: boolean) => void
  raiseQuery: (owner: string, questionId: string, text: string) => void
  resolveQuery: (owner: string, queryId: string, resolution: string) => void
  signOffSession: (owner: string, signed: boolean) => boolean
  // monthly collection
  setupCollection: () => void
  issueCycle: (month: string) => void
  setCell: (siteId: string, metric: MetricId, month: string, p: Partial<Omit<Cell, "by" | "at">> | null) => void
  reviewCycle: (month: string) => void
  closeCycle: (month: string, closed: boolean) => void
  simulateReturns: (month: string) => void
  importCollection: (rows: { siteId: string; metric: MetricId; month: string; value: number; source: CellSource; evidence?: string; note?: string }[], fileName: string) => { changed: number; unchanged: number }
  // closing the gaps
  addMetrics: (ids: MetricId[], forItem: string) => void
  setAnnual: (id: AnnualId, p: { value: number; evidence?: string; note?: string } | null) => void
  approveAnnual: (ids: AnnualId[]) => void
  setBaseline: (b: Baseline) => void
  setClosureStep: (itemId: string, stepId: string, done: boolean) => void
  setClosureEvidence: (itemId: string, evidence: string) => void
  verifyClosure: (itemId: string, verified: boolean) => void
  sendDataRequest: (itemId: string, p: { ownerRole: StakeholderRole; question: string; indicator: string }) => void
  receiveData: (itemId: string, file: string) => void
  saveDraft: (id: string, text: string) => void
}

export type Store = DemoState & { ui: UiState } & Actions

const dueIn = (days: number) => {
  const d = new Date(TODAY + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function stageIndex(s: Stage) {
  return STAGES.indexOf(s)
}

function locationDataPoint(site: Site): DataPoint {
  const src = site.foundVia[0]
  return {
    id: `dp:${site.id}:location`,
    indicator: "A.III.18",
    label: "Location",
    scope: { siteId: site.id },
    value: `${site.city || "Unplaced"}${site.state ? ", " + site.state : ""}`,
    period: "As of " + TODAY,
    source: src === "ergos" ? "ergos" : src === "gst" ? "gst" : "owner",
    sourceRef: src === "ergos" ? site.ergosSiteId ?? site.ergosCandidates?.join(", ") : src === "gst" ? site.gstin : "Pasted site list",
    evidenceState: src === "paste" ? "none" : "linked",
    owner: src === "paste" ? actorUser() : undefined,
    confirmedAt: src === "paste" ? now() : undefined,
    mode: "mock",
  }
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const log: Actions["log"] = (action, target, before, after, detail, actor = actorUser()) =>
        set((s) => ({
          audit: [...s.audit, { id: uid("ev"), ts: now(), actor, action, target, before, after, detail }],
          // Any change to inputs after the gap check marks it out of date.
          analysis: s.analysis.phase === "done" && DATA_ACTIONS.has(action) ? { ...s.analysis, stale: true } : s.analysis,
        }))

      const updateSite = (siteId: string, fn: (s: Site) => Site) =>
        set((s) => ({ sites: s.sites.map((x) => (x.id === siteId ? fn(x) : x)) }))

      const upsertDataPoints: Actions["upsertDataPoints"] = (dps) =>
        set((s) => {
          const map = new Map(s.dataPoints.map((d) => [d.id, d]))
          for (const d of dps) map.set(d.id, { ...map.get(d.id), ...d })
          return { dataPoints: [...map.values()] }
        })

      return {
        ...initialState(),
        ui: initialUi,

        go: (stage) => {
          const prev = get().stage
          if (prev === stage) return
          set((s) => ({ stage, maxStage: stageIndex(stage) > stageIndex(s.maxStage) ? stage : s.maxStage }))
          log("navigate", "stage", prev, stage, undefined, actorUser())
        },
        say: (text, kind = "agent") => set((s) => ({ agent: { id: s.agent.id + 1, text, kind } })),
        reset: (seedMode, clientId) => {
          setActiveClient(clientId ?? get().clientId)
          const mode = seedMode ?? get().seedMode
          const prefs = { ...initialState().prefs, ...get().prefs }
          const orgByClient = get().orgByClient ?? {}
          const base = initialState(mode)
          setImports(base.imports)
          set({ ...base, prefs, orgByClient, stakeholders: applyOrg(base.stakeholders, orgByClient[getClient().id]), ui: { ...initialUi } })
          log("restart demo", "demo", undefined, "seeded start", undefined, actorUser())
        },
        setPref: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
        setJourneyIntroDone: () => set({ journeyIntroDone: true }),
        saveOrg: (org) => {
          const id = get().clientId
          const before = get().orgByClient?.[id]
          set((s) => ({ orgByClient: { ...(s.orgByClient ?? {}), [id]: org }, stakeholders: applyOrg(s.stakeholders, org) }))
          const named = Object.entries(org.people).filter(([, p]) => p?.name.trim()).map(([role, p]) => `${p!.name} (${role})`)
          log(before ? "update organisation details" : "organisation details", getClient().name, before ? { you: before.you.name } : undefined, { you: `${org.you.name}, ${org.you.designation}`, people: named })
        },
        getClientFy: () => getClient().lastBrsr?.fy ?? get().group.fiscalYear,
        addStakeholder: (p) => {
          const person: Stakeholder = { id: uid("sh"), source: p.source ?? "owner", name: p.name.trim(), role: p.role, siteId: p.siteId, email: p.email?.trim() || undefined, phone: p.phone?.trim() || undefined }
          set((s) => ({ stakeholders: [...s.stakeholders, person] }))
          log("add stakeholder", person.name, undefined, { role: person.role, siteId: person.siteId, email: person.email })
          return person
        },
        applyImport: (kind, rows, fileName) => {
          const at = now()
          let count = rows.length
          if (kind === "people") {
            count = 0
            for (const r of rows as PersonRow[]) {
              const site = r.site ? matchSiteName(r.site, get().sites) : undefined
              const role = (ALL_ROLES as string[]).includes(r.role) ? (r.role as StakeholderRole) : "Plant head"
              if (get().stakeholders.some((x) => x.name === r.name && x.siteId === site?.id)) continue
              // A named person fills the vacant seat for that role, keeping any questions already routed to it.
              const seat = get().stakeholders.find((x) => x.vacant && x.role === role && x.siteId === site?.id)
              if (seat) {
                set((s) => ({
                  stakeholders: s.stakeholders.map((x) => (x.id === seat.id ? { ...x, name: r.name, email: r.email, phone: r.phone, vacant: false, source: "import" as const } : x)),
                  tasks: s.tasks.map((t) => (t.assignee?.stakeholderId === seat.id ? { ...t, assignee: { ...t.assignee, name: r.name, email: r.email }, ownerRole: `${r.name}, ${role}` } : t)),
                }))
              } else get().addStakeholder({ name: r.name, role, email: r.email, phone: r.phone, siteId: site?.id, source: "import" })
              count++
            }
          }
          const prev = get().imports
          const next: ImportedData = {
            energy: kind === "energy" ? [...prev.energy.filter((x) => !(rows as EnergyRow[]).some((y) => y.site === x.site)), ...(rows as EnergyRow[])] : prev.energy,
            headcount: kind === "headcount" ? [...prev.headcount.filter((x) => !(rows as HeadcountRow[]).some((y) => y.site === x.site)), ...(rows as HeadcountRow[])] : prev.headcount,
            erp: kind === "erp" ? [...(prev.erp ?? []).filter((x) => !(rows as ErpRow[]).some((y) => y.site === x.site)), ...(rows as ErpRow[])] : prev.erp ?? [],
            ehs: kind === "ehs" ? [...(prev.ehs ?? []).filter((x) => !(rows as EhsRow[]).some((y) => y.site === x.site)), ...(rows as EhsRow[])] : prev.ehs ?? [],
            documents: kind === "documents" ? [...prev.documents, ...(rows as DocumentRow[])] : prev.documents,
            files: [...prev.files, { kind, fileName, rows: count, at }],
          }
          set({ imports: next })
          setImports(next)
          log("import data", fileName, undefined, { kind, rows: count })
          return count
        },
        assignTask: (taskId, stakeholderId) => {
          const person = get().stakeholders.find((x) => x.id === stakeholderId)
          const task = get().tasks.find((t) => t.id === taskId)
          if (!person || !task) return
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, assignee: { stakeholderId: person.id, name: person.name, role: person.role, email: person.email }, ownerRole: personLabel(person) } : t)),
          }))
          log("assign task", person.name, task.ownerRole, personLabel(person), task.question)
        },
        setUi: (p) => set((s) => ({ ui: { ...s.ui, ...p } })),
        log,
        upsertDataPoints,

        // ---------------------------------------------------------------- seed
        setSeed: (p) => set((s) => ({ seed: { ...s.seed, ...p } })),
        addErgosRecord: (rec) => {
          const r = mergeErgosRecord(get().sites, rec)
          set((s) => ({ sites: r.sites, seed: { ...s.seed, ergosRecords: s.seed.ergosRecords + 1, ergosLocations: r.sites.length } }))
          const site = r.sites.find((x) => x.id === r.siteId)!
          upsertDataPoints([locationDataPoint(site)])
          log("source record", site.name, undefined, { ergosSiteId: rec.ergosSiteId }, "ergOS site record resolved", AGENT_ACTOR)
        },
        addGstPremise: (premise) => {
          const known = get().knownCompanies
          const names = known.some((k) => k.name === premise.legalName) ? known : [...known, { name: premise.legalName, pan: premise.gstin.slice(2, 12) }]
          const r = mergeGstPremise(get().sites, premise, names.map((n) => n.name))
          set((s) => ({ sites: r.sites, knownCompanies: names, seed: { ...s.seed, gstRecords: s.seed.gstRecords + 1 } }))
          const site = r.sites.find((x) => x.id === r.siteId)!
          if (r.isNew) upsertDataPoints([locationDataPoint(site)])
          upsertDataPoints([
            {
              id: `dp:${site.id}:gstin`,
              indicator: "A.III.18",
              label: "GSTIN",
              scope: { siteId: site.id },
              value: premise.gstin,
              period: "As of " + TODAY,
              source: "gst",
              sourceRef: `${premise.legalName} · ${premise.premiseType} place of business`,
              evidenceState: "linked",
              mode: "mock",
            },
          ])
          log("source record", site.name, undefined, { gstin: premise.gstin }, "GST premise resolved", AGENT_ACTOR)
        },
        addParsedSite: (parsed) => {
          const r = mergeParsedSite(get().sites, parsed)
          set((s) => ({
            sites: r.sites,
            seed: { ...s.seed, pasteRecords: s.seed.pasteRecords + 1, pasteNew: s.seed.pasteNew + (r.isNew ? 1 : 0) },
            knownCompanies:
              parsed.entityHint && !s.knownCompanies.some((k) => k.name === parsed.entityHint)
                ? [...s.knownCompanies, { name: parsed.entityHint }]
                : s.knownCompanies,
          }))
          const site = r.sites.find((x) => x.id === r.siteId)!
          if (r.isNew) upsertDataPoints([locationDataPoint(site)])
          log("source record", site.name, undefined, { line: parsed.raw }, r.isNew ? "Pasted site added" : "Pasted line matched an existing site", actorUser())
          return { isNew: r.isNew }
        },
        addPublicSite: (ps, via) => {
          const existing = get().sites.find((x) => x.id === ps.id)
          if (existing) {
            if (!existing.foundVia.includes(via)) updateSite(ps.id, (x) => ({ ...x, foundVia: [...x.foundVia, via] }))
            return
          }
          const cite = shortCite(ps.source)
          const site: Site = {
            id: ps.id,
            name: ps.name,
            type: ps.type,
            city: ps.city,
            state: ps.state,
            lat: ps.lat,
            lng: ps.lng,
            address: ps.address,
            geoQuery: ps.geoQuery,
            approximatePin: ps.approximatePin,
            ownerRole: ps.ownerRole,
            status: "confirmed",
            foundVia: [via],
            entityHint: ps.entityName,
            products: ps.products,
            capacity: ps.capacity,
            capacityValue: ps.capacityValue,
            reviewNote: ps.reviewNote,
            reviewSuggest: ps.reviewSuggest,
            entityReview: ps.reviewNote ? true : undefined,
            sourceNote: cite,
          }
          if (ps.status === "under-construction" || ps.status === "commissioning" || ps.status === "unconfirmed") {
            site.status = "candidate"
            site.conflict = {
              kind: "commissioning",
              title: ps.status === "unconfirmed" ? `${ps.name}: operating status not confirmed` : `${ps.name} is ${ps.status === "commissioning" ? "still commissioning" : "under construction"}`,
              detail: ps.statusNote ?? `The filed disclosures list it as ${ps.status === "commissioning" ? "commissioning" : "under construction"}. Include it in ${get().group.fiscalYear}?`,
              resolved: false,
            }
          }
          const counter = via === "brsr" ? "brsrRecords" : via === "registry" ? "registryRecords" : null
          set((s) => ({
            sites: [...s.sites, site],
            seed: counter ? { ...s.seed, [counter]: s.seed[counter] + 1 } : s.seed,
            knownCompanies: ps.entityName && !s.knownCompanies.some((k) => k.name === ps.entityName) ? [...s.knownCompanies, { name: ps.entityName }] : s.knownCompanies,
          }))
          upsertDataPoints([
            {
              id: `dp:${site.id}:location`,
              indicator: "A.III.18",
              label: "Location",
              scope: { siteId: site.id },
              value: `${site.city}, ${site.state}`,
              period: via === "brsr" ? get().getClientFy() : "As of " + TODAY,
              source: ps.fromClientFile ? "file" : via === "gst" ? "gst" : /Business Responsibility|BRSR/.test(ps.source.title) ? "brsr" : "filing",
              sourceRef: cite,
              document: ps.source.url,
              evidenceState: "linked",
              note: [ps.source.title, ps.source.note].filter(Boolean).join(". "),
              mode: ps.fromClientFile ? "live" : "public",
            },
          ])
          log("source record", site.name, undefined, { via, address: ps.address }, ps.fromClientFile ? "Client file" : via === "brsr" ? (getClient().preIpo ? "Public record" : "Listed in filed BRSR / annual report") : via === "gst" ? "Public GST record" : "Registry record", AGENT_ACTOR)
        },
        addPublicGst: (g) => {
          set((s) => ({ seed: { ...s.seed, gstRecords: s.seed.gstRecords + 1 } }))
          const client = getClient()
          // Premises named on the registration come in with it.
          for (const key of g.siteKeys ?? []) {
            const ps = client.publicSites.find((x) => x.key === key)
            if (ps?.via === "gst" && !get().sites.some((x) => x.id === ps.id)) get().addPublicSite(ps, "gst")
          }
          const linked = (g.siteKeys ?? []).map((k) => client.publicSites.find((x) => x.key === k)?.id).filter(Boolean) as string[]
          const inState = get().sites.filter((x) => x.state === g.state && x.status !== "excluded")
          const targets = linked.length ? get().sites.filter((x) => linked.includes(x.id)) : inState.length === 1 && !inState[0].gstin ? inState : []
          const ref = linked.length ? shortCite(g.source) : `${shortCite(g.source)} (only registration in ${g.state})`
          for (const site of targets) {
            updateSite(site.id, (x) => ({ ...x, gstin: x.gstin ?? g.gstin, foundVia: x.foundVia.includes("gst") ? x.foundVia : [...x.foundVia, "gst"] }))
            upsertDataPoints([
              { id: `dp:${site.id}:gstin`, indicator: "A.III.18", label: "GSTIN", scope: { siteId: site.id }, value: g.gstin, period: "As of " + TODAY, source: "gst", sourceRef: ref, document: g.source.url, note: g.note ?? g.source.note, evidenceState: "linked", mode: "public" },
            ])
          }
          log("source record", targets[0]?.name ?? g.state, undefined, { gstin: g.gstin, address: g.address }, targets.length ? "Public GST record" : "Public GST record, no premise on file", AGENT_ACTOR)
        },
        applyGeocode: (siteId, r) => {
          const site = get().sites.find((x) => x.id === siteId)
          if (!site) return
          updateSite(siteId, (x) => ({
            ...x,
            lat: r.lat,
            lng: r.lng,
            foundVia: x.foundVia.includes("maps") ? x.foundVia : [...x.foundVia, "maps"],
            geocoded: { formattedAddress: r.formattedAddress, placeId: r.placeId, partial: r.partial, at: now() },
            conflict:
              r.partial && !x.conflict
                ? { kind: "location", title: `Check ${x.name}'s location`, detail: `Google Maps matched “${r.formattedAddress}” only partially. Is the pin right?`, resolved: false }
                : x.conflict,
            status: r.partial && !x.conflict && x.status === "confirmed" ? "candidate" : x.status,
          }))
          upsertDataPoints([
            {
              id: `dp:${siteId}:maps`,
              indicator: "P6.E11",
              label: "Geocoded location",
              scope: { siteId },
              value: r.formattedAddress,
              period: "As of " + TODAY,
              source: "maps",
              sourceRef: `Geocoding API · ${r.locationType}${r.partial ? " · partial match" : ""} · place ${r.placeId}`,
              evidenceState: "linked",
              mode: "live",
            },
          ])
          log("geocode", site.name, { lat: site.lat, lng: site.lng }, { lat: r.lat, lng: r.lng, address: r.formattedAddress }, "Google Maps Geocoding", AGENT_ACTOR)
        },
        resolveConflict: (siteId, choice, extra) => {
          const site = get().sites.find((s) => s.id === siteId)
          if (!site?.conflict) return
          const before = { status: site.status, conflict: site.conflict.kind }
          if (site.conflict.kind === "not-metered") {
            if (choice === "operating") updateSite(siteId, (s) => ({ ...s, status: "confirmed", conflict: { ...s.conflict!, resolved: true, resolution: "Confirmed operating" } }))
            else updateSite(siteId, (s) => ({ ...s, status: "excluded", excludedReason: "Not operating", conflict: { ...s.conflict!, resolved: true, resolution: "Not operating — excluded" } }))
          } else if (site.conflict.kind === "ergos-candidates") {
            if (choice === "one") {
              updateSite(siteId, (s) => ({ ...s, status: "confirmed", conflict: { ...s.conflict!, resolved: true, resolution: "One plant — choose the live ergOS feed when connecting" } }))
            } else {
              // Two plants: split the second candidate into its own site.
              const cands = site.ergosCandidates ?? []
              const second: Site = {
                ...site,
                id: `${site.id}-2`,
                name: `${site.name} Unit 2`,
                ergosSiteId: cands[1],
                ergosCandidates: undefined,
                lat: site.lat + 0.03,
                lng: site.lng - 0.03,
                status: "confirmed",
                conflict: undefined,
              }
              set((s) => ({
                sites: [
                  ...s.sites.map((x) =>
                    x.id === siteId
                      ? { ...x, ergosSiteId: cands[0], ergosCandidates: undefined, status: "confirmed" as const, conflict: { ...x.conflict!, resolved: true, resolution: "Two separate plants" } }
                      : x,
                  ),
                  second,
                ],
              }))
              upsertDataPoints([locationDataPoint(second)])
            }
          } else if (site.conflict.kind === "entity-mismatch") {
            if (choice === "keep") updateSite(siteId, (s) => ({ ...s, status: "confirmed", entityReview: true, conflict: { ...s.conflict!, resolved: true, resolution: "Kept — entity to be fixed at boundary" } }))
            else updateSite(siteId, (s) => ({ ...s, status: "excluded", excludedReason: "Excluded by owner", conflict: { ...s.conflict!, resolved: true, resolution: "Excluded" } }))
          } else if (site.conflict.kind === "commissioning") {
            if (choice === "include") updateSite(siteId, (s) => ({ ...s, status: "confirmed", conflict: { ...s.conflict!, resolved: true, resolution: "Included" } }))
            else updateSite(siteId, (s) => ({ ...s, status: "excluded", excludedReason: "Not operating in the reporting year", conflict: { ...s.conflict!, resolved: true, resolution: "Excluded this year" } }))
          } else if (site.conflict.kind === "location") {
            updateSite(siteId, (s) => ({ ...s, status: "confirmed", conflict: { ...s.conflict!, resolved: true, resolution: choice === "ok" ? "Pin confirmed" : "Pin to be corrected" } }))
          } else if (site.conflict.kind === "gst-only") {
            if (choice === "include") updateSite(siteId, (s) => ({ ...s, status: "confirmed", conflict: { ...s.conflict!, resolved: true, resolution: "Included" } }))
            else updateSite(siteId, (s) => ({ ...s, status: "excluded", excludedReason: "Not an operating site", conflict: { ...s.conflict!, resolved: true, resolution: "Excluded" } }))
          } else if (site.conflict.kind === "unplaced" && extra?.city) {
            const c = extra.city
            updateSite(siteId, (s) => ({ ...s, city: c.city, state: c.state, lat: c.lat, lng: c.lng, status: "confirmed", conflict: { ...s.conflict!, resolved: true, resolution: `Placed in ${c.city}` } }))
          }
          const after = get().sites.find((s) => s.id === siteId)
          const updated = get().sites.find((s) => s.id === siteId)
          if (updated) upsertDataPoints([{ ...locationDataPoint(updated), confirmedBy: actorUser(), confirmedAt: now() }])
          log("resolve conflict", site.name, before, { status: after?.status, resolution: after?.conflict?.resolution }, choice)
        },
        confirmSite: (siteId) => {
          const site = get().sites.find((s) => s.id === siteId)
          if (!site) return
          updateSite(siteId, (s) => ({ ...s, status: "confirmed", excludedReason: undefined }))
          upsertDataPoints([{ ...locationDataPoint({ ...site, status: "confirmed" }), confirmedBy: actorUser(), confirmedAt: now() }])
          log("confirm site", site.name, site.status, "confirmed")
        },
        excludeSite: (siteId, reason = "Excluded by owner") => {
          const site = get().sites.find((s) => s.id === siteId)
          if (!site || site.status === "excluded") return
          updateSite(siteId, (s) => ({ ...s, status: "excluded", excludedReason: reason }))
          log("exclude site", site.name, site.status, "excluded", reason)
        },
        includeSite: (siteId) => {
          const site = get().sites.find((s) => s.id === siteId)
          if (!site) return
          updateSite(siteId, (s) => ({ ...s, status: "confirmed", excludedReason: undefined, conflict: s.conflict ? { ...s.conflict, resolved: true } : undefined }))
          log("include site", site.name, site.status, "confirmed")
        },
        renameSite: (siteId, name) => {
          const site = get().sites.find((s) => s.id === siteId)
          if (!site || !name.trim() || name === site.name) return
          updateSite(siteId, (s) => ({ ...s, name: name.trim() }))
          log("rename site", site.name, site.name, name.trim())
        },
        setSiteType: (siteId, type) => {
          const site = get().sites.find((s) => s.id === siteId)
          if (!site || site.type === type) return
          updateSite(siteId, (s) => ({ ...s, type }))
          log("change site type", site.name, site.type, type)
        },
        setSiteCity: (siteId, c) => {
          const site = get().sites.find((s) => s.id === siteId)
          if (!site) return
          updateSite(siteId, (s) => ({ ...s, city: c.city, state: c.state, lat: c.lat, lng: c.lng }))
          const updated = get().sites.find((s) => s.id === siteId)!
          upsertDataPoints([{ ...locationDataPoint(updated), source: "owner", sourceRef: "Corrected by owner", owner: actorUser(), confirmedBy: actorUser(), confirmedAt: now() }])
          log("change site city", site.name, `${site.city}, ${site.state}`, `${c.city}, ${c.state}`)
        },

        // ------------------------------------------------------------ boundary
        chooseReportingEntity: (name) => {
          set((s) => ({ boundary: { ...s.boundary, reportingChosen: true }, reportingEntity: { entityId: name, fiscalYear: s.group.fiscalYear, consolidation: {} } }))
          log("choose reporting entity", "BRSR", undefined, name)
        },
        setBoundary: (p) => set((s) => ({ boundary: { ...s.boundary, ...p } })),
        addRegistryNode: (node) => {
          if (get().entities.some((e) => e.id === node.entityId)) return
          const known = get().knownCompanies.find((k) => k.name === node.name)
          const seeded = ENTITIES.find((e) => e.cin === node.cin)
          const entity: LegalEntity = {
            id: node.entityId,
            name: node.name,
            shortName:
              seeded?.shortName ??
              node.shortName ??
              node.name
                .replace(/ Private Limited$/, " Pvt")
                .replace(/ Limited$/, " Ltd"),
            cin: node.cin,
            pan: seeded?.pan ?? known?.pan ?? node.pan,
            gstins: seeded?.gstins ?? [],
            note: seeded?.note ?? node.note,
            aggregate: node.aggregate,
            members: node.members,
            registeredOffice: seeded?.registeredOffice,
            parentId: node.parentId,
            relationship: node.relationship,
            holdingPct: node.holdingPct,
          }
          set((s) => {
            const re = s.reportingEntity
            const isReporting = re && (re.entityId === node.name || re.entityId === node.entityId)
            return {
              entities: [...s.entities, entity],
              reportingEntity: isReporting ? { ...re!, entityId: node.entityId } : re,
            }
          })
          const filed = node.sourceRef !== undefined
          // Before listing the group comes from registry mirrors and rating reports, not a filed BRSR.
          const filedSource = getClient().lastBrsr ? ("brsr" as const) : ("filing" as const)
          upsertDataPoints([
            ...(node.cin
              ? [
                  {
                    id: `dp:${node.entityId}:cin`,
                    indicator: "A.V.23",
                    label: "CIN",
                    scope: { entityId: node.entityId },
                    value: node.cin,
                    period: "As of " + TODAY,
                    source: filed ? filedSource : ("mca" as const),
                    sourceRef: node.sourceRef ?? "MCA master data",
                    document: node.document,
                    evidenceState: "linked" as const,
                    mode: filed ? ("public" as const) : ("mock" as const),
                  },
                ]
              : []),
            ...(node.holdingPct !== undefined
              ? [
                  {
                    id: `dp:${node.entityId}:holding`,
                    indicator: "A.V.23",
                    label: "Holding",
                    scope: { entityId: node.entityId },
                    value: node.holdingPct,
                    unit: "%",
                    period: filed ? node.period ?? PERIOD : PERIOD,
                    source: filed ? filedSource : ("mca" as const),
                    sourceRef: node.sourceRef ?? "AOC-1, FY 2025-26",
                    document: node.document,
                    evidenceState: "linked" as const,
                    mode: filed ? ("public" as const) : ("mock" as const),
                  },
                ]
              : []),
          ])
          log("registry record", node.name, undefined, { cin: node.cin, relationship: node.relationship, holdingPct: node.holdingPct }, filed ? (getClient().lastBrsr ? "Group company from the filed BRSR (Section A Q23)" : "Group company from public records") : "MCA entity resolved", AGENT_ACTOR)
        },
        assignSiteEntity: (siteId, entityId, via, ref) => {
          const site = get().sites.find((s) => s.id === siteId)
          const entity = get().entities.find((e) => e.id === entityId)
          if (!site || !entity) return
          const before = get().entities.find((e) => e.id === site.legalEntityId)?.name
          updateSite(siteId, (s) => ({ ...s, legalEntityId: entityId, entityReview: via === "owner" ? false : s.entityReview }))
          // A plant known only from the client's file is placed by that file, not by a public record.
          const fromFile = via === "filing" && get().dataPoints.find((d) => d.id === `dp:${siteId}:location`)?.source === "file"
          upsertDataPoints([
            {
              id: `dp:${siteId}:entity`,
              indicator: "A.I.13",
              label: "Legal entity",
              scope: { siteId },
              value: entity.name,
              period: "As of " + TODAY,
              source: via === "gst" ? "gst" : fromFile ? "file" : via === "filing" ? (getClient().lastBrsr ? "brsr" : "filing") : "owner",
              sourceRef: ref ?? (via === "gst" ? `GSTIN ${site.gstin}` : via === "paste" ? "Pasted site list" : via === "filing" ? (getClient().lastBrsr ? "Filed BRSR / annual report" : "Public records") : "Reassigned by owner"),
              evidenceState: via === "gst" || via === "filing" ? "linked" : "none",
              owner: via === "owner" ? actorUser() : undefined,
              confirmedBy: via === "owner" ? actorUser() : undefined,
              confirmedAt: via === "owner" ? now() : undefined,
              mode: fromFile ? "live" : via === "filing" || (via === "gst" && isPublicClient()) ? "public" : "mock",
            },
          ])
          if (via === "owner") log("reassign site entity", site.name, before ?? "unassigned", entity.name)
          else log("assign site entity", site.name, before ?? "unassigned", entity.name, ref ?? (via === "gst" ? `Matched by GSTIN ${site.gstin}` : via === "filing" ? "From the filed BRSR" : "From pasted list"), AGENT_ACTOR)
        },
        setJvDecision: (d) => {
          const before = get().boundary.jvDecision
          set((s) => ({ boundary: { ...s.boundary, jvDecision: d } }))
          // Sites owned by the entities in question follow the decision.
          const ids = decisionEntityIds(get().entities)
          for (const site of get().sites.filter((x) => x.legalEntityId && ids.includes(x.legalEntityId))) {
            if (d === "include" && isBoundaryExcluded(site)) updateSite(site.id, (x) => ({ ...x, status: "confirmed", excludedReason: undefined }))
            if (d === "exclude" && site.status !== "excluded") updateSite(site.id, (x) => ({ ...x, status: "excluded", excludedReason: outsideReason() }))
          }
          // Sites under a card that sits outside the boundary either way (a separately listed
          // fellow subsidiary that files its own BRSR) stay out whatever the decision.
          const outside = get().entities.filter((e) => e.aggregate).map((e) => e.id)
          for (const site of get().sites.filter((x) => x.legalEntityId && outside.includes(x.legalEntityId) && x.status !== "excluded")) {
            updateSite(site.id, (x) => ({ ...x, status: "excluded", excludedReason: outsideReason() }))
          }
          if (isPublicClient()) log("boundary basis", "BRSR boundary", before === "exclude" ? "Standalone" : before === "include" ? "Consolidated" : undefined, d === "exclude" ? "Standalone" : "Consolidated")
          else log("JV boundary decision", "Joint venture", before, d)
        },
        confirmBoundary: () => {
          const s = get()
          const consolidation: Record<string, number> = {}
          for (const e of s.entities) {
            if (e.relationship === "holding") consolidation[e.id] = 100
            else if (!consolidatedUnder(e, s.boundary.jvDecision)) consolidation[e.id] = 0
            else consolidation[e.id] = e.holdingPct ?? (e.relationship === "jv" ? 50 : 100)
          }
          const holding = s.entities.find((e) => e.relationship === "holding")
          const reportingEntity: ReportingEntity = { entityId: holding?.id ?? s.reportingEntity?.entityId ?? "", fiscalYear: s.group.fiscalYear, consolidation }
          set((x) => ({ reportingEntity, boundary: { ...x.boundary, confirmed: true } }))
          upsertDataPoints([
            {
              id: "dp:group:boundary",
              indicator: "A.I.13",
              label: "Reporting boundary",
              scope: { entityId: reportingEntity.entityId },
              value: isPublicClient() && s.boundary.jvDecision !== "include" ? "Standalone" : "Consolidated",
              period: s.group.fiscalYear,
              source: "owner",
              sourceRef: "Boundary confirmed in esgOS",
              evidenceState: "none",
              owner: actorUser(),
              confirmedBy: actorUser(),
              confirmedAt: now(),
              mode: "mock",
            },
          ])
          log("confirm boundary", "BRSR boundary", undefined, consolidation)
        },

        // ------------------------------------------------------------- connect
        setConnect: (p) => set((s) => ({ connect: { ...s.connect, ...p } })),
        setErgosLink: (siteId, link) => set((s) => ({ connect: { ...s.connect, siteStatus: { ...s.connect.siteStatus, [siteId]: link } } })),
        chooseErgosCandidate: (siteId, ergosSiteId) => {
          const site = get().sites.find((s) => s.id === siteId)
          if (!site) return
          updateSite(siteId, (s) => ({ ...s, ergosSiteId }))
          log("choose ergOS feed", site.name, site.ergosCandidates, ergosSiteId)
        },
        addValidatedMeter: (siteId, meter) =>
          set((s) => {
            const list = s.meters[siteId] ?? []
            if (list.some((m) => m.id === meter.id)) return {}
            const types = s.connect.validated[siteId] ?? []
            return {
              meters: { ...s.meters, [siteId]: [...list, meter] },
              connect: { ...s.connect, validated: { ...s.connect.validated, [siteId]: types.includes(meter.type) ? types : [...types, meter.type] } },
            }
          }),
        setEnergy: (siteId, e) => {
          const fromFile = !!e.sourceLabel
          const imported = fromFile || e.openAccessNote === "Imported from an ergOS export"
          set((s) => ({ energy: { ...s.energy, [siteId]: e } }))
          const meters = get().meters[siteId] ?? []
          const elecMeters = meters.filter((m) => ["grid", "solar", "wind", "rooftop"].includes(m.type)).map((m) => m.id)
          const base = {
            scope: { siteId },
            period: e.period,
            source: fromFile ? ("file" as const) : ("ergos" as const),
            sourceRef: fromFile ? `${e.sourceLabel}${e.completeness < 0.9 ? " · mostly estimated" : ""}` : imported ? `${e.ergosSiteId} · imported export` : e.ergosSiteId,
            evidenceState: "linked" as const,
            syncState: "synced" as const,
            mode: imported ? ("live" as const) : ("mock" as const),
          }
          const dps: DataPoint[] = fromFile
            ? [
                // A client workbook has consumption only: no demand, cost or per-plant renewable split.
                { ...base, id: `dp:${siteId}:elec.annual`, indicator: "P6.E1.elec", label: "Electricity", value: e.annualMWh, unit: "MWh", note: e.openAccessNote },
                { ...base, id: `dp:${siteId}:elec.grid`, indicator: "P6.E1.elec", label: "Grid share", value: Math.round(e.shares.grid * 100), unit: "%", note: "The file gives plant consumption only; group solar is not allocated to plants." },
                { ...base, id: `dp:${siteId}:completeness`, indicator: "P6.E1.elec", label: "Months from readings", value: Math.round(e.completeness * 100), unit: "%", note: e.estimateBasis ? `The other months are ${e.estimateBasis}.` : undefined },
              ]
            : [
            { ...base, id: `dp:${siteId}:elec.annual`, indicator: "P6.E1.elec", label: "Electricity", value: e.annualMWh, unit: "MWh", meterId: elecMeters.join(", ") },
            { ...base, id: `dp:${siteId}:elec.re`, indicator: "P6.E1.elec", label: "Renewable share", value: Math.round(e.renewableShare * 100), unit: "%", meterId: meters.filter((m) => ["solar", "wind", "rooftop"].includes(m.type)).map((m) => m.id).join(", "), note: e.openAccessNote },
            { ...base, id: `dp:${siteId}:elec.grid`, indicator: "P6.E1.elec", label: "Grid share", value: Math.round(e.shares.grid * 100), unit: "%", meterId: meters.find((m) => m.type === "grid")?.id },
            { ...base, id: `dp:${siteId}:peak`, indicator: "P6.E1.elec", label: "Peak demand", value: e.peakMW, unit: "MW", meterId: meters.find((m) => m.type === "grid")?.id },
            { ...base, id: `dp:${siteId}:contracted`, indicator: "P6.E1.elec", label: "Contracted demand", value: e.contractedMW, unit: "MW", meterId: meters.find((m) => m.type === "grid")?.id },
            { ...base, id: `dp:${siteId}:cost`, indicator: "P6.E1.elec", label: "Electricity cost", value: e.costCr, unit: "₹ cr", meterId: meters.find((m) => m.type === "grid")?.id },
            { ...base, id: `dp:${siteId}:completeness`, indicator: "P6.E1.elec", label: "Data completeness", value: Math.round(e.completeness * 100), unit: "%" },
              ]
          if (e.dgDieselKL) dps.push({ ...base, id: `dp:${siteId}:dg`, indicator: "P6.E1.fuel", label: "DG diesel", value: e.dgDieselKL, unit: "kL", meterId: meters.find((m) => m.type === "dg")?.id })
          if (e.steamTonnes) dps.push({ ...base, id: `dp:${siteId}:steam`, indicator: "P6.E1.fuel", label: "Steam", value: e.steamTonnes, unit: "t", meterId: meters.find((m) => m.type === "steam")?.id })
          if (e.waterKL) dps.push({ ...base, id: `dp:${siteId}:water`, indicator: "P6.E3.withdrawal", label: "Water withdrawal", value: e.waterKL, unit: "kL", meterId: meters.find((m) => m.type === "water")?.id })
          upsertDataPoints(dps)
          log("energy summary", get().sites.find((s) => s.id === siteId)?.name ?? siteId, undefined, { annualMWh: e.annualMWh, completeness: e.completeness }, fromFile ? (e.sourceLabel ?? "client file") : `ergOS ${e.ergosSiteId}`, AGENT_ACTOR)
        },
        setSource: (key, p) => {
          const before = get().sources[key].status
          set((s) => ({ sources: { ...s.sources, [key]: { ...s.sources[key], ...p } } }))
          const after = get().sources[key].status
          if (p.status && before !== after && after !== "connecting") log("source connection", get().sources[key].label, before, after, p.coverageNote)
        },
        applyHrms: (coverage, note) => {
          const imported = note.startsWith("Imported")
          const map: Record<string, HrmsSiteRecord> = {}
          for (const c of coverage) map[c.siteId] = c
          set((s) => ({ records: { ...s.records, hrms: map, sourceNotes: { ...s.records.sourceNotes, hrms: note } } }))
          upsertDataPoints(
            coverage.map((c) => ({
              id: `dp:${c.siteId}:headcount`,
              indicator: "A.IV.20",
              label: "Headcount",
              scope: { siteId: c.siteId },
              value: c.permanent + c.contract,
              unit: "people",
              period: "Snapshot " + c.extractDate,
              source: "hrms" as const,
              sourceRef: `${c.permanent} permanent, ${c.contract} contract`,
              extractDate: c.extractDate,
              evidenceState: "pending" as const,
              syncState: "pending" as const,
              note: "FY movements arrive with the first full extract",
              mode: imported ? ("live" as const) : ("mock" as const),
            })),
          )
        },
        applyErp: (products, fuel, note) => {
          const mode = note.startsWith("Imported") ? ("live" as const) : ("mock" as const)
          const p: Record<string, ErpSiteRecord> = {}
          const f: Record<string, ErpSiteRecord> = {}
          for (const r of products) p[r.siteId] = r
          for (const r of fuel) f[r.siteId] = r
          set((s) => ({ records: { ...s.records, erpProducts: p, erpFuel: f, sourceNotes: { ...s.records.sourceNotes, erp: note } } }))
          const dps: DataPoint[] = []
          for (const r of products)
            dps.push({ id: `dp:${r.siteId}:products`, indicator: "A.II.16", label: "Products", scope: { siteId: r.siteId }, value: r.products, period: "As of " + TODAY, source: "erp", sourceRef: `Product master · plant ${r.plantCode}`, evidenceState: "linked", syncState: "pending", mode })
          for (const r of fuel) {
            dps.push({ id: `dp:${r.siteId}:fuel.qty`, indicator: "P6.E1.fuel", label: "Boiler fuel", value: r.fuelQuantity, scope: { siteId: r.siteId }, period: PERIOD, source: "erp", sourceRef: `Fuel purchases · plant ${r.plantCode}`, evidenceState: "pending", syncState: "pending", mode })
            if (r.output) dps.push({ id: `dp:${r.siteId}:output`, indicator: "P6.E1.intensity", label: "Production", value: r.output.value, unit: r.output.unit, scope: { siteId: r.siteId }, period: PERIOD, source: "erp", sourceRef: `Production postings · plant ${r.plantCode}`, evidenceState: "pending", syncState: "pending", mode })
          }
          upsertDataPoints(dps)
        },
        applyEhs: (registers, note) => {
          const mode = note.startsWith("Imported") ? ("live" as const) : ("mock" as const)
          const map: Record<string, EhsSiteRecord> = {}
          for (const r of registers) map[r.siteId] = r
          set((s) => ({ records: { ...s.records, ehs: map, sourceNotes: { ...s.records.sourceNotes, ehs: note } } }))
          const dps: DataPoint[] = []
          for (const r of registers) {
            dps.push({ id: `dp:${r.siteId}:waste`, indicator: "P6.E9", label: "Waste streams", scope: { siteId: r.siteId }, value: r.wasteStreams.join(", "), period: PERIOD, source: "ehs", sourceRef: "Waste register", evidenceState: "pending", syncState: "pending", mode })
            dps.push({ id: `dp:${r.siteId}:incidents`, indicator: "P3.E11", label: "Recordable incidents", scope: { siteId: r.siteId }, value: r.incidents, period: PERIOD, source: "ehs", sourceRef: `Incident register · LTIFR ${r.ltifr}`, evidenceState: "pending", syncState: "pending", mode })
          }
          upsertDataPoints(dps)
        },
        applyVault: (docs, note) => {
          set((s) => ({ documents: [...s.documents.filter((d) => d.uploaded), ...docs], records: { ...s.records, sourceNotes: { ...s.records.sourceNotes, vault: note } } }))
          upsertDataPoints(
            docs.map((d) => ({
              id: `dp:doc:${d.id}`,
              indicator: d.kind === "permit" ? "P6.E13" : d.kind === "invoice" ? "P6.E1.fuel" : "B.1",
              label: d.topic,
              scope: d.siteId ? { siteId: d.siteId } : { entityId: d.entityId },
              value: d.validTo ? `Valid to ${d.validTo}` : "On file",
              period: d.period,
              source: "vault" as const,
              sourceRef: d.name,
              document: d.name,
              evidenceState: "linked" as const,
              mode: d.uploaded ? ("live" as const) : ("mock" as const),
            })),
          )
        },
        addDocument: (doc) => {
          set((s) => ({ documents: [...s.documents, doc] }))
          upsertDataPoints([
            {
              id: `dp:doc:${doc.id}`,
              indicator: doc.kind === "permit" ? "P6.E13" : doc.kind === "invoice" ? "P6.E1.fuel" : "B.1",
              label: doc.topic,
              scope: doc.siteId ? { siteId: doc.siteId } : { entityId: doc.entityId },
              value: "Uploaded",
              period: doc.period,
              source: "vault",
              sourceRef: doc.name,
              document: doc.name,
              evidenceState: "linked",
              owner: actorUser(),
              confirmedAt: now(),
              mode: "mock",
            },
          ])
          log("upload document", doc.name, undefined, { kind: doc.kind, topic: doc.topic, siteId: doc.siteId })
        },
        recordDrop: (label, removed, beforeSec, afterSec) =>
          set((s) => ({ connect: { ...s.connect, drop: { id: (s.connect.drop?.id ?? 0) + 1, label, removed, beforeSec, afterSec } } })),

        // ------------------------------------------------------------- profile
        setProfileIntroDone: () => set({ profileIntroDone: true }),
        setActiveProfileSite: (siteId) => set({ activeProfileSite: siteId }),
        ensureProfile: (siteId) => {
          const existing = get().profiles[siteId]
          if (existing) return existing
          const p: SiteProfile = { siteId, status: "pending", answers: {}, answeredBy: {}, history: [] }
          set((s) => ({ profiles: { ...s.profiles, [siteId]: p } }))
          return p
        },
        answer: (siteId, questionId, value, opts) => {
          const p = get().ensureProfile(siteId)
          const before = p.answers[questionId]
          const at = now()
          set((s) => ({
            profiles: {
              ...s.profiles,
              [siteId]: {
                ...p,
                status: p.status === "pending" ? "active" : p.status,
                answers: { ...p.answers, [questionId]: value },
                answeredBy: { ...p.answeredBy, [questionId]: { by: opts?.actor ?? actorUser(), at, copiedFrom: opts?.copiedFrom } },
                history: opts?.copiedFrom ? p.history : [...p.history.filter((h) => h !== questionId), questionId],
              },
            },
          }))
          const site = get().sites.find((s) => s.id === siteId)
          if (value !== NOT_SURE) {
            upsertDataPoints([
              {
                id: `dp:${siteId}:q:${questionId}`,
                indicator: QUESTION_BY_ID[questionId]?.unlocks[0] ?? "context",
                label: QUESTION_LABELS[questionId] ?? questionId,
                questionId,
                scope: { siteId },
                value,
                period: get().group.fiscalYear,
                source: "owner",
                sourceRef: opts?.copiedFrom ? `Copied from ${get().sites.find((s) => s.id === opts.copiedFrom)?.name} profile` : "Answered in esgOS",
                evidenceState: "none",
                owner: opts?.actor ?? actorUser(),
                confirmedBy: opts?.actor ?? actorUser(),
                confirmedAt: at,
                mode: "mock",
              },
            ])
          }
          log(opts?.copiedFrom ? "copy answer" : "answer", `${site?.name ?? siteId} · ${questionId}`, before, value, opts?.copiedFrom ? `Copied from ${opts.copiedFrom}` : undefined, opts?.actor ?? actorUser())
        },
        notSure: (siteId, questionId, questionText, indicator, ownerRole, assigneeId) => {
          get().answer(siteId, questionId, NOT_SURE)
          const site = get().sites.find((s) => s.id === siteId)
          const person = assigneeId ? get().stakeholders.find((x) => x.id === assigneeId) : undefined
          get().addTask({
            siteId,
            question: questionText,
            indicator,
            ownerRole: person ? personLabel(person) : `${ownerRole}, ${site?.name ?? ""}`.replace(/, $/, ""),
            origin: questionId === "output" ? "output" : "not-sure",
            questionId,
            assignee: person ? { stakeholderId: person.id, name: person.name, role: person.role, email: person.email } : undefined,
          })
        },
        back: (siteId) => {
          const p = get().profiles[siteId]
          if (!p || !p.history.length) return undefined
          const last = p.history[p.history.length - 1]
          const answers = { ...p.answers }
          const answeredBy = { ...p.answeredBy }
          const before = answers[last]
          delete answers[last]
          delete answeredBy[last]
          set((s) => ({
            profiles: { ...s.profiles, [siteId]: { ...p, answers, answeredBy, history: p.history.slice(0, -1), status: "active" } },
            tasks: s.tasks.filter((t) => !(t.siteId === siteId && t.questionId === last && t.status === "open")),
          }))
          log("back", `${get().sites.find((s) => s.id === siteId)?.name} · ${last}`, before, undefined, "Answer withdrawn")
          return last
        },
        clearAnswer: (siteId, questionId) => {
          const p = get().profiles[siteId]
          if (!p) return
          const answers = { ...p.answers }
          const answeredBy = { ...p.answeredBy }
          const before = answers[questionId]
          delete answers[questionId]
          delete answeredBy[questionId]
          set((s) => ({
            profiles: { ...s.profiles, [siteId]: { ...p, answers, answeredBy, history: p.history.filter((h) => h !== questionId), status: "active" } },
            tasks: s.tasks.filter((t) => !(t.siteId === siteId && t.questionId === questionId && t.status === "open")),
            dataPoints: s.dataPoints.filter((d) => d.id !== `dp:${siteId}:q:${questionId}` || d.source !== "owner"),
          }))
          log("change answer", `${get().sites.find((s) => s.id === siteId)?.name} · ${questionId}`, before, undefined, "Answer reopened")
        },
        acceptCopy: (siteId, templateId, copy) => {
          const p = get().ensureProfile(siteId)
          set((s) => ({ profiles: { ...s.profiles, [siteId]: { ...p, copyOffer: "accepted", copiedFrom: templateId, status: "active" } } }))
          for (const [qid, v] of Object.entries(copy)) get().answer(siteId, qid, v, { copiedFrom: templateId })
          log("accept copy-profile", get().sites.find((s) => s.id === siteId)?.name ?? siteId, undefined, { from: templateId, answers: Object.keys(copy).length })
        },
        declineCopy: (siteId) => {
          const p = get().ensureProfile(siteId)
          set((s) => ({ profiles: { ...s.profiles, [siteId]: { ...p, copyOffer: "declined", status: "active" } } }))
          log("decline copy-profile", get().sites.find((s) => s.id === siteId)?.name ?? siteId)
        },
        completeSite: (siteId) => {
          const p = get().ensureProfile(siteId)
          if (p.status === "done") return
          set((s) => ({ profiles: { ...s.profiles, [siteId]: { ...p, status: "done" } }, understood: { siteId, at: Date.now() } }))
          log("site profile complete", get().sites.find((s) => s.id === siteId)?.name ?? siteId, p.status, "done", undefined, AGENT_ACTOR)
        },
        skipSite: (siteId, pending) => {
          const p = get().ensureProfile(siteId)
          const site = get().sites.find((s) => s.id === siteId)
          set((s) => ({ profiles: { ...s.profiles, [siteId]: { ...p, status: "skipped" } } }))
          for (const q of pending) {
            const person = q.assigneeId ? get().stakeholders.find((x) => x.id === q.assigneeId) : undefined
            get().addTask({
              siteId,
              question: q.text,
              indicator: q.indicator,
              ownerRole: person ? personLabel(person) : site?.ownerRole ?? q.ownerRole,
              origin: "skipped",
              questionId: q.id,
              assignee: person ? { stakeholderId: person.id, name: person.name, role: person.role, email: person.email } : undefined,
            })
          }
          log("skip site", site?.name ?? siteId, p.status, "skipped", `${pending.length} questions sent to ${site?.ownerRole}`)
        },
        reopenSite: (siteId) => {
          const p = get().ensureProfile(siteId)
          if (p.status === "skipped") {
            set((s) => ({ tasks: s.tasks.filter((t) => !(t.siteId === siteId && t.origin === "skipped" && t.status === "open")) }))
          }
          set((s) => ({ profiles: { ...s.profiles, [siteId]: { ...p, status: "active" } } }))
        },
        recordInferred: (siteId, dps) => upsertDataPoints(dps.map((d) => ({ ...d, scope: { siteId } }))),

        // ----------------------------------------------------- analysis, plan
        setAnalysis: (p) => set((s) => ({ analysis: { ...s.analysis, ...p } })),
        pushResult: (r) => set((s) => ({ analysis: { ...s.analysis, results: [...s.analysis.results.filter((x) => x.id !== r.id), r] } })),
        finishAnalysis: (e) => {
          set((s) => ({
            gaps: e.gaps,
            analysis: { ...s.analysis, phase: "done", stale: false, results: e.results, counts: e.counts, gapCounts: e.gapCounts, ranAt: now() },
          }))
          log("gap analysis", "BRSR coverage", undefined, { ...e.counts, gaps: e.gapCounts.total }, "gap-rules evaluated", AGENT_ACTOR)
        },
        issuePlan: (tasks) => {
          set((s) => ({ tasks: [...s.tasks, ...tasks], plan: { issued: true, issuedAt: now(), issuedTasks: tasks.length } }))
          log("issue collection plan", "Collection plan", undefined, { tasks: tasks.length })
        },
        planInterviews: () => {
          const s = get()
          const existing = s.interviews.plan
          const fresh = buildInterviewPlan(s.sites.filter((x) => x.status === "confirmed"), s.stakeholders)
          // Keep interviews already planned or done; add any new plant.
          const plan = [...existing, ...fresh.filter((f) => !existing.some((e) => e.id === f.id))]
          set({ interviews: { ...s.interviews, plan } })
          log("plan interviews", getClient().name, existing.length || undefined, plan.length, `${plan.filter((x) => x.siteId).length} plants, ${plan.filter((x) => !x.siteId).length} functions`)
        },
        updateInterview: (id, p) => {
          const before = get().interviews.plan.find((x) => x.id === id)
          set((s) => ({ interviews: { ...s.interviews, plan: s.interviews.plan.map((x) => (x.id === id ? { ...x, ...p, interviewee: { ...x.interviewee, ...(p.interviewee ?? {}) } } : x)) } }))
          log("update interview", before?.title ?? id, { date: before?.date, name: before?.interviewee.name }, p)
        },
        reviewDocument: (key, p) => {
          const before = get().docReview.reviews[key]
          const next: DocReview = { ...(before ?? {}), ...p, at: now(), by: actorUser() }
          set((s) => ({ docReview: { reviews: { ...s.docReview.reviews, [key]: next } } }))
          const [docId, siteId] = key.split("@")
          const label = `${DOC_BY_ID[docId]?.title ?? docId}${siteId ? ` · ${get().sites.find((x) => x.id === siteId)?.name ?? siteId}` : ""}`
          if (p.outcome !== undefined && p.outcome !== before?.outcome) log("review document", label, before?.outcome, p.outcome)
          else if (p.file !== undefined && p.file !== before?.file) log("document reviewed: file", label, before?.file, p.file)
        },
        updateSession: (owner, p) => {
          const { check, ...rest } = p
          set((s) => {
            const cur = s.reportReview.sessions[owner] ?? EMPTY_SESSION
            const checks = check ? { ...cur.checks, [check[0]]: check[1] } : cur.checks
            // Any change after sign-off reopens the session.
            return { reportReview: { sessions: { ...s.reportReview.sessions, [owner]: { ...cur, ...rest, checks, signedOffAt: undefined, signedOffBy: undefined } } } }
          })
          if (check) log("review check", `${owner} · ${check[0]}`, undefined, check[1] ?? "cleared")
        },
        holdSession: (owner, held) => {
          set((s) => {
            const cur = s.reportReview.sessions[owner] ?? EMPTY_SESSION
            return { reportReview: { sessions: { ...s.reportReview.sessions, [owner]: { ...cur, heldAt: held ? now() : undefined, date: cur.date ?? now().slice(0, 10), signedOffAt: held ? cur.signedOffAt : undefined } } } }
          })
          log(held ? "hold review session" : "reopen review session", owner)
        },
        raiseQuery: (owner, questionId, text) => {
          const q = { id: uid("query"), questionId, text, raisedAt: now(), by: actorUser() }
          set((s) => {
            const cur = s.reportReview.sessions[owner] ?? EMPTY_SESSION
            return { reportReview: { sessions: { ...s.reportReview.sessions, [owner]: { ...cur, queries: [...cur.queries, q], signedOffAt: undefined, signedOffBy: undefined } } } }
          })
          log("raise review query", `${owner} · ${questionId}`, undefined, text)
        },
        resolveQuery: (owner, queryId, resolution) => {
          set((s) => {
            const cur = s.reportReview.sessions[owner] ?? EMPTY_SESSION
            return { reportReview: { sessions: { ...s.reportReview.sessions, [owner]: { ...cur, queries: cur.queries.map((q) => (q.id === queryId ? { ...q, resolvedAt: now(), resolution } : q)) } } } }
          })
          log("resolve review query", `${owner} · ${queryId}`, undefined, resolution)
        },
        signOffSession: (owner, signed) => {
          const cur = get().reportReview.sessions[owner]
          if (signed && !canSignOff(cur)) return false
          set((s) => ({ reportReview: { sessions: { ...s.reportReview.sessions, [owner]: { ...(cur ?? EMPTY_SESSION), signedOffAt: signed ? now() : undefined, signedOffBy: signed ? actorUser() : undefined } } } }))
          log(signed ? "sign off review session" : "withdraw sign-off", owner)
          return true
        },
        answerInterview: (interviewId, questionId, p) => {
          const key = answerKey(interviewId, questionId)
          const before = get().interviews.answers[key]
          const next: InterviewAnswer = { ...(before ?? {}), ...p, at: now(), by: actorUser(), example: false }
          set((s) => ({ interviews: { ...s.interviews, answers: { ...s.interviews.answers, [key]: next } } }))
          if (p.rating && p.rating !== before?.rating) log("interview answer", `${get().interviews.plan.find((x) => x.id === interviewId)?.title ?? interviewId} · ${questionId}`, before?.rating, p.rating)
        },
        completeInterview: (id, done) => {
          set((s) => ({ interviews: { ...s.interviews, plan: s.interviews.plan.map((x) => (x.id === id ? { ...x, status: done ? "done" : "planned", completedAt: done ? now() : undefined } : x)) } }))
          log(done ? "complete interview" : "reopen interview", get().interviews.plan.find((x) => x.id === id)?.title ?? id)
        },
        fillExampleInterview: (id) => {
          const iv = get().interviews.plan.find((x) => x.id === id)
          if (!iv || getClient().kind !== "sample") return
          const answers = { ...get().interviews.answers }
          GUIDE_BY_ID[iv.guideId].questions.forEach((q, i) => {
            const key = answerKey(id, q.id)
            if (!answers[key]?.rating) answers[key] = { ...exampleAnswer(q, i + id.length), at: now(), by: "Example (demo)" }
          })
          set((s) => ({ interviews: { ...s.interviews, answers } }))
          log("example interview answers", iv.title, undefined, "filled", "Sample client only", AGENT_ACTOR)
        },
        setupCollection: () => {
          const s = get()
          const client = getClient()
          const months = fyMonths(s.group.fiscalYear)
          const at = now()
          const sites = s.sites.filter((x) => x.status === "confirmed")
          let cells: Record<string, Cell> = { ...s.collection.cells }
          // A client's own energy workbook fills the months it covers (readings and estimates as given).
          if (client.energyFile) {
            const byName = Object.fromEntries(sites.map((x) => [x.name, x.id]))
            const fromFile = cellsFromEnergyFile(client.energyFile, byName, months, at)
            for (const [k, v] of Object.entries(fromFile)) if (!cells[k]) cells[k] = v
          }
          // The sample's ergOS meters give electricity for connected sites (demo data).
          if (client.kind === "sample") {
            for (const site of sites) {
              const e = s.energy[site.id]
              if (!e || s.connect.siteStatus[site.id] !== "connected") continue
              months.forEach((mo, i) => {
                const season = 1 + 0.08 * Math.sin(((i + 1) / 12) * 2 * Math.PI)
                const kwh = (e.annualMWh * 1000 * season) / 12
                const grid = cellKey(site.id, "elec.grid", mo)
                const re = cellKey(site.id, "elec.re", mo)
                if (!cells[grid]) cells[grid] = { value: Math.round(kwh * (1 - e.renewableShare)), source: "meter", status: "submitted", evidence: `ergOS ${e.ergosSiteId}`, by: "ergOS (demo)", at, example: true }
                if (!cells[re] && e.renewableShare > 0) cells[re] = { value: Math.round(kwh * e.renewableShare), source: "meter", status: "submitted", evidence: `ergOS ${e.ergosSiteId}`, by: "ergOS (demo)", at, example: true }
              })
            }
          }
          cells = Object.fromEntries(Object.entries(cells))
          set({ collection: { ...s.collection, setupAt: s.collection.setupAt ?? at, months, cells } })
          log("set up monthly collection", client.name, undefined, { months: months.length, sites: sites.length, prefilled: Object.keys(cells).length }, client.energyFile ? `Prefilled from ${client.energyFile.file}` : undefined, AGENT_ACTOR)
        },
        issueCycle: (month) => {
          const s = get()
          const sites = s.sites.filter((x) => x.status === "confirmed")
          const due = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)
          const label = monthLabel(month, true)
          const tasks: Task[] = []
          for (const site of sites) {
            const byOwner = new Map<string, string[]>()
            for (const m of activeMetrics(s.collection).filter((x) => appliesTo(x, site.type))) {
              if (s.collection.cells[cellKey(site.id, m.id, month)]?.status === "approved") continue
              byOwner.set(m.owner, [...(byOwner.get(m.owner) ?? []), m.label.split(" (")[0].toLowerCase()])
            }
            for (const [owner, labels] of byOwner) {
              // The role at the site, then at group, then whoever runs the site, then the ESG lead.
              const seat =
                s.stakeholders.find((x) => x.siteId === site.id && x.role === owner) ??
                s.stakeholders.find((x) => !x.siteId && x.role === owner) ??
                s.stakeholders.find((x) => x.siteId === site.id && x.role === (site.type === "factory" ? "Plant head" : "Office admin")) ??
                s.stakeholders.find((x) => !x.siteId && x.role === "ESG lead")
              tasks.push({
                id: uid("task"),
                siteId: site.id,
                question: `Submit ${label} data for ${site.name}: ${labels.join(", ")}`,
                indicator: "Monthly collection",
                ownerRole: owner,
                due,
                status: "open",
                createdAt: now(),
                origin: "collection",
                assignee: seat ? { stakeholderId: seat.id, name: seat.name, role: seat.role, email: seat.email } : undefined,
              })
            }
          }
          set((x) => ({ tasks: [...x.tasks, ...tasks], collection: { ...x.collection, cycles: { ...x.collection.cycles, [month]: { ...x.collection.cycles[month], issuedAt: now(), due, requests: tasks.length } } } }))
          log("issue collection cycle", label, undefined, { requests: tasks.length, due }, `${sites.length} sites`)
        },
        setCell: (siteId, metric, month, p) => {
          const key = cellKey(siteId, metric, month)
          const before = get().collection.cells[key]
          set((x) => {
            const cells = { ...x.collection.cells }
            if (p === null) delete cells[key]
            else cells[key] = { ...(before ?? { value: 0, source: "bill", status: "submitted" }), ...p, by: actorUser(), at: now(), example: false } as Cell
            return { collection: { ...x.collection, cells } }
          })
          const site = get().sites.find((x) => x.id === siteId)?.name ?? siteId
          log(p === null ? "clear collected value" : "collected value", `${site} · ${METRIC_BY_ID[metric].label} · ${monthLabel(month)}`, before ? { value: before.value, status: before.status } : undefined, p ? { value: p.value ?? before?.value, status: p.status ?? before?.status ?? "submitted" } : undefined)
        },
        reviewCycle: (month) => {
          const cells = { ...get().collection.cells }
          let n = 0
          for (const [k, c] of Object.entries(cells)) if (k.endsWith(`|${month}`) && c.status === "submitted") {
            cells[k] = { ...c, status: "approved", at: now() }
            n++
          }
          set((x) => ({ collection: { ...x.collection, cells } }))
          log("review collection cycle", monthLabel(month, true), undefined, { approved: n }, "Submitted values reviewed and approved; estimates stay estimates")
        },
        closeCycle: (month, closed) => {
          set((x) => ({ collection: { ...x.collection, cycles: { ...x.collection.cycles, [month]: { ...x.collection.cycles[month], closedAt: closed ? now() : undefined } } } }))
          log(closed ? "close collection cycle" : "reopen collection cycle", monthLabel(month, true))
        },
        simulateReturns: (month) => {
          if (getClient().kind !== "sample") return
          const s = get()
          const cells = { ...s.collection.cells }
          const at = now()
          for (const site of s.sites.filter((x) => x.status === "confirmed")) {
            for (const m of activeMetrics(s.collection).filter((x) => appliesTo(x, site.type))) {
              const k = cellKey(site.id, m.id, month)
              if (cells[k]) continue
              const v = exampleValue(m.id, site, month)
              if (!v && m.optional) continue
              cells[k] = { value: v, source: m.id.startsWith("hr.") || m.id === "safety.hours" ? "hrms" : m.id === "prod.output" ? "erp" : m.id.startsWith("elec") || m.id.startsWith("fuel") ? "bill" : "register", status: "submitted", evidence: m.evidence, by: "Example (demo)", at, example: true }
            }
          }
          set((x) => ({ collection: { ...x.collection, cells } }))
          log("example owner returns", monthLabel(month, true), undefined, "filled", "Sample client only", AGENT_ACTOR)
        },
        importCollection: (rows, fileName) => {
          const cells = { ...get().collection.cells }
          const at = now()
          let changed = 0
          let unchanged = 0
          for (const r of rows) {
            const key = cellKey(r.siteId, r.metric, r.month)
            const prev = cells[key]
            // The month's template carries the values already entered: a row that matches
            // what is on file is skipped, so its review status (approved) is kept.
            const same = prev && prev.value === r.value && prev.source === r.source && (!r.evidence || r.evidence === prev.evidence) && (!r.note || r.note === prev.note)
            if (same) {
              unchanged++
              continue
            }
            // The import file is not evidence: a row without its bill or register stays without
            // evidence (and is flagged), and the note records where the value came from.
            const via = `Imported from ${fileName}`
            cells[key] = { value: r.value, source: r.source, status: r.source === "estimate" ? "estimated" : "submitted", evidence: r.evidence || undefined, note: r.note?.includes(via) ? r.note : [r.note, via].filter(Boolean).join(" · "), by: actorUser(), at }
            changed++
          }
          set((x) => ({ collection: { ...x.collection, cells } }))
          log("import collection file", fileName, undefined, { changed, unchanged })
          return { changed, unchanged }
        },
        addMetrics: (ids, forItem) => {
          const cur = get().collection.added ?? []
          const fresh = ids.filter((id) => !cur.includes(id))
          if (!fresh.length) return
          const at = now()
          set((x) => ({ collection: { ...x.collection, added: [...cur, ...fresh], addedAt: { ...(x.collection.addedAt ?? {}), ...Object.fromEntries(fresh.map((id) => [id, at])) } } }))
          log("add metric to collection", fresh.map((id) => METRIC_BY_ID[id].label).join(", "), undefined, { for: forItem }, "From the gap analysis; in the templates from the next cycle")
        },
        setAnnual: (id, p) => {
          const before = get().collection.annual?.[id]
          set((x) => {
            const annual = { ...(x.collection.annual ?? {}) }
            if (p === null) delete annual[id]
            else annual[id] = { value: p.value, evidence: p.evidence ?? before?.evidence, note: p.note ?? before?.note, status: "submitted", by: actorUser(), at: now() } as AnnualValue
            return { collection: { ...x.collection, annual } }
          })
          log(p === null ? "clear company data" : "company data", ANNUAL_BY_ID[id].label, before?.value, p?.value)
        },
        approveAnnual: (ids) => {
          const annual = { ...(get().collection.annual ?? {}) }
          const who = actorUser()
          let n = 0
          for (const id of ids) {
            const v = annual[id]
            if (!v || v.status === "approved") continue
            annual[id] = { ...v, status: "approved", approvedBy: who }
            n++
          }
          if (!n) return
          set((x) => ({ collection: { ...x.collection, annual } }))
          log("approve company data", `${n} item${n === 1 ? "" : "s"}`, undefined, ids.map((id) => ANNUAL_BY_ID[id].label).join(", "))
        },
        setBaseline: (b) => {
          if (get().closure.baseline) return
          set((x) => ({ closure: { ...x.closure, baseline: b } }))
          log("gap analysis baseline", getClient().name, undefined, { items: Object.keys(b.statuses).length, ready: Object.values(b.statuses).filter((v) => v === "now").length }, "Progress on closing the gaps is measured from here", AGENT_ACTOR)
        },
        setClosureStep: (itemId, stepId, done) => {
          set((x) => {
            const cur = x.closure.entries[itemId] ?? { steps: {} }
            const steps = { ...cur.steps }
            if (done) steps[stepId] = now()
            else delete steps[stepId]
            // Undoing a step reopens a verified item.
            return { closure: { ...x.closure, entries: { ...x.closure.entries, [itemId]: { ...cur, steps, at: now(), by: actorUser(), ...(done ? {} : { verifiedAt: undefined, verifiedBy: undefined }) } } } }
          })
          log(done ? "closing step done" : "closing step undone", `${itemId} · ${stepId}`)
        },
        setClosureEvidence: (itemId, evidence) => {
          const before = get().closure.entries[itemId]?.evidence
          if ((before ?? "") === evidence) return
          set((x) => {
            const cur = x.closure.entries[itemId] ?? { steps: {} }
            return { closure: { ...x.closure, entries: { ...x.closure.entries, [itemId]: { ...cur, evidence, at: now(), by: actorUser() } } } }
          })
          log("closing evidence", itemId, before, evidence)
        },
        verifyClosure: (itemId, verified) => {
          const cur = get().closure.entries[itemId] ?? { steps: {} }
          if (verified && !cur.evidence?.trim()) return
          set((x) => ({ closure: { ...x.closure, entries: { ...x.closure.entries, [itemId]: { ...cur, verifiedAt: verified ? now() : undefined, verifiedBy: verified ? actorUser() : undefined } } } }))
          log(verified ? "verify and close gap" : "reopen gap", itemId, undefined, verified ? cur.evidence : undefined)
        },
        sendDataRequest: (itemId, p) => {
          const s = get()
          const seat = s.stakeholders.find((x) => !x.siteId && x.role === p.ownerRole && !x.vacant) ?? s.stakeholders.find((x) => !x.siteId && x.role === "ESG lead")
          const due = dueIn(14)
          const task: Task = {
            id: uid("task"),
            question: p.question,
            indicator: p.indicator,
            ownerRole: p.ownerRole,
            due,
            status: "open",
            createdAt: now(),
            origin: "closure",
            assignee: seat ? { stakeholderId: seat.id, name: seat.name, role: seat.role, email: seat.email } : undefined,
          }
          set((x) => ({ tasks: [...x.tasks, task], closure: { ...x.closure, requests: { ...x.closure.requests, [itemId]: { ...(x.closure.requests[itemId] ?? {}), sentAt: now(), due, taskId: task.id, by: actorUser() } } } }))
          log("send data request", itemId, undefined, { to: seat?.name ?? p.ownerRole, due })
        },
        receiveData: (itemId, file) => {
          const r = get().closure.requests[itemId]
          set((x) => ({ closure: { ...x.closure, requests: { ...x.closure.requests, [itemId]: { ...(r ?? {}), receivedAt: file.trim() ? now() : undefined, file: file.trim() || undefined } } }, tasks: r?.taskId ? x.tasks.map((t) => (t.id === r.taskId ? { ...t, status: file.trim() ? "done" : "open" } : t)) : x.tasks }))
          log(file.trim() ? "data received" : "data receipt cleared", itemId, r?.file, file.trim() || undefined)
        },
        saveDraft: (id, text) => {
          const before = get().drafts[id]
          if ((before?.text ?? "") === text) return
          set((x) => {
            const drafts = { ...x.drafts }
            if (!text.trim()) delete drafts[id]
            else drafts[id] = { text, by: actorUser(), at: now() }
            return { drafts }
          })
          log(text.trim() ? "draft answer" : "clear draft answer", id, before?.text ? `${before.text.slice(0, 60)}${before.text.length > 60 ? "…" : ""}` : undefined, text.trim() ? `${text.slice(0, 60)}${text.length > 60 ? "…" : ""}` : undefined)
        },
        addTask: (t) => {
          const task: Task = { id: uid("task"), createdAt: now(), status: "open", due: t.due ?? dueIn(14), ...t }
          set((s) => ({ tasks: [...s.tasks, task] }))
          log("task created", task.ownerRole, undefined, { question: task.question, indicator: task.indicator, due: task.due }, task.origin, AGENT_ACTOR)
        },
      }
    },
    {
      name: "esgos-tenneco-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // UI state and functions are not persisted
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ui, ...rest } = s
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(rest)) if (typeof v !== "function") out[k] = v
        return out as Partial<Store>
      },
      version: 5,
    },
  ),
)

export function findCityOrUndefined(text: string) {
  return findCity(text)
}
