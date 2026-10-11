"use client"

import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { readModeFromUrl, setPipelineSpeed } from "@/esgos/lib/mode"
import { DEFAULT_CLIENT, getClient, isClientId, setActiveClient } from "@/esgos/lib/clients"
import { setImports } from "@/esgos/lib/imports"
import { TopBar } from "./common/TopBar"
import { CommandBar } from "./common/CommandBar"
import { ProvenancePanel } from "./common/ProvenancePanel"
import { AuditDrawer } from "./common/AuditDrawer"
import { ReferenceDrawer } from "./common/ReferenceDrawer"
import { ImportDrawer } from "./common/ImportDrawer"
import { OrgDrawer } from "./common/OrgDrawer"
import { AgentScene } from "./Agent/AgentScene"
import { SeedScene } from "./Seed/SeedScene"
import { BoundaryScene } from "./Boundary/BoundaryScene"
import { ConnectScene } from "./Connect/ConnectScene"
import { ProfileScene } from "./Profile/ProfileScene"
import { GapsScene } from "./Gaps/GapsScene"
import { PlanScene } from "./Plan/PlanScene"

function DemoLabel() {
  const seedMode = useStore((s) => s.seedMode)
  useStore((s) => s.clientId)
  return (
    <div className="pointer-events-none flex items-center gap-2 text-[11px] text-faint" role="note">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
      <span className="whitespace-nowrap">{seedMode === "paste" ? "Demo: your pasted sites with mock sources" : getClient().label}</span>
    </div>
  )
}

export default function App() {
  const stage = useStore((s) => s.stage)
  const theme = useStore((s) => s.prefs.theme)
  const setUi = useStore((s) => s.setUi)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mode = readModeFromUrl()
    const s = useStore.getState()
    const wanted = isClientId(mode.client) ? mode.client : s.clientId && isClientId(s.clientId) ? s.clientId : DEFAULT_CLIENT
    setActiveClient(wanted)
    if (mode.reset || s.clientId !== wanted || s.seedMode !== mode.seedMode) {
      s.reset(mode.seedMode, wanted)
    }
    if (mode.reset) {
      const url = new URL(window.location.href)
      url.searchParams.delete("reset")
      window.history.replaceState(null, "", url.toString())
    }
    setImports(useStore.getState().imports)
    if (mode.demo) s.setPref({ muted: true })
    if (mode.pace) useStore.getState().setPref({ pace: mode.pace })
    if (mode.theme) useStore.getState().setPref({ theme: mode.theme })
    setReady(true)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Calm pace (default) slows every pipeline so nothing races the narration.
  const pace = useStore((s) => s.prefs.pace)
  useEffect(() => {
    setPipelineSpeed(pace === "brisk" ? 1 : 2)
  }, [pace])

  // "/" focuses the command bar from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        e.preventDefault()
        setUi({ commandFocus: Date.now() })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [setUi])

  if (!ready) return <div className="h-dvh bg-bg" />

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-dvh flex-col overflow-hidden bg-bg text-fg">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_70%_-10%,color-mix(in_oklab,var(--accent)_7%,transparent),transparent)]" aria-hidden />
        <TopBar />
        <main className="relative min-h-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0"
            >
              {stage === "agent" && <AgentScene />}
              {stage === "seed" && <SeedScene />}
              {stage === "boundary" && <BoundaryScene />}
              {stage === "connect" && <ConnectScene />}
              {stage === "profile" && <ProfileScene />}
              {stage === "gaps" && <GapsScene />}
              {stage === "plan" && <PlanScene />}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="relative z-20 flex shrink-0 flex-col gap-2 border-t border-line bg-bg/80 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:gap-4 sm:px-6">
          <div className="order-2 sm:order-1 sm:w-64">
            <DemoLabel />
          </div>
          <div className="order-1 flex-1 sm:order-2">
            <CommandBar />
          </div>
          <div className="hidden sm:order-3 sm:block sm:w-64" />
        </footer>
        <ProvenancePanel />
        <AuditDrawer />
        <ReferenceDrawer />
        <ImportDrawer />
        <OrgDrawer />
      </div>
    </MotionConfig>
  )
}
