// Seeded indicator catalogue: a representative BRSR / BRSR Core set (48 entries).
// Not the full BRSR. Each indicator lists the inputs it needs; lib/gapEngine.ts
// defines which sources can satisfy each input and resolves them.

import type { IndicatorWeight } from "./types"

export type Principle = "A" | "B" | "P1" | "P2" | "P3" | "P5" | "P6" | "P8" | "P9"

export type Indicator = {
  id: string
  principle: Principle
  title: string
  short: string
  weight: IndicatorWeight
  inputs: string[]
}

export const PRINCIPLE_LABELS: Record<Principle, string> = {
  A: "General disclosures",
  B: "Management and process",
  P1: "P1 Ethics and transparency",
  P2: "P2 Sustainable products",
  P3: "P3 Employee well-being",
  P5: "P5 Human rights",
  P6: "P6 Environment",
  P8: "P8 Inclusive growth",
  P9: "P9 Consumer value",
}

export const INDICATORS: Indicator[] = [
  // Section A — general disclosures
  { id: "A.I.1", principle: "A", short: "Identity", title: "Corporate identity and listing details", weight: "essential", inputs: ["entity.master"] },
  { id: "A.I.13", principle: "A", short: "Boundary", title: "Reporting boundary (standalone or consolidated)", weight: "essential", inputs: ["boundary"] },
  { id: "A.I.14", principle: "A", short: "Assurance", title: "Assurance provider for BRSR Core", weight: "core", inputs: ["assurance"] },
  { id: "A.II.16", principle: "A", short: "Activities", title: "Business activities and products", weight: "essential", inputs: ["products"] },
  { id: "A.II.17", principle: "A", short: "Turnover mix", title: "Products and services by share of turnover", weight: "essential", inputs: ["erp.finance"] },
  { id: "A.III.18", principle: "A", short: "Locations", title: "Number of plants and offices", weight: "essential", inputs: ["sites.register"] },
  { id: "A.IV.20", principle: "A", short: "Workforce", title: "Employees and workers, including contract workers", weight: "essential", inputs: ["people.hrms", "contract.workers"] },
  { id: "A.V.23", principle: "A", short: "Group cos.", title: "Holding, subsidiary, associate and JV companies", weight: "essential", inputs: ["entity.tree"] },
  { id: "A.VI.24", principle: "A", short: "CSR", title: "CSR applicability, turnover and net worth", weight: "essential", inputs: ["annualReport"] },
  { id: "A.VII.26", principle: "A", short: "Material issues", title: "Material responsible business conduct issues", weight: "essential", inputs: ["materiality"] },
  // Section B — management and process
  { id: "B.1", principle: "B", short: "Policies", title: "Policies covering the nine principles", weight: "essential", inputs: ["policy.esg"] },
  { id: "B.5", principle: "B", short: "Targets", title: "Specific commitments, goals and targets", weight: "essential", inputs: ["targets"] },
  { id: "B.8", principle: "B", short: "Responsibility", title: "Director responsible for the BRSR", weight: "essential", inputs: ["annualReport"] },
  // P1
  { id: "P1.E1", principle: "P1", short: "Board training", title: "Training on the principles for board and KMP", weight: "essential", inputs: ["annualReport"] },
  { id: "P1.E2", principle: "P1", short: "Fines", title: "Fines, penalties and settlements", weight: "essential", inputs: ["annualReport"] },
  { id: "P1.E4", principle: "P1", short: "Anti-bribery", title: "Anti-corruption and anti-bribery policy", weight: "essential", inputs: ["policy.code"] },
  { id: "P1.E5", principle: "P1", short: "Disciplinary", title: "Disciplinary action for bribery or corruption", weight: "essential", inputs: ["policy.code"] },
  { id: "P1.E6", principle: "P1", short: "Conflicts", title: "Complaints on conflict of interest", weight: "essential", inputs: ["policy.whistleblower"] },
  { id: "P1.E8", principle: "P1", short: "Payable days", title: "Accounts payable days", weight: "core", inputs: ["erp.finance"] },
  { id: "P1.E9", principle: "P1", short: "Concentration", title: "Openness of business: purchase and sales concentration", weight: "core", inputs: ["erp.finance"] },
  // P2
  { id: "P2.E1", principle: "P2", short: "R&D capex", title: "R&D and capex on sustainability", weight: "essential", inputs: ["erp.finance"] },
  { id: "P2.E2", principle: "P2", short: "Sourcing", title: "Sustainable sourcing procedures", weight: "essential", inputs: ["erp.finance"] },
  { id: "P2.E4", principle: "P2", short: "EPR", title: "Extended producer responsibility for plastic packaging", weight: "essential", inputs: ["epr"] },
  // P3
  { id: "P3.E1", principle: "P3", short: "Well-being spend", title: "Spending on well-being of employees and workers", weight: "core", inputs: ["erp.finance"] },
  { id: "P3.E2", principle: "P3", short: "Retirement", title: "Retirement benefits (PF, gratuity, ESI)", weight: "essential", inputs: ["statutory"] },
  { id: "P3.E4", principle: "P3", short: "Equal opp.", title: "Equal opportunity policy", weight: "essential", inputs: ["policy.posh"] },
  { id: "P3.E6", principle: "P3", short: "Grievances", title: "Grievance redressal mechanism", weight: "essential", inputs: ["policy.whistleblower"] },
  { id: "P3.E10", principle: "P3", short: "H&S system", title: "Health and safety management system", weight: "essential", inputs: ["ehs.system"] },
  { id: "P3.E11", principle: "P3", short: "Safety", title: "Safety incidents (LTIFR, fatalities)", weight: "core", inputs: ["incidents"] },
  // P5
  { id: "P5.E1", principle: "P5", short: "Human rights", title: "Human rights policy and training", weight: "essential", inputs: ["policy.humanRights"] },
  { id: "P5.E2", principle: "P5", short: "Min. wages", title: "Minimum wages paid", weight: "essential", inputs: ["erp.payroll"] },
  { id: "P5.E6", principle: "P5", short: "POSH", title: "Complaints on sexual harassment and discrimination", weight: "core", inputs: ["policy.posh"] },
  // P6
  { id: "P6.E1.elec", principle: "P6", short: "Electricity", title: "Electricity consumption by source", weight: "core", inputs: ["elec"] },
  { id: "P6.E1.fuel", principle: "P6", short: "Fuel", title: "Fuel consumption", weight: "core", inputs: ["fuel.boiler", "dg.fuel"] },
  { id: "P6.E1.intensity", principle: "P6", short: "Energy intensity", title: "Energy intensity per rupee and per tonne", weight: "core", inputs: ["elec", "fuel.boiler", "output", "annualReport"] },
  { id: "P6.E3.withdrawal", principle: "P6", short: "Water", title: "Water withdrawal by source", weight: "core", inputs: ["water.withdrawal"] },
  { id: "P6.E4", principle: "P6", short: "Discharge", title: "Water discharge by destination and treatment", weight: "core", inputs: ["discharge"] },
  { id: "P6.E5", principle: "P6", short: "ZLD", title: "Zero liquid discharge mechanism", weight: "essential", inputs: ["discharge"] },
  { id: "P6.E7.scope1", principle: "P6", short: "Scope 1", title: "Scope 1 emissions (fuel and refrigerants)", weight: "core", inputs: ["fuel.boiler", "dg.fuel", "refrigerant"] },
  { id: "P6.E7.scope2", principle: "P6", short: "Scope 2", title: "Scope 2 emissions (purchased electricity)", weight: "core", inputs: ["elec"] },
  { id: "P6.E9", principle: "P6", short: "Waste", title: "Waste generated by category", weight: "core", inputs: ["waste"] },
  { id: "P6.E11", principle: "P6", short: "Sensitive areas", title: "Operations in or near ecologically sensitive areas", weight: "essential", inputs: ["sites.register"] },
  { id: "P6.E13", principle: "P6", short: "Permits", title: "Environmental approvals and compliance (CTO, CTE)", weight: "essential", inputs: ["permits"] },
  { id: "P6.L2", principle: "P6", short: "Scope 3", title: "Scope 3 emissions", weight: "leadership", inputs: ["scope3"] },
  // P8
  { id: "P8.E4", principle: "P8", short: "MSME sourcing", title: "Input material sourced from MSMEs and small producers", weight: "core", inputs: ["erp.finance"] },
  { id: "P8.E5", principle: "P8", short: "Smaller towns", title: "Job creation in smaller towns (wages by location)", weight: "core", inputs: ["erp.payroll", "sites.register"] },
  // P9
  { id: "P9.E3", principle: "P9", short: "Complaints", title: "Consumer complaints, including data privacy", weight: "core", inputs: ["erp.crm"] },
  { id: "P9.E4", principle: "P9", short: "Recalls", title: "Product recalls on safety grounds", weight: "essential", inputs: ["erp.quality"] },
]

export const INDICATOR_BY_ID: Record<string, Indicator> = Object.fromEntries(INDICATORS.map((i) => [i.id, i]))

// Friendly references used in gap cards ("P6 E1", "Scope 1").
export function indicatorRef(id: string): string {
  if (id === "P6.E7.scope1") return "Scope 1"
  if (id === "P6.E7.scope2") return "Scope 2"
  if (id === "P6.L2") return "Scope 3"
  if (id === "P6.E1.intensity") return "intensity metrics"
  const base = id.replace(/\.(elec|fuel|withdrawal)$/, "")
  return base.startsWith("P") ? base.replace(/\./g, " ") : base
}

export function indicatorLabel(id: string): string {
  const ind = INDICATOR_BY_ID[id]
  return ind ? `${ind.id} ${ind.title}` : id
}
