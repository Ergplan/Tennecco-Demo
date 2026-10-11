// Transparent gap rule engine. For each indicator in scope, every required
// input is resolved per scope unit (group, entity or site):
//   now  — a DataPoint from a connected, synced source or a confirmed answer
//   sync — covered by a source that is connected but partial or pending sync
//   open — no source; a Gap is emitted naming the indicator(s) it blocks
// There is deliberately no composite score.

import type {
  AnswerValue,
  DocumentRecord,
  FiledEvidence,
  Gap,
  GapResolution,
  IndicatorResult,
  IndicatorStatus,
  IndicatorWeight,
  InputCoverage,
  LegalEntity,
  Site,
  SourceConnection,
  SourceKey,
} from "./types"
import { NOT_SURE } from "./types"
import { INDICATORS, INDICATOR_BY_ID, indicatorRef, type Indicator } from "./indicators"
import { QUESTION_BY_ID, type Answers, type SourceState } from "./questionEngine"
import { wait } from "./mode"

export const GAP_RULES_VERSION = "gap-rules v1.2"

export type EngineContext = {
  // Inputs already evidenced by the client's filed BRSR (public clients).
  filed?: Partial<Record<string, FiledEvidence>>
  reportingEntityId?: string
  boundaryConfirmed: boolean
  entities: LegalEntity[]
  sites: Site[]
  sources: Record<SourceKey, SourceConnection>
  documents: DocumentRecord[]
  states: Record<string, SourceState>
  answers: Record<string, Answers> // effective: owner answers plus source-inferred values
  ownerAnswers: Record<string, Answers>
  completeness: Record<string, number>
  // Energy from a client's own file instead of ergOS: the file label and how gaps were filled.
  energyFile?: Record<string, { label: string; basis?: string }>
  ergosLinked: Record<string, boolean>
  erpPlantCodes: Record<string, string>
  hrmsCoverage: Record<string, boolean>
}

type GapSpec = {
  key: string
  resolution: GapResolution
  ownerRole: string
  finding: string
  nextStep: string
  missingInput: string
  scope: { siteId?: string; entityId?: string }
  scopeLabel: string
  weight?: IndicatorWeight
  note?: string
}

type Resolution = { status: IndicatorStatus; via: string; gap?: GapSpec } | null

type Unit =
  | { kind: "group"; label: string }
  | { kind: "entity"; entity: LegalEntity; label: string }
  | { kind: "site"; site: Site; label: string }

type InputDef = {
  id: string
  label: string
  scope: "group" | "entity" | "site"
  satisfiedBy: string
  resolve: (ctx: EngineContext, unit: Unit) => Resolution
}

const connected = (ctx: EngineContext, k: SourceKey) => ctx.sources[k]?.status === "connected" || ctx.sources[k]?.status === "partial"
const pending = (ctx: EngineContext, k: SourceKey) => ctx.sources[k]?.syncState === "pending"
const hasDoc = (ctx: EngineContext, pred: (d: DocumentRecord) => boolean) => connected(ctx, "vault") && ctx.documents.some(pred)
const topicDoc = (re: RegExp) => (d: DocumentRecord) => re.test(d.topic) || re.test(d.name)
const ans = (ctx: EngineContext, site: Site, q: string): AnswerValue | undefined => ctx.answers[site.id]?.[q]
const has = (v: AnswerValue | undefined, x: string) => Array.isArray(v) && v.includes(x)
const ownerVia = (q: string) => `Owner answer (${QUESTION_BY_ID[q]?.id ?? q})`

function unanswered(site: Site, q: string, input: string): Resolution {
  const question = QUESTION_BY_ID[q]
  const what = question ? lowerFirst(question.text(site)).replace(/\?$/, "") : q
  return {
    status: "open",
    via: "Awaiting site owner",
    gap: {
      key: `${site.id}:${input}:pending`,
      resolution: "data",
      ownerRole: site.ownerRole ?? "Site owner",
      finding: `not answered yet: ${what}.`,
      nextStep: "the site owner answering the open question",
      missingInput: input,
      scope: { siteId: site.id },
      scopeLabel: site.name,
    },
  }
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function notSureGap(site: Site, q: string, input: string, resolution: GapResolution, finding: string, nextStep: string, role?: string): Resolution {
  return {
    status: "open",
    via: "Owner not sure — task sent",
    gap: {
      key: `${site.id}:${input}:notsure`,
      resolution,
      ownerRole: role ?? site.ownerRole ?? "Site owner",
      finding,
      nextStep,
      missingInput: input,
      scope: { siteId: site.id },
      scopeLabel: site.name,
    },
  }
}

function groupDocInput(id: string, label: string, re: RegExp, resolution: GapResolution, finding: string, nextStep: string, ownerRole: string, weight?: IndicatorWeight): InputDef {
  return {
    id,
    label,
    scope: "group",
    satisfiedBy: "Document vault",
    resolve: (ctx) => {
      if (hasDoc(ctx, topicDoc(re))) {
        const doc = ctx.documents.find(topicDoc(re))!
        return { status: "now", via: `Vault: ${doc.name}` }
      }
      const filed = ctx.filed?.[id]
      if (filed && filed.status !== "open") return { status: filed.status, via: `Filed BRSR: ${filed.via}` }
      if (filed) {
        return {
          status: "open",
          via: filed.via,
          gap: { key: `group:${id}`, resolution, ownerRole: filed.ownerRole ?? ownerRole, finding: filed.finding ?? finding, nextStep: filed.nextStep ?? nextStep, missingInput: id, scope: {}, scopeLabel: "Group", weight },
        }
      }
      if (!connected(ctx, "vault") && resolution !== "management") {
        return {
          status: "open",
          via: "Vault not connected",
          gap: { key: "group:vault", resolution: "automatic", ownerRole: "IT", finding: "Document vault not connected.", nextStep: "connecting the document vault", missingInput: "vault", scope: {}, scopeLabel: "Group" },
        }
      }
      return {
        status: "open",
        via: "No document on file",
        gap: { key: `group:${id}`, resolution, ownerRole, finding, nextStep, missingInput: id, scope: {}, scopeLabel: "Group", weight },
      }
    },
  }
}

function erpGroupInput(id: string, label: string, module: string): InputDef {
  return {
    id,
    label,
    scope: "group",
    satisfiedBy: `ERP (${module})`,
    resolve: (ctx) => {
      if (connected(ctx, "erp")) return { status: pending(ctx, "erp") ? "sync" : "now", via: `ERP ${module}${pending(ctx, "erp") ? " (first full sync pending)" : ""}` }
      return {
        status: "open",
        via: "ERP not connected",
        gap: { key: "group:erp", resolution: "automatic", ownerRole: "ERP team", finding: "ERP not connected, so finance, payroll and quality data have no source.", nextStep: "connecting the ERP read-only extract", missingInput: "erp", scope: {}, scopeLabel: "Group" },
      }
    },
  }
}

export const INPUTS: InputDef[] = [
  {
    id: "entity.master",
    label: "Reporting entity master data",
    scope: "group",
    satisfiedBy: "MCA master data",
    resolve: (ctx) =>
      ctx.reportingEntityId
        ? { status: "now", via: "MCA master data (CIN)" }
        : { status: "open", via: "No reporting entity", gap: { key: "group:entity", resolution: "management", ownerRole: "Company secretary", finding: "Reporting entity not chosen.", nextStep: "choosing the company that files the BRSR", missingInput: "entity.master", scope: {}, scopeLabel: "Group" } },
  },
  {
    id: "entity.tree",
    label: "Group structure",
    scope: "group",
    satisfiedBy: "MCA master data, AOC-1",
    resolve: (ctx) => (ctx.entities.length ? { status: "now", via: "MCA entity tree" } : null),
  },
  {
    id: "boundary",
    label: "Reporting boundary",
    scope: "group",
    satisfiedBy: "Boundary confirmation",
    resolve: (ctx) =>
      ctx.boundaryConfirmed
        ? { status: "now", via: "Boundary confirmed by owner" }
        : { status: "open", via: "Boundary not confirmed", gap: { key: "group:boundary", resolution: "management", ownerRole: "Company secretary", finding: "Reporting boundary not confirmed.", nextStep: "confirming entities and consolidation", missingInput: "boundary", scope: {}, scopeLabel: "Group" } },
  },
  {
    id: "sites.register",
    label: "Confirmed site register",
    scope: "group",
    satisfiedBy: "ergOS, GST and owner confirmation",
    resolve: (ctx) => {
      const unassigned = ctx.sites.filter((s) => !s.legalEntityId || s.entityReview)
      if (!unassigned.length) return { status: "now", via: "Sites confirmed against GST and ergOS" }
      return {
        status: "open",
        via: "Sites need an entity",
        gap: { key: "group:sites", resolution: "data", ownerRole: "Group ESG lead", finding: `${unassigned.length} site(s) have no confirmed entity.`, nextStep: "assigning each site to its legal entity", missingInput: "sites.register", scope: {}, scopeLabel: "Group" },
      }
    },
  },
  groupDocInput("annualReport", "Annual report", /annual report/i, "document", "Annual report not in the vault.", "uploading the annual report", "Company secretary"),
  groupDocInput("policy.code", "Code of conduct", /code of conduct/i, "management", "No code of conduct on file.", "adopting a code of conduct", "Company secretary"),
  groupDocInput("policy.whistleblower", "Whistleblower policy and log", /whistleblower/i, "management", "No whistleblower policy on file.", "adopting a whistleblower policy", "Company secretary"),
  groupDocInput("policy.posh", "POSH and equal opportunity", /posh/i, "management", "No POSH policy on file.", "adopting a POSH and equal opportunity policy", "CHRO"),
  groupDocInput("statutory", "PF and ESIC returns", /PF and ESIC/i, "document", "PF and ESIC returns not in the vault.", "uploading the annual PF and ESIC returns", "HR manager"),
  groupDocInput("epr", "EPR registration", /EPR/i, "document", "EPR registration not in the vault.", "uploading the CPCB EPR certificate", "Company secretary"),
  groupDocInput("policy.esg", "ESG policy", /ESG policy|sustainability policy/i, "management", "No board-approved ESG policy covering the nine principles.", "the board adopting an ESG policy mapped to the nine principles", "Company secretary", "essential"),
  groupDocInput("policy.humanRights", "Human rights policy", /human rights/i, "management", "No human rights policy or training record.", "adopting a human rights policy with a training plan", "CHRO", "essential"),
  groupDocInput("scope3", "Scope 3 screening", /scope 3/i, "management", "No Scope 3 screening has been done.", "commissioning a Scope 3 screen of purchased goods and logistics", "Head of procurement", "leadership"),
  groupDocInput("assurance", "Assurance engagement", /assurance/i, "management", "No assurance provider named for BRSR Core.", "appointing a reasonable-assurance provider before year end", "CFO", "core"),
  groupDocInput("materiality", "Materiality assessment", /materiality/i, "management", "No materiality assessment on file.", "running a materiality assessment with the ESG committee", "ESG committee", "essential"),
  groupDocInput("targets", "Board-approved targets", /target/i, "management", "No energy or emission targets on record.", "setting board-approved energy and emission targets", "ESG committee", "essential"),
  erpGroupInput("erp.finance", "Finance ledgers", "finance ledgers"),
  erpGroupInput("erp.payroll", "Payroll register", "payroll"),
  erpGroupInput("erp.crm", "Customer complaints", "customer service module"),
  erpGroupInput("erp.quality", "Quality and recalls", "quality module"),
  {
    id: "ehs.system",
    label: "H&S management system",
    scope: "group",
    satisfiedBy: "EHS system",
    resolve: (ctx) =>
      connected(ctx, "ehs")
        ? { status: pending(ctx, "ehs") ? "sync" : "now", via: `EHS system${pending(ctx, "ehs") ? " (first sync pending)" : ""}` }
        : { status: "open", via: "EHS not connected", gap: { key: "group:ehs", resolution: "automatic", ownerRole: "EHS head", finding: "EHS system not connected.", nextStep: "connecting the EHS incident and waste registers", missingInput: "ehs", scope: {}, scopeLabel: "Group" } },
  },
  {
    id: "people.hrms",
    label: "Headcount and HR records",
    scope: "entity",
    satisfiedBy: "HRMS",
    resolve: (ctx, unit) => {
      if (unit.kind !== "entity") return null
      const sites = ctx.sites.filter((s) => s.legalEntityId === unit.entity.id)
      if (!sites.length) return null
      if (!connected(ctx, "hrms")) {
        return {
          status: "open",
          via: "HRMS not connected",
          gap: { key: "group:hrms", resolution: "automatic", ownerRole: "HR systems", finding: "HRMS not connected, so headcount has no source.", nextStep: "connecting the HRMS headcount extract", missingInput: "people.hrms", scope: {}, scopeLabel: "Group" },
        }
      }
      const covered = sites.filter((s) => ctx.hrmsCoverage[s.id])
      if (covered.length === sites.length) return { status: pending(ctx, "hrms") ? "sync" : "now", via: "HRMS (FY extract pending)" }
      return {
        status: "open",
        via: "Payroll outside the connected HRMS",
        gap: {
          key: `entity:${unit.entity.id}:hrms`,
          resolution: "automatic",
          ownerRole: "HR systems",
          finding: `payroll for ${sites.length - covered.length} ${sites.length - covered.length === 1 ? "site" : "sites"} sits outside the connected HRMS.`,
          nextStep: `extending the HRMS connector to the ${unit.entity.shortName} payroll`,
          missingInput: "people.hrms",
          scope: { entityId: unit.entity.id },
          scopeLabel: unit.entity.name,
        },
      }
    },
  },
  {
    id: "contract.workers",
    label: "Contract worker headcount",
    scope: "site",
    satisfiedBy: "HRMS or contractor registers",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site" || unit.site.type === "office") return null
      const site = unit.site
      const c = ans(ctx, site, "contractors")
      if (c === false) return null
      if (c === undefined) return unanswered(site, "contractors", "contract.workers")
      if (c === NOT_SURE) return notSureGap(site, "contractors", "contract.workers", "data", "contract worker presence unknown.", "the HR manager confirming contract workforce", "HR manager")
      const src = ans(ctx, site, "headcountSource")
      if (src === undefined) return unanswered(site, "headcountSource", "contract.workers")
      if (src === "HRMS") {
        if (ctx.hrmsCoverage[site.id]) return { status: pending(ctx, "hrms") ? "sync" : "now", via: "HRMS" }
        // Same root cause as the entity-level HRMS gap; dedupe onto it.
        const entity = ctx.entities.find((e) => e.id === site.legalEntityId)
        return {
          status: "open",
          via: "HRMS does not cover this payroll",
          gap: {
            key: `entity:${site.legalEntityId}:hrms`,
            resolution: "automatic",
            ownerRole: "HR systems",
            finding: "payroll sits outside the connected HRMS.",
            nextStep: `extending the HRMS connector to the ${entity?.shortName ?? "entity"} payroll`,
            missingInput: "people.hrms",
            scope: { entityId: site.legalEntityId },
            scopeLabel: entity?.name ?? site.name,
          },
        }
      }
      if (src === NOT_SURE) return notSureGap(site, "headcountSource", "contract.workers", "data", "location of contract worker records unknown.", "the HR manager confirming where contractor headcount is kept", "HR manager")
      return {
        status: "open",
        via: `Kept in ${String(src).toLowerCase()}`,
        gap: {
          key: `${site.id}:contract.workers`,
          resolution: "data",
          ownerRole: "HR manager",
          finding: `contract worker headcount kept in ${String(src).toLowerCase()}.`,
          nextStep: "uploading monthly contractor register totals",
          missingInput: "contract.workers",
          scope: { siteId: site.id },
          scopeLabel: site.name,
        },
      }
    },
  },
  {
    id: "products",
    label: "Products made",
    scope: "site",
    satisfiedBy: "ERP product master or owner",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site" || unit.site.type !== "factory") return null
      const site = unit.site
      const st = ctx.states[site.id]
      if (st?.erp.connected && st.erp.productMaster) return { status: pending(ctx, "erp") ? "sync" : "now", via: "ERP product master" }
      if (st?.filing?.products && !ctx.ownerAnswers[site.id]?.products) return { status: "now", via: `Filed disclosures (${st.filing.ref ?? "annual report"})` }
      const v = ans(ctx, site, "products")
      if (v === undefined) return unanswered(site, "products", "products")
      if (v === NOT_SURE) return notSureGap(site, "products", "products", "data", "product mix unknown.", "the plant head listing products made")
      return { status: "now", via: ownerVia("products") }
    },
  },
  {
    id: "elec",
    label: "Electricity by source",
    scope: "site",
    satisfiedBy: "ergOS meters",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site") return null
      const site = unit.site
      const file = ctx.energyFile?.[site.id]
      if (file && ctx.ergosLinked[site.id]) {
        const c = ctx.completeness[site.id] ?? 1
        const pct = Math.round(c * 100)
        if (c >= 0.9) return { status: "now", via: `${file.label} (${pct}% of operating months from readings)` }
        return {
          status: "open",
          via: `${file.label}: ${pct}% of operating months from readings`,
          gap: {
            key: `${site.id}:elec`,
            resolution: "data",
            ownerRole: "Energy manager",
            finding: `${pct ? `only ${pct}% of operating months` : "none of the operating months"} in the energy file are meter or bill readings; the rest ${file.basis ? `are ${file.basis}` : "are estimates"}.`,
            nextStep: `collecting ${site.name}'s monthly electricity bills (kWh and kVAh) for the estimated months`,
            missingInput: "elec",
            scope: { siteId: site.id },
            scopeLabel: site.name,
            note: "BRSR Core energy needs metered or billed values; estimates cannot be assured.",
          },
        }
      }
      if (connected(ctx, "ergos") && ctx.ergosLinked[site.id]) {
        const c = ctx.completeness[site.id] ?? 1
        return c >= 0.9 ? { status: "now", via: `ergOS meters (${Math.round(c * 100)}% complete)` } : { status: "sync", via: `ergOS backfill pending (${Math.round(c * 100)}% complete)` }
      }
      const billing = ans(ctx, site, "officeBilling")
      const office = site.type === "office"
      const finding = office
        ? billing === "Through landlord"
          ? "electricity billed through the landlord; no metered source."
          : billing === "Included in rent"
            ? "electricity included in rent; no metered source."
            : "office electricity has no metered source."
        : `not on ergOS, so electricity has no metered source.`
      const nextStep = office
        ? billing === "Included in rent"
          ? "adding the operator's apportioned statement to ergOS bill import"
          : "adding the office bill to ergOS bill import, or a sub-meter if the landlord allows"
        : `connecting ${site.name}'s main incomer to ergOS`
      return {
        status: "open",
        via: "Not on ergOS",
        gap: {
          key: `${site.id}:elec`,
          resolution: "automatic",
          ownerRole: office ? "Office admin" : "Energy manager",
          finding,
          nextStep,
          missingInput: "elec",
          scope: { siteId: site.id },
          scopeLabel: site.name,
          note: office ? "ergOS bill import covers offices without meters." : "ergOS onboarding: one incomer meter brings the site into the energy layer.",
        },
      }
    },
  },
  {
    id: "dg.fuel",
    label: "DG diesel",
    scope: "site",
    satisfiedBy: "ergOS DG meter",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site") return null
      const site = unit.site
      const st = ctx.states[site.id]
      if (st?.ergos.connected && st.ergos.dg) return { status: "now", via: "ergOS DG meter (fuel sensor)" }
      const hvac = ans(ctx, site, "officeHvac")
      if (site.type === "office" && has(hvac, "DG backup")) {
        return {
          status: "open",
          via: "Office DG without records",
          gap: { key: `${site.id}:dg`, resolution: "data", ownerRole: "Office admin", finding: "DG backup runs without diesel records in any system.", nextStep: "uploading 12 months of diesel purchase slips", missingInput: "dg.fuel", scope: { siteId: site.id }, scopeLabel: site.name },
        }
      }
      return null
    },
  },
  {
    id: "fuel.boiler",
    label: "Boiler fuel quantity",
    scope: "site",
    satisfiedBy: "ERP fuel purchases, vault invoices or owner logbook",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site" || unit.site.type !== "factory") return null
      const site = unit.site
      const st = ctx.states[site.id]
      const boilers = ans(ctx, site, "boilers")
      if (boilers === false) return null
      if (boilers === undefined) return unanswered(site, "boilers", "fuel.boiler")
      if (boilers === NOT_SURE) return notSureGap(site, "boilers", "fuel.boiler", "data", "boiler presence unknown.", "the plant head confirming boilers and fuels")
      const fuels = ans(ctx, site, "boilerFuel")
      const fuelName = Array.isArray(fuels) && fuels.length ? fuels.join(" and ") : "fuel"
      if (st?.vault.connected && st.vault.fuelInvoices) return { status: "now", via: "Vault: 12 months of fuel invoices" }
      if (st?.erp.connected && st.erp.fuelPurchases) return { status: pending(ctx, "erp") ? "sync" : "now", via: "ERP fuel purchases (sync pending)" }
      const src = ans(ctx, site, "fuelQuantitySource")
      const boilerWord = `${fuelName} boiler confirmed`
      if (src === undefined) return unanswered(site, "fuelQuantitySource", "fuel.boiler")
      if (src === NOT_SURE)
        return notSureGap(site, "fuelQuantitySource", "fuel.boiler", "data", `${boilerWord}; where fuel quantities are kept is unknown.`, "the plant head locating 12 months of fuel records")
      if (src === "ERP") {
        const code = ctx.erpPlantCodes[site.id] ?? site.name.slice(0, 3).toUpperCase() + "1"
        if (!connected(ctx, "erp")) {
          return {
            status: "open",
            via: "ERP not connected",
            gap: { key: `${site.id}:fuel`, resolution: "automatic", ownerRole: "ERP team", finding: `${boilerWord}; fuel sits in ERP, which is not connected.`, nextStep: `connecting ERP purchases for plant ${code}`, missingInput: "fuel.boiler", scope: { siteId: site.id }, scopeLabel: site.name },
          }
        }
        return {
          status: "open",
          via: `Plant ${code} not in ERP fuel extract`,
          gap: { key: `${site.id}:fuel`, resolution: "automatic", ownerRole: "ERP team", finding: `${boilerWord}; fuel is in ERP but plant ${code} is outside the fuel extract.`, nextStep: `adding plant code ${code} to the ERP fuel-purchase extract`, missingInput: "fuel.boiler", scope: { siteId: site.id }, scopeLabel: site.name },
        }
      }
      if (src === "Invoices") {
        return {
          status: "open",
          via: "Invoices not in vault",
          gap: { key: `${site.id}:fuel`, resolution: "document", ownerRole: site.ownerRole ?? "Plant head", finding: `${boilerWord}; fuel invoices are not in the vault.`, nextStep: "uploading 12 months of fuel invoices", missingInput: "fuel.boiler", scope: { siteId: site.id }, scopeLabel: site.name },
        }
      }
      if (src === "Logbook") {
        return {
          status: "open",
          via: "Plant logbook",
          gap: { key: `${site.id}:fuel`, resolution: "data", ownerRole: site.ownerRole ?? "Plant head", finding: `${boilerWord}; quantities sit in a paper logbook.`, nextStep: "entering 12 monthly logbook totals", missingInput: "fuel.boiler", scope: { siteId: site.id }, scopeLabel: site.name },
        }
      }
      return {
        status: "open",
        via: "Not recorded",
        gap: {
          key: `${site.id}:fuel`,
          resolution: "data",
          ownerRole: site.ownerRole ?? "Plant head",
          finding: `${boilerWord}, annual fuel quantity not recorded.`,
          nextStep: connected(ctx, "erp") ? "collecting 12 months of fuel purchase totals from the plant" : "connecting ERP purchases or uploading 12 months of fuel invoices",
          missingInput: "fuel.boiler",
          scope: { siteId: site.id },
          scopeLabel: site.name,
          weight: "core",
        },
      }
    },
  },
  {
    id: "output",
    label: "Annual production",
    scope: "site",
    satisfiedBy: "ERP production postings or owner",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site" || unit.site.type !== "factory") return null
      const site = unit.site
      const st = ctx.states[site.id]
      const boilers = ans(ctx, site, "boilers")
      const needed = st?.ergos.steam || st?.ergos.water || boilers === true || boilers === undefined
      if (!needed) return null
      if (st?.erp.connected && st.erp.fuelPurchases) return { status: pending(ctx, "erp") ? "sync" : "now", via: "ERP production postings (sync pending)" }
      const v = ans(ctx, site, "output")
      if (v === undefined) return unanswered(site, "output", "output")
      if (v === NOT_SURE)
        return {
          status: "open",
          via: "Owner not sure — task sent",
          gap: { key: `${site.id}:output`, resolution: "data", ownerRole: site.ownerRole ?? "Plant head", finding: "annual production unknown, so intensity cannot be computed.", nextStep: "the plant head sharing last year's production in tonnes", missingInput: "output", scope: { siteId: site.id }, scopeLabel: site.name, weight: "core" },
        }
      return { status: "now", via: ownerVia("output") }
    },
  },
  {
    id: "water.withdrawal",
    label: "Water withdrawal",
    scope: "site",
    satisfiedBy: "ergOS water meter or owner-confirmed meter",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site" || unit.site.type !== "factory") return null
      const site = unit.site
      const st = ctx.states[site.id]
      if (st?.ergos.connected && st.ergos.water) return { status: "now", via: "ergOS water meter" }
      const src = ans(ctx, site, "waterSource")
      const metered = ans(ctx, site, "waterMetered")
      if (src === undefined) return unanswered(site, "waterSource", "water.withdrawal")
      if (metered === undefined) return unanswered(site, "waterMetered", "water.withdrawal")
      if (src === NOT_SURE || metered === NOT_SURE)
        return notSureGap(site, "waterMetered", "water.withdrawal", "data", "water source or metering unknown.", "the EHS manager confirming sources and meters", "EHS manager")
      if (metered === true) return { status: "now", via: "Owner-confirmed site meter" }
      if (has(src, "Groundwater"))
        return {
          status: "open",
          via: "Groundwater, unmetered",
          gap: { key: `${site.id}:water`, resolution: "data", ownerRole: "EHS manager", finding: "groundwater drawn without a meter.", nextStep: "fitting a flow meter (ergOS water add-on) or submitting pump-hour logs", missingInput: "water.withdrawal", scope: { siteId: site.id }, scopeLabel: site.name, weight: "core" },
        }
      return {
        status: "open",
        via: "Unmetered supply",
        gap: { key: `${site.id}:water`, resolution: "document", ownerRole: "EHS manager", finding: "water supply not metered on site.", nextStep: "uploading 12 months of water bills or tanker invoices", missingInput: "water.withdrawal", scope: { siteId: site.id }, scopeLabel: site.name },
      }
    },
  },
  {
    id: "discharge",
    label: "Wastewater destination",
    scope: "site",
    satisfiedBy: "Owner answer",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site" || unit.site.type !== "factory") return null
      const v = ans(ctx, unit.site, "discharge")
      if (v === undefined) return unanswered(unit.site, "discharge", "discharge")
      if (v === NOT_SURE) return notSureGap(unit.site, "discharge", "discharge", "data", "wastewater destination unknown.", "the EHS manager confirming discharge route", "EHS manager")
      return { status: "now", via: ownerVia("discharge") }
    },
  },
  {
    id: "waste",
    label: "Waste by category",
    scope: "site",
    satisfiedBy: "EHS waste register or owner",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site") return null
      const site = unit.site
      if (site.type === "office") {
        const v = ans(ctx, site, "officeEwaste")
        if (v === undefined) return unanswered(site, "officeEwaste", "waste")
        if (v === NOT_SURE || v === "Not tracked")
          return {
            status: "open",
            via: "E-waste not tracked",
            gap: { key: `${site.id}:waste`, resolution: "document", ownerRole: "Office admin", finding: "e-waste disposal not tracked.", nextStep: "collecting disposal certificates from an authorised recycler", missingInput: "waste", scope: { siteId: site.id }, scopeLabel: site.name },
          }
        return { status: "now", via: ownerVia("officeEwaste") }
      }
      if (site.type !== "factory") return null
      const st = ctx.states[site.id]
      if (st?.ehs.connected && st.ehs.covers) return { status: pending(ctx, "ehs") ? "sync" : "now", via: "EHS waste register (sync pending)" }
      const streams = ans(ctx, site, "wasteStreams")
      if (streams === undefined) return unanswered(site, "wasteStreams", "waste")
      if (streams === NOT_SURE) return notSureGap(site, "wasteStreams", "waste", "data", "waste streams unknown.", "the EHS manager listing waste streams", "EHS manager")
      if (has(streams, "Hazardous")) {
        const d = ans(ctx, site, "wasteDisposal")
        if (d === undefined) return unanswered(site, "wasteDisposal", "waste")
        if (d === "Not tracked" || d === NOT_SURE)
          return {
            status: "open",
            via: "Hazardous disposal not tracked",
            gap: { key: `${site.id}:waste`, resolution: "document", ownerRole: "EHS manager", finding: "hazardous waste generated, disposal not tracked.", nextStep: "uploading Form 10 manifests and the TSDF or recycler agreement", missingInput: "waste", scope: { siteId: site.id }, scopeLabel: site.name, weight: "essential" },
          }
      }
      return { status: "now", via: ownerVia("wasteStreams") }
    },
  },
  {
    id: "refrigerant",
    label: "Refrigerant top-ups",
    scope: "site",
    satisfiedBy: "Owner log",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site") return null
      const site = unit.site
      if (site.type === "office") {
        const hvac = ans(ctx, site, "officeHvac")
        if (!has(hvac, "Own HVAC plant")) return null
        return {
          status: "open",
          via: "Own HVAC without a top-up log",
          gap: { key: `${site.id}:refrigerant`, resolution: "data", ownerRole: "Office admin", finding: "own HVAC plant runs without a refrigerant top-up log.", nextStep: "collecting last year's HVAC service invoices", missingInput: "refrigerant", scope: { siteId: site.id }, scopeLabel: site.name },
        }
      }
      const r = ans(ctx, site, "refrigeration")
      if (r === false) return null
      if (r === undefined) return unanswered(site, "refrigeration", "refrigerant")
      if (r === NOT_SURE) return notSureGap(site, "refrigeration", "refrigerant", "data", "refrigeration load unknown.", "the plant head confirming refrigeration and HVAC")
      const log = ans(ctx, site, "refrigerantLog")
      if (log === undefined) return unanswered(site, "refrigerantLog", "refrigerant")
      if (log === true) return { status: "now", via: ownerVia("refrigerantLog") }
      return {
        status: "open",
        via: "No refrigerant log",
        gap: { key: `${site.id}:refrigerant`, resolution: "data", ownerRole: site.ownerRole ?? "Plant head", finding: "refrigeration runs without a top-up log.", nextStep: "starting a refrigerant top-up log and collecting last year's service invoices", missingInput: "refrigerant", scope: { siteId: site.id }, scopeLabel: site.name },
      }
    },
  },
  {
    id: "incidents",
    label: "Safety incidents",
    scope: "site",
    satisfiedBy: "EHS incident register or owner",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site" || unit.site.type !== "factory") return null
      const site = unit.site
      const st = ctx.states[site.id]
      if (st?.ehs.connected && st.ehs.covers) return { status: pending(ctx, "ehs") ? "sync" : "now", via: "EHS incident register (sync pending)" }
      const v = ans(ctx, site, "incidents")
      if (v === undefined) return unanswered(site, "incidents", "incidents")
      if (v === true) return { status: "now", via: ownerVia("incidents") }
      return {
        status: "open",
        via: v === NOT_SURE ? "Owner not sure — task sent" : "Not logged at site",
        gap: { key: `${site.id}:incidents`, resolution: "data", ownerRole: "EHS manager", finding: "safety incidents are not logged at site level.", nextStep: "starting a site incident register in EHS", missingInput: "incidents", scope: { siteId: site.id }, scopeLabel: site.name, weight: "core" },
      }
    },
  },
  {
    id: "permits",
    label: "CTO and CTE",
    scope: "site",
    satisfiedBy: "Vault permit or owner",
    resolve: (ctx, unit) => {
      if (unit.kind !== "site" || unit.site.type !== "factory") return null
      const site = unit.site
      const st = ctx.states[site.id]
      if (st?.vault.connected && st.vault.permit) {
        const doc = ctx.documents.find((d) => d.siteId === site.id && d.kind === "permit")
        return { status: "now", via: `Vault: ${doc?.name ?? "CTO"}` }
      }
      const v = ans(ctx, site, "permits")
      if (v === undefined) return unanswered(site, "permits", "permits")
      if (v === "Yes, tracked digitally") return { status: "now", via: ownerVia("permits") }
      return {
        status: "open",
        via: v === NOT_SURE ? "Owner not sure — task sent" : "Paper only",
        gap: {
          key: `${site.id}:permits`,
          resolution: "document",
          ownerRole: "EHS manager",
          finding: v === NOT_SURE ? "permit status unknown." : "CTO held on paper only, expiry not tracked.",
          nextStep: v === NOT_SURE ? "the plant head confirming CTO and CTE validity and uploading copies" : "scanning the CTO and CTE into the vault with expiry dates",
          missingInput: "permits",
          scope: { siteId: site.id },
          scopeLabel: site.name,
        },
      }
    },
  },
]

const INPUT_BY_ID: Record<string, InputDef> = Object.fromEntries(INPUTS.map((i) => [i.id, i]))

const RANK: Record<IndicatorStatus, number> = { now: 0, sync: 1, open: 2 }
const WEIGHT_RANK: Record<IndicatorWeight, number> = { core: 0, essential: 1, leadership: 2 }

function unitsFor(ctx: EngineContext, scope: InputDef["scope"]): Unit[] {
  if (scope === "group") return [{ kind: "group", label: "Group" }]
  if (scope === "entity")
    return ctx.entities
      .filter((e) => ctx.sites.some((s) => s.legalEntityId === e.id))
      .map((entity) => ({ kind: "entity" as const, entity, label: entity.name }))
  return ctx.sites.map((site) => ({ kind: "site" as const, site, label: site.name }))
}

type Evaluated = { result: IndicatorResult; gapSpecs: GapSpec[] }

export function evaluateIndicator(ind: Indicator, ctx: EngineContext): Evaluated {
  const inputs: InputCoverage[] = []
  const gapSpecs: GapSpec[] = []
  for (const inputId of ind.inputs) {
    const def = INPUT_BY_ID[inputId]
    if (!def) continue
    for (const unit of unitsFor(ctx, def.scope)) {
      const r = def.resolve(ctx, unit)
      if (!r) continue
      const scope = unit.kind === "site" ? { siteId: unit.site.id } : unit.kind === "entity" ? { entityId: unit.entity.id } : {}
      inputs.push({ inputId, status: r.status, scopeLabel: unit.label, scope, via: r.via })
      if (r.status === "open" && r.gap) gapSpecs.push(r.gap)
    }
  }
  const status = inputs.reduce<IndicatorStatus>((worst, c) => (RANK[c.status] > RANK[worst] ? c.status : worst), "now")
  return { result: { id: ind.id, status, inputs }, gapSpecs }
}

function buildGaps(evaluated: Evaluated[]): Gap[] {
  const byKey = new Map<string, { spec: GapSpec; blocks: string[] }>()
  for (const e of evaluated) {
    for (const spec of e.gapSpecs) {
      const entry = byKey.get(spec.key) ?? { spec, blocks: [] }
      if (!entry.blocks.includes(e.result.id)) entry.blocks.push(e.result.id)
      byKey.set(spec.key, entry)
    }
  }
  const gaps: Gap[] = []
  for (const [key, { spec, blocks }] of byKey) {
    const weights = blocks.map((b) => INDICATOR_BY_ID[b]?.weight ?? "essential")
    const weight = spec.weight ?? weights.sort((a, b) => WEIGHT_RANK[a] - WEIGHT_RANK[b])[0]
    const refs = [...new Set(blocks.map(indicatorRef))]
    const blocksText = refs.length > 1 ? `${refs.slice(0, -1).join(", ")} and ${refs[refs.length - 1]}` : refs[0]
    const finding = spec.finding.charAt(0).toUpperCase() + spec.finding.slice(1)
    gaps.push({
      id: `gap-${key}`,
      indicator: blocks[0],
      scope: spec.scope,
      missingInput: spec.missingInput,
      resolution: spec.resolution,
      weight,
      ownerRole: spec.ownerRole,
      title: `${spec.scopeLabel} — ${finding}`,
      description: `Blocks ${blocksText}. Resolve by ${spec.nextStep}.`,
      blocks,
      nextStep: spec.nextStep.charAt(0).toUpperCase() + spec.nextStep.slice(1),
      scopeLabel: spec.scopeLabel,
      note: spec.note,
    })
  }
  const resRank: Record<GapResolution, number> = { automatic: 0, data: 1, document: 2, management: 3 }
  return gaps.sort((a, b) => resRank[a.resolution] - resRank[b.resolution] || WEIGHT_RANK[a.weight] - WEIGHT_RANK[b.weight])
}

export type Evaluation = {
  results: IndicatorResult[]
  gaps: Gap[]
  counts: { total: number; now: number; sync: number; open: number }
  gapCounts: { total: number; automatic: number; dataOrDocument: number; management: number; data: number; document: number }
}

export function summarise(results: IndicatorResult[], gaps: Gap[]): Evaluation {
  return {
    results,
    gaps,
    counts: {
      total: results.length,
      now: results.filter((r) => r.status === "now").length,
      sync: results.filter((r) => r.status === "sync").length,
      open: results.filter((r) => r.status === "open").length,
    },
    gapCounts: {
      total: gaps.length,
      automatic: gaps.filter((g) => g.resolution === "automatic").length,
      dataOrDocument: gaps.filter((g) => g.resolution === "data" || g.resolution === "document").length,
      data: gaps.filter((g) => g.resolution === "data").length,
      document: gaps.filter((g) => g.resolution === "document").length,
      management: gaps.filter((g) => g.resolution === "management").length,
    },
  }
}

export function evaluateAll(ctx: EngineContext): Evaluation {
  const evaluated = INDICATORS.map((ind) => evaluateIndicator(ind, ctx))
  return summarise(
    evaluated.map((e) => e.result),
    buildGaps(evaluated),
  )
}

// Streams one result per indicator rule as it is evaluated, so the analysis
// grid lights from real engine events.
export async function* streamEvaluation(ctx: EngineContext, stepMs = 70): AsyncGenerator<{ result: IndicatorResult; index: number; final?: Evaluation }> {
  const evaluated: Evaluated[] = []
  for (let i = 0; i < INDICATORS.length; i++) {
    const e = evaluateIndicator(INDICATORS[i], ctx)
    evaluated.push(e)
    await wait(stepMs)
    const final = i === INDICATORS.length - 1 ? summarise(evaluated.map((x) => x.result), buildGaps(evaluated)) : undefined
    yield { result: e.result, index: i, final }
  }
}

// Pick a varied handful for the headline cards: one per resolution type, core first.
export function featuredGaps(gaps: Gap[], n = 5): Gap[] {
  const order: GapResolution[] = ["data", "automatic", "document", "management", "data", "automatic", "document", "management"]
  const pool = [...gaps].sort((a, b) => WEIGHT_RANK[a.weight] - WEIGHT_RANK[b.weight])
  const picked: Gap[] = []
  for (const r of order) {
    if (picked.length >= n) break
    const g = pool.find((x) => x.resolution === r && !picked.includes(x) && !picked.some((p) => p.scopeLabel === x.scopeLabel))
    if (g) picked.push(g)
  }
  for (const g of pool) {
    if (picked.length >= n) break
    if (!picked.includes(g)) picked.push(g)
  }
  return picked
}

export function inputLabel(id: string) {
  return INPUT_BY_ID[id]?.label ?? id
}

export function inputSatisfiedBy(id: string) {
  return INPUT_BY_ID[id]?.satisfiedBy ?? ""
}
