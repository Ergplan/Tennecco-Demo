"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Download, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { fmtTime } from "@/esgos/lib/format"
import { Button, Eyebrow } from "./ui"

function short(v: unknown) {
  if (v === undefined) return "—"
  const s = typeof v === "string" ? v : JSON.stringify(v)
  return s.length > 80 ? s.slice(0, 77) + "…" : s
}

export function exportJson() {
  const state = useStore.getState()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ui, ...rest } = state
  const data: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) if (typeof v !== "function") data[k] = v
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), demo: "Aurelia Foods Group (fictional, demo data)", state: data }, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `esgos-audit-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  useStore.getState().log("export audit JSON", "Audit trail", undefined, a.download)
}

export function AuditDrawer() {
  const open = useStore((s) => s.ui.auditOpen)
  const setUi = useStore((s) => s.setUi)
  const audit = useStore((s) => s.audit)
  const [filter, setFilter] = useState<"all" | "user" | "agent">("all")

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setUi({ auditOpen: false })
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, setUi])

  const events = useMemo(() => {
    const list = [...audit].reverse()
    if (filter === "user") return list.filter((e) => e.actor !== "esgOS agent")
    if (filter === "agent") return list.filter((e) => e.actor === "esgOS agent")
    return list
  }, [audit, filter])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUi({ auditOpen: false })} className="fixed inset-0 z-40 bg-black/30" aria-hidden />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Audit trail"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col border-l border-line-strong bg-elev shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line p-6">
              <div>
                <Eyebrow>Audit trail</Eyebrow>
                <h2 className="mt-1 text-xl font-medium tracking-tight">{audit.length} events</h2>
                <p className="mt-1 text-sm text-muted">Every confirmation, exclusion, reassignment, answer, task and connection.</p>
              </div>
              <button type="button" onClick={() => setUi({ auditOpen: false })} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Close audit trail" autoFocus>
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 px-6 py-3">
              <div className="flex gap-1 rounded-full border border-line p-1 text-xs" role="tablist" aria-label="Filter events">
                {(["all", "user", "agent"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 capitalize ${filter === f ? "bg-surface-3 text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {f === "user" ? "People" : f === "agent" ? "Agent" : "All"}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={exportJson}>
                <Download size={13} /> Export JSON
              </Button>
            </div>
            <ol className="scrollbar-thin flex-1 overflow-y-auto px-6 pb-6">
              {events.map((e) => (
                <li key={e.id} className="grid grid-cols-[84px_1fr] gap-3 border-b border-line py-3 text-sm">
                  <time className="tnum text-xs text-faint" dateTime={e.ts}>
                    {fmtTime(e.ts)}
                  </time>
                  <div className="min-w-0">
                    <div>
                      <span className="font-medium">{e.action}</span> <span className="text-muted">· {e.target}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-faint">{e.actor}</div>
                    {(e.before !== undefined || e.after !== undefined) && (
                      <div className="mt-1 break-words font-mono text-[11px] text-muted">
                        {short(e.before)} → {short(e.after)}
                      </div>
                    )}
                    {e.detail && <div className="mt-0.5 text-xs text-muted">{e.detail}</div>}
                  </div>
                </li>
              ))}
              {!events.length && <li className="py-8 text-center text-sm text-muted">No events yet.</li>}
            </ol>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
