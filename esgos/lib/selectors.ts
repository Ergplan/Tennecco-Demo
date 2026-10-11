// Derived views over DemoState shared by scenes, commands and the engines.

import type { DemoState } from "./store"
import type { Site, SiteProfile } from "./types"
import {
  effectiveAnswers,
  expectedQuestions,
  findTemplate,
  remainingSeconds,
  sourceStateFor,
  type Answers,
  type SiteSourceFacts,
  type SourceState,
} from "./questionEngine"
import type { EngineContext } from "./gapEngine"
import { getClient } from "./clients"
import { consolidatedUnder } from "./boundary"

type S = Pick<
  DemoState,
  "sites" | "sources" | "meters" | "connect" | "energy" | "records" | "documents" | "profiles" | "entities" | "reportingEntity" | "boundary"
>

export function inBoundary(state: Pick<DemoState, "sites">): Site[] {
  return state.sites.filter((s) => s.status === "confirmed")
}

export function factsFor(state: S, site: Site): SiteSourceFacts {
  const ehs = state.records.ehs[site.id]
  return {
    meters: (state.meters[site.id] ?? []).map((m) => m.type),
    ergosConnected: state.connect.siteStatus[site.id] === "connected",
    completeness: state.energy[site.id]?.completeness,
    erpProduct: !!state.records.erpProducts[site.id],
    erpFuel: !!state.records.erpFuel[site.id],
    erpFuels: state.records.erpFuel[site.id]?.fuels ?? [],
    hrms: !!state.records.hrms[site.id],
    ehs: ehs ? { wasteStreams: ehs.wasteStreams, disposal: ehs.disposal } : null,
    permit: state.documents.some((d) => d.siteId === site.id && d.kind === "permit"),
    fuelInvoices: state.documents.some((d) => d.siteId === site.id && d.kind === "invoice"),
  }
}

export function sourceState(state: S, site: Site): SourceState {
  return sourceStateFor(site, state.sources, factsFor(state, site))
}

export function ownerAnswers(state: S, siteId: string): Answers {
  return state.profiles[siteId]?.answers ?? {}
}

export function profileOrder(state: S): Site[] {
  const sites = inBoundary(state)
  const rank = (id: string) => {
    const i = getClient().profileOrder.indexOf(id)
    return i === -1 ? 100 + sites.findIndex((s) => s.id === id) : i
  }
  const typeRank = (s: Site) => (s.type === "factory" ? 0 : s.type === "warehouse" ? 1 : 2)
  return [...sites].sort((a, b) => typeRank(a) - typeRank(b) || rank(a.id) - rank(b.id))
}

export type EstimateSummary = { seconds: number; questions: number; sites: number }

export function profileEstimate(state: S, excludeSiteId?: string): EstimateSummary {
  let seconds = 0
  let questions = 0
  let sites = 0
  for (const site of inBoundary(state)) {
    if (site.id === excludeSiteId) continue
    const p = state.profiles[site.id]
    if (p && (p.status === "done" || p.status === "skipped")) continue
    const st = sourceState(state, site)
    const pend = expectedQuestions(site, st, p?.answers ?? {})
    seconds += remainingSeconds(site, st, p?.answers ?? {})
    questions += pend.length
    if (pend.length) sites += 1
  }
  return { seconds, questions, sites }
}

export function templateFor(state: S, site: Site) {
  const ctx = (s: Site) => ({ site: s, state: sourceState(state, s), profile: state.profiles[s.id], entityId: s.legalEntityId })
  const completed = inBoundary(state)
    .filter((s) => s.id !== site.id && state.profiles[s.id]?.status === "done")
    .map(ctx)
  const t = findTemplate(ctx(site), completed)
  return t ? { target: ctx(site), template: t } : undefined
}

export function entitiesInBoundary(state: Pick<DemoState, "entities" | "reportingEntity" | "boundary">) {
  return state.entities.filter((e) => {
    if (!consolidatedUnder(e, state.boundary.jvDecision)) return false
    const c = state.reportingEntity?.consolidation?.[e.id]
    return c === undefined || c > 0
  })
}

export function engineContext(state: S): EngineContext {
  const sites = inBoundary(state)
  const states: Record<string, SourceState> = {}
  const answers: Record<string, Answers> = {}
  const owner: Record<string, Answers> = {}
  const completeness: Record<string, number> = {}
  const energyFile: Record<string, { label: string; basis?: string }> = {}
  const ergosLinked: Record<string, boolean> = {}
  const erpPlantCodes: Record<string, string> = {}
  const hrmsCoverage: Record<string, boolean> = {}
  for (const site of sites) {
    const st = sourceState(state, site)
    states[site.id] = st
    owner[site.id] = ownerAnswers(state, site.id)
    answers[site.id] = effectiveAnswers(site, st, owner[site.id])
    if (state.energy[site.id]) completeness[site.id] = state.energy[site.id].completeness
    const label = state.energy[site.id]?.sourceLabel
    if (label) energyFile[site.id] = { label, basis: state.energy[site.id].estimateBasis }
    ergosLinked[site.id] = state.connect.siteStatus[site.id] === "connected"
    const code = state.records.erpProducts[site.id]?.plantCode
    if (code) erpPlantCodes[site.id] = code
    hrmsCoverage[site.id] = !!state.records.hrms[site.id]
  }
  const client = getClient()
  return {
    filed: client.kind === "public" ? client.filedEvidence : undefined,
    reportingEntityId: state.reportingEntity?.entityId,
    boundaryConfirmed: state.boundary.confirmed,
    entities: entitiesInBoundary(state),
    sites,
    sources: state.sources,
    documents: state.documents,
    states,
    answers,
    ownerAnswers: owner,
    completeness,
    energyFile,
    ergosLinked,
    erpPlantCodes,
    hrmsCoverage,
  }
}

export function profileStatus(p: SiteProfile | undefined) {
  return p?.status ?? "pending"
}
