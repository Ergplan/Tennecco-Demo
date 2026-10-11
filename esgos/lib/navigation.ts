"use client"

import { useStore } from "./store"
import type { Stage } from "./types"
import { STAGES } from "./types"
import { inBoundary } from "./selectors"
import { getClient } from "./clients"

const st = () => useStore.getState()

// What must be true before a stage can open. Returns a short agent reply when blocked.
export function blockedReason(stage: Stage): { reason: string; fallback: Stage } | null {
  const s = st()
  const conflicts = s.sites.filter((x) => x.conflict && !x.conflict.resolved && x.status !== "excluded")
  switch (stage) {
    case "agent":
      return null
    case "seed":
      // The organisation gate comes first: who is using esgOS and who owns the answers.
      return s.orgByClient?.[s.clientId] ? null : { reason: `First, tell me who's who at ${getClient().shortName}.`, fallback: "agent" }
    case "boundary":
      if (!s.seed.reconciled) return { reason: "First I need your footprint. Let's find it.", fallback: "seed" }
      if (conflicts.length) return { reason: `${conflicts.length === 1 ? "One site needs" : conflicts.length + " sites need"} your confirmation first.`, fallback: "seed" }
      return null
    case "connect":
      return blockedReason("boundary") ?? (s.boundary.confirmed ? null : { reason: "I need the reporting boundary before connecting sources.", fallback: "boundary" })
    case "profile": {
      const b = blockedReason("connect")
      if (b) return b
      if (s.connect.phase !== "done") return { reason: "Let me finish activating the energy layer first.", fallback: "connect" }
      const review = inBoundary(s).filter((x) => s.connect.siteStatus[x.id] === "needs-review")
      if (review.length) return { reason: `${review.map((r) => r.name).join(", ")} needs an ergOS feed chosen first.`, fallback: "connect" }
      return null
    }
    case "gaps":
      return blockedReason("profile") ?? (s.profileIntroDone ? null : { reason: "I'll check coverage once I understand your sites.", fallback: "profile" })
    case "plan":
      return blockedReason("gaps") ?? (s.analysis.phase === "done" && !s.analysis.stale ? null : { reason: s.analysis.stale ? "Something changed since the gap check. Let me re-check coverage." : "Let me finish the gap map first.", fallback: "gaps" })
  }
}

export function goTo(stage: Stage): boolean {
  const blocked = blockedReason(stage)
  if (blocked) {
    // Walk back to the earliest stage that is open.
    let target = blocked.fallback
    while (blockedReason(target)) target = blockedReason(target)!.fallback
    st().go(target)
    st().say(blocked.reason, "reply")
    if (target === "agent") st().setUi({ orgOpen: true })
    return false
  }
  st().go(stage)
  return true
}

export function stageReached(stage: Stage) {
  const s = st()
  return STAGES.indexOf(stage) <= STAGES.indexOf(s.maxStage)
}
