"use client"

import { EventCard } from "@/components/event-card"
import { useEvents } from "@/context/events-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth-context"
import { UniversityEventsGrid } from "@/components/university-events-grid"

export function EventsList() {
  const { filteredEvents, loading, selectedUniversity } = useEvents()
  const { isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-6">
            <div className="flex justify-between items-start mb-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // If not authenticated and no specific university is selected, show the university grid
  if (!isAuthenticated && selectedUniversity === null) {
    return <UniversityEventsGrid />
  }

  if (filteredEvents.length === 0) {
    return (
      <Alert variant="default" className="max-w-5xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No events found</AlertTitle>
        <AlertDescription>Try adjusting your search or filters to find events.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
      {filteredEvents.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
