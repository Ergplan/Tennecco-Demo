"use client"

import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useEffect } from "react"
import { useStore } from "@/esgos/lib/store"
import { getClient } from "@/esgos/lib/clients"
import { OrgForm } from "../Agent/OrgForm"
import { Eyebrow } from "./ui"

// Edit organisation details after the gate. Before they exist, the start screen shows the gate inline.
export function OrgDrawer() {
  // Before details exist, the start screen shows the gate inline; everywhere else this drawer.
  const show = useStore((s) => s.ui.orgOpen && (!!s.orgByClient?.[s.clientId] || s.stage !== "agent"))
  const setUi = useStore((s) => s.setUi)
  const say = useStore((s) => s.say)

  useEffect(() => {
    if (!show) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setUi({ orgOpen: false })
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [show, setUi])

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUi({ orgOpen: false })} className="fixed inset-0 z-40 bg-black/40" aria-hidden />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Organisation details"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="scrollbar-thin fixed inset-y-0 right-0 z-50 w-full max-w-[760px] overflow-y-auto border-l border-line-strong bg-elev p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Eyebrow>Organisation details · {getClient().name}</Eyebrow>
                <h2 className="mt-1 text-xl font-medium tracking-tight">Who&apos;s who</h2>
              </div>
              <button type="button" onClick={() => setUi({ orgOpen: false })} className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Close organisation details">
                <X size={16} />
              </button>
            </div>
            <OrgForm
              compact
              onSaved={() => {
                setUi({ orgOpen: false })
                say("Saved. Questions and requests now go to these people.", "reply")
              }}
              onCancel={() => setUi({ orgOpen: false })}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
