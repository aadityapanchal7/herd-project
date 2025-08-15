"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"
import type { Event } from "@/lib/types"
import { EventCard } from "@/components/event-card"
import { Calendar, Filter, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { motion, AnimatePresence } from "framer-motion"

export default function MyEventsPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const [rsvpedEvents, setRsvpedEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState("date-asc")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to view your events",
        variant: "destructive",
      })
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router, toast])

  useEffect(() => {
    async function fetchRsvpedEvents() {
      if (!isAuthenticated || !user) {
        setLoadingEvents(false)
        return
      }

      setLoadingEvents(true)
      try {
        // 1. Get the event IDs the user has RSVPed to
        const { data: rsvpData, error: rsvpError } = await supabase
          .from("event_rsvps")
          .select("event_id")
          .eq("user_id", user.id)

        if (rsvpError) throw rsvpError

        const eventIds = rsvpData.map((rsvp) => rsvp.event_id)

        if (eventIds.length === 0) {
          setRsvpedEvents([])
          setFilteredEvents([])
          setLoadingEvents(false)
          return
        }

        // 2. Fetch the details of those events
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .in("id", eventIds)
          .order("date", { ascending: true })

        if (eventError) throw eventError

        setRsvpedEvents(eventData || [])
        setFilteredEvents(eventData || [])
      } catch (error) {
        console.error("Error fetching RSVPed events:", error)
        toast({
          title: "Error",
          description: "Failed to load your RSVPed events.",
          variant: "destructive",
        })
        setRsvpedEvents([])
        setFilteredEvents([])
      } finally {
        setLoadingEvents(false)
      }
    }

    if (isAuthenticated && user) {
      fetchRsvpedEvents()
    }
  }, [isAuthenticated, user, toast])

  // Filter and sort events when search query or sort option changes
  useEffect(() => {
    if (!rsvpedEvents.length) return

    let filtered = [...rsvpedEvents]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          event.location.toLowerCase().includes(query),
      )
    }

    // Apply sorting
    switch (sortOption) {
      case "date-asc":
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        break
      case "date-desc":
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        break
      case "title-asc":
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "title-desc":
        filtered.sort((a, b) => b.title.localeCompare(a.title))
        break
    }

    setFilteredEvents(filtered)
  }, [searchQuery, sortOption, rsvpedEvents])

  // Group events by upcoming and past
  // Compare against **today at local midnight** (not "now")
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Parse "YYYY-MM-DD" as **local** midnight to avoid UTC shift gotchas
  const eventLocalMidnight = (ds: string) => {
    const [y, m, d] = String(ds).split("-").map(Number);
    return Number.isFinite(y) ? new Date(y, (m ?? 1) - 1, d ?? 1) : new Date(ds);
  };

  const upcomingEvents = filteredEvents.filter(
    (e) => eventLocalMidnight(e.date) >= startOfToday
  );

  const pastEvents = filteredEvents.filter(
    (e) => eventLocalMidnight(e.date) < startOfToday
  );


  // --- Remove RSVP Handler ---
  async function handleRemoveRSVP(eventId: number) {
    if (!user) return
    const { error } = await supabase
      .from("event_rsvps")
      .delete()
      .eq("user_id", user.id)
      .eq("event_id", eventId)
    if (!error) {
      setRsvpedEvents((prev) => prev.filter((e) => e.id !== eventId))
      setFilteredEvents((prev) => prev.filter((e) => e.id !== eventId))
    } else {
      toast({
        title: "Error",
        description: "Failed to remove RSVP.",
        variant: "destructive",
      })
    }
  }

  if (authLoading || loadingEvents) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#f0edfb] to-[#f8f7fc]">
        <Header />
        <main className="flex-1 container max-w-6xl mx-auto py-10 px-4">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex gap-4 mb-8">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#f0edfb] to-[#f8f7fc]">
      <Header />
      <div className="university-primary-bg text-white py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold">My Events</h1>
          <p className="mt-2 text-white/80">Manage all the events you've RSVPed to</p>
        </div>
      </div>
      <main className="flex-1 container max-w-6xl mx-auto py-10 px-4">
        {rsvpedEvents.length > 0 ? (
          <>
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search events by title, description or location"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-asc">Date (Earliest first)</SelectItem>
                    <SelectItem value="date-desc">Date (Latest first)</SelectItem>
                    <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                    <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="upcoming" className="mb-8">
              <TabsList className="mb-6">
                <TabsTrigger value="upcoming" className="flex gap-2 items-center">
                  <Calendar className="h-4 w-4" />
                  Upcoming ({upcomingEvents.length})
                </TabsTrigger>
                <TabsTrigger value="past" className="flex gap-2 items-center">
                  <Calendar className="h-4 w-4" />
                  Event History ({pastEvents.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                {upcomingEvents.length > 0 ? (
                  <AnimatePresence>
                    <motion.div
                      layout
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {upcomingEvents.map((event, idx) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 32 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 32 }}
                          transition={{ duration: 0.5, ease: "easeOut", delay: idx * 0.05 }}
                          layout
                        >
                          <EventCard
                            event={event}
                            linkLocation   // ← make location link to Google Maps here
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                    <Calendar className="h-12 w-12 mx-auto university-primary-text mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No upcoming events</h3>
                    <p className="text-gray-600 mb-6">You don't have any upcoming events you've RSVPed to.</p>
                    <Button className="university-button university-button:hover text-white" onClick={() => router.push("/")}>
                      Discover Events
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past">
                {pastEvents.length > 0 ? (
                  <AnimatePresence>
                    <motion.div
                      layout
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {pastEvents.map((event, idx) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 32 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 32 }}
                          transition={{ duration: 0.5, ease: "easeOut", delay: idx * 0.05 }}
                          layout
                        >
                          {/* NO remove rsvp for past */}
                          <EventCard event={event} linkLocation /> {/* ← clickable here too */}
                        </motion.div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                    <Calendar className="h-12 w-12 mx-auto university-primary-text mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No past events</h3>
                    <p className="text-gray-600 mb-6">You don't have any past events you've RSVPed to.</p>
                    <Button className="university-button university-button:hover text-white" onClick={() => router.push("/dashboard")}>
                      Discover Events
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm mt-4">
            <Calendar className="h-16 w-16 mx-auto university-primary-text mb-4" />
            <h2 className="text-2xl font-bold mb-2">No RSVPed Events</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              You haven't RSVPed to any events yet. Discover and join events that interest you!
            </p>
            <Button size="lg" className="university-button university-button:hover text-white" onClick={() => router.push("/dashboard")}>
              Discover Events
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
