"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { INDIA_PATH, INDIA_VIEWBOX } from "@/esgos/lib/indiaPath"
import { declutter, project } from "@/esgos/lib/geo"
import type { FoundVia, Site, SiteType } from "@/esgos/lib/types"
import { cn } from "../common/cn"

type Props = {
  sites: Site[]
  scanning?: boolean
  filter?: SiteType | null
  focusId?: string | null
  onSelect?: (id: string) => void
  labels?: "auto" | "all"
  className?: string
  dim?: boolean
}

const ORIGINS: Record<FoundVia, { x: number; y: number }> = {
  ergos: { x: 40, y: 860 },
  gst: { x: 980, y: 80 },
  paste: { x: 960, y: 1060 },
  registry: { x: 40, y: 120 },
  brsr: { x: 500, y: 20 },
  maps: { x: 980, y: 560 },
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

function Marker({ site, x, y, focused, label, onSelect }: { site: Site; x: number; y: number; focused: boolean; label: boolean; onSelect?: (id: string) => void }) {
  const conflict = site.conflict && !site.conflict.resolved && site.status !== "excluded"
  const excluded = site.status === "excluded"
  const color = excluded ? "var(--grey)" : conflict ? "var(--amber)" : "var(--accent)"
  const r = 11
  const shape =
    site.type === "office" ? (
      <rect x={-r + 1} y={-r + 1} width={(r - 1) * 2} height={(r - 1) * 2} rx={4} />
    ) : site.type === "warehouse" ? (
      <path d={`M0,${-r - 1}L${r + 1},0L0,${r + 1}L${-r - 1},0Z`} />
    ) : (
      <circle r={r} />
    )
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.2 }}
      animate={{ opacity: 1, scale: 1, x, y }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      role="button"
      tabIndex={0}
      aria-label={`${site.name}, ${site.type}, ${site.city}${conflict ? ", needs confirmation" : excluded ? ", excluded" : ""}`}
      onClick={() => onSelect?.(site.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect?.(site.id)
        }
      }}
      className="cursor-pointer outline-none [&:focus-visible_.focus-ring]:opacity-100"
    >
      {conflict && <circle r={r} fill="var(--amber)" className="motion-pulse" opacity={0.6} />}
      <circle r={r + 9} fill={color} opacity={focused ? 0.22 : 0.1} />
      <circle className="focus-ring" r={r + 6} fill="none" stroke="var(--accent-2)" strokeWidth={3} opacity={focused ? 1 : 0} />
      <g fill={excluded ? "transparent" : color} stroke={excluded ? "var(--grey)" : "var(--bg)"} strokeWidth={excluded ? 3 : 2.5}>
        {shape}
      </g>
      {label && (
        <text
          x={r + 10}
          y={7}
          fontSize={24}
          fontWeight={500}
          fill={excluded ? "var(--fg-faint)" : "var(--fg)"}
          stroke="var(--bg)"
          strokeWidth={6}
          paintOrder="stroke"
          style={{ textDecoration: excluded ? "line-through" : undefined }}
        >
          {site.name}
        </text>
      )}
    </motion.g>
  )
}

export function IndiaMap({ sites, scanning, filter, focusId, onSelect, labels = "auto", className, dim }: Props) {
  const reduced = useReducedMotion()
  const [hover, setHover] = useState<string | null>(null)
  const visible = useMemo(() => sites.filter((s) => !filter || s.type === filter).filter((s) => s.city), [sites, filter])
  const layout = useMemo(() => {
    const pts = visible.map((s) => ({ id: s.id, ...project(s.lat, s.lng) }))
    return declutter(pts, 44)
  }, [visible])

  // Track newly arrived sites to animate a pulse crossing the map.
  const seen = useRef<Set<string>>(new Set(sites.map((s) => s.id)))
  const [arrivals, setArrivals] = useState<{ key: string; from: FoundVia; to: { x: number; y: number } }[]>([])
  useEffect(() => {
    const fresh = sites.filter((s) => !seen.current.has(s.id) && s.city)
    if (!fresh.length) return
    fresh.forEach((s) => seen.current.add(s.id))
    if (reduced) return
    const items = fresh.map((s) => ({ key: `${s.id}-${Date.now()}`, from: s.foundVia[s.foundVia.length - 1] ?? "ergos", to: project(s.lat, s.lng) }))
    setArrivals((a) => [...a, ...items])
    const t = setTimeout(() => setArrivals((a) => a.filter((x) => !items.includes(x))), 1400)
    return () => clearTimeout(t)
  }, [sites, reduced])

  const centroid = project(22.5, 79.5)

  return (
    <svg viewBox={`0 0 ${INDIA_VIEWBOX.width} ${INDIA_VIEWBOX.height}`} preserveAspectRatio="xMidYMid meet" className={cn("h-full w-full", className)} role="img" aria-label={`Map of India with ${visible.length} sites`}>
      <defs>
        <clipPath id="india-clip">
          <path d={INDIA_PATH} />
        </clipPath>
        <pattern id="india-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.4" fill="var(--land-stroke)" />
        </pattern>
        <linearGradient id="scan-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="0.85" stopColor="var(--accent)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="sweep-grad" cx="0" cy="0.5" r="1">
          <stop offset="0" stopColor="var(--accent-2)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--accent-2)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path d={GRATICULE} stroke="var(--line)" strokeWidth="1" fill="none" />
      <g opacity={dim ? 0.5 : 1}>
        <path d={INDIA_PATH} fill="var(--land)" stroke="var(--land-stroke)" strokeWidth="1.6" strokeLinejoin="round" />
        <rect width={INDIA_VIEWBOX.width} height={INDIA_VIEWBOX.height} fill="url(#india-dots)" clipPath="url(#india-clip)" opacity="0.7" />
      </g>

      {scanning && !reduced && (
        <text x={INDIA_VIEWBOX.width / 2} y={INDIA_VIEWBOX.height - 24} textAnchor="middle" fontSize={20} fill="var(--fg-faint)" fontFamily="var(--font-mono)" aria-hidden>
          reading sources…
        </text>
      )}

      <AnimatePresence>
        {arrivals.map((a) => {
          const o = ORIGINS[a.from]
          const mx = (o.x + a.to.x) / 2 + (a.to.y - o.y) * 0.15
          const my = (o.y + a.to.y) / 2 - (a.to.x - o.x) * 0.15
          const d = `M${o.x},${o.y} Q${mx},${my} ${a.to.x},${a.to.y}`
          return (
            <g key={a.key} aria-hidden>
              <motion.path d={d} fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0.9 }} animate={{ pathLength: 1, opacity: 0 }} transition={{ duration: 1.1, ease: "easeOut" }} />
              <motion.circle cx={a.to.x} cy={a.to.y} r={10} fill="none" stroke="var(--accent)" strokeWidth="2" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 3], opacity: [0, 0.8, 0] }} transition={{ duration: 1.1, delay: 0.5 }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
            </g>
          )
        })}
      </AnimatePresence>

      {/* Leader lines for decluttered markers */}
      {visible.map((s) => {
        const p = layout[s.id]
        if (!p || Math.hypot(p.dx, p.dy) < 6) return null
        const t = project(s.lat, s.lng)
        return (
          <g key={`leader-${s.id}`} aria-hidden>
            <line x1={t.x} y1={t.y} x2={p.x} y2={p.y} stroke="var(--line-strong)" strokeWidth="1.5" />
            <circle cx={t.x} cy={t.y} r="3" fill="var(--fg-faint)" />
          </g>
        )
      })}

      {visible.map((s) => {
        const p = layout[s.id]
        if (!p) return null
        const focused = focusId === s.id || hover === s.id
        return (
          <g key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(s.id)} onBlur={() => setHover(null)}>
            <Marker site={s} x={p.x} y={p.y} focused={focused} label={labels === "all" || focused || !!(s.conflict && !s.conflict.resolved)} onSelect={onSelect} />
          </g>
        )
      })}
    </svg>
  )
}
