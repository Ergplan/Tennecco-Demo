"use client"

// Isometric site visuals in plain SVG. One site object evolves through the
// journey: dot → building → energy plumbing → operating profile → gap status → assured.

import { AnimatePresence, motion } from "framer-motion"
import type { MeterType, SiteType } from "@/esgos/lib/types"
import { cn } from "../common/cn"

const C = 0.866
const S = 0.5
const OX = 100
const OY = 22

type P = [number, number]
export function iso(x: number, y: number, z = 0): P {
  return [OX + (x - y) * C, OY + (x + y) * S - z]
}
const pts = (...ps: P[]) => ps.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")

function Box({ x, y, w, d, h, z = 0, tone = "base", stroke = true }: { x: number; y: number; w: number; d: number; h: number; z?: number; tone?: "base" | "accent" | "amber" | "teal" | "muted"; stroke?: boolean }) {
  const fills =
    tone === "base"
      ? ["var(--iso-top)", "var(--iso-left)", "var(--iso-right)"]
      : tone === "accent"
        ? ["color-mix(in oklab,var(--accent) 70%,white)", "color-mix(in oklab,var(--accent) 55%,black)", "var(--accent)"]
        : tone === "amber"
          ? ["color-mix(in oklab,var(--amber) 75%,white)", "color-mix(in oklab,var(--amber) 55%,black)", "var(--amber)"]
          : tone === "teal"
            ? ["color-mix(in oklab,var(--accent-2) 70%,white)", "color-mix(in oklab,var(--accent-2) 50%,black)", "var(--accent-2)"]
            : ["var(--surface-3)", "var(--surface-2)", "var(--surface-3)"]
  const top = pts(iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h))
  const left = pts(iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h))
  const right = pts(iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h))
  const sw = stroke ? 0.6 : 0
  return (
    <g strokeLinejoin="round">
      <polygon points={left} fill={fills[1]} stroke="var(--iso-edge)" strokeWidth={sw} />
      <polygon points={right} fill={fills[2]} stroke="var(--iso-edge)" strokeWidth={sw} />
      <polygon points={top} fill={fills[0]} stroke="var(--iso-edge)" strokeWidth={sw} />
    </g>
  )
}

function Cylinder({ x, y, r, h, z = 0, fill = "var(--accent-2)" }: { x: number; y: number; r: number; h: number; z?: number; fill?: string }) {
  const [bx, by] = iso(x, y, z)
  const [tx, ty] = iso(x, y, z + h)
  const rx = r * 1.2
  const ry = r * 0.62
  return (
    <g>
      <path d={`M${bx - rx},${by} L${tx - rx},${ty} A${rx},${ry} 0 0,1 ${tx + rx},${ty} L${bx + rx},${by} A${rx},${ry} 0 0,1 ${bx - rx},${by} Z`} fill={`color-mix(in oklab,${fill} 60%,black)`} stroke="var(--iso-edge)" strokeWidth={0.5} />
      <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill={`color-mix(in oklab,${fill} 80%,white)`} stroke="var(--iso-edge)" strokeWidth={0.5} />
    </g>
  )
}

function Flow({ from, to, color = "var(--accent)" }: { from: P; to: P; color?: string }) {
  const mx = (from[0] + to[0]) / 2
  const my = Math.min(from[1], to[1]) - 6
  return (
    <motion.path
      d={`M${from[0]},${from[1]} Q${mx},${my} ${to[0]},${to[1]}`}
      fill="none"
      stroke={color}
      strokeWidth={1.1}
      strokeLinecap="round"
      className="motion-flow"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.85 }}
      transition={{ duration: 0.7 }}
    />
  )
}

function Appear({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.g initial={{ opacity: 0, scale: 0.6, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 20, delay }} style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
      {children}
    </motion.g>
  )
}

const HUB: P = iso(50, 50, 14)

// ---------------------------------------------------------------- buildings
export function FactoryVisual() {
  return (
    <g>
      <Box x={24} y={30} w={52} d={40} h={24} />
      {/* sawtooth roof */}
      {[0, 1, 2, 3].map((i) => {
        const x = 26 + i * 12.5
        return (
          <polygon
            key={i}
            points={pts(iso(x, 32, 24), iso(x, 68, 24), iso(x + 6, 68, 31), iso(x + 6, 32, 31))}
            fill="color-mix(in oklab,var(--accent-2) 22%,var(--iso-right))"
            stroke="var(--iso-edge)"
            strokeWidth={0.5}
          />
        )
      })}
      <Box x={64} y={34} w={6} d={6} h={50} />
    </g>
  )
}

export function OfficeVisual() {
  const windows = []
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) windows.push([c, r])
  return (
    <g>
      <Box x={36} y={36} w={28} d={28} h={64} />
      {windows.map(([c, r]) => {
        const x = 39 + c * 8.5
        const z = 8 + r * 9.5
        return <polygon key={`${c}-${r}`} points={pts(iso(x, 64, z), iso(x + 5, 64, z), iso(x + 5, 64, z + 5), iso(x, 64, z + 5))} fill="color-mix(in oklab,var(--accent-2) 35%,transparent)" />
      })}
    </g>
  )
}

export function WarehouseVisual() {
  return (
    <g>
      <Box x={16} y={34} w={68} d={32} h={20} />
      <polygon points={pts(iso(16, 34, 20), iso(84, 34, 20), iso(84, 50, 28), iso(16, 50, 28))} fill="var(--iso-top)" stroke="var(--iso-edge)" strokeWidth={0.5} />
      <polygon points={pts(iso(16, 50, 28), iso(84, 50, 28), iso(84, 66, 20), iso(16, 66, 20))} fill="var(--iso-right)" stroke="var(--iso-edge)" strokeWidth={0.5} />
      {[0, 1, 2].map((i) => (
        <polygon key={i} points={pts(iso(24 + i * 20, 66, 0), iso(34 + i * 20, 66, 0), iso(34 + i * 20, 66, 12), iso(24 + i * 20, 66, 12))} fill="var(--surface-2)" stroke="var(--iso-edge)" strokeWidth={0.4} />
      ))}
    </g>
  )
}

// -------------------------------------------------------------------- nodes
export function GridConnection() {
  const [px, py] = iso(-6, 92, 0)
  const top: P = [px, py - 30]
  return (
    <g>
      <line x1={px - 6} y1={py} x2={top[0]} y2={top[1]} stroke="var(--fg-faint)" strokeWidth={1} />
      <line x1={px + 6} y1={py} x2={top[0]} y2={top[1]} stroke="var(--fg-faint)" strokeWidth={1} />
      <line x1={px - 8} y1={top[1] + 8} x2={px + 8} y2={top[1] + 8} stroke="var(--fg-faint)" strokeWidth={1} />
      <motion.path d={`M${top[0] - 40},${top[1] - 14} Q${top[0] - 18},${top[1] + 2} ${top[0]},${top[1] + 2}`} fill="none" stroke="var(--fg-muted)" strokeWidth={0.8} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
    </g>
  )
}
export function Transformer() {
  return <Box x={6} y={76} w={10} d={8} h={9} tone="muted" />
}
export function MeterNode() {
  const [x, y] = iso(20, 86, 4)
  return (
    <g>
      <circle cx={x} cy={y} r={3.4} fill="var(--accent)" />
      <circle cx={x} cy={y} r={6} fill="none" stroke="var(--accent)" strokeWidth={0.6} opacity={0.6} />
    </g>
  )
}
export function SolarArray() {
  return (
    <g>
      {[0, 1].map((r) =>
        [0, 1, 2].map((c) => {
          const x = 78 + c * 7
          const y = 6 + r * 9
          return <polygon key={`${r}-${c}`} points={pts(iso(x, y, 2), iso(x + 6, y, 2), iso(x + 6, y + 6, 5), iso(x, y + 6, 5))} fill="color-mix(in oklab,var(--accent-2) 55%,var(--bg))" stroke="var(--accent-2)" strokeWidth={0.5} />
        }),
      )}
    </g>
  )
}
export function WindMarker() {
  const [x, y] = iso(98, 70, 0)
  const hub: P = [x, y - 34]
  return (
    <g>
      <line x1={x} y1={y} x2={hub[0]} y2={hub[1]} stroke="var(--fg-muted)" strokeWidth={1.2} />
      <g className="motion-sweep" style={{ transformOrigin: `${hub[0]}px ${hub[1]}px`, transformBox: "view-box", animationDuration: "6s" }}>
        {[0, 120, 240].map((a) => (
          <line key={a} x1={hub[0]} y1={hub[1]} x2={hub[0] + Math.cos((a * Math.PI) / 180) * 12} y2={hub[1] + Math.sin((a * Math.PI) / 180) * 12} stroke="var(--fg)" strokeWidth={1.2} strokeLinecap="round" />
        ))}
      </g>
      <circle cx={hub[0]} cy={hub[1]} r={1.6} fill="var(--fg)" />
    </g>
  )
}
export function DGNode() {
  const [x, y] = iso(9, 46, 12)
  return (
    <g>
      <Box x={4} y={40} w={11} d={11} h={8} tone="amber" />
      <line x1={x} y1={y - 2} x2={x} y2={y - 8} stroke="var(--fg-faint)" strokeWidth={1.2} />
    </g>
  )
}
export function SteamNode() {
  const [x, y] = iso(67, 37, 52)
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <motion.circle key={i} cx={x + i * 2} cy={y - 4 - i * 5} r={3 + i * 1.3} fill="var(--fg)" opacity={0.18 - i * 0.04} animate={{ cy: [y - 4 - i * 5, y - 8 - i * 6, y - 4 - i * 5] }} transition={{ duration: 3 + i, repeat: Infinity }} />
      ))}
      <text x={x + 9} y={y - 12} fontSize={6} fill="var(--fg-muted)">
        steam
      </text>
    </g>
  )
}
export function WaterNode() {
  return <Cylinder x={88} y={48} r={5} h={12} fill="var(--accent-2)" />
}
export function BoilerNode() {
  return (
    <g>
      <Box x={44} y={76} w={14} d={9} h={9} tone="amber" />
    </g>
  )
}
export function WasteNode() {
  return (
    <g>
      <Box x={66} y={88} w={5} d={5} h={6} tone="muted" />
      <Box x={73} y={88} w={5} d={5} h={6} tone="muted" />
    </g>
  )
}
export function PeopleNode() {
  const people: P[] = [iso(30, 80, 0), iso(35, 84, 0)]
  return (
    <g>
      {people.map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y - 6} stroke="var(--fg)" strokeWidth={1.6} strokeLinecap="round" />
          <circle cx={x} cy={y - 8.5} r={1.8} fill="var(--fg)" />
        </g>
      ))}
    </g>
  )
}
export function DocumentNode() {
  const [x, y] = iso(20, 30, 40)
  return (
    <g>
      <rect x={x - 5} y={y - 7} width={10} height={13} rx={1.5} fill="var(--bg-elev)" stroke="var(--amber)" strokeWidth={0.8} />
      <line x1={x - 2.5} y1={y - 3} x2={x + 2.5} y2={y - 3} stroke="var(--amber)" strokeWidth={0.7} />
      <line x1={x - 2.5} y1={y} x2={x + 2.5} y2={y} stroke="var(--amber)" strokeWidth={0.7} />
    </g>
  )
}

// ---------------------------------------------------------------- composite
export type SiteVisualProps = {
  type: SiteType
  phase: "dot" | "building"
  meters?: MeterType[]
  profile?: { boiler?: boolean; water?: boolean; waste?: boolean; people?: boolean }
  documents?: boolean
  gaps?: number
  assured?: boolean
  pending?: boolean
  muted?: boolean
  className?: string
  title?: string
}

export function SiteVisual({ type, phase, meters = [], profile = {}, documents, gaps, assured, pending, muted, className, title }: SiteVisualProps) {
  const has = (m: MeterType) => meters.includes(m)
  const elec = has("grid")
  const [cx, cy] = iso(50, 50, 0)
  return (
    <svg viewBox="0 0 200 150" className={cn("h-auto w-full overflow-visible", className)} role="img" aria-label={title}>
      {/* ground plate */}
      <motion.polygon
        points={pts(iso(0, 0), iso(100, 0), iso(100, 100), iso(0, 100))}
        fill="color-mix(in oklab,var(--accent) 4%,transparent)"
        stroke={muted ? "var(--line-strong)" : "color-mix(in oklab,var(--accent) 30%,transparent)"}
        strokeWidth={0.7}
        strokeDasharray={muted ? "3 3" : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "building" ? 1 : 0.35 }}
      />
      <AnimatePresence mode="popLayout">
        {phase === "dot" ? (
          <motion.g key="dot" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 2.2 }} transition={{ duration: 0.35 }} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            {pending && <circle cx={cx} cy={cy} r={10} fill="var(--accent-2)" className="motion-pulse" opacity={0.5} />}
            <circle cx={cx} cy={cy} r={7} fill={muted ? "var(--grey)" : "var(--accent)"} stroke="var(--bg)" strokeWidth={2} />
          </motion.g>
        ) : (
          <motion.g key="building" initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 180, damping: 18 }} style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
            <AnimatePresence>
              {elec && (
                <Appear key="grid">
                  <GridConnection />
                  <Transformer />
                </Appear>
              )}
              {has("dg") && (
                <Appear key="dg" delay={0.05}>
                  <DGNode />
                </Appear>
              )}
              {profile.boiler && (
                <Appear key="boiler">
                  <BoilerNode />
                </Appear>
              )}
              {profile.people && (
                <Appear key="people">
                  <PeopleNode />
                </Appear>
              )}
              {profile.waste && (
                <Appear key="waste">
                  <WasteNode />
                </Appear>
              )}
            </AnimatePresence>
            {type === "office" ? <OfficeVisual /> : type === "warehouse" ? <WarehouseVisual /> : <FactoryVisual />}
            <AnimatePresence>
              {(has("solar") || has("rooftop")) && (
                <Appear key="solar">
                  <SolarArray />
                </Appear>
              )}
              {has("wind") && (
                <Appear key="wind">
                  <WindMarker />
                </Appear>
              )}
              {(has("water") || profile.water) && (
                <Appear key="water">
                  <WaterNode />
                </Appear>
              )}
              {has("steam") && (
                <Appear key="steam">
                  <SteamNode />
                </Appear>
              )}
              {elec && (
                <Appear key="meter">
                  <MeterNode />
                </Appear>
              )}
              {documents && (
                <Appear key="doc">
                  <DocumentNode />
                </Appear>
              )}
            </AnimatePresence>
            {/* flow lines from validated meters into the site */}
            {elec && <Flow from={iso(14, 80, 9)} to={HUB} />}
            {(has("solar") || has("rooftop")) && <Flow from={iso(84, 18, 4)} to={HUB} color="var(--accent-2)" />}
            {has("wind") && <Flow from={iso(98, 70, 34)} to={HUB} color="var(--fg-muted)" />}
            {has("dg") && <Flow from={iso(10, 46, 8)} to={HUB} color="var(--amber)" />}
            {(has("water") || profile.water) && <Flow from={iso(88, 48, 12)} to={HUB} color="var(--accent-2)" />}
            {profile.boiler && <Flow from={iso(51, 80, 9)} to={iso(60, 50, 20)} color="var(--amber)" />}
          </motion.g>
        )}
      </AnimatePresence>
      {phase === "building" && gaps !== undefined && gaps > 0 && (
        <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <circle cx={178} cy={20} r={11} fill="color-mix(in oklab,var(--amber) 18%,var(--bg))" stroke="var(--amber)" strokeWidth={1.2} />
          <text x={178} y={24} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--amber)">
            {gaps}
          </text>
        </motion.g>
      )}
      {phase === "building" && assured && (
        <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <circle cx={22} cy={20} r={11} fill="color-mix(in oklab,var(--accent) 14%,var(--bg))" stroke="var(--accent)" strokeWidth={1.2} />
          <path d="M17,20 L21,24 L28,16" fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
      )}
    </svg>
  )
}
