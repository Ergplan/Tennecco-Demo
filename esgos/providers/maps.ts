"use client"

// Google Maps Platform adapter: Maps JavaScript API, Geocoding and Places.
// Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (and optionally
// NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID) in .env.local. Without a key every call
// resolves to null and the UI falls back to the built-in map.

import { importLibrary, setOptions } from "@googlemaps/js-api-loader"

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
export const MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? ""

export function mapsConfigured() {
  return typeof window !== "undefined" && MAPS_KEY.length > 0
}

let ready: Promise<boolean> | null = null
let failure: string | null = null

export function mapsFailure() {
  return failure
}

// Loads the Maps JavaScript API once. Resolves false (never throws) when the key
// is missing, invalid or the network blocks Google.
export function loadMaps(): Promise<boolean> {
  if (!mapsConfigured()) return Promise.resolve(false)
  if (ready) return ready
  ready = (async () => {
    try {
      setOptions({ key: MAPS_KEY, v: "weekly", region: "IN", language: "en" })
      // Google calls this when the key is rejected after load.
      ;(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
        failure = "Google rejected the Maps API key (check referrer restrictions and enabled APIs)."
        window.dispatchEvent(new CustomEvent("esgos:maps-auth-failure"))
      }
      await importLibrary("maps")
      await importLibrary("geocoding")
      return !failure
    } catch (e) {
      failure = e instanceof Error ? e.message : "Google Maps failed to load."
      return false
    }
  })()
  return ready
}

export type GeocodeResult = {
  lat: number
  lng: number
  formattedAddress: string
  placeId: string
  locationType: string
  partial: boolean
}

const geocodeCache = new Map<string, GeocodeResult | null>()

// A rejected key can leave Google's callbacks unanswered; never wait longer than this.
const GEOCODE_TIMEOUT_MS = 8000

export async function geocode(address: string): Promise<GeocodeResult | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!
  if (failure || !(await loadMaps())) return null
  try {
    const { Geocoder } = (await importLibrary("geocoding")) as google.maps.GeocodingLibrary
    const res = await Promise.race([
      new Geocoder().geocode({ address, region: "in", componentRestrictions: { country: "IN" } }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Geocoding timed out")), GEOCODE_TIMEOUT_MS)),
    ])
    const r = res.results[0]
    if (!r) {
      geocodeCache.set(address, null)
      return null
    }
    const out: GeocodeResult = {
      lat: r.geometry.location.lat(),
      lng: r.geometry.location.lng(),
      formattedAddress: r.formatted_address,
      placeId: r.place_id,
      locationType: String(r.geometry.location_type),
      partial: !!r.partial_match,
    }
    geocodeCache.set(address, out)
    return out
  } catch {
    geocodeCache.set(address, null)
    return null
  }
}

export type PlaceHit = { name: string; address: string; lat: number; lng: number; placeId: string; types: string[] }

// Places text search ("Asian Paints plant Khandala"). Uses Places API (New),
// falling back to the legacy PlacesService if only that is enabled.
export async function searchPlaces(query: string, bias?: { lat: number; lng: number; radiusM?: number }): Promise<PlaceHit[]> {
  if (!(await loadMaps())) return []
  try {
    const places = (await importLibrary("places")) as google.maps.PlacesLibrary
    if (places.Place && "searchByText" in places.Place) {
      const { places: hits } = await places.Place.searchByText({
        textQuery: query,
        fields: ["displayName", "formattedAddress", "location", "id", "types"],
        region: "in",
        maxResultCount: 5,
        ...(bias ? { locationBias: { center: { lat: bias.lat, lng: bias.lng }, radius: bias.radiusM ?? 50000 } } : {}),
      })
      return hits
        .filter((p) => p.location)
        .map((p) => ({
          name: p.displayName ?? "",
          address: p.formattedAddress ?? "",
          lat: p.location!.lat(),
          lng: p.location!.lng(),
          placeId: p.id,
          types: p.types ?? [],
        }))
    }
  } catch {
    // fall through to legacy
  }
  try {
    const places = (await importLibrary("places")) as google.maps.PlacesLibrary
    const svc = new places.PlacesService(document.createElement("div"))
    return await new Promise<PlaceHit[]>((resolve) => {
      svc.textSearch({ query, region: "in" }, (results, status) => {
        if (status !== "OK" || !results) return resolve([])
        resolve(
          results.slice(0, 5).map((r) => ({
            name: r.name ?? "",
            address: r.formatted_address ?? "",
            lat: r.geometry?.location?.lat() ?? 0,
            lng: r.geometry?.location?.lng() ?? 0,
            placeId: r.place_id ?? "",
            types: r.types ?? [],
          })),
        )
      })
    })
  } catch {
    return []
  }
}

// Monochrome style for raster maps (used when no cloud Map ID is configured).
export const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0b0b0b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a87" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#000000" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#3a3a38" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#6a6a67" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0d0d0d" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c1c1b" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "simplified" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2a2a28" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#050505" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a4a48" }] },
]

export const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#efefec" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5a5a57" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d6dad9" }] },
]
