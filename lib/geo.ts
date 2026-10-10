import { INDIA_PROJECTION } from "./indiaPath"

// Web Mercator using the same parameters the outline was generated with,
// so site coordinates and the India path always line up.
export function project(lat: number, lng: number): { x: number; y: number } {
  const { scale, translateX, translateY } = INDIA_PROJECTION
  const lambda = (lng * Math.PI) / 180
  const phi = (lat * Math.PI) / 180
  const x = scale * lambda + translateX
  const y = translateY - scale * Math.log(Math.tan(Math.PI / 4 + phi / 2))
  return { x, y }
}

// Spread overlapping markers (Delhi NCR has four sites within 30 km) so each stays
// clickable. Deterministic: same input, same layout.
export function declutter(
  points: { id: string; x: number; y: number }[],
  minDist = 26,
  iterations = 60,
): Record<string, { x: number; y: number; dx: number; dy: number }> {
  const pos = points.map((p) => ({ id: p.id, x: p.x, y: p.y, ox: p.x, oy: p.y }))
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const a = pos[i]
        const b = pos[j]
        let dx = b.x - a.x
        let dy = b.y - a.y
        let d = Math.hypot(dx, dy)
        if (d < minDist) {
          if (d < 0.01) {
            // Deterministic nudge for identical points
            dx = Math.cos(i + j)
            dy = Math.sin(i + j)
            d = 1
          }
          const push = (minDist - d) / 2
          const ux = dx / d
          const uy = dy / d
          a.x -= ux * push
          a.y -= uy * push
          b.x += ux * push
          b.y += uy * push
        }
      }
    }
    // Gentle pull back to true position
    for (const p of pos) {
      p.x += (p.ox - p.x) * 0.04
      p.y += (p.oy - p.y) * 0.04
    }
  }
  const out: Record<string, { x: number; y: number; dx: number; dy: number }> = {}
  for (const p of pos) out[p.id] = { x: p.x, y: p.y, dx: p.x - p.ox, dy: p.y - p.oy }
  return out
}
