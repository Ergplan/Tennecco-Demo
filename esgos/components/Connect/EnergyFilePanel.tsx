"use client"

// The client's own energy workbook, plant by plant and month by month: which
// figures are readings and which were filled in, and what that means for BRSR.

import { motion } from "framer-motion"
import { FileSpreadsheet, TriangleAlert } from "lucide-react"
import { getClient } from "@/esgos/lib/clients"
import type { EnergyFileSummary } from "@/esgos/lib/clients/types"
import { Eyebrow } from "../common/ui"
import { cn } from "../common/cn"

const KIND_STYLE: Record<string, string> = {
  typed: "bg-accent",
  average: "bg-amber/80",
  copied: "bg-amber/80",
  derived: "bg-amber/80",
  repeated: "bg-hue-gaps/80",
  load: "bg-hue-gaps/80",
  none: "border border-dashed border-line-strong",
}

const LEGEND: [string, string][] = [
  ["typed", "Reading"],
  ["average", "Filled from other months"],
  ["load", "Estimated (load × hours, or one value repeated)"],
  ["none", "Not operating"],
]

const fmt = (n: number, d = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: d })

export function EnergyFilePanel({ file }: { file: EnergyFileSummary }) {
  const client = getClient()
  const max = Math.max(...file.plants.map((p) => p.kvah))
  return (
    <section aria-label="Energy file" className="rounded-xl border border-line bg-surface/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow className="flex items-center gap-2 text-hue-connect">
            <FileSpreadsheet size={13} /> Your energy file
          </Eyebrow>
          <h3 className="mt-1 text-lg font-medium tracking-tight">{file.file}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {file.providedBy} · {file.period} · {file.plants.length} plants · in {file.unit}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-x-6 text-right">
          <div>
            <dt className="text-[11px] text-faint">Total</dt>
            <dd className="text-xl font-medium tracking-tight">
              {fmt(file.totalKvah / 1e6, 1)}
              <span className="ml-1 text-xs text-muted">million kVAh</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-faint">From readings</dt>
            <dd className={cn("text-xl font-medium tracking-tight", file.actualShare < 0.9 ? "text-amber" : "text-accent")}>
              {Math.round(file.actualShare * 100)}
              <span className="ml-0.5 text-xs text-muted">%</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-faint">Solar (group)</dt>
            <dd className="text-xl font-medium tracking-tight">
              {fmt(file.solar.mwh)}
              <span className="ml-1 text-xs text-muted">MWh est.</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[11px] text-faint">
              <th className="pb-2 pr-3 font-medium">Plant</th>
              <th className="pb-2 pr-3 font-medium">
                <span className="grid grid-cols-12 gap-0.5 text-center">
                  {file.months.map((m) => (
                    <span key={m}>{m.slice(0, 1)}</span>
                  ))}
                </span>
              </th>
              <th className="pb-2 pr-3 text-right font-medium">kVAh</th>
              <th className="pb-2 text-right font-medium">Readings</th>
            </tr>
          </thead>
          <tbody>
            {file.plants.map((p, i) => (
              <motion.tr key={p.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-t border-line align-middle">
                <td className="py-2 pr-3">
                  <div className="font-medium">{p.site}</div>
                  <div className="text-[11px] text-faint">Row “{p.name}”</div>
                </td>
                <td className="w-[46%] py-2 pr-3">
                  <div className="grid grid-cols-12 gap-0.5" aria-label={`${p.site}: ${p.actualMonths} of ${p.operatingMonths} operating months are readings`}>
                    {p.kinds.map((k, m) => (
                      <span key={m} className={cn("h-4 rounded-[3px]", KIND_STYLE[k] ?? "bg-surface-3")} title={`${file.months[m]}: ${file.kindLegend[k] ?? k}`} />
                    ))}
                  </div>
                  {p.basis && <div className="mt-1 truncate text-[11px] text-muted" title={p.basis}>Filled: {p.basis}</div>}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  <div>{fmt(p.kvah)}</div>
                  <div className="ml-auto mt-1 h-1 rounded-full bg-hue-connect/60" style={{ width: `${Math.max(6, (p.kvah / max) * 100)}%` }} />
                </td>
                <td className={cn("py-2 text-right text-xs tabular-nums", p.actualMonths === p.operatingMonths ? "text-accent" : p.actualMonths === 0 ? "text-hue-gaps" : "text-amber")}>
                  {p.actualMonths} of {p.operatingMonths}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        {LEGEND.map(([k, label]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-[2px]", KIND_STYLE[k])} /> {label}
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-lg border border-amber/30 bg-amber/[0.05] p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-amber">
          <TriangleAlert size={13} /> Before these figures go into a BRSR
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted">
          {file.caveats.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-faint">
          Green share in the file: {Math.round(file.greenShareAsComputed * 100)}% (solar kWh ÷ plant kVAh). If the solar is on top of plant consumption, the like-for-like share is {Math.round(file.greenShareKwh * 100)}%. {client.shortName}&apos;s open-access settlement statements decide which.
        </p>
      </div>
    </section>
  )
}
