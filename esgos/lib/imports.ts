import type { StakeholderRole } from "./types"

// Client data import: CSV or Excel exports (site list, people, ergOS energy,
// HRMS headcount, documents). Imported rows feed the same providers the demo
// uses, so a client's own data replaces every "awaiting data" state.

export type ImportKind = "sites" | "people" | "energy" | "headcount" | "erp" | "ehs" | "documents"

export type EnergyRow = {
  site: string
  ergosSiteId: string
  period: string
  annualMWh: number
  gridShare: number
  solarShare: number
  windShare: number
  rooftopShare: number
  exchangeShare: number
  peakMW?: number
  contractedMW?: number
  completeness: number
  dgDieselKL?: number
  steamTonnes?: number
  waterKL?: number
  meters: string[]
  // Where the row came from when it is not an ergOS export (a client's own file),
  // and how it was worked out. Shown on the value and in the energy layer.
  label?: string
  note?: string
  basis?: string
  // Match on the exact site name only (many plants share a city).
  exact?: boolean
}
export type HeadcountRow = { site: string; permanent: number; contract: number; extractDate: string }
export type DocumentRow = { site?: string; kind: "permit" | "invoice" | "policy" | "report" | "certificate"; topic: string; fileName: string; validTo?: string; period?: string }
export type PersonRow = { site?: string; name: string; role: string; email?: string; phone?: string }
export type ErpRow = { site: string; plantCode: string; products?: string; fuels: string[]; fuelQuantity?: number; fuelUnit?: string; output?: { value: number; unit: string } }
export type EhsRow = { site: string; wasteStreams: string[]; disposal: string; incidents: number; ltifr: number }

export type ImportedData = {
  energy: EnergyRow[]
  headcount: HeadcountRow[]
  erp: ErpRow[]
  ehs: EhsRow[]
  documents: DocumentRow[]
  files: { kind: ImportKind; fileName: string; rows: number; at: string }[]
}

export const EMPTY_IMPORTS: ImportedData = { energy: [], headcount: [], erp: [], ehs: [], documents: [], files: [] }

let current: ImportedData = EMPTY_IMPORTS

export function getImports(): ImportedData {
  return current
}

export function setImports(d: Partial<ImportedData> | undefined) {
  current = { ...EMPTY_IMPORTS, ...(d ?? {}) }
}

// What each import is, where it comes from, who usually has it and what it fills.
export type Template = {
  file: string
  title: string
  system: string
  owner: StakeholderRole
  fills: string
  columns: string[]
  required: string[]
  help: Record<string, string>
  example: string[]
  note: string
}

export const TEMPLATES: Record<ImportKind, Template> = {
  sites: {
    file: "esgos-sites-template.csv",
    title: "Site list",
    system: "Plant master in the ERP, the admin register, or any spreadsheet",
    owner: "ESG lead",
    fills: "Every plant, office and warehouse, so the footprint matches the counts in the BRSR.",
    columns: ["name", "type", "address", "city", "state", "entity", "gstin"],
    required: ["name", "city"],
    help: { name: "Site name as you use it", type: "factory, office or warehouse", address: "Street address (improves the map pin)", city: "Town or city", state: "State", entity: "Legal entity that owns or leases it", gstin: "GSTIN registered at this address, if any" },
    example: ["Khandala plant", "factory", "Plot 3, MIDC Khandala", "Khandala", "Maharashtra", "Example Limited", ""],
    note: "One row per plant, office or warehouse.",
  },
  people: {
    file: "esgos-people-template.csv",
    title: "People and roles",
    system: "HR directory or org chart",
    owner: "HR manager",
    fills: "Names on the role seats at each site, so every question goes to a person.",
    columns: ["site", "name", "role", "email", "phone"],
    required: ["name", "role"],
    help: { site: "Site name; blank for group roles", name: "Full name", role: "Plant head, EHS manager, HR manager, Energy manager, Maintenance head, Finance controller, Procurement head, Company secretary, ESG lead, Office admin, IT / ERP owner or Quality head", email: "Work email", phone: "Optional" },
    example: ["Khandala plant", "Full Name", "EHS manager", "name@example.com", ""],
    note: "One row per person.",
  },
  energy: {
    file: "esgos-energy-template.csv",
    title: "Energy by site",
    system: "ergOS export (site energy summary), or a summary of the year's electricity bills and meter readings",
    owner: "Energy manager",
    fills: "Electricity by source per plant: P6 E1 energy, Scope 2, renewable share. Removes the meter questions.",
    columns: ["site", "ergos_site_id", "period", "annual_mwh", "grid_share", "solar_share", "wind_share", "rooftop_share", "exchange_share", "peak_mw", "contracted_mw", "completeness", "dg_diesel_kl", "steam_t", "water_kl", "meters"],
    required: ["site", "annual_mwh"],
    help: {
      site: "Site name as on the site list",
      ergos_site_id: "ergOS site id, if on ergOS",
      period: "e.g. Apr 2025 – Mar 2026",
      annual_mwh: "Electricity used in the year, MWh",
      grid_share: "Share from the grid (0.62 = 62%)",
      solar_share: "Open-access or captive solar share",
      wind_share: "Wind share",
      rooftop_share: "Rooftop solar share",
      exchange_share: "Power-exchange share",
      peak_mw: "Peak demand, MW",
      contracted_mw: "Contract demand, MW",
      completeness: "Share of the year covered by data (1 = full)",
      dg_diesel_kl: "Diesel used in DG sets, kL",
      steam_t: "Steam, tonnes (if metered)",
      water_kl: "Water withdrawn, kL (if metered)",
      meters: "Meters on site, separated by ; (grid, solar, wind, rooftop, dg, steam, water)",
    },
    example: ["Khandala plant", "ERG-KHD-01", "Apr 2025 – Mar 2026", "12000", "0.62", "0.30", "0", "0.08", "0", "2.4", "3.0", "0.97", "40", "", "85000", "grid;solar;rooftop;dg;water"],
    note: "One row per site. Shares are fractions of annual electricity.",
  },
  headcount: {
    file: "esgos-headcount-template.csv",
    title: "Headcount by site",
    system: "HRMS headcount report (SuccessFactors, Darwinbox, Workday or payroll)",
    owner: "HR manager",
    fills: "Permanent and contract headcount per site: Section A Q20 and safety-rate denominators.",
    columns: ["site", "permanent", "contract", "extract_date"],
    required: ["site", "permanent"],
    help: { site: "Site name as on the site list", permanent: "Permanent employees and workers on 31 March", contract: "Contract and other-than-permanent workers", extract_date: "Date of the report" },
    example: ["Khandala plant", "420", "160", "31 Mar 2026"],
    note: "One row per site.",
  },
  erp: {
    file: "esgos-erp-template.csv",
    title: "Fuel and production by plant",
    system: "ERP fuel purchases and production postings by plant code (SAP MM/PP, Oracle, Tally)",
    owner: "IT / ERP owner",
    fills: "Fuel quantities, products and annual output: P6 E1 fuels, Scope 1, intensity per unit. Removes the boiler and production questions.",
    columns: ["site", "plant_code", "products", "fuels", "fuel_quantity", "fuel_unit", "output", "output_unit"],
    required: ["site"],
    help: {
      site: "Plant name as on the site list",
      plant_code: "ERP plant code",
      products: "What the plant makes",
      fuels: "Fuels bought, separated by ; (PNG, LPG, HSD, furnace oil, coal, biomass)",
      fuel_quantity: "Total fuel bought in the year",
      fuel_unit: "SCM, kL, tonnes or kg",
      output: "Production in the year",
      output_unit: "tonnes, KL or million packs",
    },
    example: ["Khandala plant", "KHD1", "Decorative paints", "PNG;HSD", "1250000", "SCM", "185000", "KL"],
    note: "One row per plant.",
  },
  ehs: {
    file: "esgos-ehs-template.csv",
    title: "Safety and waste by plant",
    system: "EHS system, or the plant's incident register and hazardous-waste returns",
    owner: "EHS manager",
    fills: "Recordable incidents, LTIFR and waste streams per plant: P3 E11 safety and P6 E9 waste.",
    columns: ["site", "waste_streams", "disposal", "incidents", "ltifr"],
    required: ["site"],
    help: {
      site: "Plant name as on the site list",
      waste_streams: "Waste types, separated by ; (hazardous, plastic, e-waste, paper, metal, sludge)",
      disposal: "Where it goes (TSDF, authorised recycler, co-processing)",
      incidents: "Recordable work-related injuries in the year",
      ltifr: "Lost-time injury frequency rate per million person-hours",
    },
    example: ["Khandala plant", "Hazardous;Plastic;Paper", "TSDF and authorised recyclers", "2", "0.15"],
    note: "One row per plant.",
  },
  documents: {
    file: "esgos-documents-template.csv",
    title: "Documents",
    system: "Document vault or shared-drive index",
    owner: "EHS manager",
    fills: "Consents to operate, policies and certificates: evidence for P6 E13 compliance and the policy disclosures.",
    columns: ["site", "kind", "topic", "file_name", "valid_to"],
    required: ["kind", "file_name"],
    help: { site: "Site name; blank for group documents", kind: "permit, invoice, policy, report or certificate", topic: "e.g. Consent to Operate (Water and Air Acts)", file_name: "File name in your vault", valid_to: "Expiry date, YYYY-MM-DD" },
    example: ["Khandala plant", "permit", "Consent to Operate (Water and Air Acts)", "CTO_Khandala_2024-29.pdf", "2029-03-31"],
    note: "One row per document.",
  },
}

export function templateCsv(kind: ImportKind) {
  const t = TEMPLATES[kind]
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return `${t.columns.join(",")}\n${t.example.map(esc).join(",")}\n`
}

// RFC 4180-ish CSV parser (quotes, escaped quotes, CRLF).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ",") {
      row.push(cell)
      cell = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell)
      if (row.some((x) => x.trim())) rows.push(row)
      row = []
      cell = ""
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim())) rows.push(row)
  return rows
}

export async function readTable(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/universal")
    const data = await readSheet(await file.arrayBuffer())
    return (data as unknown[][]).map((r) => r.map((c) => (c === null || c === undefined ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c))))
  }
  return parseCsv(await file.text())
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")

export type MappedRows<T> = { rows: T[]; errors: string[]; missing: string[] }

function objects(table: string[][]): Record<string, string>[] {
  const [head, ...body] = table
  if (!head) return []
  const keys = head.map(norm)
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])))
}

const num = (v: string | undefined) => {
  if (v === undefined || v === "") return undefined
  const n = Number(v.replace(/,/g, ""))
  return Number.isFinite(n) ? n : undefined
}
const share = (v: string | undefined) => {
  const n = num(v)
  if (n === undefined) return 0
  return n > 1 ? n / 100 : n
}

export function mapRows(kind: ImportKind, table: string[][]): MappedRows<unknown> {
  const objs = objects(table)
  const head = (table[0] ?? []).map(norm)
  const missing = TEMPLATES[kind].required.filter((c) => !head.includes(c))
  const errors: string[] = []
  if (missing.length) return { rows: [], errors: [`Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`], missing }
  const rows: unknown[] = []
  objs.forEach((o, i) => {
    const line = i + 2
    if (kind === "energy") {
      const mwh = num(o.annual_mwh)
      if (mwh === undefined) return errors.push(`Row ${line}: annual_mwh is not a number`)
      const r: EnergyRow = {
        site: o.site,
        ergosSiteId: o.ergos_site_id || `ERG-${o.site.slice(0, 3).toUpperCase()}-IMP`,
        period: o.period || "Imported period",
        annualMWh: mwh,
        gridShare: share(o.grid_share),
        solarShare: share(o.solar_share),
        windShare: share(o.wind_share),
        rooftopShare: share(o.rooftop_share),
        exchangeShare: share(o.exchange_share),
        peakMW: num(o.peak_mw),
        contractedMW: num(o.contracted_mw),
        completeness: o.completeness ? share(o.completeness) : 1,
        dgDieselKL: num(o.dg_diesel_kl),
        steamTonnes: num(o.steam_t),
        waterKL: num(o.water_kl),
        meters: (o.meters || "grid").split(/[;|]/).map((m) => m.trim().toLowerCase()).filter(Boolean),
      }
      rows.push(r)
    } else if (kind === "headcount") {
      const p = num(o.permanent)
      if (p === undefined) return errors.push(`Row ${line}: permanent is not a number`)
      rows.push({ site: o.site, permanent: p, contract: num(o.contract) ?? 0, extractDate: o.extract_date || "Imported" } satisfies HeadcountRow)
    } else if (kind === "erp") {
      if (!o.site) return errors.push(`Row ${line}: site is empty`)
      const out = num(o.output)
      rows.push({
        site: o.site,
        plantCode: o.plant_code || o.site.slice(0, 3).toUpperCase() + "1",
        products: o.products || undefined,
        fuels: (o.fuels || "").split(/[;|]/).map((f) => f.trim()).filter(Boolean),
        fuelQuantity: num(o.fuel_quantity),
        fuelUnit: o.fuel_unit || undefined,
        output: out !== undefined ? { value: out, unit: o.output_unit || "tonnes" } : undefined,
      } satisfies ErpRow)
    } else if (kind === "ehs") {
      if (!o.site) return errors.push(`Row ${line}: site is empty`)
      rows.push({
        site: o.site,
        wasteStreams: (o.waste_streams || "").split(/[;|]/).map((w) => w.trim()).filter(Boolean),
        disposal: o.disposal || "Not stated",
        incidents: num(o.incidents) ?? 0,
        ltifr: num(o.ltifr) ?? 0,
      } satisfies EhsRow)
    } else if (kind === "documents") {
      const k = o.kind.toLowerCase()
      if (!["permit", "invoice", "policy", "report", "certificate"].includes(k)) return errors.push(`Row ${line}: kind "${o.kind}" is not permit, invoice, policy, report or certificate`)
      rows.push({ site: o.site || undefined, kind: k as DocumentRow["kind"], topic: o.topic || o.file_name, fileName: o.file_name, validTo: o.valid_to || undefined } satisfies DocumentRow)
    } else if (kind === "people") {
      if (!o.name) return errors.push(`Row ${line}: name is empty`)
      rows.push({ site: o.site || undefined, name: o.name, role: o.role, email: o.email || undefined, phone: o.phone || undefined } satisfies PersonRow)
    } else {
      if (!o.name || !o.city) return errors.push(`Row ${line}: name and city are required`)
      rows.push(o)
    }
  })
  return { rows, errors, missing }
}

// Sites import is fed through the pasted-list parser as CSV.
export function sitesToCsv(rows: Record<string, string>[]) {
  const cols = ["name", "city", "type", "entity", "address", "state", "gstin"]
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c] ?? "")).join(","))].join("\n")
}

export function matchSiteName(siteName: string, candidates: { id: string; name: string; city: string }[]) {
  const n = siteName.toLowerCase().trim()
  return (
    candidates.find((c) => c.name.toLowerCase() === n) ??
    candidates.find((c) => c.city.toLowerCase() === n) ??
    candidates.find((c) => n.includes(c.city.toLowerCase()) || n.includes(c.name.toLowerCase()))
  )
}
