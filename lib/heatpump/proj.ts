/**
 * The site's 2:1 isometric projection (lib/studios/iso.ts), at any scale, with the solids
 * the heat pump drawings need: boxes, cylinders along any axis (vessels, pistons,
 * barrels), and windows cut into a cylinder's visible side.
 *
 * x runs to the lower right, y to the lower left, z up. The viewer looks along
 * (−1, −1, −1.25), so the faces with +x, +y and +z normals are the visible ones.
 */
import { H, U, V } from "./iso";

export type Pt = [number, number];
export type V3 = [number, number, number];

const f = (n: number) => n.toFixed(1);
export const path = (pts: Pt[], close = true) => `M${pts.map((p) => `${f(p[0])},${f(p[1])}`).join("L")}${close ? "Z" : ""}`;

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => mul(a, 1 / Math.hypot(...a));
/** towards the viewer */
export const VIEW: V3 = norm([1, 1, 1.25]);

function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const c = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [], up: Pt[] = [];
  for (const q of p) { while (lo.length >= 2 && c(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && c(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

export function projector(s: number, ox: number, oy: number) {
  const P = (x: number, y: number, z = 0): Pt => [ox + (x - y) * U * s, oy + (x + y) * V * s - z * H * s];
  const Pv = (v: V3) => P(v[0], v[1], v[2]);
  /** screen displacement of one unit along a 3D direction */
  const dir = (a: V3): Pt => [(a[0] - a[1]) * U * s, (a[0] + a[1]) * V * s - a[2] * H * s];

  function box(x: number, y: number, z: number, w: number, d: number, h: number) {
    return {
      top: path([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]),
      left: path([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)]),
      right: path([P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)]),
    };
  }

  /** A cylinder from c along unit axis a, radius r, length len. */
  function cyl(c: V3, a: V3, r: number, len: number, n = 36) {
    const ref: V3 = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const u = norm(cross(a, ref)), w = cross(a, u);
    const ring = (o: V3, rr = r) => Array.from({ length: n }, (_, k) => {
      const t = (k / n) * Math.PI * 2;
      return Pv(add(o, add(mul(u, rr * Math.cos(t)), mul(w, rr * Math.sin(t)))));
    });
    const e0 = c, e1 = add(c, mul(a, len));
    const r0 = ring(e0), r1 = ring(e1);
    // the end facing the viewer is the one drawn as a lid
    const nearEnd = dot(a, VIEW) >= 0 ? r1 : r0;
    return { body: path(hull([...r0, ...r1])), cap: path(nearEnd), ring, e0, e1, u, w };
  }

  /**
   * A window in a cylinder's visible side, between distances t0 and t1 along the axis,
   * spanning ±half radians either side of the line facing the viewer.
   */
  function window(c: V3, a: V3, r: number, t0: number, t1: number, half = 1.0, n = 14) {
    const facing = norm(add(VIEW, mul(a, -dot(VIEW, a))));
    const side = cross(a, facing);
    const arc = (t: number, from: number, to: number) => Array.from({ length: n + 1 }, (_, k) => {
      const ang = from + ((to - from) * k) / n;
      return Pv(add(add(c, mul(a, t)), add(mul(facing, r * Math.cos(ang)), mul(side, r * Math.sin(ang)))));
    });
    return path([...arc(t0, -half, half), ...arc(t1, half, -half)]);
  }

  return { P, Pv, dir, box, cyl, window, add, mul, norm };
}
