"use client"

// Live Google map. The camera flies to each site as a source identifies it,
// drops a marker, shows the geocoded address, then settles back to the
// footprint. Clicking a site zooms to it in satellite view.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Layers, Map as MapIcon, Maximize2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { DARK_STYLE, LIGHT_STYLE, MAPS_MAP_ID, loadMaps, mapsFailure } from "@/esgos/providers/maps"
import type { Site, SiteType } from "@/esgos/lib/types"
import { cn } from "../common/cn"

type Props = {
  sites: Site[]
  focusId?: string | null
  filter?: SiteType | null
  onSelect?: (id: string) => void
  theme: "dark" | "light"
  followArrivals?: boolean
  className?: string
  onUnavailable?: () => void
  compact?: boolean
}

type MarkerHandle = { setMap: (m: google.maps.Map | null) => void; update: (site: Site, focused: boolean) => void }

function markerHtml(site: Site, focused: boolean) {
  const conflict = site.conflict && !site.conflict.resolved && site.status !== "excluded"
  const excluded = site.status === "excluded"
  const color = excluded ? "var(--grey)" : conflict ? "var(--amber)" : "var(--accent)"
  const shape = site.type === "office" ? "border-radius:3px" : site.type === "warehouse" ? "transform:rotate(45deg);border-radius:2px" : "border-radius:999px"
  return `
    <span style="position:relative;display:flex;align-items:center;gap:6px;transform:translate(-7px,-7px)">
      <span style="width:14px;height:14px;${shape};background:${excluded ? "transparent" : color};border:2px solid ${excluded ? "var(--grey)" : "#000"};box-shadow:0 0 0 ${focused ? 6 : 3}px color-mix(in oklab, ${color} ${focused ? 40 : 22}%, transparent)"></span>
      <span style="font:500 12px/1 var(--font-sans);color:${excluded ? "var(--fg-faint)" : "#fff"};text-shadow:0 1px 3px #000,0 0 6px #000;white-space:nowrap;${excluded ? "text-decoration:line-through" : ""}">${site.name.replace(/</g, "&lt;")}</span>
    </span>`
}

function createMarker(site: Site, onClick: (id: string) => void): MarkerHandle {
  class HtmlMarker extends google.maps.OverlayView {
    el: HTMLButtonElement
    pos: google.maps.LatLng
    constructor() {
      super()
      this.pos = new google.maps.LatLng(site.lat, site.lng)
      this.el = document.createElement("button")
      this.el.type = "button"
      this.el.style.cssText = "position:absolute;background:none;border:0;padding:0;cursor:pointer"
      this.el.setAttribute("aria-label", `${site.name}, ${site.type}, ${site.city}`)
      this.el.onclick = (e) => {
        e.stopPropagation()
        onClick(site.id)
      }
      this.el.innerHTML = markerHtml(site, false)
    }
    onAdd() {
      this.getPanes()?.overlayMouseTarget.appendChild(this.el)
    }
    draw() {
      const p = this.getProjection()?.fromLatLngToDivPixel(this.pos)
      if (!p) return
      this.el.style.left = `${p.x}px`
      this.el.style.top = `${p.y}px`
    }
    onRemove() {
      this.el.remove()
    }
    update(s: Site, focused: boolean) {
      this.pos = new google.maps.LatLng(s.lat, s.lng)
      this.el.innerHTML = markerHtml(s, focused)
      this.el.setAttribute("aria-label", `${s.name}, ${s.type}, ${s.city}`)
      this.draw()
    }
  }
  return new HtmlMarker()
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function flyTo(map: google.maps.Map, lat: number, lng: number, zoom: number, ms: number, reduced: boolean): Promise<void> {
  if (reduced) {
    map.moveCamera({ center: { lat, lng }, zoom })
    return Promise.resolve()
  }
  const c0 = map.getCenter()
  const lat0 = c0?.lat() ?? lat
  const lng0 = c0?.lng() ?? lng
  const z0 = map.getZoom() ?? zoom
  const dist = Math.hypot(lat - lat0, lng - lng0)
  const arc = Math.min(3, dist / 6 + Math.abs(zoom - z0) * 0.15)
  return new Promise((resolve) => {
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms)
      const e = ease(t)
      map.moveCamera({
        center: { lat: lat0 + (lat - lat0) * e, lng: lng0 + (lng - lng0) * e },
        zoom: z0 + (zoom - z0) * e - arc * Math.sin(Math.PI * e),
      })
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
}

export function GoogleSiteMap({ sites, focusId, filter, onSelect, theme, followArrivals = true, className, onUnavailable, compact }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markers = useRef(new Map<string, MarkerHandle>())
  const seen = useRef<Set<string>>(new Set(sites.map((s) => s.id)))
  const queue = useRef<string[]>([])
  const busy = useRef(false)
  const reduced = !!useReducedMotion()
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading")
  const [satellite, setSatellite] = useState(false)
  const [caption, setCaption] = useState<{ name: string; detail: string } | null>(null)
  const sitesRef = useRef(sites)
  sitesRef.current = sites

  const visible = sites.filter((s) => (!filter || s.type === filter) && s.city)

  // Create the map once.
  useEffect(() => {
    let cancelled = false
    loadMaps().then((ok) => {
      if (cancelled) return
      if (!ok || !ref.current) {
        setStatus("failed")
        onUnavailable?.()
        return
      }
      mapRef.current = new google.maps.Map(ref.current, {
        center: { lat: 22.6, lng: 80.2 },
        zoom: compact ? 13 : 4.7,
        mapId: MAPS_MAP_ID || undefined,
        styles: MAPS_MAP_ID ? undefined : theme === "dark" ? DARK_STYLE : LIGHT_STYLE,
        disableDefaultUI: true,
        zoomControl: !compact,
        isFractionalZoomEnabled: true,
        clickableIcons: false,
        gestureHandling: "cooperative",
        backgroundColor: theme === "dark" ? "#000000" : "#efefec",
        ...(MAPS_MAP_ID ? { colorScheme: theme === "dark" ? "DARK" : "LIGHT" } : {}),
      } as google.maps.MapOptions)
      setStatus("ready")
    })
    const onAuth = () => {
      setStatus("failed")
      onUnavailable?.()
    }
    window.addEventListener("esgos:maps-auth-failure", onAuth)
    return () => {
      cancelled = true
      window.removeEventListener("esgos:maps-auth-failure", onAuth)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || MAPS_MAP_ID) return
    map.setOptions({ styles: theme === "dark" ? DARK_STYLE : LIGHT_STYLE, backgroundColor: theme === "dark" ? "#000000" : "#efefec" })
  }, [theme, status])

  useEffect(() => {
    mapRef.current?.setMapTypeId(satellite ? "hybrid" : "roadmap")
  }, [satellite, status])

  // Sync markers with sites.
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== "ready") return
    const ids = new Set(visible.map((s) => s.id))
    for (const [id, m] of markers.current) {
      if (!ids.has(id)) {
        m.setMap(null)
        markers.current.delete(id)
      }
    }
    for (const s of visible) {
      let m = markers.current.get(s.id)
      if (!m) {
        m = createMarker(s, (id) => onSelect?.(id))
        m.setMap(map)
        markers.current.set(s.id, m)
      }
      m.update(s, s.id === focusId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map((s) => `${s.id}:${s.lat}:${s.lng}:${s.status}:${s.name}:${s.conflict?.resolved}`).join("|"), focusId, status])

  const fitAll = () => {
    const map = mapRef.current
    const list = sitesRef.current.filter((s) => s.city && s.status !== "excluded")
    if (!map || !list.length) return
    if (list.length === 1) {
      void flyTo(map, list[0].lat, list[0].lng, 11, 1400, reduced)
      return
    }
    const b = new google.maps.LatLngBounds()
    list.forEach((s) => b.extend({ lat: s.lat, lng: s.lng }))
    map.fitBounds(b, { top: 60, bottom: 60, left: 60, right: 60 })
  }

  // Fly to each newly identified site in turn, then settle on the footprint.
  const drain = async () => {
    if (busy.current) return
    busy.current = true
    while (queue.current.length) {
      const id = queue.current.shift()!
      const s = sitesRef.current.find((x) => x.id === id)
      const map = mapRef.current
      if (!s || !map) continue
      setCaption({ name: s.name, detail: s.address ?? `${s.city}, ${s.state}` })
      await flyTo(map, s.lat, s.lng, s.type === "factory" ? 12.5 : 13.5, 2200, reduced)
      await new Promise((r) => setTimeout(r, 1100))
    }
    setCaption(null)
    fitAll()
    busy.current = false
  }

  useEffect(() => {
    if (status !== "ready") return
    const fresh = sites.filter((s) => !seen.current.has(s.id) && s.city)
    fresh.forEach((s) => seen.current.add(s.id))
    if (followArrivals && fresh.length) {
      queue.current.push(...fresh.map((s) => s.id))
      void drain()
    } else if (!busy.current && sites.length && !compact) {
      fitAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites.map((s) => s.id).join(","), status])

  // Focus a site: zoom in close, satellite, so the plant itself is visible.
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== "ready" || !focusId) return
    const s = sitesRef.current.find((x) => x.id === focusId)
    if (!s) return
    setSatellite(true)
    setCaption({ name: s.name, detail: s.address ?? `${s.city}, ${s.state}` })
    void flyTo(map, s.lat, s.lng, compact ? 16 : 15.5, 1800, reduced).then(() => setTimeout(() => setCaption(null), 2500))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, status])

  if (status === "failed") return null

  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-lg border border-line", className)}>
      <div ref={ref} className="absolute inset-0" role="region" aria-label="Map of sites (Google Maps)" />
      {status === "loading" && <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-faint">Loading Google Maps…</div>}
      {status === "ready" && !compact && (
        <div className="absolute right-3 top-3 flex gap-1">
          <button type="button" onClick={() => setSatellite((v) => !v)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-bg/80 px-2.5 text-xs text-fg backdrop-blur hover:bg-surface-2" aria-pressed={satellite}>
            {satellite ? <MapIcon size={13} /> : <Layers size={13} />} {satellite ? "Map" : "Satellite"}
          </button>
          <button type="button" onClick={() => (setSatellite(false), fitAll())} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-bg/80 px-2.5 text-xs text-fg backdrop-blur hover:bg-surface-2" aria-label="Show all sites">
            <Maximize2 size={13} />
          </button>
        </div>
      )}
      <AnimatePresence>
        {caption && (
          <motion.div key={caption.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-4 left-4 max-w-sm rounded-md border border-line-strong bg-bg/85 px-3 py-2 backdrop-blur">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Identified</div>
            <div className="text-sm font-medium">{caption.name}</div>
            <div className="text-xs text-muted">{caption.detail}</div>
          </motion.div>
        )}
      </AnimatePresence>
      {mapsFailure() && <div className="absolute inset-x-0 top-0 bg-amber/15 px-3 py-1 text-xs text-amber">{mapsFailure()}</div>}
    </div>
  )
}
