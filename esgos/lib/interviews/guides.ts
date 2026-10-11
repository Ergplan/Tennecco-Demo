// Management interview guides (Phase 1B of a readiness assessment). One guide
// per function, plus one for each plant. Every question is tied to the BRSR
// questions (or implementation items) its answer evidences, and to one of four
// focus areas: who is accountable, whether policy is practised, how the data is
// produced and controlled, and what data exists today.

import type { StakeholderRole } from "../types"

export type Focus = "governance" | "practice" | "systems" | "availability"

export const FOCUS_LABEL: Record<Focus, string> = {
  governance: "Governance and accountability",
  practice: "Policy into practice",
  systems: "Data systems and controls",
  availability: "Data available today",
}

export type InterviewQuestion = {
  id: string
  focus: Focus
  text: string
  // BRSR question ids (catalogue) or implementation items (IMP.P1 … IMP.P9, IMP.metering).
  refs: string[]
  // What to ask to see, so the answer can be evidenced.
  evidence?: string
  // The recommendation when the answer is "partly" or "not in place".
  recommendation: string
}

export type GuideId = "cs" | "legal" | "finance" | "hr" | "ehs" | "operations" | "procurement" | "risk" | "audit" | "plant"

export type InterviewGuide = {
  id: GuideId
  title: string
  // Who usually sits in the interview, and the people seat to name them from.
  interviewee: string
  role: StakeholderRole
  purpose: string
  minutes: number
  questions: InterviewQuestion[]
}

const q = (id: string, focus: Focus, text: string, refs: string[], recommendation: string, evidence?: string): InterviewQuestion => ({ id, focus, text, refs, recommendation, evidence })

export const GUIDES: InterviewGuide[] = [
  {
    id: "cs",
    title: "Company secretarial",
    interviewee: "Company secretary",
    role: "Company secretary",
    purpose: "Board oversight of ESG, the policy set under the nine NGRBC principles, and the corporate details Section A asks for.",
    minutes: 60,
    questions: [
      q("cs.policies", "governance", "Which of the nine NGRBC principles are covered by a written policy today, and which policies has the Board approved?", ["B.1a", "B.1b", "B.12"], "Adopt one policy per NGRBC principle (or a combined responsible business policy) and take it to the Board for approval.", "Policy register, Board resolutions"),
      q("cs.weblink", "governance", "Are the policies published on the website, or ready to be?", ["B.1c"], "Publish the Board-approved policies on the investor section of the website.", "Website links"),
      q("cs.oversight", "governance", "Who is the highest authority responsible for implementing and overseeing the business responsibility policies? Is there a Board committee or a director for sustainability decisions?", ["B.8", "B.9"], "Constitute a Board-level ESG or CSR & Sustainability Committee with written terms of reference, and name the director responsible.", "Committee charter, Board minutes"),
      q("cs.review", "governance", "How often are the policies and their performance reviewed, by whom, and is non-compliance reported to the Board?", ["B.10"], "Set an annual Board review of ESG policies and a half-yearly review of performance by the committee.", "Review calendar, minutes"),
      q("cs.assessment", "governance", "Has any external agency assessed the working of the policies? Is an assurance or assessment provider being considered for BRSR Core?", ["B.11", "A.14", "A.15"], "Shortlist BRSR Core assessment or assurance providers with no consulting conflict and plan a readiness review in the first BRSR year.", "Engagement letters"),
      q("cs.materiality", "governance", "Has a materiality assessment been done? Which issues are material and how were stakeholders consulted?", ["A.26", "P4.E1", "P4.E2"], "Run a documented materiality assessment with stakeholder input and record the risk or opportunity for each material issue.", "Materiality report"),
      q("cs.entities", "availability", "Which subsidiaries, associates and joint ventures does the company have, and will they participate in its business responsibility initiatives?", ["A.23"], "Confirm the group structure for the offer document and record each entity's participation in BR initiatives.", "Shareholding chart"),
      q("cs.board", "availability", "How many women are on the Board and among key managerial personnel?", ["A.21"], "Keep a Board and KMP register by gender, updated at each change.", "Board and KMP register"),
      q("cs.conflicts", "practice", "How are Board conflicts of interest identified and managed? Were there complaints on conflicts of interest of directors or KMPs?", ["P1.E6", "P1.L2"], "Document the conflict-of-interest procedure for directors and KMPs and keep a register of declarations and complaints.", "Declarations register"),
      q("cs.chambers", "availability", "Which trade and industry chambers or associations is the company a member of?", ["P7.E1"], "Keep a list of memberships with the level (state or national).", "Membership list"),
    ],
  },
  {
    id: "legal",
    title: "Legal",
    interviewee: "Head of legal",
    role: "Company secretary",
    purpose: "Ethics, anti-corruption, regulatory actions, environmental compliance, consumer cases and data privacy.",
    minutes: 45,
    questions: [
      q("legal.abc", "governance", "Is there an anti-corruption and anti-bribery policy? Who owns it and how is it communicated?", ["P1.E4"], "Adopt an anti-bribery and anti-corruption policy, train senior staff on it and publish it.", "ABC policy, training records"),
      q("legal.fines", "availability", "Were there fines, penalties, settlements or non-monetary actions by regulators, law enforcement or courts in the year, and are any under appeal?", ["P1.E2", "P1.E3"], "Keep a litigation and regulatory-action register that separates monetary and non-monetary actions and records appeals.", "Litigation register"),
      q("legal.corruption", "practice", "Were there disciplinary actions or cases for bribery or corruption, and what corrective action followed?", ["P1.E5", "P1.E7"], "Record disciplinary outcomes for bribery and corruption cases and the corrective actions taken.", "Vigilance or HR case log"),
      q("legal.environment", "practice", "Is every plant compliant with the Air Act, Water Act, Environment Protection Act and rules? Are there show-cause notices or pending consents?", ["P6.E13", "P6.E12"], "Maintain a consent-to-operate tracker per plant with validity dates and a register of notices and their closure.", "CTO tracker, notices"),
      q("legal.consumer", "availability", "How many consumer complaints, cases and product recalls were there, and what corrective actions were taken?", ["P9.E3", "P9.E4", "P9.E6"], "Track consumer complaints by BRSR category (data privacy, advertising, safety, restrictive practices) and recalls with their root cause.", "Complaints register"),
      q("legal.privacy", "systems", "Is there a cyber security and data privacy policy? Were there data breaches involving customer data?", ["P9.E5", "P9.E7"], "Adopt a data privacy policy and keep an incident log that flags breaches involving personal data.", "Privacy policy, incident log"),
      q("legal.competition", "availability", "Were there adverse orders for anti-competitive conduct, and what positions does the company advocate on public policy?", ["P7.E2", "P7.L1"], "Record public policy advocacy through industry bodies and any competition-law orders.", "Advocacy notes"),
      q("legal.hrclauses", "practice", "Do business agreements with suppliers and distributors include human rights clauses?", ["P5.E9"], "Add human rights and labour clauses to standard supplier and distributor contracts.", "Contract templates"),
    ],
  },
  {
    id: "finance",
    title: "Finance",
    interviewee: "CFO / finance head",
    role: "Finance controller",
    purpose: "Turnover and denominators, payables, concentration, CSR, sustainable capex, wages and the systems that produce them.",
    minutes: 60,
    questions: [
      q("fin.turnover", "availability", "Is turnover available by business activity, product (NIC code) and market (domestic and exports)?", ["A.16", "A.17", "A.19"], "Map revenue to NIC codes and markets in the ERP so Section A can be produced from the ledger.", "Revenue by product and market"),
      q("fin.denominator", "systems", "Which revenue figure will be used for intensity ratios (revenue from operations, PPP-adjusted), and who signs it off?", ["P6.E1", "P6.E3", "P6.E7", "P6.E9"], "Fix the intensity denominators (revenue from operations, and PPP-adjusted revenue) and the sign-off owner.", "Audited financials"),
      q("fin.payables", "availability", "Can accounts payable days, and purchase and sales concentration (top 10 suppliers, dealers, related parties), be produced from the ERP?", ["P1.E8", "P1.E9"], "Build standard ERP reports for payable days, top-10 concentration and related-party shares; these are BRSR Core.", "ERP reports"),
      q("fin.csr", "availability", "What were the CSR obligation and spend, and in which districts?", ["A.24", "P8.L2", "P8.L6"], "Keep CSR spend by project and district with beneficiary counts.", "CSR annexure"),
      q("fin.capex", "availability", "How much R&D and capex went to technologies that improve environmental and social impact?", ["P2.E1"], "Tag sustainability capex and R&D in the fixed-asset and project codes.", "Capex register"),
      q("fin.wellbeing", "availability", "What was spent on employee well-being (insurance, maternity, day care) as a share of revenue?", ["P3.E1"], "Tag well-being spend in the ledger; this is a BRSR Core metric.", "Ledger extract"),
      q("fin.msme", "availability", "What share of input material is bought from MSMEs and small producers, and from within India?", ["P8.E4"], "Flag MSME suppliers in the vendor master (Udyam registration) and report purchases by flag.", "Vendor master"),
      q("fin.wages", "systems", "Can median remuneration by gender and category, and gross wages paid to women, be produced from payroll?", ["P5.E3", "P8.E5"], "Build a payroll report for median remuneration and wages by gender and location class; both are BRSR Core.", "Payroll report"),
      q("fin.controls", "systems", "Which ESG numbers pass through financial controls today (maker-checker, reconciliation, audit trail)?", ["IMP.metering"], "Extend financial controls (maker-checker, monthly reconciliation, audit trail) to the BRSR Core metrics.", "Controls matrix"),
    ],
  },
  {
    id: "hr",
    title: "Human resources",
    interviewee: "HR head",
    role: "HR manager",
    purpose: "Headcount, benefits, diversity, grievances, training, human rights and the HR systems behind them.",
    minutes: 60,
    questions: [
      q("hr.headcount", "systems", "Does one system hold headcount for every plant, including contract and other-than-permanent workers, by gender and category?", ["A.20", "A.22"], "Bring contract workers into the HRMS (or a contractor register with monthly uploads) so headcount covers every plant and category.", "HRMS extract"),
      q("hr.benefits", "availability", "What share of employees and workers get health insurance, accident insurance, maternity and paternity benefits, day care, PF, gratuity and ESI?", ["P3.E1", "P3.E2"], "Report benefit coverage by category and gender from payroll.", "Benefit coverage report"),
      q("hr.parental", "availability", "Are return-to-work and retention after parental leave tracked?", ["P3.E5"], "Track parental leave, return and 12-month retention by gender.", "Leave records"),
      q("hr.grievance", "practice", "Is there a grievance mechanism for permanent and contract workers, and is it used at every plant?", ["P3.E6", "P5.E5"], "Set up a grievance mechanism that covers contract workers at every plant, with a log and closure times.", "Grievance log"),
      q("hr.unions", "availability", "What share of employees and workers are members of unions or associations?", ["P3.E7"], "Record union membership by category.", "Union records"),
      q("hr.training", "availability", "Are health and safety, skill and human rights training hours tracked by category and gender?", ["P3.E8", "P1.E1", "P5.E1"], "Use the LMS (or a training register) to track hours by topic, category and gender at every plant.", "Training register"),
      q("hr.reviews", "availability", "What share of staff received performance and career development reviews?", ["P3.E9"], "Report review coverage from the appraisal system.", "Appraisal report"),
      q("hr.wages", "practice", "Are minimum wages verified for permanent and contract workers, including contractor payrolls?", ["P5.E2", "P3.L2"], "Check contractor wage registers and statutory deposits monthly at each plant.", "Wage registers"),
      q("hr.posh", "practice", "Is there a POSH policy with internal committees at every plant, and how are complainants protected?", ["P5.E7", "P5.E8"], "Constitute an internal committee at every plant and report POSH complaints; this is BRSR Core.", "IC constitution, complaints log"),
      q("hr.equal", "governance", "Is there an equal opportunity policy under the RPwD Act, and are workplaces accessible?", ["P3.E3", "P3.E4"], "Adopt an equal opportunity policy and audit plant accessibility.", "Policy, audit"),
    ],
  },
  {
    id: "ehs",
    title: "Environment, health and safety",
    interviewee: "Corporate EHS head",
    role: "EHS manager",
    purpose: "Safety management, incidents, water, waste, emissions, EPR and environmental compliance across plants.",
    minutes: 75,
    questions: [
      q("ehs.ohs", "governance", "Is there an occupational health and safety management system (for example ISO 45001) and does it cover every plant?", ["P3.E10", "P3.E12"], "Roll out one OHS management system across plants with common hazard-identification and incident procedures.", "OHS manual, certificates"),
      q("ehs.incidents", "systems", "How are injuries, lost-time injuries and person-hours recorded at each plant? Are contract workers included?", ["P3.E11", "P3.E13", "P3.E15"], "Use one incident register format at every plant, including contract workers, with person-hours from attendance; LTIFR is BRSR Core.", "Incident registers"),
      q("ehs.assess", "practice", "Were plants assessed on health and safety and working conditions in the year, and were actions closed?", ["P3.E14", "P5.E10", "P5.E11"], "Plan annual H&S and working-conditions assessments for every plant and track actions to closure.", "Audit reports"),
      q("ehs.water", "systems", "Is water withdrawal metered by source at each plant, and is discharge measured at the ETP outlet?", ["P6.E3", "P6.E4", "P6.E5", "P6.L1"], "Install flow meters by source and at ETP outlets, and log readings monthly; water is BRSR Core.", "Meter logs, CGWA NOC"),
      q("ehs.waste", "systems", "Is waste recorded by BRSR category (plastic, e-waste, bio-medical, battery, hazardous, other) with disposal method?", ["P6.E9", "P6.E10"], "Keep a waste register by BRSR category and disposal route at every plant, matched to manifests; waste is BRSR Core.", "Waste register, Form 10"),
      q("ehs.air", "availability", "Are stack emissions (NOx, SOx, PM) monitored, and by whom?", ["P6.E6"], "Collect stack monitoring results per plant from the accredited lab reports.", "Stack monitoring reports"),
      q("ehs.ghg", "systems", "Has a Scope 1 and 2 inventory been prepared, with which emission factors? Is Scope 3 screened?", ["P6.E7", "P6.L2", "P6.E8"], "Prepare a GHG inventory with fixed factors (CEA grid, IPCC fuels) and screen Scope 3 categories.", "GHG workbook"),
      q("ehs.epr", "practice", "Is the company registered for EPR on plastic packaging, and are annual targets met?", ["P2.E4", "P2.L4"], "Confirm EPR registration and keep annual target and certificate records.", "EPR portal records"),
      q("ehs.sensitive", "availability", "Are any plants in or near ecologically sensitive areas, and were EIAs needed for projects?", ["P6.E11", "P6.E12"], "Screen every plant against protected areas and record EIA status for new plants and expansions.", "Site screening"),
      q("ehs.bcp", "governance", "Is there a business continuity and disaster management plan?", ["P6.L5"], "Document a business continuity plan covering plants and key suppliers.", "BCP document"),
    ],
  },
  {
    id: "operations",
    title: "Operations",
    interviewee: "Head of operations / manufacturing",
    role: "Plant head",
    purpose: "How group standards reach plants, production data, energy management and product stewardship.",
    minutes: 45,
    questions: [
      q("ops.standards", "governance", "Who in operations owns ESG at plant level? Are group EHS and energy standards the same across plants?", ["IMP.P6", "B.2"], "Name an ESG coordinator at each plant and issue one set of group operating standards.", "Organisation chart"),
      q("ops.production", "systems", "Is production output recorded in the ERP by plant and month, in tonnes?", ["P6.E1", "P6.E3", "P6.E9"], "Use ERP production in tonnes as the physical-intensity denominator for every plant.", "ERP production report"),
      q("ops.energy", "systems", "How is energy recorded: bills, meters or estimates? Are fuels for boilers and DG sets recorded by quantity?", ["P6.E1", "IMP.metering"], "Record electricity from bills or meters and fuels from invoices and stock registers, monthly per plant; replace estimates.", "Bills, fuel registers"),
      q("ops.efficiency", "practice", "Which energy-efficiency or emission-reduction projects ran in the year, with what savings?", ["P6.E8", "P6.L4", "P6.E2"], "Keep a project register with measured savings.", "Project register"),
      q("ops.certs", "availability", "Which plants hold certifications (FSSC 22000, BRCGS, ISO 14001, ISO 45001, ISO 50001)?", ["B.4", "FBPF.food-safety-audits"], "Keep a certificate register by plant with validity dates.", "Certificates"),
      q("ops.lca", "availability", "Have life-cycle assessments been done for any product or pack?", ["P2.L1", "P2.L2"], "Run an LCA on the largest product line and its packaging.", "LCA reports"),
    ],
  },
  {
    id: "procurement",
    title: "Procurement",
    interviewee: "Procurement head",
    role: "Procurement head",
    purpose: "Sustainable sourcing, MSME purchases, supplier assessments and the value chain.",
    minutes: 45,
    questions: [
      q("proc.sourcing", "practice", "Is there a sustainable sourcing procedure, and what share of inputs is sourced sustainably (for example certified palm oil)?", ["P2.E2", "P2.L3"], "Adopt a sustainable sourcing policy with criteria for key inputs (edible oil, packaging, pulses) and track the certified share.", "Sourcing policy"),
      q("proc.code", "governance", "Do suppliers sign a code of conduct covering labour, human rights and environment?", ["B.3", "P5.E9"], "Issue a supplier code of conduct and require acknowledgement at onboarding.", "Supplier code"),
      q("proc.assess", "practice", "Are suppliers assessed on health and safety, human rights and environmental impact? What share by value?", ["P3.L5", "P5.L4", "P6.L7"], "Assess the top suppliers by spend on H&S, human rights and environment and track corrective actions.", "Assessment records"),
      q("proc.vcp", "availability", "Which suppliers and dealers make up 2% or more of purchases or sales (value-chain partners under BRSR Core)?", ["IMP.valuechain", "P1.L1"], "List value-chain partners at the 2% threshold and plan data requests for the Core KPIs.", "Spend analysis"),
      q("proc.msme", "systems", "Is MSME status recorded in the vendor master?", ["P8.E4", "P8.L3"], "Record Udyam numbers in the vendor master so MSME purchases are reported automatically.", "Vendor master"),
    ],
  },
  {
    id: "risk",
    title: "Risk",
    interviewee: "Chief risk officer / risk owner",
    role: "Finance controller",
    purpose: "Whether ESG and climate risks sit in the risk register, and continuity planning.",
    minutes: 30,
    questions: [
      q("risk.register", "governance", "Does the enterprise risk register include ESG and climate risks, with owners and mitigations?", ["A.26", "S1.rm", "S2.rm"], "Add ESG and climate risks to the risk register with owners, ratings and mitigation.", "Risk register"),
      q("risk.climate", "practice", "Have physical and transition climate risks been assessed for plants and key sourcing regions?", ["S2.str.ro", "S2.str.resilience", "S2.mt.physical"], "Run a climate risk screening for plants and sourcing regions and a simple scenario analysis.", "Risk assessment"),
      q("risk.bcp", "practice", "Are continuity plans tested for plant outages, supply disruption and water stress?", ["P6.L5", "P6.L1"], "Test continuity plans annually, including water stress at plants in stressed areas.", "BCP test reports"),
    ],
  },
  {
    id: "audit",
    title: "Internal audit",
    interviewee: "Head of internal audit",
    role: "Finance controller",
    purpose: "Controls over ESG data and readiness for BRSR Core assessment or assurance.",
    minutes: 30,
    questions: [
      q("audit.scope", "governance", "Has internal audit reviewed any ESG data or process? Is BRSR in next year's audit plan?", ["IMP.metering", "A.14"], "Add BRSR Core data and controls to the internal audit plan before the first assurance.", "Audit plan"),
      q("audit.trail", "systems", "Can each Core number be traced to a source document (bill, register, manifest) with a review sign-off?", ["P6.E1", "P6.E3", "P6.E9", "P3.E11", "P6.E7"], "Set a document retention rule and a maker-checker sign-off for every BRSR Core number.", "Sample trace"),
      q("audit.policy", "practice", "Has the working of ESG policies been tested in any audit?", ["B.11", "IMP.P1"], "Test the implementation of two or three ESG policies each year in internal audit.", "Audit reports"),
    ],
  },
  {
    id: "plant",
    title: "Plant",
    interviewee: "Plant head with EHS and HR",
    role: "Plant head",
    purpose: "Whether group policies are practised at this plant, and how its data is recorded today.",
    minutes: 60,
    questions: [
      q("plant.policies", "practice", "Which group policies (ethics, safety, human rights, environment, grievance) are known and applied here? Is there plant-level training?", ["IMP.P1", "IMP.P3", "IMP.P5", "IMP.P6"], "Brief plant staff on group policies and keep plant-level training attendance.", "Training attendance"),
      q("plant.energy", "systems", "Is electricity read from bills or meters every month? Are DG and boiler fuels recorded by quantity?", ["P6.E1", "IMP.metering"], "Record this plant's monthly electricity from bills (kWh and kVAh) and fuels from invoices; stop estimating.", "Bills, fuel register"),
      q("plant.water", "systems", "Is water withdrawal metered by source and is ETP discharge measured?", ["P6.E3", "P6.E4"], "Install and read water meters monthly at this plant.", "Meter log"),
      q("plant.waste", "systems", "Is there a waste register with categories and disposal manifests?", ["P6.E9"], "Keep the waste register by BRSR category, matched to manifests.", "Waste register"),
      q("plant.safety", "systems", "Are injuries and person-hours recorded for employees and contract workers?", ["P3.E11"], "Record injuries and person-hours for contract workers too.", "Incident register"),
      q("plant.contract", "availability", "How many contract workers work here, through which contractors, and are their wages and statutory dues checked?", ["A.20", "P5.E2", "P3.L2"], "Keep a monthly contractor headcount and wage-compliance check.", "Contractor register"),
      q("plant.consents", "practice", "Are the consent to operate, factory licence, FSSAI licence and boiler certificates valid?", ["P6.E13"], "Track permit validity at this plant with renewal reminders.", "Permits"),
      q("plant.grievance", "practice", "Can workers, including contract workers, raise grievances, and how are they closed?", ["P3.E6", "P5.E5"], "Put up the grievance channel at the plant and log every case.", "Grievance log"),
    ],
  },
]

export const GUIDE_BY_ID = Object.fromEntries(GUIDES.map((g) => [g.id, g])) as Record<GuideId, InterviewGuide>

export function questionById(id: string): { guide: InterviewGuide; question: InterviewQuestion } | undefined {
  for (const g of GUIDES) {
    const question = g.questions.find((x) => x.id === id)
    if (question) return { guide: g, question }
  }
  return undefined
}
