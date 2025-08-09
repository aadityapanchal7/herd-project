// app/(dashboard)/page.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { ConfigCheck } from "@/components/config-check";
import { ViewSelector } from "@/components/view-selector";
import { EventCard } from "@/components/event-card";
import { useAuth } from "@/context/auth-context";
import { useEvents } from "@/context/events-context";
import { useToast } from "@/components/ui/use-toast";
import type { Event } from "@/lib/types";

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { events, userRsvps } = useEvents();
  const router = useRouter();
  const { toast } = useToast();

  // Redirect unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to view the dashboard",
        variant: "destructive",
      });
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router, toast]);

  // Campus name for subtitle
  const campusName = user?.university ?? "your campus";

  // Normalize "today" to midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1) All upcoming events (today or later)
  const upcomingEvents = useMemo(
    () => events.filter((e) => new Date(e.date) >= today),
    [events]
  );

  // 2) Recommended: up to 3 within the next 7 days,
  //    EXCLUDING events the user has already RSVPd to
  const recommendedThisWeek = useMemo(() => {
    const oneWeekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // remove already-RSVPd events
    const notRsvpd = upcomingEvents.filter((e) => !userRsvps.includes(e.id));

    // shuffle the remaining and take only those within the next week
    const shuffled = [...notRsvpd].sort(() => Math.random() - 0.5);

    return shuffled
      .filter((e) => {
        const d = new Date(e.date);
        return d >= today && d <= oneWeekLater;
      })
      .slice(0, 3);
  }, [upcomingEvents, userRsvps]);

  // 3) Your scheduled events: any upcoming event you've RSVPd to
  const scheduledEvents = useMemo(
    () => upcomingEvents.filter((e) => userRsvps.includes(e.id)),
    [upcomingEvents, userRsvps]
  );

  return (
    <main className="min-h-screen bg-[#f8f7fc]">
      <Header />

      <div className="container px-4 md:px-6 pt-4">
        <ConfigCheck />
      </div>

      {/* Hero */}
      <HeroSection
        title="Discover Events"
        subtitle={`Find and join events happening around the ${campusName}`}
      />

      {/* View Tabs */}
      <ViewSelector />

      {/* Recommended Events */}
      <div className="container max-w-6xl mx-auto px-4 mt-8">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-xl font-semibold university-primary-text">
            Recommended Events For You This Week
          </h2>
        </div>
        {recommendedThisWeek.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {recommendedThisWeek.map((evt: Event) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 mb-10">
            There are no recommended events for you this week.
          </p>
        )}
      </div>

      {/* My Scheduled Events */}
      <div className="container max-w-6xl mx-auto px-4 mb-10">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-xl font-semibold university-primary-text">
            My Scheduled Events
          </h2>
        </div>
        {scheduledEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scheduledEvents.map((evt: Event) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">
            You have no upcoming scheduled events.
          </p>
        )}
      </div>
    </main>
  );
}
