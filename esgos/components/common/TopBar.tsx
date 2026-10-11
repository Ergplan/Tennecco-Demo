"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Check, Download, FileUp, Gauge, History, Menu, Moon, RotateCcw, Sun, UsersRound } from "lucide-react"
import { useEffect, useRef } from "react"
import { useStore } from "@/esgos/lib/store"
import { STAGES, STAGE_LABELS, type Stage } from "@/esgos/lib/types"
import { goTo } from "@/esgos/lib/navigation"
import { exportJson } from "./AuditDrawer"
import { ReferenceButton } from "./ReferenceDrawer"
import { cn } from "./cn"
import { STAGE_HUE, STAGE_ICON, tint } from "./icons"

const JOURNEY: Stage[] = STAGES.filter((s) => s !== "agent")

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex items-center gap-3 rounded-lg text-left" aria-label="esgOS home">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <path d="M14 2 25 8.5v11L14 26 3 19.5v-11Z" fill="none" stroke="url(#lg)" strokeWidth="1.6" />
        <path d="M14 8 19.5 11.2v6.1L14 20.5l-5.5-3.2v-6.1Z" fill="url(#lg)" opacity=".9" />
      </svg>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">
          esg<span className="text-accent">OS</span>
        </span>
        <span className="hidden text-[11px] text-faint sm:block">Enterprise Sustainability Intelligence</span>
      </span>
    </button>
  )
}

export function Stepper() {
  const stage = useStore((s) => s.stage)
  const maxStage = useStore((s) => s.maxStage)
  const maxIdx = STAGES.indexOf(maxStage)
  const curIdx = STAGES.indexOf(stage)
  return (
    <nav aria-label="Journey" className="hidden md:block">
      <ol className="flex items-center gap-1">
        {JOURNEY.map((s, i) => {
          const idx = STAGES.indexOf(s)
          const reached = idx <= maxIdx
          const active = s === stage
          const done = idx < curIdx || (idx < maxIdx && !active)
          const Icon = STAGE_ICON[s]
          return (
            <li key={s} className="flex items-center">
              {i > 0 && <span className={cn("mx-1 h-px w-4 lg:w-6", reached ? "bg-accent/50" : "bg-line-strong")} aria-hidden />}
              <button
                type="button"
                disabled={!reached}
                onClick={() => goTo(s)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
                  active ? "text-fg ring-1" : reached ? "text-muted hover:bg-surface-2 hover:text-fg" : "text-faint",
                )}
                style={active ? { backgroundColor: tint(STAGE_HUE[s], 14), boxShadow: `inset 0 0 0 1px ${tint(STAGE_HUE[s], 45)}` } : undefined}
              >
                {done ? <Check size={12} className="text-accent" /> : <Icon size={12} style={{ color: active || reached ? STAGE_HUE[s] : undefined }} aria-hidden />}
                {STAGE_LABELS[s]}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function TopBar() {
  const menuOpen = useStore((s) => s.ui.menuOpen)
  const setUi = useStore((s) => s.setUi)
  const theme = useStore((s) => s.prefs.theme)
  const pace = useStore((s) => s.prefs.pace)
  const setPref = useStore((s) => s.setPref)
  const reset = useStore((s) => s.reset)
  const go = useStore((s) => s.go)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUi({ menuOpen: false })
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setUi({ menuOpen: false })
    window.addEventListener("mousedown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [menuOpen, setUi])

  const item = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg"

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
      <Logo onClick={() => go("agent")} />
      <Stepper />
      <div className="relative flex items-center gap-1" ref={menuRef}>
        <ReferenceButton />
        <button
          type="button"
          onClick={() => setPref({ theme: theme === "dark" ? "light" : "dark" })}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted hover:bg-surface-2 hover:text-fg"
          aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}
          title={theme === "dark" ? "Day mode" : "Night mode"}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          <span className="hidden lg:inline">{theme === "dark" ? "Day" : "Night"}</span>
        </button>
        <button
          type="button"
          onClick={() => setUi({ menuOpen: !menuOpen })}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <Menu size={17} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 top-11 w-60 rounded-2xl border border-line-strong bg-elev p-1.5 shadow-2xl"
            >
              <button role="menuitem" type="button" className={item} onClick={() => setUi({ orgOpen: true, menuOpen: false })}>
                <UsersRound size={15} /> Organisation details
              </button>
              <button role="menuitem" type="button" className={item} onClick={() => setUi({ auditOpen: true, menuOpen: false })}>
                <History size={15} /> Audit trail
              </button>
              <button role="menuitem" type="button" className={item} onClick={() => setUi({ importOpen: true, menuOpen: false })}>
                <FileUp size={15} /> Import data
              </button>
              <button role="menuitem" type="button" className={item} onClick={() => setPref({ pace: pace === "calm" ? "brisk" : "calm" })}>
                <Gauge size={15} /> Pace: {pace === "calm" ? "calm (switch to brisk)" : "brisk (switch to calm)"}
              </button>
              <button role="menuitem" type="button" className={item} onClick={() => (exportJson(), setUi({ menuOpen: false }))}>
                <Download size={15} /> Export JSON
              </button>
              <button role="menuitem" type="button" className={item} onClick={() => setPref({ theme: theme === "dark" ? "light" : "dark" })}>
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />} {theme === "dark" ? "Day mode" : "Night mode"}
              </button>
              <div className="my-1 h-px bg-line" />
              <button
                role="menuitem"
                type="button"
                className={item}
                onClick={() => {
                  reset()
                  setUi({ menuOpen: false })
                }}
              >
                <RotateCcw size={15} /> Restart demo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
