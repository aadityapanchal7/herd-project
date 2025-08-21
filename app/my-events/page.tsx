// app/my-events/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronLeft } from 'lucide-react'
import HerdFullCalendar from '@/components/calendar/HerdGoogleLikeCalendar'

type Row = { event: Event; rsvpd: boolean; saved: boolean }

export default function MyEventsCalendarPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  // auth gate
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to view your calendar',
        variant: 'destructive',
      })
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router, toast])

  // fetch calendar rows: merge RSVPs + Saved
  useEffect(() => {
    let mounted = true
      ; (async () => {
        if (!user?.id) { setRows([]); setLoading(false); return }
        setLoading(true)

        const [{ data: rsvpRows, error: rsvpErr }, { data: savedRows, error: savedErr }] =
          await Promise.all([
            supabase.from('event_rsvps').select('event_id').eq('user_id', user.id),
            supabase.from('event_saved').select('event_id').eq('user_id', user.id),
          ])

        if (rsvpErr || savedErr) {
          console.error(rsvpErr || savedErr)
          toast({ title: 'Error', description: 'Failed to load your calendar', variant: 'destructive' })
          setLoading(false)
          return
        }

        const rsvpIds = new Set<string>((rsvpRows ?? []).map((r: any) => r.event_id))
        const savedIds = new Set<string>((savedRows ?? []).map((r: any) => r.event_id))
        const allIds = Array.from(new Set<string>([...rsvpIds, ...savedIds]))

        let events: Event[] = []
        if (allIds.length) {
          const { data: evs, error: evErr } = await supabase
            .from('events')
            .select('*')
            .in('id', allIds)

          if (evErr) {
            console.error(evErr)
            toast({ title: 'Error', description: 'Failed to load your events', variant: 'destructive' })
            setLoading(false)
            return
          }
          events = (evs ?? []) as Event[]
        }

        const mapped: Row[] = events.map((ev) => ({
          event: ev,
          rsvpd: rsvpIds.has(ev.id as any),
          saved: savedIds.has(ev.id as any),
        }))

        if (mounted) setRows(mapped)
        setLoading(false)
      })()
    return () => { mounted = false }
  }, [user?.id, toast])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <Button size="sm" variant="ghost" onClick={() => router.back()} className="pl-0 text-primary hover:bg-transparent">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>

        <main className="flex-1">
          <div className="border-b bg-white">
            <div className="mx-auto max-w-6xl px-4 pb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary" />
                <Skeleton className="h-8 w-48" />
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-6xl p-4">
            <Skeleton className="h-[600px] rounded-lg" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <Button size="sm" variant="ghost" onClick={() => router.back()} className="pl-0 text-primary hover:bg-transparent">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-normal text-gray-900">Calendar</h1>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          {/* default prop is fine; calendar now restores last view/date unless ?reset=1 */}
          <HerdFullCalendar rows={rows} viewMode="week" className="h-full" />
        </div>
      </main>
    </div>
  )
}
