// Boundary decision rules shared by the store, pipelines and the Boundary scene.
// Sample client: the open question is whether to include a JV's sites.
// Public client: the last BRSR was standalone, so the question is whether to
// keep it standalone or consolidate the subsidiaries that own sites.

import { getClient } from "./clients"
import type { LegalEntity, Site } from "./types"

export const JV_OUTSIDE = "JV outside BRSR boundary"
export const STANDALONE_OUTSIDE = "Outside standalone boundary"

export const isPublicClient = () => getClient().kind === "public"

export function outsideReason() {
  return isPublicClient() ? STANDALONE_OUTSIDE : JV_OUTSIDE
}

// Excluded only because of the boundary decision (still shown on the Boundary scene).
export function isBoundaryExcluded(s: Pick<Site, "excludedReason">) {
  return s.excludedReason === JV_OUTSIDE || s.excludedReason === STANDALONE_OUTSIDE
}

// Entities whose sites follow the boundary decision.
export function decisionEntityIds(entities: LegalEntity[]): string[] {
  return entities.filter((e) => !e.aggregate && (isPublicClient() ? e.relationship !== "holding" : e.relationship === "jv")).map((e) => e.id)
}

// Is the entity consolidated under the current decision?
export function consolidatedUnder(e: LegalEntity, decision: "include" | "exclude" | undefined) {
  if (e.aggregate) return false
  if (e.relationship === "holding") return true
  if (isPublicClient()) return decision === "include"
  return (e.relationship !== "jv" && e.relationship !== "associate") || decision === "include"
}
