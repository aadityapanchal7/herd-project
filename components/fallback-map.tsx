"use client"

import { MapPin } from "lucide-react"
import type { Event } from "@/lib/types"

interface FallbackMapProps {
  events: (Event & { latitude: number; longitude: number })[]
  primaryColor: string
  onEventSelect: (event: Event & { latitude: number; longitude: number }) => void
}

export function FallbackMap({ events, primaryColor, onEventSelect }: FallbackMapProps) {
  return (
    <div
      className="w-full h-[600px] rounded-lg shadow-md fallback-map relative overflow-hidden"
      style={{ border: `2px solid ${primaryColor}` }}
    >
      <div className="absolute inset-0">
        {events.map((event) => {
          // Convert lat/lng to relative positions in the container
          // This is a very simplified positioning just for visual representation
          const x = ((event.longitude + 180) / 360) * 100
          const y = ((90 - event.latitude) / 180) * 100

          return (
            <div
              key={event.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
              onClick={() => onEventSelect(event)}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: primaryColor }}
              ></div>
            </div>
          )
        })}
      </div>
      <div className="absolute bottom-4 right-4 bg-white p-2 rounded-md shadow-md">
        <div className="flex items-center text-sm">
          <MapPin className="w-4 h-4 mr-1" style={{ color: primaryColor }} />
          <span>Events ({events.length})</span>
        </div>
      </div>
      <div className="absolute top-4 left-4 bg-white p-2 rounded-md shadow-md">
        <p className="text-sm text-gray-500">Interactive map unavailable in preview mode</p>
      </div>
    </div>
  )
}
