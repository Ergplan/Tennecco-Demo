"use client"

// Keyword-based command interpreter (no LLM). Each command maps to the same
// store actions and pipelines the UI uses.

import { useStore } from "./store"
import { goTo } from "./navigation"
import { connectSource, gotoProfileSite, maybeConfirmBoundary } from "./pipelines"
import { inBoundary, profileEstimate, sourceState } from "./selectors"
import { formatEstimate, pendingQuestions, planCopy, QUESTION_BY_ID } from "./questionEngine"
import type { Site, SiteType, SourceKey } from "./types"

export type CommandOutcome = { handled: boolean; reply?: string }

export const SUPPORTED_COMMANDS = [
  "Find my footprint",
  "Go back to Noida",
  "Move Pune to Aurelia Foods",
  "Exclude Jaipur",
  "Include Kolkata",
  "Show only offices",
  "Which sites aren't connected?",
  "Connect HRMS",
  "Skip this site",
  "Use the same answers as Noida",
  "What's left?",
  "How much time is remaining?",
  "Show gaps for Pune",
  "Show provenance for Noida electricity",
  "Restart demo",
]

const st = () => useStore.getState()

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function findSite(text: string, sites = st().sites): Site | undefined {
  const t = ` ${norm(text)} `
  const candidates = sites
    .flatMap((s) => [s.name, s.city].filter(Boolean).map((n) => ({ s, n: norm(n) })))
    .sort((a, b) => b.n.length - a.n.length)
  return candidates.find(({ n }) => n && t.includes(` ${n} `))?.s
}

function findEntity(text: string) {
  const t = norm(text)
  const entities = st().entities
  return (
    entities.find((e) => t.includes(norm(e.name))) ??
    entities.find((e) => t.includes(norm(e.shortName))) ??
    entities.find((e) =>
      norm(e.name)
        .split(" ")
        .filter((w) => w.length > 3 && !["aurelia", "private", "limited", "tenneco", "india", "federal", "mogul"].includes(w))
        .some((w) => t.includes(w)),
    )
  )
}

function say(text: string) {
  st().say(text, "reply")
  return { handled: true, reply: text }
}

function listNames(sites: Site[]) {
  const names = sites.map((s) => s.name)
  if (names.length <= 1) return names.join("")
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

const SOURCE_WORDS: Record<string, Exclude<SourceKey, "ergos">> = {
  hrms: "hrms",
  hr: "hrms",
  payroll: "hrms",
  erp: "erp",
  sap: "erp",
  ehs: "ehs",
  safety: "ehs",
  vault: "vault",
  documents: "vault",
  document: "vault",
}

export function runCommand(input: string): CommandOutcome {
  const raw = input.trim()
  if (!raw) return { handled: false }
  const t = norm(raw)
  const s = st()
  s.log("command", "Command bar", undefined, raw)

  // Restart
  if (/\b(restart|reset|start over)\b/.test(t)) {
    s.reset()
    return say("Restarted with seeded data. What's on your mind today?")
  }

  // Help
  if (/^(help|what can (i|you) (say|do)|commands)/.test(t)) {
    return say(`Try “${SUPPORTED_COMMANDS[3]}”, “${SUPPORTED_COMMANDS[6]}” or “${SUPPORTED_COMMANDS[12]}”.`)
  }

  // Journey chips
  if (/\b(find|map|show) (my )?footprint\b/.test(t) || t === "footprint") {
    goTo("seed")
    return { handled: true }
  }
  if (/\b(set )?(my )?reporting boundary\b/.test(t)) {
    goTo("boundary")
    return { handled: true }
  }
  if (/\b(connect|activate) ergos\b|energy layer/.test(t)) {
    goTo("connect")
    return { handled: true }
  }
  if (/\b(check )?(my )?brsr coverage\b/.test(t)) {
    goTo("gaps")
    return { handled: true }
  }

  // Provenance
  if (/\bprovenance\b|\bwhere (does|did) .* come from\b|\bsource of\b/.test(t)) {
    const site = findSite(t)
    const metric = /renewable/.test(t)
      ? "elec.re"
      : /water/.test(t)
        ? "water"
        : /steam/.test(t)
          ? "steam"
          : /diesel|dg/.test(t)
            ? "dg"
            : /headcount|people|employees/.test(t)
              ? "headcount"
              : /entity|company/.test(t)
                ? "entity"
                : /location|address/.test(t)
                  ? "location"
                  : /permit|cto/.test(t)
                    ? "permit"
                    : "elec.annual"
    if (!site) return say("Which site? Try “Show provenance for Noida electricity”.")
    const dp =
      metric === "permit"
        ? s.dataPoints.find((d) => d.scope.siteId === site.id && d.indicator === "P6.E13")
        : s.dataPoints.find((d) => d.id === `dp:${site.id}:${metric}`)
    if (!dp) return say(`I don't have a ${metric === "elec.annual" ? "metered electricity" : metric} value for ${site.name} yet${metric === "elec.annual" ? " — it isn't connected to ergOS" : ""}.`)
    s.setUi({ provenance: dp })
    return say(`Here's where ${site.name}'s ${dp.label?.toLowerCase() ?? "value"} comes from.`)
  }

  // Gaps for a site
  if (/\bgaps?\b/.test(t) && /\b(for|at|in)\b/.test(t)) {
    const site = findSite(t)
    if (!site) return say("Which site? Try “Show gaps for Pune”.")
    if (s.analysis.phase !== "done") {
      goTo("gaps")
      return say(`I'll show ${site.name}'s gaps once the gap map is built.`)
    }
    s.go("gaps")
    s.setUi({ gapSiteFilter: site.id, showAllGaps: true })
    const own = s.gaps.filter((g) => g.scope.siteId === site.id).length
    const viaEntity = s.gaps.filter((g) => g.scope.entityId && g.scope.entityId === site.legalEntityId)
    const entity = s.entities.find((e) => e.id === site.legalEntityId)
    const parts = [own ? `${own} at the site` : "none at the site itself"]
    if (viaEntity.length) parts.push(`${viaEntity.length} through ${entity?.name ?? "its entity"}`)
    return say(`${site.name}: ${parts.join(", ")}.`)
  }

  // Move site to entity
  const move = t.match(/^(move|assign|put) (.+?) (to|under|into) (.+)$/)
  if (move) {
    const site = findSite(move[2])
    const entity = findEntity(move[4])
    if (!s.entities.length) return say("I'll know the group's entities once the reporting boundary is set.")
    if (!site) return say("Which site? Try “Move Pune to Aurelia Foods”.")
    if (!entity) return say(`Which company? ${s.entities.map((e) => e.shortName).join(", ")}.`)
    s.assignSiteEntity(site.id, entity.id, "owner")
    if (s.stage === "boundary") maybeConfirmBoundary()
    return say(`${site.name} now sits under ${entity.name}.`)
  }

  // Exclude / include
  const ex = t.match(/^(exclude|remove|drop) (.+)$/)
  if (ex) {
    const site = findSite(ex[2])
    if (!site) return say("Which site? Try “Exclude Jaipur”.")
    s.excludeSite(site.id, "Excluded by owner")
    return say(`${site.name} is out of the footprint. Say “Include ${site.name}” to bring it back.`)
  }
  const inc = t.match(/^(include|add back|restore) (.+)$/)
  if (inc) {
    const site = findSite(inc[2])
    if (!site) return say("Which site? Try “Include Kolkata”.")
    const jv = s.entities.find((e) => e.id === site.legalEntityId && e.relationship === "jv")
    if (jv) {
      s.setJvDecision("include")
      if (s.boundary.matching === "done") maybeConfirmBoundary()
      return say(`${site.name} is in. ${jv.shortName.replace(/ JV$/, "")} is consolidated at ${jv.holdingPct ?? 50}%.`)
    }
    s.includeSite(site.id)
    return say(`${site.name} is back in the footprint.`)
  }

  // Filters
  const only = t.match(/\bshow only (offices|office|factories|factory|plants|warehouses|warehouse)\b/)
  if (only) {
    const type: SiteType = /office/.test(only[1]) ? "office" : /warehouse/.test(only[1]) ? "warehouse" : "factory"
    s.setUi({ siteFilter: type })
    const n = s.sites.filter((x) => x.type === type && x.status !== "excluded").length
    return say(`Showing ${n} ${type === "factory" ? "factories" : type + "s"}. Say “Show all sites” to clear.`)
  }
  if (/\bshow (all|everything)\b|clear filter/.test(t)) {
    s.setUi({ siteFilter: null, gapSiteFilter: null })
    return say("Showing every site.")
  }

  // Not connected
  if (/(arent|not|isnt|un) ?connected|which sites.*connect/.test(t)) {
    const sites = inBoundary(s)
    if (s.connect.phase === "idle") return say(`I haven't activated the ergOS layer yet. ${sites.length} sites are waiting.`)
    const missing = sites.filter((x) => s.connect.siteStatus[x.id] !== "connected")
    if (!missing.length) return say("Every site in the boundary is connected to ergOS.")
    return say(`${listNames(missing)} ${missing.length === 1 ? "isn't" : "aren't"} on ergOS yet.`)
  }

  // Connect a source
  const conn = t.match(/^(connect|link|sync) (\w+)/)
  if (conn) {
    const key = SOURCE_WORDS[conn[2]]
    if (!key) return say("I can connect HRMS, ERP, EHS or the document vault.")
    if (!s.boundary.confirmed) return say("Let's set the reporting boundary first, then I'll connect sources.")
    if (s.stage !== "connect" && s.stage !== "profile") s.go("connect")
    void connectSource(key)
    return { handled: true }
  }

  // Profile commands
  if (/\bskip (this )?site\b/.test(t)) {
    if (s.stage !== "profile" || !s.activeProfileSite) return say("Skipping works while I'm profiling a site.")
    window.dispatchEvent(new CustomEvent("esgos:skip-site"))
    return { handled: true }
  }
  const same = t.match(/\b(same answers as|copy (from|answers from)|reuse) (.+)$/)
  if (same) {
    const from = findSite(same[3])
    const siteId = s.activeProfileSite
    if (s.stage !== "profile" || !siteId) return say("That works while I'm profiling a site.")
    if (!from) return say("Which site should I copy? Try “Use the same answers as Noida”.")
    const target = s.sites.find((x) => x.id === siteId)!
    if (s.profiles[from.id]?.status !== "done") return say(`${from.name} isn't profiled yet.`)
    if (from.type !== target.type) return say(`${from.name} is a ${from.type}; ${target.name} is a ${target.type}. I'll ask instead.`)
    const ctx = (x: Site) => ({ site: x, state: sourceState(s, x), profile: s.profiles[x.id], entityId: x.legalEntityId })
    const plan = planCopy(ctx(target), ctx(from))
    s.acceptCopy(target.id, from.id, plan.copy)
    return say(`Reused ${from.name}'s answers. ${plan.ask.length ? `${plan.ask.length} question${plan.ask.length === 1 ? "" : "s"} differ.` : "Nothing differs."}`)
  }
  const goBack = t.match(/^(go back to|back to|go to|open|show) (.+)$/)
  if (goBack) {
    const site = findSite(goBack[2])
    if (site) {
      if (s.profileIntroDone && site.status === "confirmed") {
        s.go("profile")
        gotoProfileSite(site.id)
        return say(`Back at ${site.name}.`)
      }
      s.setUi({ focusSiteId: site.id })
      return say(`Here's ${site.name}.`)
    }
  }

  // What's left / time remaining
  if (/\bwhats left\b|\bwhat is left\b|\bremaining\b.*\b(sites|questions)\b|\bto do\b/.test(t)) {
    return say(whatsLeft())
  }
  if (/\b(how much|how long).*(time|left|remaining)|time remaining/.test(t)) {
    const e = profileEstimate(s)
    if (!s.boundary.confirmed) return say("Once the boundary is set I'll estimate the questions left.")
    return say(e.questions ? `${formatEstimate(e.seconds)} across ${e.sites} site${e.sites === 1 ? "" : "s"}.` : "Almost done. No questions are left.")
  }

  // Unrecognised: nearest supported command by word overlap
  const words = new Set(t.split(" "))
  let best = SUPPORTED_COMMANDS[0]
  let bestScore = -1
  for (const c of SUPPORTED_COMMANDS) {
    const cw = norm(c).split(" ")
    const score = cw.filter((w) => words.has(w)).length / cw.length
    if (score > bestScore) {
      best = c
      bestScore = score
    }
  }
  return say(`I didn't catch that. Try “${best}”.`)
}

export function whatsLeft(): string {
  const s = st()
  const conflicts = s.sites.filter((x) => x.conflict && !x.conflict.resolved && x.status !== "excluded")
  if (!s.seed.reconciled) return "First, your footprint. Say “Find my footprint”."
  if (conflicts.length) return `${listNames(conflicts)} ${conflicts.length === 1 ? "needs" : "need"} your confirmation.`
  if (!s.boundary.confirmed) return "The reporting boundary is next."
  if (s.connect.phase !== "done") return "Activating the ergOS energy layer is next."
  const sites = inBoundary(s)
  const left = sites.filter((x) => {
    const p = s.profiles[x.id]
    return !p || (p.status !== "done" && p.status !== "skipped")
  })
  if (left.length) {
    const active = s.activeProfileSite ? s.sites.find((x) => x.id === s.activeProfileSite) : undefined
    const q = active ? pendingQuestions(active, sourceState(s, active), s.profiles[active.id]?.answers ?? {}) : []
    const e = profileEstimate(s)
    return `${left.length} site${left.length === 1 ? "" : "s"} to understand${q.length && active ? `, ${q.length} question${q.length === 1 ? "" : "s"} at ${active.name}` : ""}. ${formatEstimate(e.seconds)}.`
  }
  if (s.analysis.phase !== "done") return "Every site is understood. The gap map is next."
  const g = s.analysis.gapCounts ?? { total: 0, automatic: 0, dataOrDocument: 0, management: 0 }
  return `${g.total} gaps: ${g.automatic} automatic, ${g.dataOrDocument} need data or documents, ${g.management} need management. ${s.tasks.filter((x) => x.status === "open").length} tasks are with owners.`
}

export function questionText(id: string, site: Site) {
  return QUESTION_BY_ID[id]?.text(site) ?? id
}
