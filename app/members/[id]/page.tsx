// app/members/[id]/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/auth-context'
import type { Event } from '@/lib/types'
import { to12h } from '@/lib/to12hrs'

import { ArrowLeft, CalendarDays, History, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Profile = {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    university?: string | null
}

type Tab = 'upcoming' | 'past'
type PeopleTab = 'followers' | 'following'

/* ---- Category color helpers ---- */
const CAT = {
    Social: { bg: '#F3E8FF', text: '#7E22CE', border: '#A855F7' },
    Academic: { bg: '#DCFCE7', text: '#166534', border: '#22C55E' },
    Sports: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
    Arts: { bg: '#FCE7F3', text: '#9D174D', border: '#ec65a8' },
    default: { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1' },
} as const
function catStyle(cat?: string) {
    const key = (cat as keyof typeof CAT) || 'default'
    return CAT[key] ?? CAT.default
}

export default function MemberProfilePage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { user, isAuthenticated } = useAuth()

    const [member, setMember] = useState<Profile | null>(null)
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)

    const [tab, setTab] = useState<Tab>('upcoming')

    const [isFollowing, setIsFollowing] = useState(false)
    const [followBusy, setFollowBusy] = useState(false)
    const [followersCount, setFollowersCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)

    const [peopleOpen, setPeopleOpen] = useState(false)
    const [peopleTab, setPeopleTab] = useState<PeopleTab>('followers')
    const [followers, setFollowers] = useState<Profile[]>([])
    const [following, setFollowing] = useState<Profile[]>([])
    const [peopleLoading, setPeopleLoading] = useState(false)

    // event date helper
    const eventStart = (e: Event) => {
        const base = new Date(e.date || '')
        if (Number.isNaN(+base)) return new Date(0)
        const m = /^\d{1,2}:\d{2}$/.exec(String(e.time || '')) ? String(e.time) : null
        if (m) {
            const [hh, mm] = m.split(':').map(Number)
            base.setHours(Math.min(23, hh || 0), Math.min(59, mm || 0), 0, 0)
        } else {
            base.setHours(0, 0, 0, 0)
        }
        return base
    }

    useEffect(() => {
        let active = true
        const run = async () => {
            try {
                setLoading(true)
                const { data: p } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
                if (active) setMember((p as Profile) ?? null)

                const { data: evs } = await supabase.from('events').select('*').eq('created_by', id)
                if (active) setEvents((evs as Event[]) ?? [])
            } finally {
                if (active) setLoading(false)
            }
        }
        run()
        return () => { active = false }
    }, [id])

    const refreshFollowBits = async () => {
        // counts (via view if present; fallback to counts)
        const viaView = await supabase
            .from('follow_counts')
            .select('followers, following')
            .eq('user_id', id)
            .maybeSingle()

        if (!viaView.error && viaView.data) {
            setFollowersCount(viaView.data.followers ?? 0)
            setFollowingCount(viaView.data.following ?? 0)
        } else {
            const [fwers, fwing] = await Promise.all([
                supabase.from('follows').select('followee_id', { count: 'exact', head: true }).eq('followee_id', id),
                supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', id),
            ])
            setFollowersCount(fwers.count ?? 0)
            setFollowingCount(fwing.count ?? 0)
        }

        // isFollowing (IMPORTANT: table has no 'id' column)
        if (user?.id && user.id !== id) {
            const { count, error } = await supabase
                .from('follows')
                .select('followee_id', { count: 'exact', head: true })
                .eq('follower_id', user.id)
                .eq('followee_id', id)

            if (error) {
                console.error('isFollowing check failed:', JSON.stringify(error))
                setIsFollowing(false)
            } else {
                setIsFollowing((count ?? 0) > 0)
            }
        } else {
            setIsFollowing(false)
        }
    }

    useEffect(() => {
        if (!id) return
        refreshFollowBits()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user?.id, isAuthenticated])

    const now = new Date()
    const filtered = useMemo(() => {
        const list = events
            .filter(e => (tab === 'upcoming' ? eventStart(e) >= now : eventStart(e) < now))
            .sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime())
        return tab === 'past' ? list.reverse() : list
    }, [events, tab])

    const handleToggleFollow = async () => {
        if (!isAuthenticated || !user) {
            router.push('/login')
            return
        }
        if (user.id === id) return

        setFollowBusy(true)
        try {
            if (!isFollowing) {
                const { error } = await supabase.from('follows').insert({ follower_id: user.id, followee_id: id })
                if (error) {
                    // if already followed (unique violation), just sync state
                    if ((error as any).code !== '23505') {
                        throw error
                    }
                }
            } else {
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .eq('follower_id', user.id)
                    .eq('followee_id', id)
                if (error) throw error
            }
        } catch (e: any) {
            console.error('follow toggle failed:', e?.message ?? JSON.stringify(e))
        } finally {
            setFollowBusy(false)
            // Always recompute to be correct
            await refreshFollowBits()
            if (peopleOpen) loadPeople()
        }
    }

    const loadPeople = async () => {
        setPeopleLoading(true)
        try {
            const { data: followersRows } = await supabase
                .from('follows')
                .select(`
          follower_id,
          profiles:follower_id ( id, first_name, last_name, avatar_url, university )
        `)
                .eq('followee_id', id)

            const followersList =
                (followersRows || [])
                    .map((r: any) => (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles))
                    .filter(Boolean) as Profile[]
            setFollowers(followersList)

            const { data: followingRows } = await supabase
                .from('follows')
                .select(`
          followee_id,
          profiles:followee_id ( id, first_name, last_name, avatar_url, university )
        `)
                .eq('follower_id', id)

            const followingList =
                (followingRows || [])
                    .map((r: any) => (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles))
                    .filter(Boolean) as Profile[]
            setFollowing(followingList)
        } finally {
            setPeopleLoading(false)
        }
    }

    // --------- Loading ----------
    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <div className="max-w-3xl mx-auto p-4 space-y-6">
                    <Skeleton className="h-8 w-20" />
                    <div className="flex items-center gap-6">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="grid grid-cols-3 gap-6 flex-1">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="space-y-1">
                                    <Skeleton className="h-5 w-10 mx-auto" />
                                    <Skeleton className="h-3 w-16 mx-auto" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <Skeleton className="h-9 w-40" />
                    <div className="grid grid-cols-3 gap-1">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <Skeleton key={i} className="aspect-square" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (!member) {
        return (
            <div className="min-h-screen bg-white">
                <div className="max-w-3xl mx-auto p-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="gap-2"
                        style={{ color: 'var(--primary-color)' }}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <div className="mt-8 text-center text-gray-600">Member not found.</div>
                </div>
            </div>
        )
    }

    const fullName = `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() || 'Member'
    const isOwnProfile = user?.id === member.id

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-3xl mx-auto p-4">
                {/* Back */}
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="gap-2 px-0"
                        style={{ color: 'var(--primary-color)' }}
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back
                    </Button>
                </div>

                {/* Header (no banner) */}
                <div className="mt-4">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={member.avatar_url ?? ''} alt={fullName} />
                            <AvatarFallback className="text-xl">
                                {(member.first_name?.[0] ?? '?')}
                                {member.last_name?.[0] ?? ''}
                            </AvatarFallback>
                        </Avatar>

                        <div className="grid grid-cols-3 gap-6 flex-1 text-center">
                            <div>
                                <div className="text-lg font-bold">{events.length}</div>
                                <div className="text-xs text-gray-500">Events</div>
                            </div>
                            <button
                                className="focus:outline-none"
                                onClick={async () => { setPeopleTab('followers'); setPeopleOpen(true); await loadPeople() }}
                            >
                                <div className="text-lg font-bold">{followersCount}</div>
                                <div className="text-xs text-gray-500">Followers</div>
                            </button>
                            <button
                                className="focus:outline-none"
                                onClick={async () => { setPeopleTab('following'); setPeopleOpen(true); await loadPeople() }}
                            >
                                <div className="text-lg font-bold">{followingCount}</div>
                                <div className="text-xs text-gray-500">Following</div>
                            </button>
                        </div>
                    </div>

                    <div className="mt-3">
                        <div className="font-semibold">{fullName}</div>
                        {member.university && <div className="text-sm text-gray-600">{member.university}</div>}
                    </div>

                    {!isOwnProfile && (
                        <div className="mt-3 flex gap-2">
                            {isFollowing ? (
                                <Button
                                    onClick={handleToggleFollow}
                                    disabled={followBusy}
                                    variant="outline"
                                    className="h-9 flex-1 font-semibold border-red-500 text-red-600 hover:bg-red-50"
                                >
                                    Unfollow
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleToggleFollow}
                                    disabled={followBusy}
                                    className="h-9 flex-1 font-semibold text-white"
                                    style={{ backgroundColor: 'var(--primary-color)' }}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <UserPlus className="h-4 w-4" /> Follow
                                    </span>
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="mt-6 border-t">
                    <div className="grid grid-cols-2 text-center">
                        <button
                            className={`py-3 inline-flex items-center justify-center gap-2 text-sm font-semibold ${tab === 'upcoming' ? 'text-gray-900' : 'text-gray-500'
                                } ${tab === 'upcoming' ? 'border-t-2' : 'border-t'} `}
                            style={tab === 'upcoming' ? { borderColor: 'var(--primary-color)' } : { borderColor: 'transparent' }}
                            onClick={() => setTab('upcoming')}
                        >
                            <CalendarDays className="h-4 w-4" />
                            Upcoming
                        </button>
                        <button
                            className={`py-3 inline-flex items-center justify-center gap-2 text-sm font-semibold ${tab === 'past' ? 'text-gray-900' : 'text-gray-500'
                                } ${tab === 'past' ? 'border-t-2' : 'border-t'} `}
                            style={tab === 'past' ? { borderColor: 'var(--primary-color)' } : { borderColor: 'transparent' }}
                            onClick={() => setTab('past')}
                        >
                            <History className="h-4 w-4" />
                            Past
                        </button>
                    </div>
                </div>

                {/* Grid of events */}
                {filtered.length === 0 ? (
                    <Card className="mt-6 p-8 text-center text-gray-500">No {tab} events.</Card>
                ) : (
                    <div className="mt-1 grid grid-cols-3 gap-1">
                        {filtered.map((ev) => {
                            const poster =
                                (ev as any).poster_url ||
                                (ev as any).image_url ||
                                (ev as any).poster ||
                                (ev as any).image ||
                                '/herd-logo.jpg'

                            const colors = catStyle(ev.category)

                            return (
                                <button
                                    key={ev.id}
                                    className="relative group w-full"
                                    onClick={() => router.push(`/events/${ev.id}`)}
                                >
                                    <div className="aspect-square overflow-hidden relative rounded-xl ring-1 ring-black/5 bg-gray-50">
                                        <img
                                            src={poster}
                                            alt={ev.title}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                            loading="lazy"
                                        />

                                        {/* Bottom overlay with classy glass chip */}
                                        <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                                            <div className="flex items-end justify-between gap-2">
                                                <span className="min-w-0">
                                                    <span
                                                        className="truncate inline-block max-w-full text-[12px] sm:text-sm font-semibold px-3 py-1.5 rounded-full shadow-md backdrop-blur-md ring-1"
                                                        style={{
                                                            backgroundColor: colors.bg,
                                                            color: colors.text,
                                                            borderColor: colors.border,
                                                        }}
                                                        title={ev.title}
                                                    >
                                                        {ev.title}
                                                    </span>
                                                </span>
                                                <span className="hidden md:inline-block text-[11px] text-white/90 font-medium">
                                                    {ev.date}{/* {ev.time ? ` • ${to12h(ev.time)}` : ''} */}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Followers / Following Dialog */}
            <Dialog
                open={peopleOpen}
                onOpenChange={(o) => {
                    setPeopleOpen(o)
                    if (o) loadPeople()
                }}
            >
                <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden">
                    <DialogHeader className="px-4 pt-4">
                        <DialogTitle>{peopleTab === 'followers' ? 'Followers' : 'Following'}</DialogTitle>
                    </DialogHeader>

                    <div className="px-4 pb-3">
                        <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                aria-pressed={peopleTab === 'followers'}
                                onClick={() => setPeopleTab('followers')}
                                className={`h-8 rounded-md text-sm ${peopleTab === 'followers' ? 'text-white' : 'text-gray-700 hover:bg-white/60'}`}
                                style={peopleTab === 'followers' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                            >
                                Followers
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                aria-pressed={peopleTab === 'following'}
                                onClick={() => setPeopleTab('following')}
                                className={`h-8 rounded-md text-sm ${peopleTab === 'following' ? 'text-white' : 'text-gray-700 hover:bg-white/60'}`}
                                style={peopleTab === 'following' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                            >
                                Following
                            </Button>
                        </div>
                    </div>

                    <div className="max-h-[60vh] overflow-auto px-2 pb-4">
                        {peopleLoading ? (
                            <div className="space-y-2 px-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 px-2 py-2">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <Skeleton className="h-4 w-40" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="divide-y">
                                {(peopleTab === 'followers' ? followers : following).length === 0 ? (
                                    <div className="px-4 py-8 text-center text-gray-600 text-sm">
                                        No {peopleTab === 'followers' ? 'followers' : 'following'} yet.
                                    </div>
                                ) : (
                                    (peopleTab === 'followers' ? followers : following).map((p) => {
                                        const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Member'
                                        return (
                                            <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Avatar className="h-10 w-10 shrink-0">
                                                        <AvatarImage src={p.avatar_url ?? ''} alt={name} />
                                                        <AvatarFallback>
                                                            {(p.first_name?.[0] ?? '?')}
                                                            {p.last_name?.[0] ?? ''}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="truncate">
                                                        <div className="font-medium truncate">{name}</div>
                                                        {p.university && (
                                                            <div className="text-xs text-gray-500 truncate">{p.university}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="shrink-0"
                                                    onClick={() => {
                                                        setPeopleOpen(false)
                                                        router.push(`/members/${p.id}`)
                                                    }}
                                                >
                                                    View
                                                </Button>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
