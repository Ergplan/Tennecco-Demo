// Everything a deliverable needs, assembled once from the current state: the
// client, boundary, readiness, interviews, monthly collection, peer and the
// assumptions behind every number. Generators (PPT, Excel, Word) only format it.

import type { DemoState } from "../store"
import { getClient } from "../clients"
import type { ClientProfile } from "../clients/types"
import { assessReadiness, MILESTONES, type ReadinessSummary } from "../readiness/engine"
import type { ReadinessItem } from "../readiness/types"
import { findings, type Finding } from "../interviews/plan"
import { completeness, derivedTotals, factorNotes, flags, type Derived, type Flag } from "../collection/calc"
import { ANNUAL_BY_ID } from "../collection/annual"
import { entitiesInBoundary } from "../selectors"
import { peerClient } from "../peer"
import type { LegalEntity, Site } from "../types"
import { OUTCOME_LABEL, coverage as docCoverage, reviewRows, type Outcome, type ReviewRow } from "../documents/review"
import { reviewPlan, reviewSummary, type SessionPlan } from "../reportReview"

export type Assumption = { area: string; assumption: string; effect: string; remove: string; owner: string }

export type ReportModel = {
  client: ClientProfile
  fy: string
  period: string
  generatedAt: string
  preparedBy: string
  boundary: string
  entities: LegalEntity[]
  sites: Site[]
  plants: Site[]
  offices: Site[]
  readiness: ReadinessSummary
  open: ReadinessItem[]
  milestones: (typeof MILESTONES[number] & { items: ReadinessItem[] })[]
  interviews: { planned: number; done: number; findings: Finding[] }
  collection: {
    setup: boolean
    months: string[]
    closed: string[]
    // The months every total covers: the closed months, or all months before any is closed.
    period: string[]
    completeness: ReturnType<typeof completeness>
    collected: Derived
    withEstimates: Derived
    flags: Flag[]
    factors: string[]
  }
  peer?: ClientProfile
  assumptions: Assumption[]
  docs: { rows: ReviewRow[]; reviewed: ReviewRow[]; byOutcome: Record<Outcome, number>; coverage: ReturnType<typeof docCoverage> }
  review: { plan: SessionPlan[]; summary: ReturnType<typeof reviewSummary> }
  state: Pick<DemoState, "collection" | "interviews" | "stakeholders" | "orgByClient" | "group" | "energy" | "sites" | "gaps" | "docReview" | "reportReview" | "closure" | "drafts" | "plan">
}

type S = DemoState

export function boundaryText(state: Pick<S, "entities" | "reportingEntity" | "boundary" | "sites">, client = getClient()) {
  const sites = state.sites.filter((x) => x.status === "confirmed")
  const plants = sites.filter((x) => x.type === "factory").length
  const entities = entitiesInBoundary(state).filter((e) => !e.aggregate)
  const holding = entities.find((e) => e.relationship === "holding")
  const subs = entities.filter((e) => e.relationship !== "holding")
  const which = client.preIpo ? "The first BRSR" : "This BRSR"
  if (!state.boundary.confirmed) return `Boundary not confirmed yet: ${sites.length} sites (${plants} plants) on file.`
  return subs.length
    ? `${which} consolidates ${holding?.name ?? client.legalName} and ${subs.length} ${subs.length === 1 ? "subsidiary" : "subsidiaries"}: ${plants} plants and ${sites.length - plants} other sites.`
    : `${which} covers ${holding?.name ?? client.legalName} on a standalone basis: ${plants} plants and ${sites.length - plants} other sites.`
}

export function buildAssumptions(state: S, client: ClientProfile, col: ReportModel["collection"]): Assumption[] {
  const out: Assumption[] = []
  const owner = (role: string) => state.stakeholders.find((p) => !p.siteId && p.role === role && !p.vacant)?.name ?? role
  out.push({
    area: "Reporting boundary",
    assumption: boundaryText(state, client),
    effect: "Every number covers the confirmed sites only. Sites left out (under construction, unconfirmed) are excluded.",
    remove: "Confirm the boundary with the company secretary against the audited financial statements.",
    owner: owner("Company secretary"),
  })
  if (client.preIpo) {
    out.push({
      area: "Public information",
      assumption: "Plants, group structure, revenue and shareholding come from public records (pollution-board, rating-agency, competition-regulator, GST and news pages) read through search-engine extracts; the pages themselves were not reachable. Plant ownership after the demerger is assumed.",
      effect: "Section A details and the plant list may be incomplete or out of date.",
      remove: "Replace with the company's own records: certificate of incorporation, plant list with consents, shareholding pattern.",
      owner: owner("Company secretary"),
    })
    const audited = state.collection.annual?.["fin.revenue"]
    if (audited) {
      out.push({
        area: "Revenue",
        assumption: `Revenue from operations of ₹${audited.value.toLocaleString("en-IN")} crore for ${state.group.fiscalYear} is entered from ${audited.evidence ?? ANNUAL_BY_ID["fin.revenue"].evidence}${audited.status === "approved" ? " and approved" : "; not yet approved by the reviewer"}.`,
        effect: "Intensity ratios per rupee of turnover use it once all 12 months are collected; until then they use revenue for the same months, where Finance has given it.",
        remove: audited.status === "approved" ? "None, once the statements are signed by the auditors." : "Approve the figure against the signed financial statements.",
        owner: owner("Finance controller"),
      })
    } else if (client.preIpo.revenueCr) {
      out.push({
        area: "Revenue",
        assumption: `Revenue of ₹${client.preIpo.revenueCr.value.toLocaleString("en-IN")} crore (${client.preIpo.revenueCr.fy}) is CRISIL's figure for the combined business, not audited accounts for the reporting year.`,
        effect: "Intensity ratios per rupee of turnover cannot be computed until audited revenue for the reporting year is available.",
        remove: "Use audited revenue from operations for the reporting year.",
        owner: owner("Finance controller"),
      })
    }
  }
  const approx = state.sites.filter((x) => x.approximatePin && x.status === "confirmed")
  if (approx.length) {
    out.push({
      area: "Plant locations",
      assumption: `${approx.map((x) => x.name).join(", ")}: no address on record; placed by town only.`,
      effect: "Section A location counts by state may be wrong for these plants.",
      remove: "Confirm each address from the consent to operate or factory licence.",
      owner: owner("Plant head"),
    })
  }
  if (client.energyFile) {
    for (const c of client.energyFile.caveats) out.push({ area: "Energy file", assumption: c, effect: "Electricity in P6 E1 and Scope 2 in P6 E7 carry this limitation.", remove: "Collect monthly bills (kWh and kVAh) for every plant and month.", owner: owner("Energy manager") })
  }
  if (col.setup) {
    const c = col.completeness
    out.push({
      area: "Monthly collection",
      assumption: `${c.have.toLocaleString("en-IN")} of ${c.expected.toLocaleString("en-IN")} required monthly values collected; ${c.est.toLocaleString("en-IN")} are estimates; ${c.missing.toLocaleString("en-IN")} are missing.`,
      effect: "Totals in Section C are shown with and without estimates; missing months understate the year.",
      remove: "Close the remaining monthly cycles and replace estimates with source documents.",
      owner: owner("ESG lead"),
    })
    for (const f of col.factors) out.push({ area: "Conversion factors", assumption: f, effect: "Used for energy in GJ and Scope 1 and 2.", remove: "Confirm factors with the assurance provider; update to the reporting year's CEA grid factor when published.", owner: owner("ESG lead") })
  } else {
    out.push({ area: "Monthly collection", assumption: "Monthly data collection has not started.", effect: "Section C quantitative answers are placeholders.", remove: "Set up monthly collection and close at least three cycles.", owner: owner("ESG lead") })
  }
  const interviewOnly = findings(state.interviews)
  if (interviewOnly.length) {
    out.push({
      area: "Management interviews",
      assumption: `${interviewOnly.length} answers from ${new Set(interviewOnly.map((f) => f.interview.id)).size} interviews are management representations. Evidence was seen only where noted.`,
      effect: "Section B and qualitative answers rest on what management said.",
      remove: "File the evidence named in each interview answer.",
      owner: owner("ESG lead"),
    })
  }
  if (client.preIpo) {
    out.push({
      area: "Peer comparisons",
      assumption: `Peer values are ${peerClient()?.name ?? "the peer"}'s filed BRSR; scaled values multiply the peer's intensity per ₹ crore by this company's revenue.`,
      effect: "Scaled values show order of magnitude only and are never used as this company's data.",
      remove: "None needed; they stay labelled as estimates.",
      owner: owner("ESG lead"),
    })
  }
  const rows = reviewRows(state.docReview, state.sites)
  const reviewed = rows.filter((r) => r.review?.outcome)
  if (reviewed.length < rows.length) {
    out.push({
      area: "Document review",
      assumption: `${reviewed.length} of ${rows.length} documents in the review checklist have been reviewed; ${rows.length - reviewed.length} have not been seen.`,
      effect: "Answers that rest on policies, registers and plant records not yet reviewed are management representations.",
      remove: "Collect and review the remaining documents, starting with the plant consents and registers.",
      owner: owner("ESG lead"),
    })
  }
  const rv = reviewSummary(state.reportReview)
  out.push({
    area: "Status of this report",
    assumption: `This is a test report for internal review. ${rv.signedOff === rv.sessions ? `All ${rv.sessions} review sessions with data owners are signed off.` : `${rv.held} of ${rv.sessions} review sessions with data owners held, ${rv.signedOff} signed off${rv.openQueries ? `, ${rv.openQueries} queries open` : ""}.`} It has not been assessed or assured, and it is not approved by the Board.`,
    effect: "Not for publication or for use in the offer document.",
    remove: rv.signedOff === rv.sessions ? "Appoint an independent assessment or assurance provider and take the report to the Board." : "Complete the review sessions with data owners and resolve their queries, then appoint an assessment or assurance provider.",
    owner: owner("Company secretary"),
  })
  return out
}

export function buildReportModel(state: S, preparedBy = "esgOS"): ReportModel {
  const client = getClient()
  const readiness = assessReadiness(state)
  const open = readiness.items.filter((x) => x.status !== "now").sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, undefined, { numeric: true }))
  const sites = state.sites.filter((x) => x.status === "confirmed")
  const col = state.collection
  const closed = col.months.filter((m) => col.cycles[m]?.closedAt)
  const months = col.months.length ? col.months : []
  // Totals cover the closed months, as on the collection screen; completeness covers the year.
  const period = closed.length ? closed : months
  const collection: ReportModel["collection"] = {
    setup: !!col.setupAt,
    months,
    closed,
    period,
    completeness: completeness(col, sites, months),
    collected: derivedTotals(col, sites, period),
    withEstimates: derivedTotals(col, sites, period, { includeEstimates: true }),
    flags: flags(col, sites, months),
    factors: factorNotes(col),
  }
  const f = findings(state.interviews)
  const rows = reviewRows(state.docReview, state.sites)
  const reviewed = rows.filter((r) => r.review?.outcome)
  const byOutcome = Object.fromEntries((Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => [o, reviewed.filter((r) => r.review!.outcome === o).length])) as Record<Outcome, number>
  return {
    client,
    fy: state.group.fiscalYear,
    period: state.group.period,
    generatedAt: new Date().toISOString(),
    preparedBy,
    boundary: boundaryText(state, client),
    entities: entitiesInBoundary(state),
    sites,
    plants: sites.filter((x) => x.type === "factory"),
    offices: sites.filter((x) => x.type !== "factory"),
    readiness,
    open,
    milestones: MILESTONES.map((m) => ({ ...m, items: open.filter((x) => x.milestone === m.id) })),
    interviews: { planned: state.interviews.plan.length, done: state.interviews.plan.filter((x) => x.status === "done").length, findings: f },
    collection,
    peer: peerClient(),
    assumptions: buildAssumptions(state, client, collection),
    docs: { rows, reviewed, byOutcome, coverage: docCoverage(rows) },
    review: { plan: reviewPlan(), summary: reviewSummary(state.reportReview) },
    state,
  }
}

export const fmtN = (n: number, d = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: d })
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
