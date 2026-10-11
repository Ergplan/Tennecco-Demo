import type { CorporateRegistryProvider, GstRegistryProvider, ParsedSite, RegistryNode, SiteListProvider } from "./types"
import { GST_PREMISES, MCA_TREE } from "@/esgos/lib/demoData"
import { findCity } from "@/esgos/lib/geo"
import { wait } from "@/esgos/lib/mode"

export const gstMock: GstRegistryProvider = {
  mode: "mock",
  label: "GST",
  async *streamPremises(pans) {
    const wanted = new Set(pans)
    for (const premise of GST_PREMISES) {
      // GSTIN characters 3–12 carry the PAN
      if (!wanted.has(premise.gstin.slice(2, 12))) continue
      await wait(300)
      yield premise
    }
  },
}

let prospectTree: RegistryNode[] = []
export function setProspectRegistry(nodes: RegistryNode[]) {
  prospectTree = nodes
}

export const corporateRegistryMock: CorporateRegistryProvider = {
  mode: "mock",
  label: "MCA",
  async *streamEntityTree(holdingCin) {
    const seeded = MCA_TREE.some((n) => n.cin === holdingCin)
    const nodes: RegistryNode[] = seeded ? MCA_TREE : prospectTree
    for (const node of nodes) {
      await wait(420)
      yield node
    }
  },
}

const OFFICE_WORDS = /\b(office|corporate|hq|head ?office|headquarters|sales office|registered office|branch)\b/i
const WAREHOUSE_WORDS = /\b(warehouse|depot|dc|distribution|fulfil+ment|godown|cold store|cold storage)\b/i

function cleanName(city: string | undefined, fallback: string) {
  if (!city) return fallback
  return city === "New Delhi" ? "Delhi" : city
}

export const siteListMock: SiteListProvider = {
  mode: "mock",
  label: "Pasted list",
  async *parse(text) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    // CSV with header: name,city,type,entity
    const header = lines[0]?.toLowerCase()
    const isCsv = !!header && header.includes(",") && header.includes("city") && header.includes("name")
    const cols = isCsv ? header.split(",").map((c) => c.trim()) : []
    const body = isCsv ? lines.slice(1) : lines
    for (const raw of body) {
      await wait(340)
      let name = ""
      let typeText = raw
      let cityText = raw
      let entityHint: string | undefined
      let address: string | undefined
      let gstin: string | undefined
      if (isCsv) {
        const cells = raw.split(",").map((c) => c.trim())
        const get = (k: string) => cells[cols.indexOf(k)] ?? ""
        name = get("name")
        cityText = get("city") || raw
        typeText = `${get("type")} ${name}`
        entityHint = get("entity") || undefined
        address = get("address") || undefined
        gstin = get("gstin") || undefined
        if (address) cityText = `${cityText} ${address} ${get("state")}`
      } else {
        name = raw.split(/\s[—–-]\s|,/)[0].trim()
        const m = raw.match(/\b([A-Z][A-Za-z&. ]+ (?:Private Limited|Pvt\.? Ltd\.?|Limited|Ltd\.?))\b/)
        if (m) entityHint = m[1]
      }
      const city = findCity(cityText) ?? findCity(raw)
      const type: ParsedSite["type"] = OFFICE_WORDS.test(typeText) ? "office" : WAREHOUSE_WORDS.test(typeText) ? "warehouse" : "factory"
      const parsed: ParsedSite = {
        raw,
        // CSV names are used as given; free-text lines are named after their city.
        name: isCsv && name ? name : city ? cleanName(city.city, name) : name || raw.slice(0, 40),
        type,
        city: city?.city,
        state: city?.state,
        lat: city?.lat,
        lng: city?.lng,
        entityHint,
        address,
        gstin,
      }
      yield parsed
    }
  },
}
