"use client"

import { useEffect, useRef, useState } from "react"
import { Map, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FallbackMap } from "@/components/fallback-map"
import type { Event } from "@/lib/types"

interface MapComponentProps {
  center: [number, number]
  zoom: number
  events: (Event & { latitude: number; longitude: number })[]
  primaryColor: string
  onEventSelect: (event: Event & { latitude: number; longitude: number }) => void
  selectedEventId?: number
}

export default function MapComponent({
  center,
  zoom,
  events,
  primaryColor,
  onEventSelect,
  selectedEventId,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markers = useRef<any[]>([])
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapboxLoaded, setMapboxLoaded] = useState(false)
  const [isMapboxSupported, setIsMapboxSupported] = useState(true)

  // Load Mapbox GL
  useEffect(() => {
    let mapboxgl: any

    async function loadMapbox() {
      try {
        // Dynamic import of mapbox-gl
        const mapboxModule = await import("mapbox-gl")
        mapboxgl = mapboxModule.default

        // Check if Mapbox GL is supported
        if (!mapboxgl.supported()) {
          setIsMapboxSupported(false)
          return
        }

        setMapboxLoaded(true)
      } catch (error) {
        console.error("Error loading Mapbox GL:", error)
        setIsMapboxSupported(false)
      }
    }

    loadMapbox()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxLoaded || map.current || !isMapboxSupported) return

    try {
      // Import mapbox-gl dynamically
      import("mapbox-gl").then((mapboxgl) => {
        // Set access token
        if (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
          mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        } else {
          setMapError("Mapbox access token is missing")
          return
        }

        // Create map
        map.current = new mapboxgl.default.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: center,
          zoom: zoom,
        })

        // Add navigation controls
        map.current.addControl(new mapboxgl.default.NavigationControl(), "top-right")

        // Add university marker
        new mapboxgl.default.Marker({
          color: primaryColor,
          scale: 1.2,
        })
          .setLngLat(center)
          .setPopup(new mapboxgl.default.Popup().setHTML(`<h3>Campus Center</h3>`))
          .addTo(map.current)
      })
    } catch (error) {
      console.error("Error initializing map:", error)
      setMapError("Failed to initialize map")
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [center, zoom, primaryColor, mapboxLoaded, isMapboxSupported])

  // Add event markers to map
  useEffect(() => {
    if (!map.current || !mapboxLoaded || events.length === 0 || !isMapboxSupported) return

    // Wait for map to be loaded
    map.current.once("load", () => {
      // Import mapbox-gl dynamically
      import("mapbox-gl").then((mapboxgl) => {
        // Clear existing markers
        markers.current.forEach((marker) => marker.remove())
        markers.current = []

        // Add markers for each event
        events.forEach((event) => {
          // Create custom marker element
          const el = document.createElement("div")
          el.className = "event-marker"
          el.style.backgroundColor = primaryColor
          el.style.width = "20px"
          el.style.height = "20px"
          el.style.borderRadius = "50%"
          el.style.border = "2px solid white"
          el.style.cursor = "pointer"
          el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)"

          // Highlight selected event
          if (event.id === selectedEventId) {
            el.style.width = "24px"
            el.style.height = "24px"
            el.style.zIndex = "10"
            el.style.border = "3px solid white"
          }

          // Create popup content
          const popupContent = `
            <div style="max-width: 200px;">
              <h3 style="font-weight: bold; margin-bottom: 5px;">${event.title}</h3>
              <p style="font-size: 12px; margin-bottom: 5px;">${event.date} • ${event.time}</p>
              <p style="font-size: 12px;">${event.location}</p>
            </div>
          `

          // Create and add marker
          const marker = new mapboxgl.default.Marker(el)
            .setLngLat([event.longitude, event.latitude])
            .setPopup(new mapboxgl.default.Popup().setHTML(popupContent))
            .addTo(map.current)

          // Add click handler
          el.addEventListener("click", () => {
            onEventSelect(event)
          })

          markers.current.push(marker)
        })
      })
    })
  }, [events, primaryColor, selectedEventId, mapboxLoaded, isMapboxSupported])

  // Fly to selected event
  useEffect(() => {
    if (!map.current || !mapboxLoaded || !selectedEventId || !isMapboxSupported) return

    const selectedEvent = events.find((event) => event.id === selectedEventId)
    if (selectedEvent && map.current.loaded()) {
      map.current.flyTo({
        center: [selectedEvent.longitude, selectedEvent.latitude],
        zoom: zoom,
        essential: true,
      })

      // Open popup for this event
      markers.current.forEach((marker) => {
        const markerLngLat = marker.getLngLat()
        if (markerLngLat.lng === selectedEvent.longitude && markerLngLat.lat === selectedEvent.latitude) {
          marker.togglePopup()
        }
      })
    }
  }, [selectedEventId, events, zoom, mapboxLoaded, isMapboxSupported])

  if (mapError) {
    return (
      <div className="w-full h-[600px] rounded-lg border-2 flex items-center justify-center bg-gray-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Map Error</AlertTitle>
          <AlertDescription>{mapError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Use fallback map if Mapbox is not supported or couldn't be loaded
  if (!isMapboxSupported) {
    return <FallbackMap events={events} primaryColor={primaryColor} onEventSelect={onEventSelect} />
  }

  return (
    <div
      ref={mapContainer}
      className="w-full h-[600px] rounded-lg shadow-md"
      style={{ border: `2px solid ${primaryColor}` }}
    >
      {!mapboxLoaded && (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="flex flex-col items-center">
            <Map className="h-12 w-12 text-gray-400 mb-4" />
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8a70d6]"></div>
            <p className="mt-4 text-gray-500">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}
