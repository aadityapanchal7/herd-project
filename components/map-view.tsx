// app/(whatever-your-route-is)/map-view.tsx
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
import { Button } from "@/components/ui/button";
import { AvatarThumb } from "@/components/avatar-thumb";
import { to12h } from "@/lib/to12hrs"; // <-- NEW

// Dynamically import LeafletMap (no SSR)
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), { ssr: false });

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

  // Today's midnight
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // One month from today
  const oneMonthLater = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 1);
    return d;
  }, [today]);

  // Merge events + coords (base list)
  const eventsWithCoordinates = useMemo(() => {
    return (events ?? [])
      .map((evt) => {
        const coords = VENUE_COORDS[schoolKey ?? ""]?.[evt.location];
        if (!coords) return null;
        return {
          ...evt,
          latitude: coords.latitude,
          longitude: coords.longitude,
          creator_name: evt.creator_name || "",
          max_attendees: evt.max_attendees,
          current_attendees: evt.current_attendees ?? 0,
        } as EventWithCoords;
      })
      .filter((e): e is EventWithCoords => !!e);
  }, [events, schoolKey]);

  // --- RSVP COUNTS (no-refresh)
  const [attendeeCounts, setAttendeeCounts] = useState<Record<number, number>>({});

  const loadAttendeeCounts = async () => {
    const { data, error } = await supabase.from("event_rsvps").select("event_id");
    if (error) return;
    const counts: Record<number, number> = {};
    eventsWithCoordinates.forEach((e) => (counts[e.id] = 0));
    data?.forEach((r) => {
      counts[r.event_id] = (counts[r.event_id] || 0) + 1;
    });
    setAttendeeCounts(counts);
  };

  useEffect(() => {
    loadAttendeeCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsWithCoordinates.length]);

  // realtime subscription to event_rsvps
  useEffect(() => {
    const channel = supabase
      .channel("mapview-rsvps")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_rsvps" },
        (payload: any) => {
          const evtId = payload.new?.event_id as number | undefined;
          if (!evtId) return;
          setAttendeeCounts((prev) => ({ ...prev, [evtId]: (prev[evtId] || 0) + 1 }));
          if (payload.new?.user_id && user?.id && payload.new.user_id === user.id) {
            setRsvpdIds((prev) => (prev.includes(evtId) ? prev : [...prev, evtId]));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "event_rsvps" },
        (payload: any) => {
          const evtId = payload.old?.event_id as number | undefined;
          if (!evtId) return;
          setAttendeeCounts((prev) => {
            const next = { ...prev };
            next[evtId] = Math.max(0, (next[evtId] || 0) - 1);
            return next;
          });
          if (payload.old?.user_id && user?.id && payload.old.user_id === user.id) {
            setRsvpdIds((prev) => prev.filter((id) => id !== evtId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // --- THIS USER’S RSVPd IDs (no-refresh)
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
      if (isSub && !error && data) {
        setRsvpdIds(data.map((r) => r.event_id));
      }
      setRsvpsLoading(false);
    })();
    return () => {
      isSub = false;
    };
  }, [user]);

  // --- FILTERING
  const searchFiltered = useMemo(() => {
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

  // Date window [today, oneMonthLater] & not created by me
  const dateAndOwnerFiltered = useMemo(() => {
    const me = user?.id;
    return searchFiltered.filter((evt) => {
      const d = new Date(evt.date);
      const inWindow = d >= today && d <= oneMonthLater;
      const notMine = me ? evt.created_by !== me : true;
      return inWindow && notMine;
    });
  }, [searchFiltered, today, oneMonthLater, user?.id]);

  // Hide only truly full events (RSVPs allowed + limited + at cap) & ones already RSVPd
  const visibleEvents = useMemo(() => {
    return dateAndOwnerFiltered.filter((evt) => {
      const count = attendeeCounts[evt.id] || 0;

      const isLimited = !!evt.allow_rsvp && !!evt.rsvp_limited;
      const max = Number.isFinite(evt.max_attendees) ? evt.max_attendees : Number.MAX_SAFE_INTEGER;
      const isFull = isLimited && count >= (max ?? Number.MAX_SAFE_INTEGER);

      const notAlreadyRsvpd = !rsvpdIds.includes(evt.id);

      return !isFull && notAlreadyRsvpd;
    });
  }, [dateAndOwnerFiltered, attendeeCounts, rsvpdIds]);

  // --- SELECTION & DETAIL
  const [selectedEvents, setSelectedEvents] = useState<EventWithCoords[]>([]);
  const [panToEvent, setPanToEvent] = useState<EventWithCoords | null>(null);
  const [viewEventDetail, setViewEventDetail] = useState<EventWithCoords | null>(null);

  useEffect(() => {
    setSelectedEvents((prev) => prev.filter((e) => visibleEvents.some((v) => v.id === e.id)));
  }, [visibleEvents]);

  function toggleSelect(evt: EventWithCoords) {
    setSelectedEvents((prev) =>
      prev.some((e) => e.id === evt.id) ? prev.filter((e) => e.id !== evt.id) : [...prev, evt]
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
    ? selectedEvents.filter((e) => visibleEvents.some((v) => v.id === e.id))
    : visibleEvents;
  const sidebarTitle = viewSelected ? "My Selected Events" : "Nearby Events";

  // --- RSVP DETAIL & ATTENDEE LIST
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [hasRSVPdDetail, setHasRSVPdDetail] = useState(false);
  const [showAttendeeList, setShowAttendeeList] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const filteredAttendees = attendees.filter((a) =>
    `${a.attendee_first} ${a.attendee_last}`.toLowerCase().includes(attendeeSearch.toLowerCase())
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

      const { error: insErr } = await supabase.from("event_rsvps").insert({
        event_id: evt.id,
        user_id: user.id,
        attendee_first: prof.first_name,
        attendee_last: prof.last_name,
        attendee_avatar_url: prof.avatar_url,
      });

      if (insErr) throw insErr;

      setHasRSVPdDetail(true);
      setRsvpdIds((prev) => (prev.includes(evt.id) ? prev : [...prev, evt.id]));
      setAttendeeCounts((prev) => ({ ...prev, [evt.id]: (prev[evt.id] || 0) + 1 }));
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
  const center: [number, number] = (MAP_CENTERS[schoolKey ?? "ut_austin"] ??
    [30.2861, -97.7394]) as any;
  const zoom = 14;

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-370px)] min-h-[420px]">
        {/* Map */}
        <div className="w-full md:w-2/3 h-full rounded-lg overflow-hidden shadow-md">
          {!rsvpsLoading ? (
            <LeafletMap
              center={center}
              zoom={zoom}
              events={visibleEvents ?? []}
              selectedEvents={selectedEvents.filter((e) => visibleEvents.some((v) => v.id === e.id))}
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
              {viewSelected ? "More Nearby Events" : "My Selected Events"}
            </button>
          </div>

          {!rsvpsLoading && sidebarList.length === 0 ? (
            <p className="text-gray-500">
              {viewSelected ? "You haven’t selected any events." : "No nearby events."}
            </p>
          ) : (
            sidebarList.map((evt) => {
              const isSel = selectedEvents.some((e) => e.id === evt.id);
              const badgeCls =
                {
                  Social: "bg-purple-100 text-purple-800",
                  Academic: "bg-green-100 text-green-800",
                  Sports: "bg-red-100 text-red-800",
                  Arts: "bg-pink-100 text-pink-800",
                }[evt.category] || "bg-gray-100 text-gray-800";

              const count = attendeeCounts[evt.id] || 0;

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
                      className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded ${isSel ? "bg-red-500 text-white" : "university-button text-white"
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
                    {evt.date} at {to12h(evt.time)}
                    {evt.time_zone ? ` ${evt.time_zone}` : ""} {/* <-- 12h + TZ */}
                  </p>
                  <p className="text-sm text-zinc-500 mb-1 flex items-center">
                    <MapPin className="w-4 h-4 mr-1 university-primary-text" />
                    {evt.location}
                  </p>

                  {/* Attendees row: 3 states (off / unlimited / limited) */}
                  <div className="flex items-center text-gray-500 mt-1">
                    <Users className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-base">
                      {!evt.allow_rsvp
                        ? "No RSVP needed"
                        : evt.rsvp_limited
                          ? `${count} / ${evt.max_attendees} attendees`
                          : `${count} attendees`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </aside>
      </div>

      {/* RSVP Detail Modal (marker popup) */}
      {viewEventDetail && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"
          onClick={() => setViewEventDetail(null)}
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewEventDetail(null)}
              className="absolute top-3 right-3 university-primary-text hover:opacity-80"
              aria-label="Close"
            >
              <XIcon size={20} />
            </button>

            <h2 className="text-2xl font-bold mt-2 mb-1">{viewEventDetail.title}</h2>
            {viewEventDetail.creator_name && (
              <p className="text-sm text-gray-500 mb-2">
                <strong>Hosted by:</strong> {viewEventDetail.creator_name}
              </p>
            )}
            {viewEventDetail.description && (
              <p className="text-gray-600 mb-4">{viewEventDetail.description}</p>
            )}

            {/* Meta rows (aligned) */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-gray-500">
                <CalIcon className="w-4 h-4 mr-2 university-primary-text" />
                <span>
                  {viewEventDetail.date} • {to12h(viewEventDetail.time)}
                  {viewEventDetail.time_zone ? ` ${viewEventDetail.time_zone}` : ""} {/* <-- 12h + TZ */}
                </span>
              </div>
              <div className="flex items-center text-gray-500">
                <MapPin className="w-4 h-4 mr-2 university-primary-text" />
                <span>{viewEventDetail.location}</span>
              </div>

              {/* RSVP row (modal only) */}
              <div className="flex items-center text-gray-500">
                {viewEventDetail.allow_rsvp ? (
                  <button
                    type="button"
                    title="View attendees"
                    className="group flex items-center justify-center w-8 h-8 rounded-md border border-primary bg-white hover:bg-primary transition-colors focus:outline-none mr-2"
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
                  >
                    <Users className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                  </button>
                ) : (
                  <Users className="w-4 h-4 mr-2 university-primary-text" />
                )}

                <span className="text-[15px]">
                  {!viewEventDetail.allow_rsvp
                    ? "No RSVP needed"
                    : viewEventDetail.rsvp_limited
                      ? `${attendeeCounts[viewEventDetail.id] || 0} / ${viewEventDetail.max_attendees} attendees`
                      : `${attendeeCounts[viewEventDetail.id] || 0} attendees`}
                </span>
              </div>
            </div>

            {/* RSVP CTA — hidden entirely when RSVPs are off */}
            {viewEventDetail.allow_rsvp && (
              <div className="flex justify-end mb-6">
                <Button
                  onClick={() => handleRSVP(viewEventDetail)}
                  disabled={
                    rsvpLoading ||
                    (viewEventDetail.rsvp_limited &&
                      (attendeeCounts[viewEventDetail.id] || 0) >= viewEventDetail.max_attendees) ||
                    hasRSVPdDetail
                  }
                  className="university-button text-white px-4 py-2 rounded-md font-semibold disabled:opacity-50"
                >
                  {rsvpLoading
                    ? "RSVP…"
                    : (viewEventDetail.rsvp_limited &&
                      (attendeeCounts[viewEventDetail.id] || 0) >= viewEventDetail.max_attendees)
                      ? "Full"
                      : hasRSVPdDetail
                        ? "Already RSVP’d"
                        : "RSVP Now"}
                </Button>
              </div>
            )}

            {/* Attendee List Modal */}
            {showAttendeeList && viewEventDetail.allow_rsvp && (
              <div
                className="fixed inset-0 z-[11000] bg-black/40 flex items-center justify-center"
                onClick={() => setShowAttendeeList(false)}
              >
                <div
                  className="bg-white rounded-lg p-6 max-w-xs w-full shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">Attendees</h4>
                    <button
                      className="text-gray-400 hover:text-gray-700 text-2xl"
                      onClick={() => setShowAttendeeList(false)}
                      aria-label="Close attendees list"
                    >
                      &times;
                    </button>
                  </div>
                  <input
                    type="text"
                    className="w-full mb-3 px-3 py-2 border rounded-md focus:outline-none focus:ring"
                    placeholder="Search by name…"
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                  />
                  {loadingAttendees ? (
                    <div>Loading…</div>
                  ) : filteredAttendees.length === 0 ? (
                    <div className="text-gray-500 text-sm">No one has RSVP'd yet.</div>
                  ) : (
                    <ul className="space-y-3 max-h-64 overflow-y-auto">
                      {filteredAttendees.map((a, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <AvatarThumb
                            url={a.attendee_avatar_url}
                            first={a.attendee_first}
                            last={a.attendee_last}
                            size={32}
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
