"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Event, EventCategory, University } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "./auth-context"
import { supabase } from "@/lib/supabase"
import { getUniversities } from "@/lib/universities"

interface EventsContextType {
  events: Event[]
  filteredEvents: Event[]
  searchTerm: string
  selectedCategory: EventCategory
  selectedDate: string
  selectedUniversity: number | null
  universities: University[]
  setSearchTerm: (term: string) => void
  setSelectedCategory: (category: EventCategory) => void
  setSelectedDate: (date: string) => void
  setSelectedUniversity: (universityId: number | null) => void
  rsvpToEvent: (eventId: number) => Promise<void>
  userRsvps: number[]
  addUserRsvp: (eventId: number) => void
  loading: boolean
  refreshEvents: () => Promise<void>
  error: string | null
  updateEventAttendees: (eventId: number, attendeeCount: number) => void
}

const EventsContext = createContext<EventsContextType | undefined>(undefined)

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>("All")
  const [selectedDate, setSelectedDate] = useState("All")
  const [selectedUniversity, setSelectedUniversity] = useState<number | null>(null)
  const [universities, setUniversities] = useState<University[]>([])
  const [userRsvps, setUserRsvps] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { isAuthenticated, user } = useAuth()

  // Fetch universities
  useEffect(() => {
    async function fetchUniversities() {
      try {
        const data = await getUniversities()
        setUniversities(data)
      } catch (error) {
        console.error("Error fetching universities:", error)
      }
    }

    fetchUniversities()
  }, [])

  // Set selected university based on user's university when logged in
  useEffect(() => {
    if (isAuthenticated && user && universities.length > 0) {
      const userUniversity = universities.find((u) => u.name === user.university)
      if (userUniversity) {
        setSelectedUniversity(userUniversity.id)
      }
    }
  }, [isAuthenticated, user, universities])

  // Fetch events on mount
  useEffect(() => {
    fetchEvents()
    if (isAuthenticated) {
      fetchUserRsvps()
    }
  }, [isAuthenticated])

  // Set up real-time subscription for event updates
  useEffect(() => {
    // Subscribe to changes on the events table
    const subscription = supabase
      .channel("events-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
        },
        (payload) => {
          console.log("Event updated:", payload)

          // Update the event in our local state
          if (payload.new && typeof payload.new.id === "number") {
            const updatedEvent = payload.new as Event

            // Update the events array
            setEvents((currentEvents) =>
              currentEvents.map((event) => (event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event)),
            )
          }
        },
      )
      .subscribe()

    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  // Filter events when search term, category, date, or university changes
  useEffect(() => {
    let filtered = [...events]

    // Filter by university
    if (selectedUniversity !== null) {
      filtered = filtered.filter((event) => event.university_id === selectedUniversity)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter((event) => event.category === selectedCategory)
    }

    // Filter by date
    if (selectedDate !== "All") {
      filtered = filtered.filter((event) => event.date === selectedDate)
    }

    setFilteredEvents(filtered)
  }, [events, searchTerm, selectedCategory, selectedDate, selectedUniversity])

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError("Database configuration is missing")
        setLoading(false)
        return
      }

      const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true })

      if (error) {
        console.error("Error fetching events:", error)
        setError("Failed to load events")
        toast({
          title: "Error",
          description: "Failed to load events",
          variant: "destructive",
        })
        return
      }

      setEvents(data || [])
      setFilteredEvents(data || [])
    } catch (error) {
      console.error("Error fetching events:", error)
      setError("Failed to load events")
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRsvps = async () => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return
      }

      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        return
      }

      const { data, error } = await supabase.from("event_rsvps").select("event_id").eq("user_id", authData.user.id)

      if (error) {
        console.error("Error fetching user RSVPs:", error)
        return
      }

      setUserRsvps(data.map((rsvp) => rsvp.event_id) || [])
    } catch (error) {
      console.error("Error fetching user RSVPs:", error)
    }
  }

  // Add a new function to update the user's RSVPs locally
  const addUserRsvp = (eventId: number) => {
    if (!userRsvps.includes(eventId)) {
      setUserRsvps((prev) => [...prev, eventId])
    }
  }

  // Add a function to update event attendees count
  const updateEventAttendees = (eventId: number, attendeeCount: number) => {
    setEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === eventId ? { ...event, current_attendees: attendeeCount } : event)),
    )
  }

  const handleRsvpToEvent = async (eventId: number) => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        toast({
          title: "Configuration Error",
          description: "Database service is not properly configured.",
          variant: "destructive",
        })
        return
      }

      // This is now handled in the EventCard component directly
      // We keep this method for backward compatibility
      console.warn("rsvpToEvent in context is deprecated, use the direct method in EventCard")
    } catch (error) {
      console.error("Error RSVPing to event:", error)
      toast({
        title: "RSVP Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const refreshEvents = async () => {
    await fetchEvents()
    if (isAuthenticated) {
      await fetchUserRsvps()
    }
  }

  return (
    <EventsContext.Provider
      value={{
        events,
        filteredEvents,
        searchTerm,
        selectedCategory,
        selectedDate,
        selectedUniversity,
        universities,
        setSearchTerm,
        setSelectedCategory,
        setSelectedDate,
        setSelectedUniversity,
        rsvpToEvent: handleRsvpToEvent,
        userRsvps,
        addUserRsvp,
        loading,
        refreshEvents,
        error,
        updateEventAttendees,
      }}
    >
      {children}
    </EventsContext.Provider>
  )
}

export function useEvents() {
  const context = useContext(EventsContext)
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider")
  }
  return context
}
