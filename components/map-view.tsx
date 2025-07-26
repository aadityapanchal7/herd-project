'use client';

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Search as SearchIcon,
  Filter as FilterIcon,
  Calendar as CalIcon,
  MapPin,
  X as XIcon,
} from "lucide-react";
import { useEvents } from "@/context/events-context";
import { MAP_CENTERS, VENUE_COORDS } from "@/lib/ut-venue-coordinates";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/use-toast";
import type { Event } from "@/lib/types";

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

// helper to format YYYY-MM-DD in local timezone
function formatLocalDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MapView() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { events } = useEvents();

  // derive school key
  let school = "";
  if (user?.university?.toLowerCase().includes("texas") &&
      user.university.toLowerCase().includes("austin")) {
    school = "ut_austin";
  }

  // 1. merge events with coords
  const eventsWithCoordinates = useMemo(
    () =>
      events
        .map((evt) => {
          const c = VENUE_COORDS[school]?.[evt.location];
          return c
            ? ({
                ...evt,
                latitude: c.latitude,
                longitude: c.longitude,
                creator_name: evt.creator_name || "",
                max_attendees: evt.max_attendees,
                current_attendees: evt.current_attendees,
              } as EventWithCoords)
            : null;
        })
        .filter((e): e is EventWithCoords => !!e),
    [events, school]
  );

  // 2. attendee counts
  const [attendeeCounts, setAttendeeCounts] = useState<{ [key: number]: number }>({});
  async function loadAttendeeCounts() {
    const { data, error } = await supabase.from("event_rsvps").select("event_id");
    if (error) return;
    const counts: { [key: number]: number } = {};
    eventsWithCoordinates.forEach((e) => (counts[e.id] = 0));
    (data || []).forEach((row) => {
      counts[row.event_id] = (counts[row.event_id] || 0) + 1;
    });
    setAttendeeCounts(counts);
  }
  useEffect(() => {
    loadAttendeeCounts();
  }, [eventsWithCoordinates.length]);

  // 3. load this user’s RSVPd IDs
  const [rsvpdIds, setRsvpdIds] = useState<number[]>([]);
  const [rsvpsLoading, setRsvpsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    async function fetchRsvps() {
      setRsvpsLoading(true);
      try {
        if (!user) {
          setRsvpdIds([]);
          return;
        }
        const { data, error } = await supabase
          .from("event_rsvps")
          .select("event_id")
          .eq("user_id", user.id);
        if (error) throw error;
        if (!cancelled) {
          setRsvpdIds(data?.map((r) => r.event_id) || []);
        }
      } catch (err) {
        console.error("Failed to load RSVPs:", err);
      } finally {
        if (!cancelled) setRsvpsLoading(false);
      }
    }
    fetchRsvps();
    return () => { cancelled = true; };
  }, [user]);

  // 4. filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const dateInputRef = useRef<HTMLInputElement & { showPicker?: () => void }>(null);
  const categories = ["Social", "Academic", "Sports", "Arts"];

  const filteredEvents = useMemo(
    () =>
      eventsWithCoordinates.filter((evt) => {
        if (searchTerm && !evt.title.toLowerCase().includes(searchTerm.toLowerCase()))
          return false;
        if (categoryFilter !== "All" && evt.category !== categoryFilter)
          return false;
        if (dateFilter) {
          const iso = new Date(evt.date).toISOString().split("T")[0];
          if (iso !== dateFilter) return false;
        }
        return true;
      }),
    [eventsWithCoordinates, searchTerm, categoryFilter, dateFilter]
  );

  // remove any they’ve already RSVPd to
  const visibleEvents = useMemo(
    () => filteredEvents.filter((evt) => !rsvpdIds.includes(evt.id)),
    [filteredEvents, rsvpdIds]
  );

  // 5. selection & modal
  const [selectedEvents, setSelectedEvents] = useState<EventWithCoords[]>([]);
  const [panToEvent, setPanToEvent] = useState<EventWithCoords | null>(null);
  const [viewEventDetail, setViewEventDetail] = useState<EventWithCoords | null>(null);

  const toggleSelect = (evt: EventWithCoords) => {
    setSelectedEvents((prev) =>
      prev.some((e) => e.id === evt.id)
        ? prev.filter((e) => e.id !== evt.id)
        : [...prev, evt]
    );
  };

  const handleMarkerClick = (evt: EventWithCoords) => {
    toggleSelect(evt);
    setPanToEvent(evt);
  };

  const handleCardClick = (evt: EventWithCoords) => {
    if (panToEvent?.id === evt.id) {
      setPanToEvent(null);
      setTimeout(() => setPanToEvent(evt), 0);
    } else {
      setPanToEvent(evt);
    }
  };

  const [viewSelected, setViewSelected] = useState(false);
  const sidebarList = viewSelected
    ? selectedEvents.filter((e) => !rsvpdIds.includes(e.id))
    : visibleEvents;
  const sidebarTitle = viewSelected ? "Selected Events" : "Nearby Events";
  const toggleLabel = viewSelected ? "Back to Nearby Events" : "Show Selected Events";

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // 6. RSVP logic
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [hasRSVPd, setHasRSVPd] = useState(false);

  const handleRSVP = async (evt: EventWithCoords) => {
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
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("first_name,last_name")
        .eq("id", user.id)
        .single();
      await supabase.from("event_rsvps").insert({
        event_id: evt.id,
        user_id: user.id,
        attendee_first: prof!.first_name,
        attendee_last: prof!.last_name,
      });
      toast({ title: "RSVP Successful" });
      setRsvpdIds((prev) => [...prev, evt.id]);
      await loadAttendeeCounts();
    } catch {
      toast({ title: "RSVP Failed", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setRsvpLoading(false);
    }
  };

  useEffect(() => {
    if (viewEventDetail && isAuthenticated && user) {
      supabase
        .from("event_rsvps")
        .select("*")
        .eq("event_id", viewEventDetail.id)
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => setHasRSVPd(!!data));
    } else {
      setHasRSVPd(false);
    }
  }, [viewEventDetail, isAuthenticated, user]);

  // map center
  const center: [number, number] =
    (MAP_CENTERS[school] as [number, number]) ?? (MAP_CENTERS["ut_austin"] as [number, number]);
  const zoom = 14;

  return (
    <>
    
      {/* Info bar */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-4">
        <h1 className="text-xl font-bold university-primary-text">
          {user?.university || "Campus"} Map
        </h1>
        <p className="text-gray-700">
  Explore events happening around your campus. Click on a marker or click &quot;add&quot; to select an event.
</p>
      </div>

      {/* Filters */}
      <div className="university-primary-bg text-university-primary-text rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-current" size={20} />
          <input
            type="text"
            placeholder="Search for events…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-lg text-current placeholder-current focus:ring-2 focus:ring-current"
          />
        </div>
        {/* Category */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2 bg-white rounded-lg text-current focus:ring-2 focus:ring-current"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <FilterIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-current" size={20} />
        </div>

        {/* Date */}
        <div
  className="relative w-full md:w-auto cursor-pointer"
  onClick={() => dateInputRef.current?.showPicker?.()}
>
  <input
    ref={dateInputRef}
    type="date"
    value={dateFilter}
    onChange={(e) => setDateFilter(e.target.value)}
    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
    style={{ pointerEvents: "none" }} // allow clicks to pass through
    tabIndex={-1} // not focusable by tab, but still accessible via showPicker
  />
  <div className="flex items-center pl-4 pr-10 py-2 bg-white rounded-lg text-current select-none">
    <CalIcon className="mr-2 text-current" size={20} />
    <span className="text-current">
      {dateFilter ? formatLocalDate(dateFilter) : "Select date"}
    </span>
  </div>
  {dateFilter && (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        setDateFilter("");
      }}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-400 z-20"
      aria-label="Clear date"
    >
      ×
    </button>
  )}
</div>

      </div>

      {/* Map & Sidebar */}
      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-370px)]">
        {/* Map */}
        <div className="w-full md:w-2/3 h-full rounded-lg overflow-hidden shadow-md">
          {mounted && !rsvpsLoading ? (
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
              {toggleLabel}
            </button>
          </div>

          {!rsvpsLoading ? (
            sidebarList.length === 0 ? (
              <p className="text-gray-500">
                {viewSelected ? 'You haven’t selected any events yet. Click on a marker or click "add" to select an event.' : "No nearby events"}
              </p>
            ) : (
              sidebarList.map((evt) => {
                const isSel = selectedEvents.some((e) => e.id === evt.id);
                const badgeMap: Record<string,string> = {
                  Social:   "bg-purple-100 text-purple-800",
                  Academic: "bg-green-100 text-green-800",
                  Sports:   "bg-red-100 text-red-700",
                  Arts:     "bg-pink-100 text-pink-800",
                };
                const badgeCls = badgeMap[evt.category] ?? "bg-gray-100 text-gray-800";

                return (
                  <div
                    key={evt.id}
                    onClick={() => handleCardClick(evt)}
                    className="relative p-4 mb-4 border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 cursor-pointer"
                  >
                    {!viewSelected ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(evt);
                        }}
                        className={`absolute top-2 right-2 text-white text-xs font-semibold px-2 py-1 rounded ${
                          isSel ? "bg-red-500 hover:bg-red-600" : "university-button"
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
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded"
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
                        className="absolute bottom-2 right-2 university-button text-white text-xs font-semibold px-2 py-1 rounded"
                      >
                        View
                      </button>
                    )}

                    <span className={`${badgeCls} inline-block text-sm font-semibold px-3 py-1 rounded-full`}>
                      {evt.category}
                    </span>
                    <h3 className="text-xl font-semibold text-zinc-800 mt-2 mb-1">
                      {evt.title}
                    </h3>
                    <p className="text-sm text-zinc-500 mb-1 flex items-center">
                      <CalIcon className="inline w-4 h-4 mr-1 university-primary-text" /> {evt.date} at {evt.time}
                    </p>
                    <p className="text-sm text-zinc-500 flex items-center">
                      <MapPin className="inline w-4 h-4 mr-1 university-primary-text" /> {evt.location}
                    </p>
                    <p className="text-sm text-zinc-500 mt-1">
                      Attendees: {(attendeeCounts[evt.id] || 0)}/{evt.max_attendees}
                    </p>
                  </div>
                );
              })
            )
          ) : (
            <p className="text-center py-4">Loading events…</p>
          )}

          {viewSelected && selectedEvents.length > 0 && (
            <button
              onClick={() => setSelectedEvents([])}
              className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-md"
            >
              Clear All
            </button>
          )}
        </aside>
      </div>

      {/* Detail Modal */}
      {viewEventDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setViewEventDetail(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <XIcon size={20} />
            </button>
            <h2 className="text-2xl font-bold mb-2">{viewEventDetail.title}</h2>
            <p className="mb-1">
              <span className="font-semibold">Category:</span> {viewEventDetail.category}
            </p>
            <p className="mb-2 text-sm text-gray-600">{viewEventDetail.description}</p>
            <p className="mb-1 flex items-center">
              <CalIcon className="inline w-4 h-4 mr-1 university-primary-text" /> {viewEventDetail.date} at {viewEventDetail.time}
            </p>
            <p className="mb-1 flex items-center">
              <MapPin className="inline w-4 h-4 mr-1 university-primary-text" /> {viewEventDetail.location}
            </p>
            <p className="mb-1">
              <span className="font-semibold">Hosted by:</span> {viewEventDetail.creator_name}
            </p>
            <p className="mb-1">
              <span className="font-semibold">Attendees:</span> {(attendeeCounts[viewEventDetail.id] || 0)}/{viewEventDetail.max_attendees}
            </p>
            <button
              onClick={() => handleRSVP(viewEventDetail)}
              disabled={
                rsvpLoading ||
                (attendeeCounts[viewEventDetail.id] || 0) >= viewEventDetail.max_attendees ||
                hasRSVPd
              }
              className="mt-4 float-right university-button text-white px-4 py-2 rounded-md font-semibold disabled:opacity-50"
            >
              {rsvpLoading
                ? "RSVP…"
                : (attendeeCounts[viewEventDetail.id] || 0) >= viewEventDetail.max_attendees
                ? "Full"
                : hasRSVPd
                ? "Already RSVP’d"
                : "RSVP Now"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
