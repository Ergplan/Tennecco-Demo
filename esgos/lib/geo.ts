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

export type CityRecord = { city: string; state: string; lat: number; lng: number; aliases?: string[] }

// Local gazetteer used to place pasted sites (no external geocoding).
export const CITIES: CityRecord[] = [
  { city: "New Delhi", state: "Delhi", lat: 28.6315, lng: 77.2167, aliases: ["delhi", "connaught place", "nehru place", "okhla"] },
  { city: "Noida", state: "Uttar Pradesh", lat: 28.6273, lng: 77.3725 },
  { city: "Greater Noida", state: "Uttar Pradesh", lat: 28.4744, lng: 77.504 },
  { city: "Ghaziabad", state: "Uttar Pradesh", lat: 28.6692, lng: 77.4538 },
  { city: "Gurugram", state: "Haryana", lat: 28.5021, lng: 77.0857, aliases: ["gurgaon", "udyog vihar"] },
  { city: "Faridabad", state: "Haryana", lat: 28.4089, lng: 77.3178 },
  { city: "Manesar", state: "Haryana", lat: 28.3515, lng: 76.9428 },
  { city: "Sonipat", state: "Haryana", lat: 28.9931, lng: 77.0151 },
  { city: "Muzaffarnagar", state: "Uttar Pradesh", lat: 29.4727, lng: 77.7085 },
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319 },
  { city: "Agra", state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081 },
  { city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739 },
  { city: "Dehradun", state: "Uttarakhand", lat: 30.3165, lng: 78.0322 },
  { city: "Haridwar", state: "Uttarakhand", lat: 29.9457, lng: 78.1642 },
  { city: "Rudrapur", state: "Uttarakhand", lat: 28.9845, lng: 79.4 },
  { city: "Baddi", state: "Himachal Pradesh", lat: 30.958, lng: 76.7914 },
  { city: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { city: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.8573 },
  { city: "Amritsar", state: "Punjab", lat: 31.634, lng: 74.8723 },
  { city: "Jaipur", state: "Rajasthan", lat: 26.7788, lng: 75.8458, aliases: ["sitapura"] },
  { city: "Neemrana", state: "Rajasthan", lat: 27.9881, lng: 76.3866 },
  { city: "Bhiwadi", state: "Rajasthan", lat: 28.2104, lng: 76.8606 },
  { city: "Jodhpur", state: "Rajasthan", lat: 26.2389, lng: 73.0243 },
  { city: "Udaipur", state: "Rajasthan", lat: 24.5854, lng: 73.7125 },
  { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, aliases: ["sanand"] },
  { city: "Vadodara", state: "Gujarat", lat: 22.3072, lng: 73.1812, aliases: ["baroda"] },
  { city: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311 },
  { city: "Rajkot", state: "Gujarat", lat: 22.3039, lng: 70.8022 },
  { city: "Vapi", state: "Gujarat", lat: 20.3893, lng: 72.9106 },
  { city: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777, aliases: ["bombay", "andheri", "bkc", "lower parel", "powai"] },
  { city: "Thane", state: "Maharashtra", lat: 19.2183, lng: 72.9781, aliases: ["bhiwandi"] },
  { city: "Navi Mumbai", state: "Maharashtra", lat: 19.033, lng: 73.0297, aliases: ["taloja", "turbhe"] },
  { city: "Pune", state: "Maharashtra", lat: 18.7606, lng: 73.8636, aliases: ["chakan", "ranjangaon", "hinjewadi"] },
  { city: "Nashik", state: "Maharashtra", lat: 19.9975, lng: 73.7898 },
  { city: "Aurangabad", state: "Maharashtra", lat: 19.8762, lng: 75.3433, aliases: ["chhatrapati sambhajinagar", "waluj"] },
  { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  { city: "Goa", state: "Goa", lat: 15.4909, lng: 73.8278, aliases: ["panaji", "verna"] },
  { city: "Indore", state: "Madhya Pradesh", lat: 22.6136, lng: 75.675, aliases: ["pithampur"] },
  { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, aliases: ["mandideep"] },
  { city: "Raipur", state: "Chhattisgarh", lat: 21.2514, lng: 81.6296 },
  { city: "Hyderabad", state: "Telangana", lat: 17.5326, lng: 78.2649, aliases: ["patancheru", "secunderabad", "gachibowli"] },
  { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185, aliases: ["vizag"] },
  { city: "Vijayawada", state: "Andhra Pradesh", lat: 16.5062, lng: 80.648 },
  { city: "Sri City", state: "Andhra Pradesh", lat: 13.5546, lng: 80.0281 },
  { city: "Chennai", state: "Tamil Nadu", lat: 12.9675, lng: 79.9419, aliases: ["sriperumbudur", "oragadam", "guindy", "ambattur"] },
  { city: "Hosur", state: "Tamil Nadu", lat: 12.7409, lng: 77.8253 },
  { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558 },
  { city: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198 },
  { city: "Tiruppur", state: "Tamil Nadu", lat: 11.1085, lng: 77.3411 },
  { city: "Bengaluru", state: "Karnataka", lat: 12.8166, lng: 77.695, aliases: ["bangalore", "bommasandra", "whitefield", "peenya"] },
  { city: "Mysuru", state: "Karnataka", lat: 12.2958, lng: 76.6394, aliases: ["mysore"] },
  { city: "Mangaluru", state: "Karnataka", lat: 12.9141, lng: 74.856, aliases: ["mangalore"] },
  { city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, aliases: ["cochin"] },
  { city: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366, aliases: ["trivandrum"] },
  { city: "Kolkata", state: "West Bengal", lat: 22.682, lng: 88.29, aliases: ["calcutta", "dankuni", "howrah"] },
  { city: "Durgapur", state: "West Bengal", lat: 23.5204, lng: 87.3119 },
  { city: "Siliguri", state: "West Bengal", lat: 26.7271, lng: 88.3953 },
  { city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245 },
  { city: "Jamshedpur", state: "Jharkhand", lat: 22.8046, lng: 86.2029 },
  { city: "Ranchi", state: "Jharkhand", lat: 23.3441, lng: 85.3096 },
  { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 },
  { city: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362 },
]

export const STATE_CODES: Record<string, string> = {
  "Jammu and Kashmir": "01",
  "Himachal Pradesh": "02",
  Punjab: "03",
  Chandigarh: "04",
  Uttarakhand: "05",
  Haryana: "06",
  Delhi: "07",
  Rajasthan: "08",
  "Uttar Pradesh": "09",
  Bihar: "10",
  Assam: "18",
  "West Bengal": "19",
  Jharkhand: "20",
  Odisha: "21",
  Chhattisgarh: "22",
  "Madhya Pradesh": "23",
  Gujarat: "24",
  Maharashtra: "27",
  Karnataka: "29",
  Goa: "30",
  Kerala: "32",
  "Tamil Nadu": "33",
  Telangana: "36",
  "Andhra Pradesh": "37",
}

export function findCity(text: string): CityRecord | undefined {
  const t = text.toLowerCase()
  // Longest names first so "Greater Noida" wins over "Noida" and "Navi Mumbai" over "Mumbai".
  const candidates = CITIES.flatMap((c) =>
    [c.city, ...(c.aliases ?? [])].map((name) => ({ name: name.toLowerCase(), c })),
  ).sort((a, b) => b.name.length - a.name.length)
  for (const { name, c } of candidates) {
    const re = new RegExp(`(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`)
    if (re.test(t)) return c
  }
  return undefined
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
