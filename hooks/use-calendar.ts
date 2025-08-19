// hooks/use-calendar.ts
'use client'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/auth-context'
import type { Event } from '@/lib/types'

export function useCalendarActions() {
    const { user } = useAuth()

    async function toggleSaved(evt: Event, isSaved: boolean) {
        if (evt.allow_rsvp) return; // enforce UI rule: RSVPable events cannot be saved
        if (!user?.id) throw new Error('Login required')

        const { error } = await supabase
            .from('user_calendar')
            .upsert({ user_id: user.id, event_id: evt.id, saved: !isSaved }, { onConflict: 'user_id,event_id' })

        if (error) throw error
    }

    async function getSavedIds(): Promise<number[]> {
        if (!user?.id) return []
        const { data, error } = await supabase
            .from('user_calendar')
            .select('event_id')
            .eq('user_id', user.id)
            .eq('saved', true)
        if (error) return []
        return (data ?? []).map(r => r.event_id)
    }

    return { toggleSaved, getSavedIds }
}
