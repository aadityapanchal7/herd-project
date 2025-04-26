"use client"

import { useState } from "react"
import { useEvents } from "@/context/events-context"
import { EventCard } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import type { Event } from "@/lib/types"

export function UniversityEventsGrid() {
  const { events, universities } = useEvents()
  const { isAuthenticated } = useAuth()
  const [expandedUniversities, setExpandedUniversities] = useState<Record<number, boolean>>({})

  // If user is authenticated, don't use this component
  if (isAuthenticated) {
    return null
  }

  // Group events by university
  const eventsByUniversity: Record<number, Event[]> = {}

  // Initialize with empty arrays for all universities
  universities.forEach((university) => {
    eventsByUniversity[university.id] = []
  })

  // Group events
  events.forEach((event) => {
    if (event.university_id) {
      if (eventsByUniversity[event.university_id]) {
        eventsByUniversity[event.university_id].push(event)
      }
    }
  })

  // Toggle expanded state for a university
  const toggleUniversity = (universityId: number) => {
    setExpandedUniversities((prev) => ({
      ...prev,
      [universityId]: !prev[universityId],
    }))
  }

  return (
    <div className="space-y-8">
      {universities.map((university) => {
        const universityEvents = eventsByUniversity[university.id] || []
        const isExpanded = expandedUniversities[university.id] || false

        // Skip universities with no events
        if (universityEvents.length === 0) return null

        return (
          <div key={university.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div
              className="p-4 flex justify-between items-center cursor-pointer"
              onClick={() => toggleUniversity(university.id)}
              style={{ backgroundColor: university.primary_color, color: university.text_color }}
            >
              <h2 className="text-xl font-bold">{university.name}</h2>
              <div className="flex items-center">
                <span className="mr-2">{universityEvents.length} Events</span>
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>

            {isExpanded && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {universityEvents.slice(0, 6).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>

                {universityEvents.length > 6 && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      className="border-gray-300"
                      onClick={() => {
                        // Set the selected university in the context
                        // This will be handled by the events context
                      }}
                    >
                      View all {universityEvents.length} events from {university.name}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
