"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Building2, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { INDIA_PATH, INDIA_VIEWBOX } from "@/lib/indiaPath"
import { JouleWise } from "@/components/ui/brand"

const TARGET = "tenneco"

export default function Landing() {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [miss, setMiss] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const matches = q.trim().length > 0 && TARGET.startsWith(q.trim().toLowerCase().slice(0, TARGET.length))
  const exact = q.trim().toLowerCase().startsWith(TARGET)

  useEffect(() => {
    router.prefetch("/tenneco")
    input.current?.focus()
  }, [router])

  function go() {
    if (exact || (matches && q.trim().length >= 3)) router.push("/tenneco")
    else setMiss(true)
  }

  function typeForMe() {
    setQ("")
    TARGET.split("").forEach((_, i) => setTimeout(() => setQ(TARGET.slice(0, i + 1)), 140 * (i + 1)))
    setTimeout(() => router.push("/tenneco"), 140 * TARGET.length + 650)
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-brand-deep text-white">
      <svg viewBox={`0 0 ${INDIA_VIEWBOX.width} ${INDIA_VIEWBOX.height}`} className="pointer-events-none absolute -right-24 top-1/2 h-[120vh] -translate-y-1/2 opacity-[0.12]" aria-hidden>
        <defs>
          <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.6" fill="#fff" />
          </pattern>
          <clipPath id="india">
            <path d={INDIA_PATH} />
          </clipPath>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" clipPath="url(#india)" />
        <path d={INDIA_PATH} fill="none" stroke="#fff" strokeWidth="1.5" />
      </svg>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <JouleWise onDark className="text-xl" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">Electricity · Heat · ESG</span>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 pb-24">
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#7fb0ff]">
          One place for a group&apos;s energy and ESG
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Which company are we looking at?
        </motion.h1>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          onSubmit={(e) => {
            e.preventDefault()
            go()
          }}
          className="relative mt-8"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-4 backdrop-blur focus-within:border-[#7fb0ff]">
            <Search size={20} className="shrink-0 text-white/50" />
            <input
              ref={input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setMiss(false)
              }}
              placeholder="Type a company name"
              aria-label="Company name"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-2xl focus-visible:outline-none font-medium tracking-tight text-white outline-none placeholder:text-white/30"
            />
            <button type="submit" aria-label="Open" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand transition-transform active:scale-95">
              <ArrowRight size={18} />
            </button>
          </div>

          <AnimatePresence>
            {matches && (
              <motion.button
                type="button"
                onClick={() => router.push("/tenneco")}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-2 flex w-full items-center gap-4 rounded-2xl bg-white px-5 py-4 text-left text-fg shadow-xl"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white">
                  <Building2 size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold tracking-tight">Tenneco India</span>
                  <span className="block text-[13px] text-muted">12 entities · 16 plants · 2 listed (NSE: TENNIND, FMGOETZE)</span>
                </span>
                <span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-accent sm:block">Open ↵</span>
              </motion.button>
            )}
          </AnimatePresence>
          {miss && !matches && <p className="mt-3 text-sm text-white/60">This demo is loaded for Tenneco India. Try “Tenneco”.</p>}
        </motion.form>

        <button type="button" onClick={typeForMe} className="mt-6 self-start font-mono text-[11px] uppercase tracking-[0.16em] text-white/40 hover:text-white/80">
          ▶ Type it for me
        </button>
      </section>

      <footer className="relative z-10 px-6 py-5 text-[11px] text-white/40 sm:px-10">
        Prepared by jouleWise for a discussion with Tenneco India. Built from public filings and the plant note shared by Tenneco; assumptions are marked.
      </footer>
    </main>
  )
}
