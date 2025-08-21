// app/events/[id]/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { CalendarIcon, MapPin, Users, ArrowLeft, Edit } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/components/ui/use-toast'
import { to12h } from '@/lib/to12hrs'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'
import { AvatarThumb } from '@/components/avatar-thumb'
import { VENUE_COORDS } from '@/lib/school-cords'

// 👇 load chat only on the client; avoid server import
const RealtimeChat = dynamic(
  () => import('@/components/realtime-chat').then((m) => m.RealtimeChat),
  { ssr: false }
)

type Attendee = {
  attendee_first: string
  attendee_last: string
  attendee_avatar_url: string | null
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()

  // Be tolerant: if id is missing or not a number, avoid NaN
  const eventId = useMemo(() => {
    const raw = (params?.id as string) ?? ''
    return /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN
  }, [params])

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  // RSVP state
  const [isRsvping, setIsRsvping] = useState(false)
  const [attendeeCount, setAttendeeCount] = useState<number>(0)
  const [hasRSVPd, setHasRSVPd] = useState(false)

  // Saved-event state (for allow_rsvp === false)
  const [hasSaved, setHasSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Attendees list
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [attendeeSearch, setAttendeeSearch] = useState('')

  const filteredAttendees = useMemo(() => {
    const q = attendeeSearch.trim().toLowerCase()
    if (!q) return attendees
    return attendees.filter((a) =>
      `${a.attendee_first} ${a.attendee_last}`.toLowerCase().includes(q)
    )
  }, [attendees, attendeeSearch])

  // Load event details
  useEffect(() => {
    if (!Number.isFinite(eventId)) {
      setLoading(false)
      return
    }
    const loadEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()
        if (error) throw error
        setEvent(data as Event)
      } catch (err) {
        console.error('Error loading event:', err)
        toast({
          title: 'Error',
          description: 'Failed to load event details',
          variant: 'destructive',
        })
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    loadEvent()
  }, [eventId, router, toast])

  // Load attendees (for display/counts)
  useEffect(() => {
    if (!event) return
      ; (async () => {
        const { data, count } = await supabase
          .from('event_rsvps')
          .select('attendee_first, attendee_last, attendee_avatar_url', {
            count: 'exact',
            head: false,
          })
          .eq('event_id', event.id)

        setAttendees((data as any[]) || [])
        setAttendeeCount(count ?? data?.length ?? 0)
      })()
  }, [event])

  // Check if user has RSVP'd
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !event) {
      setHasRSVPd(false)
      return
    }
    ; (async () => {
      const { data } = await supabase
        .from('event_rsvps')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle()
      setHasRSVPd(!!data)
    })()
  }, [isAuthenticated, user?.id, event])

  // Check if user has SAVED this event (for allow_rsvp === false)
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !event) {
      setHasSaved(false)
      return
    }
    ; (async () => {
      const { data } = await supabase
        .from('event_saved')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle()
      setHasSaved(!!data)
    })()
  }, [isAuthenticated, user?.id, event])

  const school = useMemo(() => {
    const uni = (user?.university || '').toLowerCase()
    if (uni.includes('texas') && uni.includes('austin')) return 'ut_austin'
    return ''
  }, [user?.university])

  const googleMapsLink = useMemo(() => {
    if (!event) return ''
    const coordsFromEvent =
      typeof event.latitude === 'number' && typeof event.longitude === 'number'
        ? { latitude: event.latitude, longitude: event.longitude }
        : null
    const coordsFromVenue =
      school && event.location ? VENUE_COORDS[school]?.[event.location] ?? null : null
    const chosen = coordsFromEvent || coordsFromVenue || null
    return chosen
      ? `https://www.google.com/maps?q=${chosen.latitude},${chosen.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        event.location || ''
      )}`
  }, [event, school])

  const categoryColor = useMemo(() => {
    if (!event) return 'bg-slate-100 text-slate-700'
    return (
      {
        Social: 'bg-purple-100 text-purple-700',
        Academic: 'bg-emerald-100 text-emerald-700',
        Sports: 'bg-orange-100 text-orange-700',
        Arts: 'bg-pink-100 text-pink-700',
      }[event.category] || 'bg-slate-100 text-slate-700'
    )
  }, [event])

  const isOwner = !!user && !!event && event.created_by === user.id
  const isFull =
    !!event?.allow_rsvp &&
    !!event?.rsvp_limited &&
    attendeeCount >= (event?.max_attendees ?? Number.MAX_SAFE_INTEGER)
  const canRSVP =
    !!event?.allow_rsvp && isAuthenticated && !isOwner && !hasRSVPd && !isFull

  // RSVP handlers
  const handleRSVP = async () => {
    if (!event || !canRSVP || !user?.id) return
    setIsRsvping(true)
    try {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single()
      if (profErr || !prof) throw new Error('Could not load your profile.')

      const { error: insErr } = await supabase.from('event_rsvps').insert({
        event_id: event.id,
        user_id: user.id,
        attendee_first: (prof as any).first_name,
        attendee_last: (prof as any).last_name,
        attendee_avatar_url: (prof as any).avatar_url,
      })
      if (insErr) throw insErr

      setHasRSVPd(true)
      setAttendeeCount((c) => c + 1)
      toast({ title: 'RSVP Successful', description: "You're in!" })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'RSVP Failed',
        description: err.message || 'Unexpected error',
        variant: 'destructive',
      })
    } finally {
      setIsRsvping(false)
    }
  }

  const handleRemoveRSVP = async () => {
    if (!event || !user?.id) return
    try {
      const { error } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id)
      if (error) throw error

      setHasRSVPd(false)
      setAttendeeCount((c) => Math.max(0, c - 1))
      toast({
        title: 'RSVP Removed',
        description: 'You are no longer RSVP’d to this event.',
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Failed to remove RSVP',
        description: err.message || 'Unexpected error',
        variant: 'destructive',
      })
    }
  }

  // Save Event (for allow_rsvp === false)
  const handleSaveEvent = async () => {
    if (!event || !user?.id) return
    setIsSaving(true)
    try {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single()
      if (profErr || !prof) throw new Error('Could not load your profile.')

      const { error: insErr } = await supabase.from('event_saved').insert({
        event_id: event.id,
        user_id: user.id,
        attendee_first: (prof as any).first_name,
        attendee_last: (prof as any).last_name,
        attendee_avatar_url: (prof as any).avatar_url,
      })

      // ignore unique violation = already saved
      if (insErr && (insErr as any).code !== '23505') throw insErr

      setHasSaved(true)
      toast({ title: 'Saved', description: 'Event added to your saved list.' })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Save Failed',
        description: err.message || 'Unexpected error',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveSaved = async () => {
    if (!event || !user?.id) return
    try {
      const { error } = await supabase
        .from('event_saved')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id)
      if (error) throw error

      setHasSaved(false)
      toast({
        title: 'Removed',
        description: 'Event removed from your saved list.',
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Failed to remove',
        description: err.message || 'Unexpected error',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse">
            <div className="mb-4 h-8 rounded bg-gray-200" />
            <div className="mb-6 h-64 rounded bg-gray-200" />
            <div className="mb-6 h-32 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Event not found</h1>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div key={eventId} className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {isOwner && (
              <Button
                variant="outline"
                onClick={() => router.push(`/edit-event/${event.id}`)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Event
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 p-4">
        {/* Event Header Card */}
        <Card>
          <CardContent className="p-0">
            <div className="relative h-64 w-full">
              <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-black/0 to-black/10" />
              {event.image_url ? (
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="h-full w-full rounded-t-lg object-cover"
                />
              ) : (
                <div className="h-full w-full rounded-t-lg bg-gradient-to-br from-slate-100 to-slate-200" />
              )}
              <div className="absolute left-4 top-4 z-[2] flex items-center gap-2">
                <Badge variant="secondary" className={`backdrop-blur ${categoryColor}`}>
                  {event.category}
                </Badge>
                {event.verified && (
                  <Badge
                    variant="secondary"
                    className="backdrop-blur bg-blue-100 text-blue-700"
                  >
                    ✓ Verified
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-6">
              <h1 className="mb-2 text-3xl font-bold text-gray-900">{event.title}</h1>
              {event.creator_name && (
                <p className="mb-4 text-sm text-gray-600">
                  Created by <span className="font-semibold">{event.creator_name}</span>
                </p>
              )}
              {event.description && (
                <p className="mb-6 text-gray-700">{event.description}</p>
              )}

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{event.date}</p>
                    <p className="text-sm text-gray-600">
                      {to12h(event.time)}
                      {event.time_zone ? ` ${event.time_zone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{event.location}</p>
                    {googleMapsLink && (
                      <a
                        href={googleMapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View on Google Maps
                      </a>
                    )}
                  </div>
                </div>

                {event.allow_rsvp && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">
                        {event.rsvp_limited
                          ? `${attendeeCount} / ${event.max_attendees} attendees`
                          : `${attendeeCount} attendees`}
                      </p>
                      {isFull && (
                        <p className="text-sm text-red-600">Event is full</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* RSVP / Save area */}
              <div className="flex justify-center">
                {!event.allow_rsvp ? (
                  <div className="flex flex-col items-center gap-2">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                      This event doesn’t require RSVP
                    </Badge>

                    {hasSaved ? (
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          ✓ Saved
                        </Badge>
                        <Button
                          variant="outline"
                          className="border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white"
                          onClick={handleRemoveSaved}
                        >
                          Remove Save
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleSaveEvent}
                        disabled={!isAuthenticated || isSaving}
                        className="university-button px-8 py-3"
                      >
                        {isSaving ? 'Processing...' : 'Save Event'}
                      </Button>
                    )}
                  </div>
                ) : isOwner ? (
                  <Badge variant="secondary">Your Event</Badge>
                ) : hasRSVPd ? (
                  <>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      ✓ RSVP’d
                    </Badge>
                    <Button
                      variant="outline"
                      className="border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white"
                      onClick={handleRemoveRSVP}
                    >
                      Remove RSVP
                    </Button>
                  </>
                ) : isFull ? (
                  <Badge variant="secondary" className="bg-red-100 text-red-700">
                    Event Full
                  </Badge>
                ) : (
                  <Button
                    onClick={handleRSVP}
                    disabled={!canRSVP || isRsvping}
                    className="university-button px-8 py-3"
                  >
                    {isRsvping ? 'Processing...' : 'RSVP for Event'}
                  </Button>
                )}
              </div>

            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Attendees List (with search) */}
          {(event.allow_rsvp || attendees.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendees ({attendeeCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search input */}
                <Input
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  placeholder="Search attendees by name…"
                  className="mb-3"
                />

                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {filteredAttendees.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      {attendees.length === 0
                        ? 'No one has RSVP’d yet.'
                        : 'No matching attendees.'}
                    </div>
                  ) : (
                    filteredAttendees.map((a, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <AvatarThumb
                          url={a.attendee_avatar_url}
                          first={a.attendee_first}
                          last={a.attendee_last}
                          size={40}
                        />
                        <span className="font-medium">
                          {a.attendee_first} {a.attendee_last}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* chat stays client-only via dynamic import */}
          <div id="chat">
            <RealtimeChat
              eventId={eventId}
              userId={user?.id}
              username={user ? `${user.first_name} ${user.last_name}` : undefined}
              creatorId={event.created_by}
              className="h-fit"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
