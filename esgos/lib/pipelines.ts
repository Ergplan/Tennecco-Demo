"use client"

// Pipelines: each scene's theatre is driven by these provider calls. Every
// animation reacts to a store change made here when a record resolves.

import { providers } from "@/esgos/providers"
import { setProspectRegistry } from "@/esgos/providers/registry.mock"
import type { RegistryNode } from "@/esgos/providers/types"
import { useStore } from "./store"
import { getClient } from "./clients"
import { shortCite } from "./clients/public"
import { isBoundaryExcluded, isPublicClient } from "./boundary"
import { narrate } from "./narration"
import { publicRecords } from "@/esgos/providers/public"
import { geocode, loadMaps, mapsConfigured, mapsFailure } from "@/esgos/providers/maps"
import { ENTITIES, PERIOD } from "./demoData"
import { getMode, wait } from "./mode"
import { engineContext, entitiesInBoundary, inBoundary, profileEstimate, profileOrder, sourceState } from "./selectors"
import { streamEvaluation } from "./gapEngine"
import { suppressedFor } from "./questionEngine"
import type { DataPoint, Site, SourceKey, Task } from "./types"
import { formatEstimate } from "./questionEngine"
import { TEMPLATES, getImports, type ImportKind } from "./imports"
import { filedMetric } from "./filed"
import { fmtNumber } from "./format"
import { ownerPerson } from "./org"
import { personLabel } from "./stakeholders"

const running = new Map<string, Promise<void>>()
async function once(key: string, fn: () => Promise<void>) {
  if (running.has(key)) return
  const p = fn()
  running.set(key, p)
  try {
    await p
  } finally {
    running.delete(key)
  }
}

// Wait for a running pipeline (e.g. narration still finishing) before starting it again.
async function whenIdle(key: string) {
  await running.get(key)?.catch(() => undefined)
}

const st = () => useStore.getState()

// ------------------------------------------------------------------ seed
export function runSeed() {
  return once("seed", async () => {
    const s = st()
    const client = getClient()
    if (s.seedMode === "default") {
      if (client.kind === "public") await runPublicSources()
      else await runSampleSources()
      if (st().seed.paste === "idle" && !st().seed.reconciled) await narrate("Anything else? Paste a site list, or tell me there's nothing more.")
    }
    if (st().seed.paste === "running" && st().seed.pasteText) await runPaste(st().seed.pasteText)
  })
}

async function runSampleSources() {
  const s = st()
  if (s.seed.ergos !== "done") {
    await narrate("I'll start from what we already know. First, the sites you meter on ergOS.")
    s.setSeed({ ergos: "running", ergosRecords: 0 })
    s.setSource("ergos", { status: "connected", syncState: "synced", connectedAt: new Date().toISOString(), coverageNote: "Group ergOS account" })
    for await (const rec of providers.ergos.streamSites(s.group.id)) st().addErgosRecord(rec)
    st().setSeed({ ergos: "done", ergosLocations: st().sites.length })
  }
  if (st().seed.gst !== "done") {
    await narrate("Next, GST registrations under the group's PANs.")
    st().setSeed({ gst: "running", gstRecords: 0 })
    for await (const p of providers.gst.streamPremises(st().group.pans)) st().addGstPremise(p)
    st().setSeed({ gst: "done" })
  }
}

async function runPublicSources() {
  const client = getClient()
  if (st().seed.registry !== "done") {
    await narrate(`I'll start from what ${client.name} has already filed. First, the company registry.`)
    st().setSeed({ registry: "running", registryRecords: 0 })
    for await (const site of publicRecords.streamRegistrySites()) st().addPublicSite(site, "registry")
    st().setSeed({ registry: "done" })
  }
  if (st().seed.brsr !== "done") {
    await narrate(client.preIpo ? client.preIpo.plantSources.narration : `Next, the plants listed in the ${client.lastBrsr?.fy ?? "latest"} BRSR and annual report.`)
    st().setSeed({ brsr: "running", brsrRecords: 0 })
    for await (const site of publicRecords.streamBrsrSites()) st().addPublicSite(site, "brsr")
    st().setSeed({ brsr: "done" })
  }
  if (client.publicGst.length && st().seed.gst !== "done") {
    await narrate(client.preIpo ? "Then GST registrations on public record, state by state." : "Then GST registrations on public record. They often name offices the BRSR doesn't list.")
    st().setSeed({ gst: "running", gstRecords: 0 })
    for await (const g of publicRecords.streamGst()) st().addPublicGst(g)
    st().setSeed({ gst: "done" })
  }
}

// Google Maps: geocode every site address so pins sit on the real premises.
// The user can skip it, and it stops if Google rejects the key, so it never blocks the footprint.
let mapsSkipped = false
export function skipMapsCheck() {
  mapsSkipped = true
}

export async function runMapsVerify() {
  mapsSkipped = false
  if (!mapsConfigured() || st().seed.maps === "done") {
    st().setSeed({ maps: mapsConfigured() ? "done" : "idle" })
    return
  }
  const ok = await loadMaps()
  if (!ok) {
    st().setSeed({ maps: "idle" })
    return
  }
  await narrate("Now I'll find each site on Google Maps.")
  st().setSeed({ maps: "running", mapsRecords: 0 })
  for (const site of st().sites.filter((x) => x.status !== "excluded" && !x.approximatePin)) {
    if (mapsSkipped || mapsFailure()) break
    const query = site.geoQuery ? `${site.geoQuery}, India` : [site.address, site.city, site.state, "India"].filter(Boolean).join(", ")
    const r = await geocode(query)
    if (r) st().applyGeocode(site.id, r)
    st().setSeed({ mapsRecords: st().seed.mapsRecords + 1 })
    await wait(900)
  }
  if (mapsSkipped || mapsFailure()) st().log("map check stopped", "Google Maps", undefined, mapsSkipped ? "skipped by user" : mapsFailure(), undefined, "esgOS agent")
  st().setSeed({ maps: "done" })
}

export function runPaste(text: string) {
  return once("paste", async () => {
    st().setSeed({ paste: "running", pasteText: text, pasteRecords: 0, pasteNew: 0 })
    await narrate("Reading your list.")
    for await (const parsed of providers.siteList.parse(text)) st().addParsedSite(parsed)
    st().setSeed({ paste: "done" })
    await runMapsVerify()
    await wait(300)
    reconcile()
  })
}

export function skipPaste() {
  return once("paste", async () => {
    st().setSeed({ paste: "done" })
    st().log("skip pasted list", "Seed", undefined, "no extra sites")
    await runMapsVerify()
    reconcile()
  })
}

export function reconcile() {
  const s = st()
  const total = s.sites.length
  const conflicts = s.sites.filter((x) => x.conflict && !x.conflict.resolved).length
  s.setSeed({ reconciled: true })
  s.log("reconcile", "Footprint", undefined, { locations: total, conflicts }, "Reconciliation complete", "esgOS agent")
  s.say(
    (conflicts
      ? `${total} locations, ${conflicts === 1 ? "one needs" : `${numberWord(conflicts)} need`} your confirmation.`
      : `${total} locations. Your footprint is mapped.`) + footprintNote(),
  )
}

// Public clients: compare what public records name with the counts in the filed BRSR.
export function footprintNote() {
  const client = getClient()
  const counts = client.lastBrsr?.counts
  if (client.preIpo) {
    const approx = st().sites.filter((x) => x.approximatePin && x.status !== "excluded").length
    return ` ${client.shortName} hasn't filed a BRSR yet, so there's no official plant count to check against.${approx ? ` ${approx === 1 ? "One plant" : `${numberWord(approx).replace(/^./, (c) => c.toUpperCase())} plants`} from your energy file ${approx === 1 ? "has" : "have"} no address on record; ${approx === 1 ? "its pin is" : "their pins are"} approximate.` : ""}`
  }
  if (client.kind !== "public" || !counts) return ""
  const s = st()
  const plants = s.sites.filter((x) => x.type === "factory" && x.entityHint === client.legalName).length
  const offices = s.sites.filter((x) => x.type !== "factory").length
  const missing = Math.max(0, (counts.plants ?? 0) - plants) + Math.max(0, (counts.offices ?? 0) - offices)
  if (!missing) return ""
  return ` The ${client.lastBrsr!.fy} BRSR counts ${counts.plants} plants and ${counts.offices} offices; public records name ${plants} and ${offices}. Import your site list for the rest.`
}

export function numberWord(n: number) {
  return ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n)
}

// -------------------------------------------------------------- boundary
export function runBoundary(reportingName: string) {
  return once("boundary", async () => {
    const s = st()
    if (!s.boundary.reportingChosen) s.chooseReportingEntity(reportingName)
    let holdingCin = ENTITIES.find((e) => e.name === reportingName)?.cin
    const client = getClient()
    if (client.kind === "public") {
      // The filed BRSR (Section A Q23) lists the group companies.
      const holding = client.publicEntities.find((e) => e.relationship === "holding")!
      setProspectRegistry(
        client.publicEntities.map((e) => ({
          entityId: e.id,
          name: e.name,
          shortName: e.shortName,
          cin: e.cin,
          pan: e.relationship === "holding" ? client.group.pans[0] : undefined,
          parentId: e.relationship === "holding" ? undefined : holding.id,
          relationship: e.relationship,
          holdingPct: e.holdingPct,
          note: e.note,
          aggregate: e.aggregate,
          members: e.members,
          sourceRef: client.lastBrsr ? `${client.lastBrsr.fy} BRSR Section A Q23${e.source.page ? `, ${e.source.page}` : ""}` : shortCite(e.source),
          document: e.source.url,
          period: client.lastBrsr?.fy ?? e.source.date,
        })),
      )
      holdingCin = holding.cin ?? holding.id
    } else if (!holdingCin) {
      // Live-prospect mode: build the registry response from the companies the user named.
      const companies = st().knownCompanies.length ? st().knownCompanies : [{ name: reportingName }]
      const holding = companies.find((c) => c.name === reportingName) ?? { name: reportingName }
      const nodes: RegistryNode[] = [
        { entityId: "ent-p-holding", name: holding.name, cin: "L00000XX2026PLC000001", relationship: "holding" },
        ...companies
          .filter((c) => c.name !== holding.name)
          .map((c, i) => ({
            entityId: `ent-p-${i}`,
            name: c.name,
            cin: `U00000XX2026PTC00000${i + 2}`,
            parentId: "ent-p-holding",
            relationship: "subsidiary" as const,
            holdingPct: 100,
          })),
      ]
      setProspectRegistry(nodes)
      holdingCin = "L00000XX2026PLC000001"
    }
    if (st().boundary.tree !== "done") {
      st().setBoundary({ tree: "running" })
      st().say(isPublicClient() ? (getClient().lastBrsr ? `Reading the group companies listed in the ${getClient().lastBrsr?.fy} BRSR.` : "Reading the group companies from MCA, court and rating-agency records.") : "Reading the group structure from MCA master data.")
      for await (const node of providers.mca.streamEntityTree(holdingCin)) st().addRegistryNode(node)
      st().setBoundary({ tree: "done" })
      await wait(400)
    }
    if (st().boundary.matching !== "done") {
      st().setBoundary({ matching: "running" })
      st().say(isPublicClient() ? "Placing each site under the company that owns it." : "Placing each site by its GSTIN.")
      for (const site of st().sites.filter((x) => x.status !== "excluded" || isBoundaryExcluded(x))) {
        if (site.legalEntityId) continue
        await wait(240)
        matchSiteToEntity(site)
      }
      st().setBoundary({ matching: "done" })
      const review = st().sites.filter((x) => x.status === "confirmed" && (!x.legalEntityId || x.entityReview))
      const jv = st().entities.find((e) => e.relationship === "jv" && st().sites.some((x) => x.legalEntityId === e.id))
      if (review.length) {
        const r = review[0]
        st().say(`${review.length === 1 ? r.name : review.length + " sites"} ${review.length === 1 ? "needs" : "need"} review. ${r.reviewNote ? "The filings disagree on who owns " + (review.length === 1 ? "it." : "them.") : r.entityReview ? "GST and the trade name disagree." : "I couldn't match an entity."}`)
      } else if (jv || isPublicClient()) {
        askJv()
      } else {
        maybeConfirmBoundary()
      }
    }
  })
}

function matchSiteToEntity(site: Site) {
  const s = st()
  const entities = s.entities
  if (site.entityReview) {
    s.log("needs review", site.name, undefined, "Needs review", "GSTIN entity conflicts with trade name", "esgOS agent")
    return
  }
  if (isPublicClient() && site.gstin) {
    const e = entities.find((x) => x.pan && x.pan === site.gstin!.slice(2, 12))
    if (e && (!site.entityHint || site.entityHint === e.name)) return s.assignSiteEntity(site.id, e.id, "gst")
  }
  if (site.entityHint) {
    const e = entities.find((x) => x.name.toLowerCase() === site.entityHint!.toLowerCase())
    if (e) return s.assignSiteEntity(site.id, e.id, isPublicClient() ? "filing" : "paste", isPublicClient() ? site.sourceNote : undefined)
  }
  if (site.gstin) {
    const pan = site.gstin.slice(2, 12)
    const e = entities.find((x) => x.pan === pan || x.gstins.some((g) => g.gstin === site.gstin))
    if (e) return s.assignSiteEntity(site.id, e.id, "gst")
  }
  const byState = entities.filter((x) => x.gstins.some((g) => g.state === site.state))
  if (byState.length === 1) {
    const g = byState[0].gstins.find((x) => x.state === site.state)!
    return s.assignSiteEntity(site.id, byState[0].id, "gst", `GSTIN ${g.gstin} (${site.state} registration)`)
  }
  if (getMode().seedMode === "paste" || s.seedMode === "paste") {
    const holding = entities.find((x) => x.relationship === "holding")
    if (holding) return s.assignSiteEntity(site.id, holding.id, "paste")
  }
}

export function askJv() {
  const s = st()
  if (isPublicClient()) {
    const client = getClient()
    const subs = s.sites.filter((x) => x.legalEntityId && s.entities.some((e) => e.id === x.legalEntityId && e.relationship !== "holding"))
    if (client.preIpo) {
      s.say(client.preIpo.boundaryQuestion)
      return
    }
    s.say(`${client.shortName} filed ${client.lastBrsr?.fy} on a standalone basis. Keep it standalone for ${s.group.fiscalYear}${subs.length ? `, or consolidate the ${subs.length === 1 ? "subsidiary site" : `${numberWord(subs.length)} subsidiary sites`}` : ""}?`)
    return
  }
  const jv = s.entities.find((e) => e.relationship === "jv")
  if (!jv) return
  const site = s.sites.find((x) => x.legalEntityId === jv.id)
  s.say(`${jv.name.replace(" Private Limited", "")} is a ${jv.holdingPct ?? 50}% JV. Include its ${site?.name ?? ""} ${site?.type ?? "site"} in this BRSR?`)
}

export function maybeConfirmBoundary() {
  const s = st()
  const review = s.sites.filter((x) => x.status === "confirmed" && (!x.legalEntityId || x.entityReview))
  const jvNeeded = isPublicClient() || s.entities.some((e) => e.relationship === "jv" && s.sites.some((x) => x.legalEntityId === e.id))
  if (s.boundary.matching !== "done" || review.length) return
  if (jvNeeded && !s.boundary.jvDecision) {
    askJv()
    return
  }
  s.confirmBoundary()
  s.say(boundaryStatement())
}

export function boundaryStatement() {
  const s = st()
  const sites = inBoundary(s)
  if (isPublicClient()) {
    const holding = s.entities.find((e) => e.relationship === "holding")
    const plants = sites.filter((x) => x.type === "factory").length
    const rest = sites.length - plants
    const subs = entitiesInBoundary(s).filter((e) => e.relationship !== "holding")
    const which = getClient().preIpo ? "The first BRSR" : "This BRSR"
    return s.boundary.jvDecision === "include"
      ? `${which} consolidates ${holding?.shortName ?? "the company"} and ${subs.length} ${subs.length === 1 ? "subsidiary" : "subsidiaries"}: ${plants} plants and ${rest} other sites.`
      : `${which} covers ${holding?.name ?? "the company"} on a standalone basis: ${plants} plants and ${rest} other sites.`
  }
  // Entities without sites (Aurelia Energy owns the solar, no factory) still sit in the boundary.
  const consolidated = s.entities.filter((e) => e.relationship !== "jv" && e.relationship !== "associate" ? true : s.boundary.jvDecision === "include")
  const subs = consolidated
    .filter((e) => e.relationship !== "holding")
    .map((e, i) => {
      const name = e.shortName.replace(/ (Pvt|Ltd|JV)$/, "")
      const pct = s.reportingEntity?.consolidation[e.id] ?? e.holdingPct ?? 100
      return i === 0 ? `${name} consolidated at ${pct}%` : `${name} at ${pct}%`
    })
  return `This BRSR covers ${consolidated.length} ${consolidated.length === 1 ? "entity" : "entities"} and ${sites.length} sites.${subs.length ? " " + subs.join(", ") + "." : ""}`
}

// --------------------------------------------------------------- connect
export function runConnect() {
  return once("connect", async () => {
    const s = st()
    // Sites added after activation (for example an included JV warehouse) still get matched.
    const unmatched = inBoundary(s).filter((x) => !s.connect.siteStatus[x.id])
    if (s.connect.phase === "done" && !unmatched.length) return
    const before = profileEstimate(st())
    s.setConnect({ phase: "running" })
    if (isPublicClient() && !getImports().energy.length) {
      await connectPublicWithoutErgos()
      return
    }
    const fileLabel = getImports().energy.find((r) => r.label)?.label
    if (s.sources.ergos.status !== "connected") {
      s.setSource("ergos", { status: "connected", syncState: "synced", connectedAt: new Date().toISOString(), coverageNote: fileLabel ?? "Group ergOS account" })
    }
    const sites = profileOrder(st())
    const queue = sites.filter((x) => !["connected", "not-found", "needs-review"].includes(st().connect.siteStatus[x.id] ?? ""))
    const worker = async () => {
      while (queue.length) {
        const site = queue.shift()!
        await connectSite(site.id)
      }
    }
    await Promise.all([worker(), worker(), worker()])
    st().setConnect({ phase: "done" })
    const coverage = inBoundary(st()).filter((x) => st().connect.siteStatus[x.id] === "connected").map((x) => x.id)
    st().setSource("ergos", { coverage, coverageNote: fileLabel ? `${coverage.length} plants from ${fileLabel}` : `${coverage.length} metered sites` })
    const after = profileEstimate(st())
    if (before.questions > after.questions) st().recordDrop("ergOS meters validated", before.questions - after.questions, before.seconds, after.seconds)
    const review = inBoundary(st()).filter((x) => st().connect.siteStatus[x.id] === "needs-review")
    if (fileLabel) {
      const estimated = coverage.filter((id) => (st().energy[id]?.completeness ?? 1) < 0.9).length
      st().say(
        `${coverage.length} ${coverage.length === 1 ? "plant" : "plants"} read from ${fileLabel}. ${estimated ? `${estimated} of them are mostly estimates, not readings; I've flagged each one.` : "Every plant is from readings."}`,
      )
      return
    }
    st().say(
      review.length
        ? `${coverage.length} ${coverage.length === 1 ? "site" : "sites"} connected. ${review.map((r) => r.name).join(", ")} ${review.length === 1 ? "needs" : "need"} review.`
        : `${coverage.length} ${coverage.length === 1 ? "site" : "sites"} connected. The energy layer is live.`,
    )
  })
}

// After an ergOS export is imported: match the sites that were not on ergOS again.
export async function reconnectErgos() {
  await whenIdle("connect")
  const retry = Object.entries(st().connect.siteStatus).filter(([, v]) => v === "not-found").map(([k]) => k)
  useStore.setState((x) => ({ connect: { ...x.connect, phase: "idle", siteStatus: Object.fromEntries(Object.entries(x.connect.siteStatus).filter(([k]) => !retry.includes(k))) } }))
  await runConnect()
}

// An uploaded file connects (or refreshes) the source it stands in for.
export async function refreshFromImport(kind: ImportKind) {
  if (kind === "energy") return reconnectErgos()
  const key = (Object.keys(SOURCE_IMPORT) as SourceKey[]).find((k) => SOURCE_IMPORT[k] === kind)
  if (!key || key === "ergos") return
  await whenIdle(`source-${key}`)
  st().setSource(key, { status: "not_connected" })
  await connectSource(key)
}

// A listed client that isn't on ergOS: the filed BRSR has company totals only,
// so every plant starts unmetered and the profile asks the plant instead.
async function connectPublicWithoutErgos() {
  const client = getClient()
  for (const site of profileOrder(st())) {
    st().setErgosLink(site.id, "connecting")
    await wait(160)
    st().setErgosLink(site.id, "not-found")
  }
  st().setSource("ergos", { status: "not_connected", coverage: [], coverageNote: "No ergOS account linked" })
  st().setConnect({ phase: "done" })
  st().log("ergOS match", client.name, undefined, "no ergOS account", "Plant-level energy is not public", "esgOS agent")
  const total = filedMetric("p6.e1.total")
  await narrate(
    client.lastBrsr
      ? `${client.shortName} isn't on ergOS yet. The ${client.lastBrsr.fy} BRSR gives energy for the company only${total ? `: ${fmtNumber(total.value as number)} GJ` : ""}, not by plant.`
      : `${client.shortName} isn't on ergOS yet, and with no BRSR filed there's no public energy figure.`,
  )
  st().say("Import an ergOS export, or continue and I'll ask each plant.")
}

export async function connectSite(siteId: string) {
  const s = st()
  const site = s.sites.find((x) => x.id === siteId)
  if (!site) return
  s.setErgosLink(siteId, "connecting")
  const match = await providers.ergos.matchSite(site)
  if (match.status === "needs-review") {
    st().setErgosLink(siteId, "needs-review")
    st().log("ergOS match", site.name, undefined, "needs review", `${match.candidates.length} candidates`, "esgOS agent")
    return
  }
  if (match.status === "not-found") {
    st().setErgosLink(siteId, "not-found")
    st().log("ergOS match", site.name, undefined, "not on ergOS", undefined, "esgOS agent")
    return
  }
  const ergosSiteId = match.candidates[0].ergosSiteId
  if (site.ergosSiteId !== ergosSiteId) {
    useStore.setState((x) => ({ sites: x.sites.map((y) => (y.id === siteId ? { ...y, ergosSiteId } : y)) }))
  }
  st().setErgosLink(siteId, "connected")
  st().log("ergOS match", site.name, undefined, "connected", ergosSiteId, "esgOS agent")
  for await (const meter of providers.ergos.streamMeters(ergosSiteId)) st().addValidatedMeter(siteId, meter)
  const e = await providers.ergos.energySummary(ergosSiteId, s.group.fiscalYear)
  st().setEnergy(siteId, { ...e, siteId })
}

export async function resolveErgosCandidate(siteId: string, ergosSiteId: string) {
  const before = profileEstimate(st())
  st().chooseErgosCandidate(siteId, ergosSiteId)
  await connectSite(siteId)
  const after = profileEstimate(st())
  const site = st().sites.find((x) => x.id === siteId)
  if (before.questions !== after.questions) st().recordDrop(`${site?.name} meters validated`, before.questions - after.questions, before.seconds, after.seconds)
  const coverage = inBoundary(st()).filter((x) => st().connect.siteStatus[x.id] === "connected").map((x) => x.id)
  st().setSource("ergos", { coverage, coverageNote: `${coverage.length} metered sites` })
  st().say(`${site?.name} connected through ${ergosSiteId}.`)
}

const SOURCE_LABEL: Record<SourceKey, string> = { ergos: "ergOS", hrms: "HRMS", erp: "ERP", ehs: "EHS", vault: "Vault" }

// The import that stands in for each source when there is no live connection.
export const SOURCE_IMPORT: Record<SourceKey, ImportKind> = { ergos: "energy", hrms: "headcount", erp: "erp", ehs: "ehs", vault: "documents" }

export function connectSource(key: Exclude<SourceKey, "ergos">) {
  return once(`source-${key}`, async () => {
    const s = st()
    if (s.sources[key].status === "connected" || s.sources[key].status === "partial") {
      s.say(`${SOURCE_LABEL[key]} is already connected.`, "reply")
      return
    }
    const before = profileEstimate(s)
    s.setSource(key, { status: "connecting" })
    const sites = inBoundary(st())
    let coverage: string[] = []
    let note = ""
    let synced = false
    if (key === "hrms") {
      const r = await providers.hrms.connect(sites, st().entities)
      st().applyHrms(r.coverage, r.note)
      coverage = r.coverage.map((c) => c.siteId)
      note = r.note
    } else if (key === "erp") {
      const r = await providers.erp.connect(sites)
      st().applyErp(r.productMaster, r.fuelPurchases, r.note)
      coverage = r.fuelPurchases.map((c) => c.siteId)
      note = r.note
    } else if (key === "ehs") {
      const r = await providers.ehs.connect(sites)
      st().applyEhs(r.registers, r.note)
      coverage = r.registers.map((c) => c.siteId)
      note = r.note
    } else if (key === "vault") {
      const r = await providers.vault.connect(sites)
      st().applyVault(r.documents, r.note)
      coverage = [...new Set(r.documents.map((d) => d.siteId).filter(Boolean) as string[])]
      note = r.note
      synced = true
    }
    if (getClient().kind === "public" && !coverage.length) {
      st().setSource(key, { status: "not_connected" })
      const kind = SOURCE_IMPORT[key]
      const rows = (getImports() as unknown as Record<string, unknown[]>)[kind] ?? []
      if (rows.length) {
        st().say(`None of the ${rows.length} rows in your ${TEMPLATES[kind].title.toLowerCase()} file matched a site. Use the site names from the footprint.`, "reply")
        return
      }
      st().say(`No ${SOURCE_LABEL[key]} data for ${getClient().name} yet. Upload the ${TEMPLATES[kind].title.toLowerCase()} file and I'll connect it.`, "reply")
      st().setUi({ importOpen: true, importKind: kind })
      return
    }
    const partial = key !== "vault" && coverage.length < sites.filter((x) => (key === "hrms" ? true : x.type === "factory")).length
    st().setSource(key, {
      status: partial ? "partial" : "connected",
      coverage,
      coverageNote: note,
      syncState: synced ? "synced" : "pending",
      connectedAt: new Date().toISOString(),
    })
    const after = profileEstimate(st())
    const removed = before.questions - after.questions
    st().recordDrop(`${SOURCE_LABEL[key]} connected`, removed, before.seconds, after.seconds)
    st().say(
      removed > 0
        ? `${SOURCE_LABEL[key]} connected: ${removed} question${removed === 1 ? "" : "s"} removed. ${formatEstimate(after.seconds)}.`
        : `${SOURCE_LABEL[key]} connected. ${note}.`,
    )
  })
}

// --------------------------------------------------------------- profile
export function recordKnownItems(site: Site) {
  const s = st()
  const ss = sourceState(s, site)
  const dps: DataPoint[] = suppressedFor(site, ss).map(({ question, inferred }) => ({
    id: `dp:${site.id}:q:${question.id}`,
    indicator: question.unlocks[0] ?? "context",
    label: inferred.label,
    questionId: question.id,
    scope: { siteId: site.id },
    value: inferred.value,
    period: PERIOD,
    source: inferred.source,
    sourceRef: inferred.ref,
    evidenceState: "linked",
    syncState: inferred.source === "ergos" || inferred.source === "vault" ? "synced" : "pending",
    note: `Question "${question.id}" not asked: answered by ${inferred.ref}`,
    mode: inferred.source === "brsr" ? "public" : "mock",
  }))
  if (dps.length) s.recordInferred(site.id, dps)
}

// -------------------------------------------------------------- analysis
export const ANALYSIS_STEPS = [
  "Checking boundary…",
  "Matching indicators in scope…",
  "Checking connected sources…",
  "Checking evidence…",
  "Building gap map…",
]

export function runAnalysis() {
  return once("analysis", async () => {
    const s = st()
    s.setAnalysis({ phase: "running", stale: false, results: [] })
    s.say("Checking boundary…")
    const ctx = engineContext(st())
    await wait(500)
    for await (const { result, index, final } of streamEvaluation(ctx, 85)) {
      st().pushResult(result)
      const step = Math.min(ANALYSIS_STEPS.length - 1, Math.floor(((index + 1) / 48) * ANALYSIS_STEPS.length))
      if (st().agent.text !== ANALYSIS_STEPS[step] && index < 47) st().say(ANALYSIS_STEPS[step])
      if (final) {
        await wait(500)
        st().finishAnalysis(final)
        st().say(
          `Of ${final.counts.total} indicators in scope: ${final.counts.now} producible now, ${final.counts.sync} after sources sync, ${final.counts.open} open.`,
        )
      }
    }
  })
}

// ------------------------------------------------------------------ plan
export function buildCollectionTasks(): Task[] {
  const s = st()
  const tasks: Task[] = []
  const due = (days: number) => {
    const d = new Date("2026-10-04T00:00:00")
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }
  for (const g of s.gaps) {
    if (g.resolution === "automatic") continue
    const covered = s.tasks.some((t) => t.status === "open" && t.siteId && t.siteId === g.scope.siteId && g.blocks.includes(t.indicator))
    if (covered) continue
    const site = g.scope.siteId ? s.sites.find((x) => x.id === g.scope.siteId) : undefined
    const person = ownerPerson(g.ownerRole, g.scope.siteId, s.stakeholders)
    tasks.push({
      id: `task-plan-${g.id}`,
      siteId: g.scope.siteId,
      entityId: g.scope.entityId,
      question: g.nextStep,
      indicator: g.indicator,
      ownerRole: person ? personLabel(person) : site ? `${g.ownerRole}, ${site.name}`.replace(/, ([^,]+), \1$/, ", $1") : g.ownerRole,
      assignee: person ? { stakeholderId: person.id, name: person.name, role: person.role, email: person.email } : undefined,
      due: due(g.resolution === "management" ? 45 : 21),
      status: "open",
      createdAt: new Date().toISOString(),
      origin: "plan",
    })
  }
  return tasks
}

export function issuePlan() {
  const tasks = buildCollectionTasks()
  st().issuePlan(tasks)
  const owners = new Set(tasks.map((t) => t.ownerRole))
  st().say(`Collection plan issued: ${tasks.length} requests to ${owners.size} owners. Automatic fixes are queued.`)
}

export function gotoProfileSite(siteId: string) {
  st().setActiveProfileSite(siteId)
}

export function nextProfileSite(afterId?: string): string | undefined {
  const s = st()
  const order = profileOrder(s)
  const idx = afterId ? order.findIndex((x) => x.id === afterId) : -1
  const rest = [...order.slice(idx + 1), ...order.slice(0, Math.max(0, idx + 1))]
  return rest.find((x) => {
    const p = s.profiles[x.id]
    return !p || (p.status !== "done" && p.status !== "skipped")
  })?.id
}
