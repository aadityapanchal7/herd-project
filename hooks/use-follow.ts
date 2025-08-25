'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/auth-context'

export function useFollow(targetUserId?: string) {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [isFollowing, setIsFollowing] = useState(false)

    useEffect(() => {
        let mounted = true
        if (!user?.id || !targetUserId) return
            ; (async () => {
                const { count } = await supabase
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('follower_id', user.id)
                    .eq('followee_id', targetUserId)

                if (mounted) setIsFollowing((count ?? 0) > 0)
            })()
        return () => { mounted = false }
    }, [user?.id, targetUserId])

    const toggle = useCallback(async () => {
        if (!user?.id || !targetUserId) return
        setLoading(true)
        try {
            if (isFollowing) {
                await supabase.from('follows').delete()
                    .eq('follower_id', user.id)
                    .eq('followee_id', targetUserId)
                setIsFollowing(false)
            } else {
                await supabase.from('follows').insert({ follower_id: user.id, followee_id: targetUserId })
                setIsFollowing(true)
            }
        } finally {
            setLoading(false)
        }
    }, [user?.id, targetUserId, isFollowing])

    return { isFollowing, loading, toggle }
}
