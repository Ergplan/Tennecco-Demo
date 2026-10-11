"use client"

// India map with Tenneco's sites, adapted from esgOS (Ergplan/esgOS, components/Seed/IndiaMap.tsx):
// same Natural Earth outline and Web Mercator projection, so coordinates line up, and the
// same deterministic declutter with leader lines for clustered sites (Chakan has five).

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { INDIA_PATH, INDIA_VIEWBOX } from "@/lib/indiaPath"
import { declutter, project } from "@/lib/geo"
import { entityById, type EntityId } from "@/lib/entities"
import type { Site } from "@/lib/sites"
import { cn } from "../ui/cn"

type Props = {
  sites: Site[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  focusEntity?: EntityId | null
  labels?: "auto" | "all" | "featured"
  className?: string
  stagger?: boolean
  /** discovery mode: a sweep while sources are read, and an arc from the source to each new site */
  scanning?: boolean
  originOf?: (site: Site) => keyof typeof ORIGINS
  /** sites to pulse, e.g. the factory to pick */
  pulseIds?: string[]
}

// Where each source sits off the map; a new site's arc starts here (as in esgOS).
export const ORIGINS: Record<"filings" | "brsr" | "rhp" | "tenneco" | "maps", { x: number; y: number }> = {
  filings: { x: 90, y: 140 },
  brsr: { x: 500, y: 40 },
  rhp: { x: 960, y: 520 },
  tenneco: { x: 940, y: 1040 },
  maps: { x: 120, y: 980 },
}

function graticule() {
  const lines: string[] = []
  for (let lat = 5; lat <= 40; lat += 5) {
    const a = project(lat, 66)
    const b = project(lat, 100)
    lines.push(`M${a.x},${a.y}L${b.x},${b.y}`)
  }
  for (let lng = 65; lng <= 100; lng += 5) {
    const a = project(4, lng)
    const b = project(38, lng)
    lines.push(`M${a.x},${a.y}L${b.x},${b.y}`)
  }
  return lines.join("")
}
const GRATICULE = graticule()

function Marker({
  site,
  x,
  y,
  selected,
  dim,
  label,
  delay,
  onSelect,
  pulse,
}: {
  site: Site
  x: number
  y: number
  selected: boolean
  dim: boolean
  label: boolean
  delay: number
  onSelect?: (id: string) => void
  pulse?: boolean
}) {
  const color = entityById(site.entityId).color
  const r = site.type === "office" ? 8 : site.featured ? 13 : 11
  const shape =
    site.type === "office" ? (
      <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={3} />
    ) : site.type === "rnd" ? (
      <path d={`M0,${-r - 2}L${r + 2},0L0,${r + 2}L${-r - 2},0Z`} />
    ) : (
      <circle r={r} />
    )
  const planned = site.type === "planned"
  const pos = site.labelPos ?? "r"
  const text = site.label ?? site.city
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.2, x, y }}
      animate={{ opacity: dim ? 0.25 : 1, scale: 1, x, y }}
      transition={{ type: "spring", stiffness: 240, damping: 22, delay }}
      role="button"
      tabIndex={0}
      aria-label={`${entityById(site.entityId).short}: ${site.name}, ${site.city}`}
      onClick={() => onSelect?.(site.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect?.(site.id)
        }
      }}
      className="cursor-pointer outline-none"
    >
      {pulse && <circle r={r} fill="var(--green)" className="motion-pulse" opacity={0.55} />}
      <circle r={r + 9} fill={color} opacity={selected ? 0.25 : 0.1} />
      {selected && <circle r={r + 6} fill="none" stroke="var(--fg)" strokeWidth={2.5} />}
      <g fill={planned ? "var(--surface)" : color} stroke={planned ? color : "#fff"} strokeWidth={planned ? 3.5 : 2.5} strokeDasharray={planned ? "4 3" : undefined}>
        {shape}
      </g>
      {label && (
        <text
          x={pos === "l" ? -(r + 9) : pos === "r" ? r + 9 : 0}
          y={pos === "t" ? -(r + 10) : pos === "b" ? r + 24 : 7}
          textAnchor={pos === "l" ? "end" : pos === "r" ? "start" : "middle"}
          fontSize={site.featured ? 24 : 20}
          fontWeight={site.featured ? 700 : 600}
          fill={site.featured ? "var(--green)" : "var(--fg)"}
          stroke="var(--surface)"
          strokeWidth={6}
          paintOrder="stroke"
        >
          {text}
        </text>
      )}
    </motion.g>
  )
}

export function IndiaMap({ sites, selectedId, onSelect, focusEntity, labels = "auto", className, stagger = true, scanning, originOf, pulseIds }: Props) {
  const reduced = useReducedMotion()
  const [hover, setHover] = useState<string | null>(null)

  // Newly arrived sites draw an arc from the source that found them.
  const seen = useRef<Set<string>>(new Set(originOf ? [] : sites.map((s) => s.id)))
  const [arrivals, setArrivals] = useState<{ key: string; from: { x: number; y: number }; to: { x: number; y: number } }[]>([])
  useEffect(() => {
    const fresh = sites.filter((s) => !seen.current.has(s.id))
    if (!fresh.length) return
    fresh.forEach((s) => seen.current.add(s.id))
    if (reduced || !originOf) return
    const items = fresh.map((s) => ({ key: `${s.id}-${Date.now()}`, from: ORIGINS[originOf(s)], to: project(s.lat, s.lng) }))
    setArrivals((a) => [...a, ...items])
    const t = setTimeout(() => setArrivals((a) => a.filter((x) => !items.includes(x))), 1400)
    return () => clearTimeout(t)
  }, [sites, reduced, originOf])
  const layout = useMemo(() => {
    const pts = sites.map((s) => ({ id: s.id, ...project(s.lat, s.lng) }))
    return declutter(pts, 34)
  }, [sites])


  return (
    <svg
      viewBox={`50 10 ${INDIA_VIEWBOX.width - 100} ${INDIA_VIEWBOX.height - 40}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={`Map of India with ${sites.length} Tenneco sites`}
    >
      <defs>
        <clipPath id="india-clip">
          <path d={INDIA_PATH} />
        </clipPath>
        <linearGradient id="scan-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sky)" stopOpacity="0" />
          <stop offset="0.85" stopColor="var(--sky)" stopOpacity="0.14" />
          <stop offset="1" stopColor="var(--sky)" stopOpacity="0.45" />
        </linearGradient>
        <pattern id="india-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.3" fill="var(--land-stroke)" />
        </pattern>
      </defs>
      <path d={GRATICULE} stroke="var(--line)" strokeWidth="1" fill="none" />
      <path d={INDIA_PATH} fill="var(--land)" stroke="var(--land-stroke)" strokeWidth="1.6" strokeLinejoin="round" />
      <rect width={INDIA_VIEWBOX.width} height={INDIA_VIEWBOX.height} fill="url(#india-dots)" clipPath="url(#india-clip)" opacity="0.6" />

      {scanning && !reduced && (
        <g clipPath="url(#india-clip)" aria-hidden>
          <motion.rect
            x={0}
            width={INDIA_VIEWBOX.width}
            height={160}
            fill="url(#scan-grad)"
            initial={{ y: -160 }}
            animate={{ y: INDIA_VIEWBOX.height }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
          />
        </g>
      )}
      {scanning && (
        <text x={INDIA_VIEWBOX.width / 2} y={INDIA_VIEWBOX.height - 40} textAnchor="middle" fontSize={22} fill="var(--faint)" fontFamily="var(--font-mono)" aria-hidden>
          reading sources…
        </text>
      )}

      <AnimatePresence>
        {arrivals.map((a) => {
          const mx = (a.from.x + a.to.x) / 2 + (a.to.y - a.from.y) * 0.15
          const my = (a.from.y + a.to.y) / 2 - (a.to.x - a.from.x) * 0.15
          const d = `M${a.from.x},${a.from.y} Q${mx},${my} ${a.to.x},${a.to.y}`
          return (
            <g key={a.key} aria-hidden>
              <motion.path d={d} fill="none" stroke="var(--sky)" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0.9 }} animate={{ pathLength: 1, opacity: 0 }} transition={{ duration: 1.1, ease: "easeOut" }} />
              <motion.circle cx={a.to.x} cy={a.to.y} r={10} fill="none" stroke="var(--accent)" strokeWidth="2" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 3], opacity: [0, 0.8, 0] }} transition={{ duration: 1.1, delay: 0.5 }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
            </g>
          )
        })}
      </AnimatePresence>

      {sites.map((s) => {
        const p = layout[s.id]
        if (!p || Math.hypot(p.dx, p.dy) < 6) return null
        const t = project(s.lat, s.lng)
        return (
          <g key={`leader-${s.id}`} aria-hidden opacity={focusEntity && focusEntity !== s.entityId ? 0.2 : 1}>
            <line x1={t.x} y1={t.y} x2={p.x} y2={p.y} stroke="var(--line-strong)" strokeWidth="1.5" />
            <circle cx={t.x} cy={t.y} r="3" fill="var(--faint)" />
          </g>
        )
      })}

      {sites.map((s, k) => {
        const p = layout[s.id]
        if (!p) return null
        const selected = selectedId === s.id || hover === s.id
        const dim = !!focusEntity && focusEntity !== s.entityId
        const showLabel =
          !dim && (labels === "all" || selected || (labels === "featured" ? !!s.featured : !!s.label))
        return (
          <g key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
            <Marker site={s} x={p.x} y={p.y} selected={selected} dim={dim} label={showLabel} delay={stagger && !reduced ? 0.25 + k * 0.06 : 0} onSelect={onSelect} pulse={pulseIds ? pulseIds.includes(s.id) : !!s.featured} />
          </g>
        )
      })}
    </svg>
  )
}
