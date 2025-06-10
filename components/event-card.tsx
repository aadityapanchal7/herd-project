"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, MapPin, MessageSquare, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useEvents } from "@/context/events-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import type { Event } from "@/lib/types"
import { supabase } from "@/lib/supabase"

interface EventCardProps {
  event: Event
}

export function EventCard({ event: initialEvent }: EventCardProps) {
  // Use local state to track the event data so we can update it immediately
  const [event, setEvent] = useState<Event>(initialEvent)
  const { title, category, description, date, time, location, max_attendees, current_attendees, verified, id } = event

  const { isAuthenticated, user } = useAuth()
  const { userRsvps, addUserRsvp, refreshEvents, updateEventAttendees } = useEvents()
  const router = useRouter()
  const { toast } = useToast()
  const [isRsvping, setIsRsvping] = useState(false)

  // Listen for updates to this specific event
  useEffect(() => {
    const subscription = supabase
      .channel(`event-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log(`Event ${id} updated:`, payload)
          if (payload.new) {
            setEvent((current) => ({
              ...current,
              ...(payload.new as Event),
            }))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [id])

  // Update local state when initialEvent changes (e.g., from parent component)
  useEffect(() => {
    setEvent(initialEvent)
  }, [initialEvent])

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

  const handleRSVP = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to RSVP for events",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (userRsvps.includes(id)) {
      toast({
        title: "Already RSVP'd",
        description: "You've already RSVP'd to this event",
      })
      return
    }

    if (current_attendees >= max_attendees) {
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
        .eq("event_id", id)
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
        .eq("id", id)
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
        event_id: id,
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

      // Update event attendee count locally
      const newAttendeeCount = eventData.current_attendees + 1

      // Update local state immediately
      setEvent((prev) => ({
        ...prev,
        current_attendees: newAttendeeCount,
      }))

      // Update the attendee count in the context
      updateEventAttendees(id, newAttendeeCount)

      // Add to user's RSVPs in context
      addUserRsvp(id)

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

  const handleChat = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to chat about events",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    toast({
      title: "Chat Coming Soon",
      description: "This feature is coming soon!",
    })
  }

  const isRSVPd = userRsvps.includes(id)

  return (
    <div className="bg-white rounded-lg border p-6 transition-shadow hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <Badge variant="outline" className={getCategoryColor(category)}>
          {category}
        </Badge>
        {verified && (
          <div className="flex items-center text-blue-600 text-sm">
            <svg
              className="w-4 h-4 mr-1 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Verified Host
          </div>
        )}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-gray-500">
          <CalendarIcon className="w-4 h-4 mr-2" />
          <span>
            {date} • {time}
          </span>
        </div>
        <div className="flex items-center text-gray-500">
          <MapPin className="w-4 h-4 mr-2" />
          <span>{location}</span>
        </div>
        <div className="flex items-center text-gray-500">
          <Users className="w-4 h-4 mr-2" />
          <span>
            {current_attendees} / {max_attendees} attendees
          </span>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={handleChat}>
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
        <Button
          className={isRSVPd ? "bg-green-600 hover:bg-green-700" : "university-button"}
          onClick={handleRSVP}
          disabled={isRSVPd || current_attendees >= max_attendees || isRsvping}
        >
          {isRsvping ? "Processing..." : isRSVPd ? "RSVP'd" : current_attendees >= max_attendees ? "Full" : "RSVP"}
        </Button>
      </div>
    </div>
  )
}
