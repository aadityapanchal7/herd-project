"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Event, EventCategory, University } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "./auth-context";
import { supabase } from "@/lib/supabase";
import { getUniversities } from "@/lib/universities";

interface EventsContextType {
  events: (Event & { attendee_count?: number })[];
  filteredEvents: (Event & { attendee_count?: number })[];
  searchTerm: string;
  selectedCategory: EventCategory;
  selectedDate: string; // YYYY-MM-DD or "All"
  selectedUniversity: number | null;
  universities: University[];
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: EventCategory) => void;
  setSelectedDate: (date: string) => void;
  setSelectedUniversity: (universityId: number | null) => void;
  rsvpToEvent: (eventId: number) => Promise<void>;
  userRsvps: number[];
  addUserRsvp: (eventId: number) => void;
  loading: boolean;
  refreshEvents: () => Promise<void>;
  error: string | null;
  updateEventAttendees: (eventId: number, attendeeCount: number) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<(Event & { attendee_count?: number })[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<(Event & { attendee_count?: number })[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>("All");
  const [selectedDate, setSelectedDate] = useState("All");
  const [selectedUniversity, setSelectedUniversity] = useState<number | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [userRsvps, setUserRsvps] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();

  // Fetch universities
  useEffect(() => {
    async function fetchUniversities() {
      try {
        const data = await getUniversities();
        setUniversities(data);
      } catch (error) {
        console.error("Error fetching universities:", error);
      }
    }
    fetchUniversities();
  }, []);

  // Preselect user's university
  useEffect(() => {
    if (isAuthenticated && user && universities.length > 0) {
      const userUniversity = universities.find((u) => u.name === user.university);
      if (userUniversity) setSelectedUniversity(userUniversity.id);
    }
  }, [isAuthenticated, user, universities]);

  // Initial data
  useEffect(() => {
    fetchEvents();
    if (isAuthenticated) fetchUserRsvps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Realtime subscription for event updates (doesn't update attendee_count; we recompute on refresh)
  useEffect(() => {
    const subscription = supabase
      .channel("events-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events" },
        (payload) => {
          if (payload.new && typeof payload.new.id === "number") {
            const updatedEvent = payload.new as Event;
            setEvents((current) =>
              current.map((ev) =>
                ev.id === updatedEvent.id ? { ...ev, ...updatedEvent } : ev
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Filtering
  useEffect(() => {
    let filtered = [...events];

    if (selectedUniversity !== null) {
      filtered = filtered.filter((event) => event.university_id === selectedUniversity);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(q) ||
          event.description.toLowerCase().includes(q) ||
          event.location.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter((event) => event.category === selectedCategory);
    }

    if (selectedDate !== "All") {
      filtered = filtered.filter((event) => {
        try {
          const eventDateObj = new Date(event.date);
          if (isNaN(eventDateObj.getTime())) return false;
          const formatter = new Intl.DateTimeFormat("en-CA", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            timeZone: "America/Chicago",
          });
          const eventDateYMD = formatter.format(eventDateObj);
          return eventDateYMD === selectedDate;
        } catch {
          return false;
        }
      });
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, selectedCategory, selectedDate, selectedUniversity]);

  // ---- Data fetchers ----
  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError("Database configuration is missing");
        setLoading(false);
        return;
      }

      const { data: eventsRaw, error } = await supabase
        .from("events")
        .select(`
          id, title, category, description, date, time, location,
          max_attendees, current_attendees, verified, created_by, creator_name,
          latitude, longitude, university_id, is_private, image_url,
          allow_rsvp, rsvp_limited, created_at, time_zone
        `)
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching events:", error);
        setError("Failed to load events");
        toast({
          title: "Error",
          description: "Failed to load events",
          variant: "destructive",
        });
        return;
      }

      // Fetch RSVP rows and aggregate counts client-side
      const { data: rsvpRows, error: rsvpErr } = await supabase
        .from("event_rsvps")
        .select("event_id");

      if (rsvpErr) {
        console.warn("Failed to fetch RSVP counts:", rsvpErr.message);
        setEvents((eventsRaw ?? []) as (Event & { attendee_count?: number })[]);
      } else {
        const counts: Record<number, number> = {};
        (rsvpRows ?? []).forEach((r) => {
          counts[r.event_id] = (counts[r.event_id] || 0) + 1;
        });

        const merged = (eventsRaw ?? []).map((e) => ({
          ...(e as Event),
          attendee_count: counts[e.id] ?? 0,
        }));

        setEvents(merged);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setError("Failed to load events");
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRsvps = async () => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data, error } = await supabase
        .from("event_rsvps")
        .select("event_id")
        .eq("user_id", authData.user.id);

      if (error) {
        console.error("Error fetching user RSVPs:", error);
        return;
      }

      setUserRsvps(data?.map((rsvp) => rsvp.event_id) || []);
    } catch (error) {
      console.error("Error fetching user RSVPs:", error);
    }
  };

  // Helpers
  const addUserRsvp = (eventId: number) => {
    if (!userRsvps.includes(eventId)) {
      setUserRsvps((prev) => [...prev, eventId]);
    }
  };

  const updateEventAttendees = (eventId: number, attendeeCount: number) => {
    setEvents((current) =>
      current.map((ev) => (ev.id === eventId ? { ...ev, attendee_count: attendeeCount } : ev))
    );
  };

  // Kept for compatibility; RSVP is handled inside EventCard now
  const handleRsvpToEvent = async (_eventId: number) => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        toast({
          title: "Configuration Error",
          description: "Database service is not properly configured.",
          variant: "destructive",
        });
        return;
      }
      console.warn("rsvpToEvent in context is deprecated; use the EventCard handler instead.");
    } catch (error) {
      console.error("Error RSVPing to event:", error);
      toast({
        title: "RSVP Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const refreshEvents = async () => {
    await fetchEvents();
    if (isAuthenticated) {
      await fetchUserRsvps();
    }
  };

  return (
    <EventsContext.Provider
      value={{
        events,
        filteredEvents,
        searchTerm,
        selectedCategory,
        selectedDate,
        selectedUniversity,
        universities,
        setSearchTerm,
        setSelectedCategory,
        setSelectedDate,
        setSelectedUniversity,
        rsvpToEvent: handleRsvpToEvent,
        userRsvps,
        addUserRsvp,
        loading,
        refreshEvents,
        error,
        updateEventAttendees,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider");
  }
  return context;
}
