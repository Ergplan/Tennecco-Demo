"use client"

// Every displayed value renders through <Value />, which always carries a
// source badge and opens the provenance thread on click.

import { useStore } from "@/esgos/lib/store"
import type { DataPoint, Source } from "@/esgos/lib/types"
import { fmtDataPointValue, sourceDetail, sourceLabel } from "@/esgos/lib/format"
import { cn } from "./cn"

const SOURCE_TONE: Record<Source, string> = {
  ergos: "text-accent border-accent/30 bg-accent/10",
  gst: "text-teal border-teal/30 bg-teal/10",
  mca: "text-teal border-teal/30 bg-teal/10",
  hrms: "text-fg border-line-strong bg-surface-2",
  erp: "text-fg border-line-strong bg-surface-2",
  ehs: "text-fg border-line-strong bg-surface-2",
  vault: "text-amber border-amber/30 bg-amber/10",
  owner: "text-muted border-line-strong bg-surface-2",
  estimate: "text-faint border-dashed border-line-strong bg-transparent italic",
  engine: "text-teal border-teal/30 bg-transparent",
  brsr: "text-fg border-line-strong bg-surface-2",
  filing: "text-fg border-line-strong bg-surface-2",
  maps: "text-teal border-teal/30 bg-teal/10",
  file: "text-hue-connect border-hue-connect/35 bg-hue-connect/10",
}

export function SourceBadge({ dp, detail = true, className }: { dp: DataPoint; detail?: boolean; className?: string }) {
  const d = detail ? sourceDetail(dp) : ""
  const pending = dp.syncState === "pending"
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium leading-none whitespace-nowrap",
        SOURCE_TONE[dp.source],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full bg-current", pending && "opacity-50")} aria-hidden />
      <span>{sourceLabel(dp.source, dp.mode)}</span>
      {d && <span className="truncate font-normal opacity-75">· {d}</span>}
      {pending && <span className="font-normal opacity-75">· sync pending</span>}
    </span>
  )
}

type ValueProps = {
  dp: DataPoint
  size?: "sm" | "md" | "lg" | "xl"
  badge?: "inline" | "below" | "none-on-hover"
  detail?: boolean
  className?: string
  format?: (dp: DataPoint) => { text: string; unit?: string }
  label?: boolean
}

const SIZE: Record<NonNullable<ValueProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl tracking-tight",
  xl: "text-4xl tracking-tight",
}

export function Value({ dp, size = "md", badge = "inline", detail = true, className, format, label = false }: ValueProps) {
  const setUi = useStore((s) => s.setUi)
  const { text, unit } = (format ?? fmtDataPointValue)(dp)
  const estimate = dp.source === "estimate"
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setUi({ provenance: dp })
      }}
      className={cn(
        "group inline-flex max-w-full rounded-md text-left transition-colors hover:bg-surface-2/70 focus-visible:bg-surface-2",
        badge === "below" ? "flex-col items-start gap-1" : "flex-wrap items-center gap-x-2 gap-y-1",
        className,
      )}
      aria-label={`${dp.label ?? "Value"}: ${text}${unit ? " " + unit : ""}. Source ${sourceLabel(dp.source, dp.mode)}. Show provenance.`}
    >
      {label && dp.label && <span className="text-xs text-muted">{dp.label}</span>}
      <span className={cn("tnum font-medium", SIZE[size], estimate && "italic text-faint")}>
        {text}
        {unit && <span className="ml-1 text-[0.7em] font-normal text-muted">{unit}</span>}
        {estimate && <span className="ml-1 text-[0.6em] font-normal not-italic">est.</span>}
      </span>
      <SourceBadge dp={dp} detail={detail} />
    </button>
  )
}
