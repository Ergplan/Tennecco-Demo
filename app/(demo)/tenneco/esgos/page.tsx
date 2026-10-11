"use client"

// The esgOS track: the real esgOS app (vendored under /esgos) running on Tenneco Clean Air
// India's public disclosures, embedded here so the walkthrough keeps its stepper.

import { ExternalLink, RotateCcw } from "lucide-react"
import { useState } from "react"
import { PageHead } from "@/components/ui/kit"

const STAGES = [
  { n: 1, t: "Who's who", d: "Enter your name at the gate; the ESG lead, CFO and CS seats are prefilled as roles" },
  { n: 2, t: "Footprint", d: "esgOS reads the filings and maps every site; decide on Kharkhoda, under construction" },
  { n: 3, t: "Boundary", d: "TCAIL files the BRSR; choose standalone or consolidate the four subsidiaries. FMGIL sits outside" },
  { n: 4, t: "Connect", d: "Energy, HR, ERP and EHS sources; without feeds it falls back to the filed totals" },
  { n: 5, t: "Profile", d: "A few questions per site, routed to the plant heads" },
  { n: 6, t: "Gaps", d: "Readiness against every BRSR and BRSR Core indicator, with owners and next steps" },
]

export default function EsgosStep() {
  const [key, setKey] = useState(0)
  const [reset, setReset] = useState(false)
  const src = `/esgos?client=tenneco&theme=light&pace=brisk&demo=true${reset ? "&reset=true" : ""}`

  return (
    <div className="space-y-4">
      <PageHead
        eyebrow="esgOS · gap assessment"
        title="The esgOS track, on Tenneco Clean Air India."
        lede="esgOS starts from what TCAIL has already filed: its FY2025-26 BRSR, the prospectus and Tenneco's location list. It maps the footprint, sets the reporting boundary, connects sources and shows, indicator by indicator, what is ready for FY2026-27 and what is not."
        right={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setReset(true)
                setKey((k) => k + 1)
              }}
              className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] text-muted hover:text-fg"
            >
              <RotateCcw size={13} /> Start over
            </button>
            <a href={src} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[12.5px] font-medium text-white">
              Open full screen <ExternalLink size={13} />
            </a>
          </div>
        }
      />
      <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((s) => (
          <li key={s.n} className="rounded-xl border border-line bg-surface p-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <span className="tnum grid h-5 w-5 place-items-center rounded-full bg-accent font-mono text-[10px] text-white">{s.n}</span>
              {s.t}
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-muted">{s.d}</p>
          </li>
        ))}
      </ol>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_3px_rgba(0,29,52,0.06)]">
        <iframe key={key} src={src} title="esgOS on Tenneco Clean Air India" className="block h-[calc(100dvh-150px)] min-h-[720px] w-full" />
      </div>
    </div>
  )
}
