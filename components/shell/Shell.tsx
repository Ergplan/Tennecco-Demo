"use client"

import { ArrowLeft, ArrowRight, Search } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { STEPS, stepIndex } from "@/lib/steps"
import { JouleWise, TennecoName } from "../ui/brand"
import { cn } from "../ui/cn"
import { DemoStateProvider } from "./DemoState"

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const i = stepIndex(pathname)
  const prev = STEPS[i - 1]
  const next = STEPS[i + 1]

  useEffect(() => {
    STEPS.forEach((s) => router.prefetch(s.href))
  }, [router])

  // ← / → (and PageUp / PageDown from a clicker) move through the story.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.key === "ArrowRight" || e.key === "PageDown") && next) router.push(next.href)
      if ((e.key === "ArrowLeft" || e.key === "PageUp") && prev) router.push(prev.href)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev, router])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <DemoStateProvider>
      <div className="min-h-dvh bg-bg">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-deep text-white">
          <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-3" aria-label="Back to company search">
              <TennecoName onDark sub="India" />
            </Link>
            <span className="hidden h-5 w-px bg-white/20 sm:block" />
            <span className="hidden items-center gap-1.5 text-[12px] text-white/60 sm:flex">
              with <JouleWise onDark className="text-[15px]" />
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/" className="hidden items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/70 hover:text-white md:flex">
                <Search size={13} /> tenneco
              </Link>
              <span className="tnum font-mono text-[11px] text-white/50">
                {i + 1} / {STEPS.length}
              </span>
            </div>
          </div>
          <nav aria-label="Demo steps" className="scrollbar-thin mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-3 pb-2 sm:px-5">
            {STEPS.map((s, k) => (
              <Link
                key={s.id}
                href={s.href}
                aria-current={k === i ? "step" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] transition-colors",
                  k === i ? "bg-white text-brand-deep" : k < i ? "text-white/80 hover:bg-white/10" : "text-white/50 hover:bg-white/10 hover:text-white/80",
                )}
              >
                <span
                  className={cn(
                    "tnum grid h-5 w-5 place-items-center rounded-full font-mono text-[10px]",
                    k === i ? "bg-brand text-white" : k < i ? "bg-white/20 text-white" : "border border-white/25",
                  )}
                >
                  {k + 1}
                </span>
                {s.short}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8">{children}</main>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-4">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-surface/95 p-1 shadow-lg backdrop-blur">
            {prev ? (
              <Link href={prev.href} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-muted hover:bg-surface-2 hover:text-fg">
                <ArrowLeft size={15} /> <span className="hidden sm:inline">{prev.short}</span>
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-muted hover:bg-surface-2 hover:text-fg">
                <ArrowLeft size={15} /> <span className="hidden sm:inline">Search</span>
              </Link>
            )}
            <span className="px-2 font-mono text-[11px] text-faint">{STEPS[i].label}</span>
            {next && (
              <Link href={next.href} className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[13px] font-medium text-white hover:bg-brand-deep">
                <span className="hidden sm:inline">{next.short}</span> <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </DemoStateProvider>
  )
}
