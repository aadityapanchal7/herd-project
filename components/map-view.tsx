"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { MapPin, X as XIcon, Calendar as CalIcon, Users } from "lucide-react";
import { useEvents } from "@/context/events-context";
import { MAP_CENTERS, VENUE_COORDS } from "@/lib/school-cords";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/use-toast";
import type { Event } from "@/lib/types";

// Dynamically import your map component
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
});

type EventWithCoords = Event & {
  latitude: number;
  longitude: number;
  creator_name?: string;
  max_attendees: number;
  current_attendees: number;
};

interface Attendee {
  attendee_first: string;
  attendee_last: string;
  attendee_avatar_url: string | null;
}

export default function MapView({ schoolKey }: { schoolKey?: string }) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { events, searchTerm, selectedCategory, selectedDate } = useEvents();

  // Merge events + coords
  const eventsWithCoordinates = useMemo(
    () =>
      events
        .map((evt) => {
          const coords = VENUE_COORDS[schoolKey ?? ""]?.[evt.location];
          if (!coords) return null;
          return {
            ...evt,
            latitude: coords.latitude,
            longitude: coords.longitude,
            creator_name: evt.creator_name || "",
            max_attendees: evt.max_attendees,
            current_attendees: evt.current_attendees,
          } as EventWithCoords;
        })
        .filter((e): e is EventWithCoords => !!e),
    [events, schoolKey]
  );

  // Attendee counts
  const [attendeeCounts, setAttendeeCounts] = useState<Record<number, number>>({});
  async function loadAttendeeCounts() {
    const { data, error } = await supabase.from("event_rsvps").select("event_id");
    if (error) return;
    const counts: Record<number, number> = {};
    eventsWithCoordinates.forEach((e) => (counts[e.id] = 0));
    data?.forEach((r) => {
      counts[r.event_id] = (counts[r.event_id] || 0) + 1;
    });
    setAttendeeCounts(counts);
  }
  useEffect(() => {
    loadAttendeeCounts();
    // eslint-disable-next-line
  }, [eventsWithCoordinates.length]);

  // This user’s RSVPd IDs
  const [rsvpdIds, setRsvpdIds] = useState<number[]>([]);
  const [rsvpsLoading, setRsvpsLoading] = useState(true);
  useEffect(() => {
    let isSub = true;
    (async () => {
      setRsvpsLoading(true);
      if (!user) {
        if (isSub) setRsvpdIds([]);
        setRsvpsLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("event_rsvps")
        .select("event_id")
        .eq("user_id", user.id);
      if (isSub) {
        if (!error && data) setRsvpdIds(data.map((r) => r.event_id));
        setRsvpsLoading(false);
      }
    })();
    return () => { isSub = false; };
  }, [user]);

  // Search/category/date filters
  const filteredEvents = useMemo(() => {
    return eventsWithCoordinates.filter((evt) => {
      if (searchTerm && !evt.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (selectedCategory !== "All" && evt.category !== selectedCategory) return false;
      if (selectedDate && selectedDate !== "All") {
        const iso = new Date(evt.date).toISOString().split("T")[0];
        if (iso !== selectedDate) return false;
      }
      return true;
    });
  }, [eventsWithCoordinates, searchTerm, selectedCategory, selectedDate]);

  // Hide ones they’ve already RSVPd to
  const visibleEvents = useMemo(
    () => filteredEvents.filter((evt) => !rsvpdIds.includes(evt.id)),
    [filteredEvents, rsvpdIds]
  );

  // Map/card selection & detail modal state
  const [selectedEvents, setSelectedEvents] = useState<EventWithCoords[]>([]);
  const [panToEvent, setPanToEvent] = useState<EventWithCoords | null>(null);
  const [viewEventDetail, setViewEventDetail] = useState<EventWithCoords | null>(null);

  function toggleSelect(evt: EventWithCoords) {
    setSelectedEvents((prev) =>
      prev.some((e) => e.id === evt.id)
        ? prev.filter((e) => e.id !== evt.id)
        : [...prev, evt]
    );
  }

  function handleMarkerClick(evt: EventWithCoords) {
    toggleSelect(evt);
    setPanToEvent(evt);
  }
  function handleCardClick(evt: EventWithCoords) {
    if (panToEvent?.id === evt.id) {
      setPanToEvent(null);
      setTimeout(() => setPanToEvent(evt), 0);
    } else {
      setPanToEvent(evt);
    }
  }

  const [viewSelected, setViewSelected] = useState(false);
  const sidebarList = viewSelected
    ? selectedEvents.filter((e) => !rsvpdIds.includes(e.id))
    : visibleEvents;
  const sidebarTitle = viewSelected ? "Selected Events" : "Nearby Events";

  // RSVP logic and attendee list
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [hasRSVPdDetail, setHasRSVPdDetail] = useState(false);

  // For attendee modal in detail
  const [showAttendeeList, setShowAttendeeList] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  // Search state for attendee modal
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const filteredAttendees = attendees.filter(
    a =>
      (a.attendee_first + " " + a.attendee_last)
        .toLowerCase()
        .includes(attendeeSearch.toLowerCase())
  );

  async function handleRSVP(evt: EventWithCoords) {
    if (!isAuthenticated || !user) {
      toast({ title: "Login Required", description: "Please login to RSVP", variant: "destructive" });
      return;
    }
    setRsvpLoading(true);
    try {
      const { data: exists } = await supabase
        .from("event_rsvps")
        .select("*")
        .eq("event_id", evt.id)
        .eq("user_id", user.id)
        .single();

      if (exists) {
        toast({ title: "Already RSVP'd" });
        setHasRSVPdDetail(true);
        return;
      }

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("first_name,last_name,avatar_url")
        .eq("id", user.id)
        .single();

      if (profErr || !prof) {
        toast({
          title: "Profile Load Failed",
          description: profErr?.message || "Could not load your profile.",
          variant: "destructive",
        });
        return;
      }

      const { error: insErr } = await supabase
        .from("event_rsvps")
        .insert({
          event_id:            evt.id,
          user_id:             user.id,
          attendee_first:      prof.first_name,
          attendee_last:       prof.last_name,
          attendee_avatar_url: prof.avatar_url,
        });

      if (insErr) throw insErr;

      toast({ title: "RSVP Successful" });
      setHasRSVPdDetail(true);
      setRsvpdIds((prev) => [...prev, evt.id]);
      await loadAttendeeCounts();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "RSVP Failed",
        description: err.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setRsvpLoading(false);
    }
  }

  useEffect(() => {
    if (viewEventDetail && isAuthenticated && user) {
      supabase
        .from("event_rsvps")
        .select("*")
        .eq("event_id", viewEventDetail.id)
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => setHasRSVPdDetail(!!data));
    } else {
      setHasRSVPdDetail(false);
    }
  }, [viewEventDetail, isAuthenticated, user]);

  // Map center fallback
  const center: [number, number] = (MAP_CENTERS[schoolKey ?? "ut_austin"] ?? [30.2861, -97.7394]) as any;
  const zoom = 14;

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-370px)]">
        {/* Map */}
        <div className="w-full md:w-2/3 h-full rounded-lg overflow-hidden shadow-md">
          {!rsvpsLoading ? (
            <LeafletMap
              center={center}
              zoom={zoom}
              events={visibleEvents}
              selectedEvents={selectedEvents.filter((e) => !rsvpdIds.includes(e.id))}
              selectedEvent={panToEvent || undefined}
              onEventSelect={handleMarkerClick}
            />
          ) : (
            <div className="h-full flex items-center justify-center">Loading events…</div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-full md:w-1/3 overflow-y-auto bg-white border border-zinc-200 p-4 shadow-md rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-zinc-800">{sidebarTitle}</h2>
            <button
              onClick={() => setViewSelected((v) => !v)}
              className="university-button text-white px-4 py-2 rounded-md"
            >
              {viewSelected ? "More Nearby Events" : "Selected Events"}
            </button>
          </div>

          {!rsvpsLoading && sidebarList.length === 0 ? (
            <p className="text-gray-500">
              {viewSelected ? "You haven’t selected any events." : "No nearby events."}
            </p>
          ) : (
            sidebarList.map((evt) => {
              const isSel = selectedEvents.some((e) => e.id === evt.id);
              const badgeCls = {
                Social:   "bg-purple-100 text-purple-800",
                Academic: "bg-green-100 text-green-800",
                Sports:   "bg-red-100 text-red-800",
                Arts:     "bg-pink-100 text-pink-800",
              }[evt.category] || "bg-gray-100 text-gray-800";

              return (
                <div
                  key={evt.id}
                  onClick={() => handleCardClick(evt)}
                  className="relative p-4 mb-4 border rounded-lg cursor-pointer hover:bg-zinc-50"
                >
                  {!viewSelected ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(evt);
                      }}
                      className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded ${
                        isSel ? "bg-red-500 text-white" : "university-button text-white"
                      }`}
                    >
                      {isSel ? "Remove" : "Add"}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(evt);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded"
                    >
                      Remove
                    </button>
                  )}

                  {viewSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewEventDetail(evt);
                      }}
                      className="absolute bottom-2 right-2 university-button text-white px-2 py-1 text-xs font-semibold rounded"
                    >
                      View
                    </button>
                  )}

                  <span className={`${badgeCls} inline-block px-3 py-1 rounded-full text-sm font-semibold`}>
                    {evt.category}
                  </span>

                  <h3 className="text-xl font-semibold mt-2 mb-1">{evt.title}</h3>
                  <p className="text-sm text-zinc-500 mb-1 flex items-center">
                    <CalIcon className="w-4 h-4 mr-1 university-primary-text" />
                    {evt.date} at {evt.time}
                  </p>
                  <p className="text-sm text-zinc-500 mb-1 flex items-center">
                    <MapPin className="w-4 h-4 mr-1 university-primary-text" />
                    {evt.location}
                  </p>
                  <div className="flex items-center text-gray-500 mt-1">
                    <Users className="w-4 h-4 mr-2 university-primary" />
                    <span className="text-base">{attendeeCounts[evt.id] || 0} / {evt.max_attendees} attendees</span>
                  </div>
                </div>
              );
            })
          )}
        </aside>
      </div>

      {/* --- RSVP Detail Modal --- */}
      {viewEventDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setViewEventDetail(null)}
              className="absolute top-3 right-3 university-primary-text hover:opacity-80"
            >
              <XIcon size={20} />
            </button>
            <h2 className="text-2xl font-bold mb-2">{viewEventDetail.title}</h2>
            <p className="mb-1">
              <strong>Category:</strong> {viewEventDetail.category}
            </p>
            <p className="mb-2 text-sm text-gray-600">{viewEventDetail.description}</p>
            <p className="mb-1 flex items-center">
              <CalIcon className="w-4 h-4 mr-1 university-primary-text" />
              {viewEventDetail.date} at {viewEventDetail.time}
            </p>
            <p className="mb-1 flex items-center">
              <MapPin className="w-4 h-4 mr-1 university-primary-text" />
              {viewEventDetail.location}
            </p>
            <p className="mb-1">
              <strong>Hosted by:</strong> {viewEventDetail.creator_name}
            </p>
            {/* --- Attendees Row --- */}
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-5 h-5 text-orange-700" />
              <span className="text-base text-gray-600 font-normal">
                {attendeeCounts[viewEventDetail.id] || 0} / {viewEventDetail.max_attendees} attendees
              </span>
              <button
                className="ml-4 px-4 py-1 rounded-lg border-2 border-orange-700 text-orange-700 font-bold bg-white transition hover:bg-orange-50 focus:outline-none"
                onClick={async () => {
                  setShowAttendeeList(true);
                  setLoadingAttendees(true);
                  setAttendeeSearch("");
                  const { data } = await supabase
                    .from("event_rsvps")
                    .select("attendee_first, attendee_last, attendee_avatar_url")
                    .eq("event_id", viewEventDetail.id);
                  setAttendees(data || []);
                  setLoadingAttendees(false);
                }}
                type="button"
              >
                View
              </button>
            </div>
            <button
              onClick={() => handleRSVP(viewEventDetail)}
              disabled={
                rsvpLoading ||
                (attendeeCounts[viewEventDetail.id] || 0) >= viewEventDetail.max_attendees ||
                hasRSVPdDetail
              }
              className="mt-6 float-right university-button text-white px-4 py-2 rounded-md font-semibold disabled:opacity-50"
            >
              {rsvpLoading
                ? "RSVP…"
                : (attendeeCounts[viewEventDetail.id] || 0) >= viewEventDetail.max_attendees
                ? "Full"
                : hasRSVPdDetail
                ? "Already RSVP’d"
                : "RSVP Now"}
            </button>
            {/* --- Attendee List Modal --- */}
            {showAttendeeList && (
              <div
                className="fixed inset-0 z-[11000] bg-black/40 flex items-center justify-center"
                onClick={() => setShowAttendeeList(false)}
              >
                <div
                  className="bg-white rounded-lg p-6 max-w-xs w-full shadow-lg"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">Attendees</h4>
                    <button
                      className="text-gray-400 hover:text-gray-700 text-2xl"
                      onClick={() => setShowAttendeeList(false)}
                    >
                      &times;
                    </button>
                  </div>
                  <input
                    type="text"
                    className="w-full mb-3 px-3 py-2 border rounded-md focus:outline-none focus:ring"
                    placeholder="Search by name…"
                    value={attendeeSearch}
                    onChange={e => setAttendeeSearch(e.target.value)}
                  />
                  {loadingAttendees ? (
                    <div>Loading…</div>
                  ) : filteredAttendees.length === 0 ? (
                    <div className="text-gray-500 text-sm">No one has RSVP'd yet.</div>
                  ) : (
                    <ul className="space-y-3 max-h-64 overflow-y-auto">
                      {filteredAttendees.map((a, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <img
                            src={a.attendee_avatar_url || "/default-avatar.png"}
                            alt={`${a.attendee_first} ${a.attendee_last}`}
                            className="w-8 h-8 rounded-full object-cover border"
                            onError={e => (e.currentTarget.src = "/default-avatar.png")}
                          />
                          <span>
                            {a.attendee_first} {a.attendee_last}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
