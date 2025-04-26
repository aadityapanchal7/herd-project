import { supabase } from "./supabase"

// Cache for geocoded locations to reduce API calls
const geocodeCache: Record<string, { lat: number; lng: number }> = {}

/**
 * Geocode a location string to coordinates using Mapbox Geocoding API
 */
export async function geocodeLocation(
  locationString: string,
  universityName?: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Check cache first
    const cacheKey = `${locationString}${universityName ? `-${universityName}` : ""}`
    if (geocodeCache[cacheKey]) {
      return {
        latitude: geocodeCache[cacheKey].lat,
        longitude: geocodeCache[cacheKey].lng,
      }
    }

    // If no Mapbox token, return null
    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      console.error("Mapbox access token is missing")
      return null
    }

    // Get university coordinates to use as a proximity hint for better results
    let proximity = ""
    if (universityName) {
      const { data: university } = await supabase
        .from("universities")
        .select("latitude, longitude")
        .eq("name", universityName)
        .single()

      if (university) {
        proximity = `&proximity=${university.longitude},${university.latitude}`
      }
    }

    // Construct the geocoding URL
    const endpoint = "https://api.mapbox.com/geocoding/v5/mapbox.places"
    const encodedLocation = encodeURIComponent(locationString)
    const url = `${endpoint}/${encodedLocation}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}${proximity}&limit=1`

    // Make the geocoding request
    const response = await fetch(url)
    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center

      // Cache the result
      geocodeCache[cacheKey] = { lat, lng }

      return {
        latitude: lat,
        longitude: lng,
      }
    }

    return null
  } catch (error) {
    console.error("Error geocoding location:", error)
    return null
  }
}

/**
 * Fallback function to generate coordinates near university when geocoding fails
 */
export function generateFallbackCoordinates(
  universityLat: number,
  universityLng: number,
  eventId: number,
): { latitude: number; longitude: number } {
  // Use the existing function from mapbox.ts
  const { getEventCoordinates } = require("./mapbox")
  return getEventCoordinates(eventId, universityLat, universityLng)
}
