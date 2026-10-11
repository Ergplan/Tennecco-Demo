// Adapter interfaces. Each external capability sits behind one of these; the
// mock implementations run seeded data through the same pipeline a real
// adapter will. Swap a mock for a live adapter in providers/index.ts.

import type {
  DocumentRecord,
  EnergySummary,
  LegalEntity,
  Meter,
  ProviderMode,
  Relationship,
  Site,
  SiteType,
} from "@/esgos/lib/types"
import type { ErgosSiteRecord, GstPremiseRecord } from "@/esgos/lib/demoData"

export interface Provider {
  readonly mode: ProviderMode
  readonly label: string
}

// ergOS API: /group/{id}/sites, /site/{id}/meters, /site/{id}/energy-summary
export interface ErgosProvider extends Provider {
  streamSites(groupId: string): AsyncGenerator<ErgosSiteRecord>
  matchSite(site: Site): Promise<{ status: "connected" | "needs-review" | "not-found"; candidates: ErgosSiteRecord[] }>
  streamMeters(ergosSiteId: string): AsyncGenerator<Meter>
  energySummary(ergosSiteId: string, fiscalYear: string): Promise<Omit<EnergySummary, "siteId">>
  describeCandidate(ergosSiteId: string): ErgosSiteRecord | undefined
}

// Licensed GST data provider or client-supplied certificates
export interface GstRegistryProvider extends Provider {
  streamPremises(pans: string[]): AsyncGenerator<GstPremiseRecord>
}

export type RegistryNode = {
  entityId: string
  name: string
  cin?: string
  parentId?: string
  relationship: Relationship
  holdingPct?: number
  // Public clients: the node comes from the filed BRSR, not MCA.
  shortName?: string
  pan?: string
  note?: string
  sourceRef?: string
  document?: string
  period?: string
  aggregate?: boolean
  members?: { name: string; relationship: string; holdingPct?: number | null; country?: string | null }[]
}

// MCA master data, AOC-1
export interface CorporateRegistryProvider extends Provider {
  streamEntityTree(holdingCin: string): AsyncGenerator<RegistryNode>
}

export type ParsedSite = {
  raw: string
  name: string
  type: SiteType
  city?: string
  state?: string
  lat?: number
  lng?: number
  entityHint?: string
  address?: string
  gstin?: string
}

export interface SiteListProvider extends Provider {
  parse(text: string): AsyncGenerator<ParsedSite>
}

export type HrmsSiteRecord = { siteId: string; permanent: number; contract: number; extractDate: string }
export interface HrmsProvider extends Provider {
  connect(sites: Site[], entities: LegalEntity[]): Promise<{ coverage: HrmsSiteRecord[]; note: string }>
}

export type ErpSiteRecord = {
  siteId: string
  plantCode: string
  products?: string
  fuels?: string[]
  fuelQuantity?: string
  output?: { value: number; unit: string }
}
export interface ErpProvider extends Provider {
  connect(sites: Site[]): Promise<{ productMaster: ErpSiteRecord[]; fuelPurchases: ErpSiteRecord[]; note: string }>
}

export type EhsSiteRecord = { siteId: string; wasteStreams: string[]; disposal: string; incidents: number; ltifr: number }
export interface EhsProvider extends Provider {
  connect(sites: Site[]): Promise<{ registers: EhsSiteRecord[]; note: string }>
}

export interface DocumentVaultProvider extends Provider {
  connect(sites: Site[]): Promise<{ documents: DocumentRecord[]; note: string }>
  upload(input: { fileName: string; kind: DocumentRecord["kind"]; topic: string; siteId?: string; entityId?: string }): Promise<DocumentRecord>
}
