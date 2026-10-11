// Public-records adapter: streams a listed company's disclosed footprint from
// its client profile (filed BRSR / annual report, registry, public GST search).
// Values were captured from public documents; each carries its citation.

import { getClient } from "@/esgos/lib/clients"
import type { PublicGst, PublicSite } from "@/esgos/lib/clients/types"
import { wait } from "@/esgos/lib/mode"

export const publicRecords = {
  mode: "public" as const,
  label: "Public records",
  async *streamRegistrySites(): AsyncGenerator<PublicSite> {
    for (const s of getClient().publicSites.filter((x) => x.via === "registry")) {
      await wait(500)
      yield s
    }
  },
  async *streamBrsrSites(): AsyncGenerator<PublicSite> {
    for (const s of getClient().publicSites.filter((x) => x.via === "brsr")) {
      await wait(520)
      yield s
    }
  },
  async *streamGst(): AsyncGenerator<PublicGst> {
    for (const g of getClient().publicGst) {
      await wait(380)
      yield g
    }
  },
}
