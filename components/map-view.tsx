"use client"

import { useState, useEffect } from "react"
import { useEvents } from "@/context/events-context"
import { useAuth } from "@/context/auth-context"
import { useTheme } from "@/context/theme-context"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getUniversityByName } from "@/lib/universities"
import { getEventCoordinates } from "@/lib/mapbox"
import { MapPin, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Event } from "@/lib/types"
import dynamic from "next/dynamic"

// Dynamically import the MapComponent to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] rounded-lg bg-gray-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8a70d6]"></div>
    </div>
  ),
})

export function MapView() {
  const { filteredEvents, userRsvps, addUserRsvp, refreshEvents, updateEventAttendees } = useEvents()
  const { isAuthenticated, user } = useAuth()
  const { colors } = useTheme()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isRsvping, setIsRsvping] = useState(false)
  const [universityCoordinates, setUniversityCoordinates] = useState<{
    latitude: number
    longitude: number
    zoom: number
  } | null>(null)
  const [eventsWithCoordinates, setEventsWithCoordinates] = useState<
    (Event & { latitude: number; longitude: number })[]
  >([])
  const { toast } = useToast()
  const router = useRouter()

  // Fetch university coordinates
  useEffect(() => {
    async function fetchUniversityCoordinates() {
      if (!user) {
        // Default to a central US view if no user
        setUniversityCoordinates({
          latitude: 39.8283,
          longitude: -98.5795,
          zoom: 4,
        })
        return
      }

      try {
        const university = await getUniversityByName(user.university)
        if (university) {
          setUniversityCoordinates({
            latitude: university.latitude,
            longitude: university.longitude,
            zoom: university.zoom_level,
          })
        }
      } catch (error) {
        console.error("Error fetching university coordinates:", error)
      }
    }

    fetchUniversityCoordinates()
  }, [user])

  // Process events to ensure they all have coordinates
  useEffect(() => {
    if (!universityCoordinates) return

    const processEvents = async () => {
      const eventsWithCoords = filteredEvents.map((event) => {
        // If the event already has coordinates, use them
        if (event.latitude && event.longitude) {
          return {
            ...event,
            latitude: event.latitude,
            longitude: event.longitude,
          }
        }

        // Otherwise, generate coordinates based on the event ID
        const coords = getEventCoordinates(event.id, universityCoordinates.latitude, universityCoordinates.longitude)
        return {
          ...event,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }
      })

      setEventsWithCoordinates(eventsWithCoords)
    }

    processEvents()
  }, [filteredEvents, universityCoordinates])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Social":
        return "bg-purple-100 text-purple-800"
      case "Academic":
        return "bg-green-100 text-green-800"
      case "Sports":
        return "bg-red-100 text-red-800"
      case "Arts":
        return "bg-pink-100 text-pink-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleRSVP = async (event: Event) => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to RSVP for events",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (userRsvps.includes(event.id)) {
      toast({
        title: "Already RSVP'd",
        description: "You've already RSVP'd to this event",
      })
      return
    }

    if (event.current_attendees >= event.max_attendees) {
      toast({
        title: "Event Full",
        description: "This event has reached its maximum capacity",
        variant: "destructive",
      })
      return
    }

    setIsRsvping(true)

    try {
      // Get the current user directly from Supabase
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        console.error("Auth error in RSVP:", authError || "No user found")
        toast({
          title: "Authentication Error",
          description: "Please log in again to RSVP.",
          variant: "destructive",
        })
        setIsRsvping(false)
        return
      }

      // Check if already RSVP'd
      const { data: existingRsvp } = await supabase
        .from("event_rsvps")
        .select()
        .eq("event_id", event.id)
        .eq("user_id", authData.user.id)
        .single()

      if (existingRsvp) {
        toast({
          title: "Already RSVP'd",
          description: "You've already RSVP'd to this event",
        })
        setIsRsvping(false)
        return
      }

      // Get event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("current_attendees, max_attendees")
        .eq("id", event.id)
        .single()

      if (eventError) {
        toast({
          title: "Error",
          description: "Event not found",
          variant: "destructive",
        })
        setIsRsvping(false)
        return
      }

      if (eventData.current_attendees >= eventData.max_attendees) {
        toast({
          title: "Event Full",
          description: "This event has reached its maximum capacity",
          variant: "destructive",
        })
        setIsRsvping(false)
        return
      }

      // Insert RSVP
      const { error: rsvpError } = await supabase.from("event_rsvps").insert({
        event_id: event.id,
        user_id: authData.user.id,
      })

      if (rsvpError) {
        toast({
          title: "Error",
          description: rsvpError.message,
          variant: "destructive",
        })
        setIsRsvping(false)
        return
      }

      // Update attendee count locally
      const newAttendeeCount = eventData.current_attendees + 1

      // Update the attendee count in the context
      updateEventAttendees(event.id, newAttendeeCount)

      // Add to user's RSVPs in context
      addUserRsvp(event.id)

      toast({
        title: "RSVP Successful",
        description: "You have successfully RSVP'd to this event",
      })

      // Refresh events in the background to keep everything in sync
      refreshEvents()
    } catch (error) {
      console.error("Error RSVPing to event:", error)
      toast({
        title: "RSVP Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsRsvping(false)
    }
  }

  const handleEventSelect = (event: Event & { latitude: number; longitude: number }) => {
    setSelectedEvent(event)
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-semibold university-primary-text mb-2">
          {user ? `${user.university} Campus Map` : "Campus Map"}
        </h2>
        <p className="text-gray-600">
          Explore events happening around {user?.university || "your campus"}. Click on markers to see event details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {universityCoordinates ? (
            <MapComponent
              center={[universityCoordinates.longitude, universityCoordinates.latitude]}
              zoom={universityCoordinates.zoom}
              events={eventsWithCoordinates}
              primaryColor={colors.primary}
              onEventSelect={handleEventSelect}
              selectedEventId={selectedEvent?.id}
            />
          ) : (
            <div className="w-full h-[600px] rounded-lg bg-gray-100 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8a70d6]"></div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-2">Nearby Events</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {eventsWithCoordinates.length === 0 ? (
                <p className="text-gray-500">No events found in this area.</p>
              ) : (
                eventsWithCoordinates.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 border rounded-md cursor-pointer transition-all ${
                      selectedEvent?.id === event.id
                        ? `border-2 university-border shadow-md`
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleEventSelect(event)}
                  >
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className={getCategoryColor(event.category)}>
                        {event.category}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        {event.current_attendees}/{event.max_attendees}
                      </div>
                    </div>
                    <h4 className="font-medium mt-2">{event.title}</h4>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>
                        {event.date} • {event.time}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <Badge variant="outline" className={getCategoryColor(selectedEvent.category)}>
                {selectedEvent.category}
              </Badge>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-500 hover:text-gray-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h3 className="text-xl font-bold mb-2">{selectedEvent.title}</h3>
            <p className="text-gray-600 mb-4">{selectedEvent.description}</p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                <span>
                  {selectedEvent.date} • {selectedEvent.time}
                </span>
              </div>
              <div className="flex items-center text-gray-500">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{selectedEvent.location}</span>
              </div>
              <div className="flex items-center text-gray-500">
                <Users className="w-4 h-4 mr-2" />
                <span>
                  {selectedEvent.current_attendees} / {selectedEvent.max_attendees} attendees
                </span>
              </div>
            </div>
            <Button
              className={
                userRsvps.includes(selectedEvent.id)
                  ? "w-full bg-green-600 hover:bg-green-700"
                  : "w-full university-button"
              }
              onClick={() => handleRSVP(selectedEvent)}
              disabled={
                userRsvps.includes(selectedEvent.id) ||
                selectedEvent.current_attendees >= selectedEvent.max_attendees ||
                isRsvping
              }
            >
              {isRsvping
                ? "Processing..."
                : userRsvps.includes(selectedEvent.id)
                  ? "RSVP'd"
                  : selectedEvent.current_attendees >= selectedEvent.max_attendees
                    ? "Full"
                    : "RSVP"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
