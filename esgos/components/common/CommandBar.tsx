"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, Mic } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { runCommand, SUPPORTED_COMMANDS } from "@/esgos/lib/commands"
import { useStore } from "@/esgos/lib/store"
import type { Stage } from "@/esgos/lib/types"
import { cn } from "./cn"

const STAGE_SUGGESTIONS: Record<Stage, string[]> = {
  agent: ["Find my footprint", "Check my BRSR coverage", "Restart demo"],
  seed: ["Show only offices", "Exclude Jaipur", "What's left?"],
  boundary: ["Move Pune to Aurelia Foods", "Include Kolkata", "What's left?"],
  connect: ["Which sites aren't connected?", "Connect HRMS", "How much time is remaining?"],
  profile: ["Use the same answers as Noida", "Skip this site", "How much time is remaining?"],
  gaps: ["Show gaps for Pune", "Show provenance for Noida electricity", "What's left?"],
  plan: ["Show provenance for Noida electricity", "What's left?", "Restart demo"],
}

export function CommandBar() {
  const stage = useStore((s) => s.stage)
  const focusToken = useStore((s) => s.ui.commandFocus)
  const [value, setValue] = useState("")
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [hIdx, setHIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusToken) inputRef.current?.focus()
  }, [focusToken])

  const suggestions = useMemo(() => {
    const base = STAGE_SUGGESTIONS[stage]
    if (!value.trim()) return base
    const v = value.toLowerCase()
    return SUPPORTED_COMMANDS.filter((c) => c.toLowerCase().includes(v)).slice(0, 5)
  }, [stage, value])

  const submit = (text: string) => {
    const t = text.trim()
    if (!t) return
    runCommand(t)
    setHistory((h) => [t, ...h.filter((x) => x !== t)].slice(0, 20))
    setHIdx(-1)
    setValue("")
    setOpen(false)
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-2xl border border-line-strong bg-elev p-1.5 shadow-2xl"
            role="listbox"
            aria-label="Suggested commands"
          >
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => submit(s)}
                  className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg focus-visible:bg-surface-2"
                >
                  {s}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(value)
        }}
        className={cn("flex h-11 items-center gap-1 rounded-full border border-line-strong bg-surface pl-2 pr-1.5 transition-shadow", open && "shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_12%,transparent)]")}
      >
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o)
            inputRef.current?.focus()
          }}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
          aria-label="Preset voice commands"
          title="Preset commands"
        >
          <Mic size={15} />
        </button>
        <label htmlFor="command" className="sr-only">
          Ask esgOS
        </label>
        <input
          id="command"
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false)
              ;(e.target as HTMLInputElement).blur()
            }
            if (e.key === "ArrowUp" && history.length) {
              e.preventDefault()
              const i = Math.min(hIdx + 1, history.length - 1)
              setHIdx(i)
              setValue(history[i])
            }
            if (e.key === "ArrowDown" && hIdx > -1) {
              e.preventDefault()
              const i = hIdx - 1
              setHIdx(i)
              setValue(i === -1 ? "" : history[i])
            }
          }}
          placeholder="Ask esgOS — “Which sites aren't connected?”"
          className="h-full min-w-0 flex-1 bg-transparent px-1 text-sm text-fg outline-none placeholder:text-faint focus-visible:outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fg text-bg transition-opacity disabled:opacity-25"
          aria-label="Send command"
        >
          <ArrowUp size={15} />
        </button>
      </form>
    </div>
  )
}
