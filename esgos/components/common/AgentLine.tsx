"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { RotateCcw, SkipForward, Volume2, VolumeX } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { splitWords, voice } from "@/esgos/lib/voice"
import { cn } from "./cn"

// The agent speaks one short line at a time. Captions are always visible; words
// brighten as they are "spoken" and the current phrase glows.
export function AgentLine({ variant = "panel", className, text, id }: { variant?: "hero" | "panel" | "question"; className?: string; text?: string; id?: string | number }) {
  const storeAgent = useStore((s) => s.agent)
  const agent = text !== undefined ? { id: id ?? text, text, kind: "agent" as const } : storeAgent
  const muted = useStore((s) => s.prefs.muted)
  const setPref = useStore((s) => s.setPref)
  const reduced = useReducedMotion()
  const words = useMemo(() => splitWords(agent.text), [agent.text])
  const [lit, setLit] = useState(-1)
  const [speaking, setSpeaking] = useState(false)
  const [replay, setReplay] = useState(0)

  useEffect(() => {
    if (reduced) {
      setLit(words.length)
      setSpeaking(false)
      if (!muted) voice.speak(agent.text, { muted, onWord: () => {}, onEnd: () => {} })
      return
    }
    setLit(-1)
    setSpeaking(true)
    voice.speak(agent.text, {
      muted,
      onWord: (i) => setLit(i),
      onEnd: () => {
        setLit(words.length)
        setSpeaking(false)
      },
    })
    return () => voice.stop()
    // Re-speak on every new agent message or replay; muting mid-line does not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id, replay])

  const skip = () => {
    voice.stop()
    setLit(words.length)
    setSpeaking(false)
  }

  // Current phrase = words since the last punctuation mark up to the lit word.
  let phraseStart = 0
  for (let i = 0; i <= lit && i < words.length; i++) if (i > 0 && /[.,;:!?—]$/.test(words[i - 1])) phraseStart = i

  return (
    <div className={cn("flex items-start gap-3", className)} aria-live="polite">
      <div className={cn("relative mt-1.5 shrink-0", variant === "hero" ? "mt-3" : "")} aria-hidden>
        <span className={cn("block rounded-full bg-accent", variant === "hero" ? "h-2.5 w-2.5" : "h-2 w-2", speaking && "motion-breathe")} />
        {speaking && <span className="absolute inset-0 rounded-full bg-accent motion-pulse" />}
      </div>
      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.p
            key={agent.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35 }}
            className={cn(
              "text-balance",
              variant === "hero"
                ? "text-3xl font-medium tracking-tight sm:text-5xl"
                : variant === "question"
                  ? "text-[28px] font-medium leading-[1.12] tracking-tight sm:text-[34px] xl:text-[40px]"
                  : "text-lg font-medium leading-snug tracking-tight sm:text-xl",
              agent.kind === "reply" && variant !== "hero" && "text-base sm:text-lg",
            )}
          >
            <span className="sr-only">{agent.text}</span>
            <span aria-hidden>
              {words.map((w, i) => (
                <span key={i} className={cn("word", i > lit ? "word-muted" : i >= phraseStart && speaking ? "word-current" : "word-lit")}>
                  {w}{" "}
                </span>
              ))}
            </span>
          </motion.p>
        </AnimatePresence>
        <div className="mt-2 flex items-center gap-1 text-faint">
          <button
            type="button"
            onClick={() => setPref({ muted: !muted })}
            className="inline-flex h-7 items-center gap-1.5 rounded-full px-2 text-[11px] hover:bg-surface-2 hover:text-fg"
            aria-label={muted ? "Unmute agent voice" : "Mute agent voice"}
            aria-pressed={!muted}
          >
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            {muted ? "Voice off" : "Voice on"}
          </button>
          <button type="button" onClick={() => setReplay((r) => r + 1)} className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-2 hover:text-fg" aria-label="Replay agent line">
            <RotateCcw size={13} />
          </button>
          <button type="button" onClick={skip} disabled={!speaking} className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-2 hover:text-fg disabled:opacity-30" aria-label="Skip agent line">
            <SkipForward size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
