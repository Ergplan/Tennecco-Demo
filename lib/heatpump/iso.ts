/** A 2:1 isometric projection for the studios' plant drawings. x runs to the lower right,
 *  y to the lower left, z straight up. The same system the RE Transition Studio and the
 *  cement scene use, so the studios read as one set of drawings. */
export const U = 30, V = 15, H = 24;
export type Pt = [number, number];
export const iso = (x: number, y: number, z = 0, ox = 0, oy = 0): Pt => [ox + (x - y) * U, oy + (x + y) * V - z * H];
const pt = (p: Pt) => p.map((v) => v.toFixed(1)).join(",");
export const poly = (pts: Pt[]) => `M${pts.map(pt).join("L")}Z`;
export function box(x: number, y: number, w: number, d: number, h: number, z = 0, ox = 0, oy = 0) {
  const P = (a: number, b: number, c: number) => iso(a, b, c, ox, oy);
  return {
    top: poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]),
    left: poly([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)]),
    right: poly([P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)]),
  };
}
export function tile(x: number, y: number, w: number, d: number, z: number, ox = 0, oy = 0) {
  const P = (a: number, b: number) => iso(a, b, z, ox, oy);
  return poly([P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)]);
}
export function route(points: [number, number][], z: number, ox = 0, oy = 0) {
  return `M${points.map(([a, b]) => pt(iso(a, b, z, ox, oy))).join("L")}`;
}
/** A vertical cylinder as three paths: side, shade, lid. */
export function cylinder(x: number, y: number, r: number, h: number, z = 0, ox = 0, oy = 0) {
  const [cx, cy] = iso(x, y, z, ox, oy);
  const rx = r * U * Math.SQRT2, ry = r * V * Math.SQRT2, hh = h * H;
  return {
    side: `M${cx - rx},${cy} L${cx - rx},${cy - hh} A${rx},${ry} 0 0 0 ${cx + rx},${cy - hh} L${cx + rx},${cy} A${rx},${ry} 0 0 1 ${cx - rx},${cy} Z`,
    shade: `M${cx},${cy + ry} L${cx},${cy - hh + ry} L${cx + rx},${cy - hh} L${cx + rx},${cy} A${rx},${ry} 0 0 1 ${cx},${cy + ry} Z`,
    lid: { cx, cy: cy - hh, rx, ry },
  };
}
