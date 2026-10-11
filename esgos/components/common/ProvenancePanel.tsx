"use client"

import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useEffect } from "react"
import { useStore } from "@/esgos/lib/store"
import type { DataPoint } from "@/esgos/lib/types"
import { fmtDataPointValue, fmtTime, isDemoSource, sourceLabel, SOURCE_NAMES } from "@/esgos/lib/format"
import { INDICATOR_BY_ID } from "@/esgos/lib/indicators"
import { QUESTION_BY_ID } from "@/esgos/lib/questionEngine"
import { Value } from "./Value"
import { Eyebrow } from "./ui"

function originLine(dp: DataPoint): { label: string; value: string } {
  switch (dp.source) {
    case "ergos":
      return { label: "Meter", value: dp.meterId || dp.sourceRef || "ergOS site" }
    case "vault":
      return { label: "Document", value: dp.document ?? dp.sourceRef ?? "" }
    case "hrms":
      return { label: "Extract", value: [dp.sourceRef, dp.extractDate ? `extracted ${dp.extractDate}` : ""].filter(Boolean).join(" · ") }
    case "gst":
      return { label: "Registration", value: dp.sourceRef ?? "" }
    case "mca":
      return { label: "Record", value: dp.sourceRef ?? "" }
    case "owner":
      return { label: "Recorded", value: dp.sourceRef ?? "Answered in esgOS" }
    case "estimate":
      return { label: "Method", value: dp.sourceRef ?? "Benchmark estimate" }
    default:
      return { label: "Reference", value: dp.sourceRef ?? "" }
  }
}

export function ProvenancePanel() {
  const dp = useStore((s) => s.ui.provenance)
  const setUi = useStore((s) => s.setUi)
  const dataPoints = useStore((s) => s.dataPoints)
  const sites = useStore((s) => s.sites)
  const entities = useStore((s) => s.entities)
  const audit = useStore((s) => s.audit)

  useEffect(() => {
    if (!dp) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setUi({ provenance: null })
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [dp, setUi])

  const site = dp?.scope.siteId ? sites.find((s) => s.id === dp.scope.siteId) : undefined
  const entity = dp?.scope.entityId ? entities.find((e) => e.id === dp.scope.entityId) : undefined
  const components = dp?.components?.map((id) => dataPoints.find((d) => d.id === id)).filter(Boolean) as DataPoint[] | undefined
  const indicator = dp ? INDICATOR_BY_ID[dp.indicator] : undefined
  const question = dp?.questionId ? QUESTION_BY_ID[dp.questionId] : undefined
  const related = dp && site ? audit.filter((a) => a.target.startsWith(site.name)).slice(-3).reverse() : []

  const steps = dp
    ? [
        { label: "Value", value: `${fmtDataPointValue(dp).text}${fmtDataPointValue(dp).unit ? " " + fmtDataPointValue(dp).unit : ""}` },
        { label: "Source", value: `${SOURCE_NAMES[dp.source]}${dp.mode === "public" ? " — public record" : dp.mode === "live" ? " — live" : isDemoSource(dp.source) ? " — mock provider (demo data)" : ""}${dp.syncState === "pending" ? " · first full sync pending" : ""}` },
        { label: "Period", value: dp.period },
        dp.mode === "public" ? { label: "Citation", value: dp.sourceRef ?? "" } : originLine(dp),
        {
          label: "Confirmed",
          value: dp.confirmedBy ? `${dp.confirmedBy}, ${fmtTime(dp.confirmedAt)}` : dp.source === "owner" ? `${dp.owner ?? "Owner"}, ${fmtTime(dp.confirmedAt)}` : dp.evidenceState === "linked" ? "System of record — no manual confirmation needed" : "Not yet confirmed",
        },
      ]
    : []

  return (
    <AnimatePresence>
      {dp && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setUi({ provenance: null })}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            aria-hidden
          />
          <motion.aside
            key={dp.id}
            role="dialog"
            aria-modal="true"
            aria-label="Provenance"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="scrollbar-thin fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col overflow-y-auto border-l border-line-strong bg-elev p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Eyebrow>Provenance</Eyebrow>
                <h2 className="mt-1 text-xl font-medium tracking-tight">
                  {question && site ? question.text(site) : dp.label ?? "Value"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {[site?.name, entity?.name].filter(Boolean).join(" · ") || "Group"}
                  {indicator && <> · feeds {indicator.id}</>}
                </p>
              </div>
              <button type="button" onClick={() => setUi({ provenance: null })} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Close provenance" autoFocus>
                <X size={16} />
              </button>
            </div>

            <ol className="relative mt-8">
              <svg className="absolute left-[7px] top-2 h-[calc(100%-16px)] w-[2px] overflow-visible" aria-hidden>
                <motion.line x1="1" y1="0" x2="1" y2="100%" stroke="var(--accent)" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: "easeInOut" }} />
              </svg>
              {steps.map((step, i) => (
                <motion.li key={step.label} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.16 }} className="relative pb-6 pl-8 last:pb-0">
                  <span className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-accent bg-elev" />
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">{step.label}</div>
                  <div className="mt-0.5 break-words text-[15px]">{step.value || "—"}</div>
                  {step.label === "Citation" && dp.document && /^https?:/.test(dp.document) && (
                    <a href={dp.document} target="_blank" rel="noreferrer noopener" className="mt-1 inline-block break-all text-xs text-muted underline-offset-2 hover:text-fg hover:underline">
                      {dp.document}
                    </a>
                  )}
                </motion.li>
              ))}
            </ol>

            <div className="mt-6 rounded-xl border border-line bg-surface p-3 text-xs text-muted">
              <div className="flex items-center justify-between">
                <span>Source badge</span>
                <span>{sourceLabel(dp.source, dp.mode)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Evidence</span>
                <span className="capitalize">{dp.evidenceState}</span>
              </div>
              {dp.note && <p className="mt-2 text-muted">{dp.note}</p>}
              {dp.source === "estimate" && <p className="mt-2 text-amber">Estimates are counted as open in coverage.</p>}
            </div>

            {components && components.length > 0 && (
              <div className="mt-6">
                <Eyebrow>Computed from {components.length} values</Eyebrow>
                <ul className="mt-3 space-y-2">
                  {components.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 text-sm">
                      <span className="text-muted">{sites.find((s) => s.id === c.scope.siteId)?.name ?? c.label}</span>
                      <Value dp={c} size="sm" detail={false} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {related.length > 0 && (
              <div className="mt-6">
                <Eyebrow>Recent audit events</Eyebrow>
                <ul className="mt-2 space-y-1.5 text-xs text-muted">
                  {related.map((a) => (
                    <li key={a.id}>
                      <span className="text-fg">{a.action}</span> · {a.actor} · {fmtTime(a.ts)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
