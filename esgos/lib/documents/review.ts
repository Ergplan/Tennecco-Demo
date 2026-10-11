// Desktop document review (Phase 1A): the documents a readiness assessment asks
// for, what to look for in each, and the BRSR questions (or ISSB requirements and
// implementation items) each one evidences. Plant-specific documents are reviewed
// once per plant. Review outcomes feed the readiness assessment.

import type { Site } from "../types"

export type DocCategory = "diligence" | "policy" | "procedure" | "risk" | "hr" | "ehs" | "compliance" | "site"

export const CATEGORY_LABEL: Record<DocCategory, string> = {
  diligence: "Prior ESG diligence and reports",
  policy: "Policies",
  procedure: "Procedures",
  risk: "Risk registers",
  hr: "HR data",
  ehs: "EHS data",
  compliance: "Compliance records",
  site: "Plant-specific policies and procedures",
}

export type ReviewDoc = {
  id: string
  category: DocCategory
  title: string
  lookFor: string
  // Catalogue ids (BRSR questions, ISSB requirements) or implementation items.
  refs: string[]
  owner: string
  perPlant?: boolean
  // What to do when the document is missing or falls short.
  recommendation: string
}

const d = (id: string, category: DocCategory, title: string, lookFor: string, refs: string[], owner: string, recommendation: string, perPlant = false): ReviewDoc => ({ id, category, title, lookFor, refs, owner, recommendation, perPlant })

export const DOC_CHECKLIST: ReviewDoc[] = [
  d("dd.esg", "diligence", "Prior ESG due diligence reports", "Findings, open actions and data gaps raised by earlier ESG or IPO diligence, and whether they were closed.", ["A.26", "B.11"], "Company secretary", "Carry every open finding from earlier diligence into the gap register and track it to closure."),
  d("dd.csr", "diligence", "CSR annual reports and any sustainability report", "CSR spend, projects and impact; any published ESG targets or performance.", ["A.24", "P8.E1", "B.5", "B.6"], "ESG lead", "Reuse CSR records for A.24 and P8, and align any published targets with B.5 and B.6."),

  d("pol.ngrbc", "policy", "Responsible business policy set (NGRBC P1–P9)", "One policy per principle or a combined policy; Board approval date; web link; principles not covered and why.", ["B.1a", "B.1b", "B.1c", "B.12"], "Company secretary", "Cover all nine principles, take the set to the Board, and publish it on the website."),
  d("pol.conduct", "policy", "Code of conduct, anti-bribery and conflict of interest", "Anti-corruption commitments, gifts and hospitality, conflict-of-interest declarations for Directors and KMP.", ["P1.E4", "P1.L2", "P1.E5", "P1.E6"], "Legal", "Adopt a Board-approved anti-bribery and conflict-of-interest policy with an annual declaration."),
  d("pol.vigil", "policy", "Whistle-blower and vigil mechanism", "Channels, protection against retaliation, who investigates, reporting to the Audit Committee.", ["P5.E8", "P1.E7"], "Legal", "Publish the vigil mechanism with protection for complainants and quarterly reporting to the Audit Committee."),
  d("pol.hr", "policy", "HR, equal opportunity and grievance policies", "Equal opportunity under the RPwD Act, accessibility, grievance redressal for employees and workers.", ["P3.E4", "P3.E6", "P3.E3"], "HR manager", "Adopt an equal opportunity policy and one grievance procedure covering permanent and contract workers."),
  d("pol.posh", "policy", "POSH policy and Internal Committee constitution", "Internal Committee at every location, annual report, complaint register.", ["P5.E7", "P5.E8"], "HR manager", "Constitute an Internal Committee for every plant and keep the annual POSH report and complaint register."),
  d("pol.rights", "policy", "Human rights policy", "Scope (employees, contract workers, value chain), focal point, grievance channel.", ["P5.E4", "P5.E5", "P5.E9"], "HR manager", "Adopt a human rights policy that names a focal point and extends to contract workers and suppliers."),
  d("pol.ehs", "policy", "Environment, health and safety policy", "Commitments on safety, emissions, water and waste; management system; legal compliance.", ["P3.E10", "P3.E12", "P6.E13"], "EHS manager", "Adopt one EHS policy for all plants and back it with a management system and compliance register."),
  d("pol.quality", "policy", "Food safety, quality and product responsibility policy", "Food safety certifications, recall procedure, consumer complaints, sustainable sourcing.", ["P2.E2", "P9.E1", "P9.E4"], "Quality head", "Link the food safety policy to the recall and consumer complaint procedures and record sustainable sourcing."),
  d("pol.privacy", "policy", "Cyber security and data privacy policy", "Data protection, breach response, customer data handling.", ["P9.E5", "P9.E7"], "IT / ERP owner", "Adopt a data privacy and cyber security policy with a breach register."),
  d("pol.supplier", "policy", "Supplier code of conduct and sourcing policy", "ESG clauses in supplier contracts, supplier assessments, MSME and local sourcing.", ["B.3", "P2.E2", "P5.E9", "P8.E4", "P3.L5", "P5.L4", "P6.L7"], "Procurement head", "Issue a supplier code of conduct with ESG clauses and assess the largest suppliers against it."),
  d("pol.csr", "policy", "CSR policy and annual action plan", "Board-approved CSR policy, projects, spend and impact assessments.", ["A.24", "P8.E1", "P8.E3"], "Company secretary", "Keep the CSR policy, annual action plan and impact assessments current and Board-approved."),
  d("pol.stakeholder", "policy", "Stakeholder engagement policy and materiality assessment", "Stakeholder groups identified and how, engagement channels and frequency, vulnerable groups, how the Board hears stakeholders, the material issues found.", ["P4.E1", "P4.E2", "P4.L1", "A.26"], "ESG lead", "Map stakeholder groups with how and how often each is engaged, and record how the Board hears them."),
  d("pol.advocacy", "policy", "Public policy positions and trade association memberships", "Chambers and associations, positions advocated, anti-competitive conduct.", ["P7.E1", "P7.E2"], "Company secretary", "List trade association memberships and the public policy positions taken through them."),

  d("proc.ehs", "procedure", "EHS management system procedures", "ISO 14001 / 45001 or equivalent manuals, hazard identification, incident investigation, waste handling.", ["B.2", "B.4", "P3.E10", "P6.E10"], "EHS manager", "Write the EHS procedures every plant follows and certify the largest plants against ISO 14001 and 45001."),
  d("proc.grievance", "procedure", "Grievance and complaint handling procedures", "Employee, community, investor and consumer channels; registers; timelines; escalation.", ["A.25", "P3.E6", "P8.E3", "P9.E1"], "ESG lead", "Run one grievance register per stakeholder group with response timelines and quarterly reporting."),
  d("proc.data", "procedure", "Existing ESG or MIS data collection procedures", "Who collects which data, how often, checks and sign-off before it is reported.", ["IMP.collection", "B.2"], "ESG lead", "Replace ad hoc collection with the monthly data procedure, named owners and maker-checker review."),

  d("risk.erm", "risk", "Enterprise risk register", "ESG and climate risks, owners, ratings, mitigation; how it reaches the Board.", ["A.26", "S1.rm", "S2.rm"], "Finance controller", "Add ESG and climate risks to the enterprise risk register with owners and Board reporting."),
  d("risk.climate", "risk", "Climate risk or scenario assessment, if any", "Physical and transition risks by plant, scenarios used, financial effects.", ["S2.str.ro", "S2.str.resilience", "S1.str.ro"], "Finance controller", "Run a climate risk assessment by plant with at least two scenarios before the first ISSB-aligned report."),

  d("hr.headcount", "hr", "HRMS headcount by category, gender and location", "Permanent and contract employees and workers, differently abled, joiners and leavers, location class.", ["A.20", "A.22", "P8.E5"], "HR manager", "Run a monthly HRMS extract covering contract workers, by plant, gender and category."),
  d("hr.payroll", "hr", "Payroll: wages by gender, minimum wages, benefits", "Median remuneration, gross wages to women, minimum wage compliance, PF, gratuity and ESI coverage.", ["P5.E2", "P5.E3", "P3.E2", "P3.E1"], "HR manager", "Build payroll reports for wages by gender and minimum wage compliance, reconciled to the books."),
  d("hr.training", "hr", "Training records", "Health and safety, skills, human rights and code of conduct training by category.", ["P1.E1", "P3.E8", "P5.E1"], "HR manager", "Record every training by topic, category and gender in the HRMS."),

  d("ehs.incidents", "ehs", "Incident register and safety statistics", "Lost-time injuries, fatalities, high-consequence injuries, person-hours, contract workers.", ["P3.E11", "P3.E13", "P3.E15"], "EHS manager", "Use one incident register format at every plant, with person-hours from attendance."),
  d("ehs.energy", "ehs", "Energy bills, meter logs and fuel invoices", "Monthly kWh and kVAh by plant, DG and boiler fuels by quantity, renewable purchases.", ["P6.E1", "P6.E7", "IMP.metering"], "Energy manager", "File every monthly bill and fuel invoice by plant; replace estimates with readings."),
  d("ehs.water", "ehs", "Water withdrawal and discharge records", "Borewell meters, municipal bills, tanker challans, ETP outlet logs, CGWA permissions.", ["P6.E3", "P6.E4", "P6.E5"], "EHS manager", "Meter withdrawal by source and ETP discharge at every plant and keep monthly logs."),
  d("ehs.waste", "ehs", "Waste manifests, EPR registration and returns", "Form 10 manifests, plastic EPR filings, recycler receipts, waste by category.", ["P6.E9", "P6.E10", "P2.E4"], "EHS manager", "Keep manifests and EPR returns by plant and reconcile them to the waste register each month."),
  d("ehs.air", "ehs", "Stack monitoring reports", "NOx, SOx, PM from boilers and DG sets, against consent limits.", ["P6.E6"], "EHS manager", "Collect quarterly stack monitoring reports for every boiler and DG set."),

  d("comp.register", "compliance", "Statutory compliance register; notices, fines and penalties", "Legal notices, penalties, settlements, appeals, regulator correspondence.", ["P1.E2", "P1.E3", "P6.E13"], "Legal", "Maintain one compliance register across plants, with every notice, penalty and appeal."),
  d("comp.consents", "compliance", "Consents to establish and operate; environmental statements", "Validity of CTE and CTO, conditions, Form V environmental statements.", ["P6.E13", "P6.E4", "P6.E12"], "EHS manager", "Track consent validity and conditions for every plant and file the annual environmental statements."),
  d("comp.assess", "compliance", "Health, safety and working-condition assessments", "Audits of plants for safety and working conditions, findings and corrective actions.", ["P3.E14", "P5.E10", "P3.E15"], "EHS manager", "Assess every plant each year on safety and working conditions and track the corrective actions."),

  d("site.ehs", "site", "Plant EHS procedures and permits", "Plant-level procedures, permits to work, emergency plans, safety committee minutes.", ["B.2", "P3.E10", "P3.E12"], "Plant head", "Adopt the group EHS procedures at the plant and keep the permits and safety committee minutes.", true),
  d("site.consent", "site", "Plant consent to operate and pollution-board returns", "CTO validity and conditions, monitoring returns, notices from the pollution board.", ["P6.E13", "P6.E4", "P6.E6"], "Plant head", "Renew the consent before expiry and file the monitoring returns the conditions require.", true),
  d("site.hr", "site", "Plant HR, contract labour and grievance records", "Contract labour licences and registers, minimum wages, grievance and POSH records at the plant.", ["P3.E6", "P5.E2", "A.20", "P5.E7"], "Plant head", "Keep contract labour registers, wage records and grievance logs at the plant and report them monthly.", true),
]

export const DOC_BY_ID = Object.fromEntries(DOC_CHECKLIST.map((x) => [x.id, x])) as Record<string, ReviewDoc>

export type Outcome = "adequate" | "partial" | "inadequate" | "missing"
export const OUTCOME_LABEL: Record<Outcome, string> = { adequate: "Adequate", partial: "Partly adequate", inadequate: "Not adequate", missing: "Not available" }
export const OUTCOME_ORDER: Outcome[] = ["missing", "inadequate", "partial", "adequate"]

export type DocReview = { outcome?: Outcome; file?: string; notes?: string; at: string; by: string }
export type DocReviewState = { reviews: Record<string, DocReview> }
export const EMPTY_DOC_REVIEW: DocReviewState = { reviews: {} }

export const reviewKey = (docId: string, siteId?: string) => (siteId ? `${docId}@${siteId}` : docId)

export type ReviewRow = { key: string; doc: ReviewDoc; site?: Site; review?: DocReview }

// Every review the assessment expects: corporate documents once, plant documents per plant.
export function reviewRows(state: DocReviewState, sites: Site[]): ReviewRow[] {
  const plants = sites.filter((s) => s.type === "factory" && s.status === "confirmed")
  const out: ReviewRow[] = []
  for (const doc of DOC_CHECKLIST) {
    if (doc.perPlant) for (const site of plants) out.push({ key: reviewKey(doc.id, site.id), doc, site, review: state.reviews[reviewKey(doc.id, site.id)] })
    else out.push({ key: doc.id, doc, review: state.reviews[doc.id] })
  }
  return out
}

export function worstOutcome(outcomes: Outcome[]): Outcome | undefined {
  return OUTCOME_ORDER.find((o) => outcomes.includes(o))
}

// BRSR areas the policies and procedures reviewed cover: the "material topics and
// all areas assessed by BRSR" check.
export const AREAS = ["A", "B", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "ISSB"] as const
export function areaOf(ref: string) {
  if (/^S[12]\./.test(ref)) return "ISSB"
  if (ref.startsWith("IMP.")) return "B"
  return ref.match(/^(P\d|A|B)/)?.[1] ?? "B"
}
export function coverage(rows: ReviewRow[]) {
  return AREAS.map((area) => {
    const docs = rows.filter((r) => r.doc.refs.some((x) => areaOf(x) === area))
    const reviewed = docs.filter((r) => r.review?.outcome)
    return {
      area,
      expected: docs.length,
      reviewed: reviewed.length,
      adequate: reviewed.filter((r) => r.review!.outcome === "adequate").length,
      gaps: reviewed.filter((r) => r.review!.outcome !== "adequate").length,
    }
  })
}
