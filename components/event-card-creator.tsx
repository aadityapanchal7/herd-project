"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, MapPin, Users, Edit, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import type { Event } from "@/lib/types"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AvatarThumb } from "@/components/avatar-thumb"

interface EventCardCreatorProps {
  event: Event
  onEventDeleted?: (eventId: number) => void
}

type Attendee = {
  attendee_first: string
  attendee_last: string
  attendee_avatar_url: string | null
}

export function EventCardCreator({ event, onEventDeleted }: EventCardCreatorProps) {
  const {
    title,
    category,
    description,
    date,
    time,
    location,
    max_attendees,
    id,
    creator_name,
    verified,
    is_private,
  } = event

  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [attendeeCount, setAttendeeCount] = useState<number>(0)
  const [isDeleting, setIsDeleting] = useState(false)

  // attendee modal state (like dashboard)
  const [showAttendeeList, setShowAttendeeList] = useState(false)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [attendeeSearch, setAttendeeSearch] = useState("")

  const filteredAttendees = attendees.filter((a) =>
    `${a.attendee_first} ${a.attendee_last}`.toLowerCase().includes(attendeeSearch.toLowerCase())
  )

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoadingAttendees(true)
        const { data, count, error } = await supabase
          .from("event_rsvps")
          .select("attendee_first, attendee_last, attendee_avatar_url", { count: "exact", head: false })
          .eq("event_id", id)

        if (error) throw error
        if (!active) return

        setAttendees(data || [])
        setAttendeeCount(count ?? data?.length ?? 0)
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoadingAttendees(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  const getCategoryColor = (c: string) => {
    switch (c) {
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

  const handleEdit = () => {
    router.push(`/edit-event/${id}`)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id)
        .eq("created_by", user?.id || "")

      if (error) throw error

      toast({
        title: "Event Deleted",
        description: "Your event has been successfully deleted.",
      })

      onEventDeleted?.(id)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const attendeeLabel = is_private
    ? `${attendeeCount} attendees`
    : `${attendeeCount} / ${max_attendees} attendees`

  return (
    <div className="bg-white rounded-lg border p-6 transition-shadow hover:shadow-md">
      {/* top row: category + Private/Public + actions */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getCategoryColor(category)}>
            {category}
          </Badge>
          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
            {is_private ? "Private" : "Public"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
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
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-600 hover:text-red-600"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-2">{title}</h3>

      {creator_name && (
        <p className="text-sm text-gray-500 mb-2">
          <span className="font-medium">Created by:</span> {creator_name}
        </p>
      )}

      <p className="text-gray-600 mb-4">{description}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-gray-500">
          <CalendarIcon className="w-4 h-4 mr-2" style={{ color: "var(--primary-color)" }} />
          <span>
            {date} • {time}
          </span>
        </div>

        <div className="flex items-center text-gray-500">
          <MapPin className="w-4 h-4 mr-2" style={{ color: "var(--primary-color)" }} />
          <span>{location}</span>
        </div>

        <div className="flex items-center text-gray-500">
          <button
            type="button"
            className="group flex items-center justify-center w-8 h-8 rounded-md border border-[var(--primary-color)] bg-white hover:bg-[var(--primary-color)] transition-colors focus:outline-none mr-2"
            onClick={() => setShowAttendeeList(true)}
            title="View attendees"
          >
            <Users className="w-5 h-5 text-[var(--primary-color)] group-hover:text-white transition-colors" />
          </button>

          <span className="text-base">{attendeeLabel}</span>
        </div>
      </div>

      <div className="flex justify-end items-center">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Attendee Modal */}
      {showAttendeeList && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={() => setShowAttendeeList(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-xs w-full shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-lg">Attendees</h4>
              <button
                className="text-gray-400 hover:text-gray-700 text-2xl"
                onClick={() => setShowAttendeeList(false)}
                aria-label="Close attendees list"
              >
                &times;
              </button>
            </div>

            <input
              type="text"
              className="w-full mb-3 px-3 py-2 border rounded-md focus:outline-none focus:ring"
              placeholder="Search by name…"
              value={attendeeSearch}
              onChange={(e) => setAttendeeSearch(e.target.value)}
            />

            {loadingAttendees ? (
              <div>Loading…</div>
            ) : filteredAttendees.length === 0 ? (
              <div className="text-gray-500 text-sm">No one has RSVP&apos;d yet.</div>
            ) : (
              <ul className="space-y-3 max-h-64 overflow-y-auto">
                {filteredAttendees.map((a, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <AvatarThumb
                      url={a.attendee_avatar_url}
                      first={a.attendee_first}
                      last={a.attendee_last}
                      size={32} // w-8 h-8
                    />
                    <span>
                      {a.attendee_first} {a.attendee_last}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
