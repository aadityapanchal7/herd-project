'use client'

import { Button } from '@/components/ui/button'
import { useFollow } from '@/hooks/use-follow'
import { useAuth } from '@/context/auth-context'

export function FollowButton({ profileId }: { profileId: string }) {
    const { user } = useAuth()
    const { isFollowing, loading, toggle } = useFollow(profileId)
    const isSelf = user?.id === profileId

    if (!user?.id || isSelf) return null

    return (
        <Button
            onClick={toggle}
            disabled={loading}
            className={isFollowing ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'university-button'}
        >
            {isFollowing ? 'Following' : 'Follow'}
        </Button>
    )
}
