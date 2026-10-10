"use client"

import { animate, useReducedMotion } from "framer-motion"
import { ExternalLink } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { Source } from "@/lib/sites"
import { cn } from "./cn"

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent", className)}>{children}</p>
}

export function PageHead({ eyebrow, title, lede, right }: { eyebrow: string; title: React.ReactNode; lede?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-3xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-[40px] sm:leading-[1.08]">{title}</h1>
        {lede && <p className="mt-3 text-[15px] leading-relaxed text-muted sm:text-base">{lede}</p>}
      </div>
      {right}
    </header>
  )
}

export function Card({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn("min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(0,29,52,0.04)]", className)}>
      {children}
    </div>
  )
}

export function Stat({ label, value, unit, sub, tone, className }: { label: string; value: React.ReactNode; unit?: string; sub?: React.ReactNode; tone?: "good" | "warn" | "heat" | "brand"; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[12px] text-faint">{label}</p>
      <p
        className={cn(
          "tnum mt-0.5 text-2xl font-semibold tracking-tight",
          tone === "good" && "text-green",
          tone === "warn" && "text-amber",
          tone === "heat" && "text-heat",
          tone === "brand" && "text-accent",
          !tone && "text-fg",
        )}
      >
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}
      </p>
      {sub && <p className="mt-0.5 text-[12px] leading-snug text-muted">{sub}</p>}
    </div>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  note,
  onChange,
  color,
  big,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  note?: React.ReactNode
  onChange: (v: number) => void
  color?: string
  big?: boolean
}) {
  const fill = ((value - min) / (max - min)) * 100
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className={cn("text-[13px] font-medium text-fg", big && "text-[15px]")}>{label}</span>
        <b className={cn("tnum font-mono text-[13px] font-medium text-accent", big && "text-lg")} style={color ? { color } : undefined}>
          {display}
        </b>
      </span>
      <input
        type="range"
        className={cn("slider mt-2", big && "big")}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label}: ${display}`}
        style={{ ["--fill" as string]: `${fill}%`, ...(color ? { ["--track-fill" as string]: color } : {}) }}
      />
      {note && <span className="mt-1 block text-[11.5px] leading-snug text-faint">{note}</span>}
    </label>
  )
}

export function Chips<T extends string>({ options, value, onChange, className }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
            o.id === value ? "border-accent bg-accent text-white" : "border-line-strong bg-surface text-muted hover:border-accent hover:text-accent",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Pill({ children, tone = "grey", className }: { children: React.ReactNode; tone?: "grey" | "green" | "amber" | "blue" | "heat" | "red"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "grey" && "bg-surface-2 text-muted",
        tone === "green" && "bg-green-soft text-green",
        tone === "amber" && "bg-amber-soft text-amber",
        tone === "blue" && "bg-accent-soft text-accent",
        tone === "heat" && "bg-heat-soft text-heat",
        tone === "red" && "bg-red-50 text-danger",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SourceLinks({ sources, className }: { sources: Source[]; className?: string }) {
  const list = sources.filter((s) => s.url)
  const offline = sources.filter((s) => !s.url)
  if (!sources.length) return null
  return (
    <p className={cn("text-[11px] leading-relaxed text-faint", className)}>
      Source:{" "}
      {list.map((s, i) => (
        <span key={s.url}>
          {i > 0 && " · "}
          <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline decoration-line-strong underline-offset-2 hover:text-accent">
            {s.label}
            <ExternalLink size={10} />
          </a>
        </span>
      ))}
      {offline.map((s, i) => (
        <span key={s.label}>
          {(list.length > 0 || i > 0) && " · "}
          {s.label}
        </span>
      ))}
    </p>
  )
}

export function Count({ value, format, className, duration = 0.7 }: { value: number; format: (n: number) => string; className?: string; duration?: number }) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    if (reduced) {
      setShown(value)
      prev.current = value
      return
    }
    const c = animate(prev.current, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: setShown })
    prev.current = value
    return () => c.stop()
  }, [value, duration, reduced])
  return <span className={cn("tnum", className)}>{format(shown)}</span>
}

export const fmt = (n: number, d = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d })
export const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`
