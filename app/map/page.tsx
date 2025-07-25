'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { ConfigCheck } from '@/components/config-check'
import MapView from '@/components/map-view'
import { ViewSelector } from '@/components/view-selector'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/components/ui/use-toast'

export default function MapPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to view the map',
        variant: 'destructive',
      })
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router, toast])

  return (
    <main className="min-h-screen bg-[#f8f7fc]">
      <Header />
      <div className="container px-4 md:px-6 pt-4">
        <ConfigCheck />
      </div>

      {/* Tabs */}
      <ViewSelector />

      {/* Standalone map + built‑in filters & sidebar */}
      <MapView />
    </main>
  )
}
