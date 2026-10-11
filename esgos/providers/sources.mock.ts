import type {
  DocumentVaultProvider,
  EhsProvider,
  EhsSiteRecord,
  ErpProvider,
  ErpSiteRecord,
  HrmsProvider,
  HrmsSiteRecord,
} from "./types"
import type { DocumentRecord, Site } from "@/esgos/lib/types"
import {
  EHS_REGISTERS,
  ENTITY_IDS,
  ERP_FUEL,
  ERP_PLANT_CODES,
  ERP_PRODUCTS,
  HRMS_EXTRACT_DATE,
  HRMS_HEADCOUNT,
  SEED_DOCUMENTS,
  TODAY,
} from "@/esgos/lib/demoData"
import { stableHash, wait } from "@/esgos/lib/mode"
import { getClient } from "@/esgos/lib/clients"
import { getImports, matchSiteName } from "@/esgos/lib/imports"

const inBoundary = (sites: Site[]) => sites.filter((s) => s.status === "confirmed")
const isSeeded = (s: Site) => s.id.startsWith("site-") && !s.id.startsWith("site-p-")

// HRMS covers the holding company's payroll only. Subsidiary payrolls run elsewhere.
export const hrmsMock: HrmsProvider = {
  mode: "mock",
  label: "HRMS",
  async connect(sites, entities) {
    await wait(900)
    const holding = entities.find((e) => e.relationship === "holding")
    const coverage: HrmsSiteRecord[] = []
    const imported = getImports().headcount
    if (getClient().kind === "public" || imported.length) {
      for (const row of imported) {
        const site = matchSiteName(row.site, inBoundary(sites))
        if (site) coverage.push({ siteId: site.id, permanent: row.permanent, contract: row.contract, extractDate: row.extractDate })
      }
      return { coverage, note: imported.length ? "Imported HRMS export" : "No HRMS export imported" }
    }
    for (const s of inBoundary(sites)) {
      if (s.legalEntityId !== holding?.id) continue
      const seeded = HRMS_HEADCOUNT[s.city]
      const h = stableHash(s.id)
      coverage.push({
        siteId: s.id,
        permanent: seeded?.permanent ?? (s.type === "office" ? 60 + (h % 140) : 140 + (h % 460)),
        contract: seeded?.contract ?? (s.type === "office" ? 10 + (h % 20) : 50 + (h % 180)),
        extractDate: HRMS_EXTRACT_DATE,
      })
    }
    return {
      coverage,
      note: holding ? `Payroll for ${holding.name} only` : "Holding company payroll",
    }
  },
}

// ERP product master covers every plant; fuel purchases and production
// postings are extracted for three plant codes only.
export const erpMock: ErpProvider = {
  mode: "mock",
  label: "ERP",
  async connect(sites) {
    await wait(1000)
    const factories = inBoundary(sites).filter((s) => s.type === "factory")
    const importedErp = getImports().erp
    if (getClient().kind === "public" || importedErp.length) {
      const productMaster: ErpSiteRecord[] = []
      const fuelPurchases: ErpSiteRecord[] = []
      for (const row of importedErp) {
        const site = matchSiteName(row.site, factories)
        if (!site) continue
        productMaster.push({ siteId: site.id, plantCode: row.plantCode, products: row.products })
        if (row.fuels.length || row.fuelQuantity !== undefined || row.output) {
          fuelPurchases.push({
            siteId: site.id,
            plantCode: row.plantCode,
            fuels: row.fuels,
            fuelQuantity: row.fuelQuantity !== undefined ? `${row.fuelQuantity.toLocaleString("en-IN")} ${row.fuelUnit ?? ""} ${row.fuels.join(" / ")}`.replace(/\s+/g, " ").trim() : undefined,
            output: row.output,
          })
        }
      }
      return { productMaster, fuelPurchases, note: importedErp.length ? `Imported ERP export: ${fuelPurchases.length} plants` : "No ERP export imported" }
    }
    const productMaster: ErpSiteRecord[] = factories.map((s) => ({
      siteId: s.id,
      plantCode: ERP_PLANT_CODES[s.city] ?? `${s.city.slice(0, 3).toUpperCase()}1`,
      products: ERP_PRODUCTS[s.city] ?? "Packaged foods (demo)",
    }))
    const seededMode = factories.some(isSeeded)
    const fuelSites = seededMode ? factories.filter((s) => ERP_FUEL[s.city]) : factories.slice(0, 3)
    const fuelPurchases: ErpSiteRecord[] = fuelSites.map((s) => {
      const seeded = ERP_FUEL[s.city]
      const h = stableHash(s.id)
      return {
        siteId: s.id,
        plantCode: ERP_PLANT_CODES[s.city] ?? `${s.city.slice(0, 3).toUpperCase()}1`,
        fuels: seeded?.fuels ?? ["PNG"],
        fuelQuantity: seeded?.quantity ?? `${(0.6 + (h % 20) / 10).toFixed(2)} million SCM PNG (demo)`,
        output: seeded?.output ?? { value: 8000 + (h % 30000), unit: "tonnes" },
      }
    })
    return {
      productMaster,
      fuelPurchases,
      note: `Fuel purchases and production for ${fuelPurchases.length} of ${factories.length} plant codes`,
    }
  },
}

export const ehsMock: EhsProvider = {
  mode: "mock",
  label: "EHS",
  async connect(sites) {
    await wait(800)
    const factories = inBoundary(sites).filter((s) => s.type === "factory")
    const importedEhs = getImports().ehs
    if (getClient().kind === "public" || importedEhs.length) {
      const registers: EhsSiteRecord[] = []
      for (const row of importedEhs) {
        const site = matchSiteName(row.site, factories)
        if (site) registers.push({ siteId: site.id, wasteStreams: row.wasteStreams, disposal: row.disposal, incidents: row.incidents, ltifr: row.ltifr })
      }
      return { registers, note: importedEhs.length ? `Imported EHS registers: ${registers.length} plants` : "No EHS export imported" }
    }
    const seededMode = factories.some(isSeeded)
    const covered = seededMode ? factories.filter((s) => EHS_REGISTERS[s.city]) : factories.filter((_, i) => i % 4 === 0)
    const registers: EhsSiteRecord[] = covered.map((s) => {
      const seeded = EHS_REGISTERS[s.city]
      return {
        siteId: s.id,
        wasteStreams: seeded?.wasteStreams ?? ["Hazardous", "Plastic"],
        disposal: seeded?.disposal ?? "TSDF",
        incidents: seeded?.incidents ?? 2,
        ltifr: seeded?.ltifr ?? 0.4,
      }
    })
    return { registers, note: `Incident and waste registers for ${registers.length} sites` }
  },
}

let uploadCounter = 0

export const vaultMock: DocumentVaultProvider = {
  mode: "mock",
  label: "Vault",
  async connect(sites) {
    await wait(700)
    const confirmed = inBoundary(sites)
    const seededMode = confirmed.some(isSeeded)
    const holdingId = seededMode ? ENTITY_IDS.foods : confirmed[0]?.legalEntityId
    const documents: DocumentRecord[] = []
    for (const [i, row] of getImports().documents.entries()) {
      const site = row.site ? matchSiteName(row.site, confirmed) : undefined
      documents.push({ id: `doc-imp-${i}`, name: row.fileName, kind: row.kind, topic: row.topic, siteId: site?.id, period: row.period ?? "Imported", validTo: row.validTo, uploaded: true })
    }
    if (getClient().kind === "public") return { documents, note: documents.length ? `${documents.length} imported documents` : "No documents imported" }
    if (seededMode) {
      for (const d of SEED_DOCUMENTS) {
        const { city, ...doc } = d
        const site = city ? confirmed.find((s) => s.city === city) : undefined
        if (city && !site) continue
        documents.push({ ...doc, siteId: site?.id, entityId: doc.entityId })
      }
    } else {
      confirmed
        .filter((s) => s.type === "factory")
        .forEach((s, i) => {
          if (i % 2 === 1) return
          documents.push({
            id: `doc-cto-${s.id}`,
            name: `CTO_${s.name.replace(/\s/g, "")}_demo.pdf`,
            kind: "permit",
            topic: "Consent to Operate (Water and Air Acts)",
            siteId: s.id,
            period: "2024 – 2029",
            validTo: "2029-03-31",
          })
        })
      for (const d of SEED_DOCUMENTS.filter((x) => x.kind === "policy" || x.kind === "report" || x.kind === "certificate")) {
        const { city: _city, ...doc } = d
        documents.push({ ...doc, entityId: holdingId })
      }
    }
    return { documents, note: `${documents.length} documents indexed` }
  },
  async upload(input) {
    await wait(500)
    uploadCounter += 1
    return {
      id: `doc-upload-${Date.now()}-${uploadCounter}`,
      name: input.fileName,
      kind: input.kind,
      topic: input.topic,
      siteId: input.siteId,
      entityId: input.entityId,
      period: "Uploaded " + TODAY,
      uploaded: true,
      uploadedAt: new Date().toISOString(),
    }
  },
}
