"use client"

import { animate, motion, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { cn } from "./cn"

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "quiet"
  size?: "sm" | "md" | "lg"
}

export function Button({ variant = "secondary", size = "md", className, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-[-0.005em] transition-all active:scale-[0.98] disabled:opacity-40",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-[15px]",
        variant === "primary" && "bg-fg text-bg hover:bg-fg/85",
        variant === "secondary" && "border border-line-strong bg-transparent text-fg hover:bg-surface-2",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
        variant === "quiet" && "text-muted underline-offset-4 hover:text-fg hover:underline",
        className,
      )}
    />
  )
}

export function Count({ value, className, duration = 0.9 }: { value: number; className?: string; duration?: number }) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    if (reduced) {
      setShown(value)
      prev.current = value
      return
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    })
    prev.current = value
    return () => controls.stop()
  }, [value, duration, reduced])
  return <span className={cn("tnum", className)}>{shown.toLocaleString("en-IN")}</span>
}

export function Typewriter({ text, className, speed = 22, onDone }: { text: string; className?: string; speed?: number; onDone?: () => void }) {
  const reduced = useReducedMotion()
  const [n, setN] = useState(reduced ? text.length : 0)
  useEffect(() => {
    if (reduced) {
      setN(text.length)
      onDone?.()
      return
    }
    setN(0)
    let i = 0
    const id = setInterval(() => {
      i++
      setN(i)
      if (i >= text.length) {
        clearInterval(id)
        onDone?.()
      }
    }, speed)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, reduced])
  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{text.slice(0, n)}</span>
      {n < text.length && <span aria-hidden className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-accent motion-breathe" />}
    </span>
  )
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border border-line bg-surface/70 backdrop-blur-sm", className)}>{children}</div>
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint", className)}>{children}</div>
}

export function StatusDot({ tone, pulse }: { tone: "green" | "amber" | "grey" | "teal"; pulse?: boolean }) {
  const color = tone === "green" ? "bg-accent" : tone === "amber" ? "bg-amber" : tone === "teal" ? "bg-teal" : "bg-grey"
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {pulse && <span className={cn("absolute inset-0 rounded-full motion-pulse", color)} />}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} />
    </span>
  )
}

export function FadeIn({ children, delay = 0, className, y = 8 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  )
}

export function SceneLayout({ visual, panel, className }: { visual: React.ReactNode; panel: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden", className)}>
      <div className="relative min-h-[46vh] flex-1 lg:min-h-0">{visual}</div>
      <aside className="scrollbar-thin flex w-full shrink-0 flex-col border-line lg:w-[440px] lg:overflow-y-auto lg:border-l xl:w-[480px]">{panel}</aside>
    </div>
  )
}
