"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, MapPin, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import type { Event } from "@/lib/types"
import { supabase } from "@/lib/supabase"

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const { title, category, description, date, time, location, max_attendees, id, creator_name, verified } = event
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()
  const [isRsvping, setIsRsvping] = useState(false)
  const [attendeeCount, setAttendeeCount] = useState<number>(0)
  const [hasRSVPd, setHasRSVPd] = useState(false)

  // Fetch RSVP count & RSVP status for this event
  useEffect(() => {
    const fetchAttendees = async () => {
      // Get number of RSVPs for this event
      const { count } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
      setAttendeeCount(count || 0)
    }
    fetchAttendees()
  }, [id, isRsvping])

  useEffect(() => {
    // Check if user has RSVP'd
    const checkRSVP = async () => {
      if (isAuthenticated && user) {
        const { data } = await supabase
          .from("event_rsvps")
          .select("*")
          .eq("event_id", id)
          .eq("user_id", user.id)
          .single()
        setHasRSVPd(!!data)
      } else {
        setHasRSVPd(false)
      }
    }
    checkRSVP()
  }, [isAuthenticated, user, id, isRsvping])

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
    if (!isAuthenticated || !user) {
      toast({
        title: "Login Required",
        description: "Please login to RSVP for events",
        variant: "destructive",
      })
      return
    }
    if (hasRSVPd) {
      toast({
        title: "Already RSVP'd",
        description: "You've already RSVP'd to this event",
      })
      return
    }
    if (attendeeCount >= max_attendees) {
      toast({
        title: "Event Full",
        description: "This event has reached its maximum capacity",
        variant: "destructive",
      })
      return
    }

    setIsRsvping(true)

    try {
      // Insert RSVP
      const { error } = await supabase.from("event_rsvps").insert({
        event_id: id,
        user_id: user.id,
      })
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
        setIsRsvping(false)
        return
      }
      toast({
        title: "RSVP Successful",
        description: "You have successfully RSVP'd to this event",
      })
      setHasRSVPd(true)
    } catch (error) {
      toast({
        title: "RSVP Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsRsvping(false)
    }
  }

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
      {creator_name && (
        <p className="text-sm text-gray-500 mb-2">
          <span className="font-medium">Hosted by:</span> {creator_name}
        </p>
      )}
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
            {attendeeCount} / {max_attendees} attendees
          </span>
        </div>
      </div>
      <div className="flex justify-end items-center">
        <Button
          className={
            hasRSVPd
              ? "bg-green-600 hover:bg-green-700"
              : "university-button"
          }
          onClick={handleRSVP}
          disabled={hasRSVPd || attendeeCount >= max_attendees || isRsvping}
        >
          {isRsvping
            ? "Processing..."
            : attendeeCount >= max_attendees
            ? "Full"
            : hasRSVPd
            ? "RSVP'd"
            : "RSVP"}
        </Button>
      </div>
    </div>
  )
}
