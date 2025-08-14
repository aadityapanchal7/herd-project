'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CalendarIcon, MapPin, Users, ArrowLeft, Edit } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { RealtimeChat } from '@/components/realtime-chat'
import type { Event } from '@/lib/types'
import { AvatarThumb } from '@/components/avatar-thumb'
import { VENUE_COORDS } from '@/lib/school-cords'

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
  
  const eventId = parseInt(params.id as string)
  
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRsvping, setIsRsvping] = useState(false)
  const [attendeeCount, setAttendeeCount] = useState<number>(0)
  const [hasRSVPd, setHasRSVPd] = useState(false)
  const [attendees, setAttendees] = useState<Attendee[]>([])

  // Load event details
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()

        if (error) throw error
        setEvent(data)
      } catch (err) {
        console.error('Error loading event:', err)
        toast({
          title: 'Error',
          description: 'Failed to load event details',
          variant: 'destructive'
        })
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      loadEvent()
    }
  }, [eventId, router, toast])

  // Load attendees
  useEffect(() => {
    if (!event) return
    
    const loadAttendees = async () => {
      const { data, count } = await supabase
        .from('event_rsvps')
        .select('attendee_first, attendee_last, attendee_avatar_url', {
          count: 'exact',
          head: false
        })
        .eq('event_id', event.id)

      setAttendees(data || [])
      setAttendeeCount(count ?? data?.length ?? 0)
    }

    loadAttendees()
  }, [event])

  // Check if user has RSVP'd
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !event) {
      setHasRSVPd(false)
      return
    }

    const checkRSVP = async () => {
      const { data } = await supabase
        .from('event_rsvps')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .single()
      
      setHasRSVPd(!!data)
    }

    checkRSVP()
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
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location || '')}`
  }, [event, school])

  const categoryColor = useMemo(() => {
    if (!event) return 'bg-slate-100 text-slate-700'
    
    return {
      Social: 'bg-purple-100 text-purple-700',
      Academic: 'bg-emerald-100 text-emerald-700',
      Sports: 'bg-orange-100 text-orange-700',
      Arts: 'bg-pink-100 text-pink-700'
    }[event.category] || 'bg-slate-100 text-slate-700'
  }, [event])

  const isOwner = !!user && !!event && event.created_by === user.id
  const isFull = !!event?.allow_rsvp && !!event?.rsvp_limited && 
    attendeeCount >= (event?.max_attendees ?? Number.MAX_SAFE_INTEGER)
  const canRSVP = !!event?.allow_rsvp && isAuthenticated && !isOwner && !hasRSVPd && !isFull

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
        attendee_first: prof.first_name,
        attendee_last: prof.last_name,
        attendee_avatar_url: prof.avatar_url
      })
      
      if (insErr) throw insErr

      setHasRSVPd(true)
      setAttendeeCount(c => c + 1)
      toast({
        title: 'RSVP Successful',
        description: 'You have successfully RSVP\'d to this event!'
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'RSVP Failed',
        description: err.message || 'Unexpected error',
        variant: 'destructive'
      })
    } finally {
      setIsRsvping(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="h-32 bg-gray-200 rounded mb-6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event not found</h1>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
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

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Event Header Card */}
        <Card>
          <CardContent className="p-0">
            {/* Cover Image */}
            <div className="relative h-64 w-full">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/10 z-[1]" />
              {event.image_url ? (
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="h-full w-full object-cover rounded-t-lg"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-t-lg" />
              )}
              
              {/* Category & Verified Badges */}
              <div className="absolute top-4 left-4 z-[2] flex items-center gap-2">
                <Badge variant="secondary" className={`backdrop-blur ${categoryColor}`}>
                  {event.category}
                </Badge>
                {event.verified && (
                  <Badge variant="secondary" className="backdrop-blur bg-blue-100 text-blue-700">
                    ✓ Verified
                  </Badge>
                )}
              </div>
            </div>

            {/* Event Info */}
            <div className="p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
              {event.creator_name && (
                <p className="text-sm text-gray-600 mb-4">
                  Created by <span className="font-semibold">{event.creator_name}</span>
                </p>
              )}
              {event.description && (
                <p className="text-gray-700 mb-6">{event.description}</p>
              )}

              {/* Event Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{event.date}</p>
                    <p className="text-sm text-gray-600">{event.time}</p>
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
                      {isFull && <p className="text-sm text-red-600">Event is full</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* RSVP Button */}
              {event.allow_rsvp && (
                <div className="flex justify-center">
                  {isOwner ? (
                    <Badge variant="secondary">Your Event</Badge>
                  ) : hasRSVPd ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      ✓ RSVP'd
                    </Badge>
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
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendees List */}
          {event.allow_rsvp && attendees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendees ({attendeeCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {attendees.map((attendee, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <AvatarThumb
                        url={attendee.attendee_avatar_url}
                        first={attendee.attendee_first}
                        last={attendee.attendee_last}
                        size={40}
                      />
                      <span className="font-medium">
                        {attendee.attendee_first} {attendee.attendee_last}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chat Section */}
          <RealtimeChat 
            eventId={eventId} 
            userId={user?.id}
            username={user ? `${user.first_name} ${user.last_name}` : undefined}
            className="h-fit"
          />
        </div>
      </div>
    </div>
  )
}