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
import type { Event } from "@/lib/types";
import { parse, isValid } from "date-fns";

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { events, userRsvps, loading: eventsLoading } = useEvents() as {
    events: (Event & { attendee_count?: number })[];
    userRsvps: number[];
    loading?: boolean;
  };
  const router = useRouter();

  // Redirect after auth resolves
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const parseEventDate = (d: string): Date => {
    let p = parse(d, "MMM d, yyyy", new Date());
    if (isValid(p)) return p;
    p = parse(d, "yyyy-MM-dd", new Date());
    if (isValid(p)) return p;
    const asDate = new Date(d);
    return isValid(asDate) ? asDate : new Date(8640000000000000);
  };

  // Replace your current upcomingEvents useMemo with this:
  const upcomingEvents = useMemo(
    () =>
      (events ?? []).filter((e) => {
        const d = parseEventDate(e.date); // expect local date at 00:00
        if (!(d instanceof Date) || Number.isNaN(d.getTime())) return false;

        // Keep the event visible until the *start of the next day*
        const nextDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        return nextDayStart > today; // 'today' is your current Date (now)
      }),
    [events, today]
  );


  const isVisibleToMe = (e: Event & { attendee_count?: number }) => {
    const mine = user?.id && e.created_by === user.id;

    // Only consider "full" when RSVPs are allowed AND limited and max > 0
    const isLimited = e.allow_rsvp && e.rsvp_limited;
    const max =
      Number.isFinite(e.max_attendees) && (e.max_attendees ?? 0) > 0
        ? e.max_attendees!
        : undefined;
    const attendeeCount = e.attendee_count ?? e.current_attendees ?? 0;

    const full = isLimited && max !== undefined && attendeeCount >= max;

    return !mine && !full;
  };

  const recommendedThisWeek = useMemo(() => {
    const oneWeekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const base = upcomingEvents
      .filter(isVisibleToMe)
      .filter((e) => !(userRsvps ?? []).includes(e.id));

    const within = base.filter((e) => {
      const d = parseEventDate(e.date);
      return d >= today && d <= oneWeekLater;
    });

    return [...within].sort(() => Math.random() - 0.5).slice(0, 3);
  }, [upcomingEvents, userRsvps, user?.id, today]);

  const scheduledEvents = useMemo(
    () => upcomingEvents.filter((e) => (userRsvps ?? []).includes(e.id)),
    [upcomingEvents, userRsvps]
  );

  const campusName = user?.university ?? "your campus";

  return (
    <main className="min-h-screen bg-[#f8f7fc]">
      <Header />

      <div className="container px-4 md:px-6 pt-4">
        <ConfigCheck />
      </div>

      <HeroSection
        title="Discover Events"
        subtitle={`Find and join events happening around the ${campusName}`}
      />

      <ViewSelector />

      {(authLoading || eventsLoading) && (
        <div className="container max-w-6xl mx-auto px-4 py-10 text-center text-slate-500">
          Loading…
        </div>
      )}

      {!authLoading && !eventsLoading && (
        <>
          {/* Recommended */}
          <div className="container max-w-6xl mx-auto px-4 mt-8">
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <h2 className="text-xl font-semibold university-primary-text">
                Recommended Events For You This Week
              </h2>
            </div>
            {recommendedThisWeek.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {recommendedThisWeek.map((evt) => (
                  <EventCard key={evt.id} event={evt} />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 mb-10">
                There are no recommended events for you this week.
              </p>
            )}
          </div>


        </>
      )}
    </main>
  );
}
