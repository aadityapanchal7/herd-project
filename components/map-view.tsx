'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Search as SearchIcon,
  Filter as FilterIcon,
  Calendar as CalIcon,
  MapPin,
  X as XIcon,
} from 'lucide-react';
import { useEvents } from '@/context/events-context';
import { VENUE_COORDS } from '@/lib/venue-coordinates';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/use-toast';
import type { Event } from '@/lib/types';
const LeafletMap = dynamic(() => import('@/components/leaflet-map'), {
  ssr: false,
});
type EventWithCoords = Event & {
  latitude: number;
  longitude: number;
  creator_name?: string;
  max_attendees: number;
  current_attendees: number;
};
export default function MapView() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { events } = useEvents();
  const eventsWithCoordinates = useMemo(
    () =>
      events
        .map((evt) => {
          const c = VENUE_COORDS[evt.location];
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
    [events]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const dateInputRef = useRef<HTMLInputElement & { showPicker?: () => void }>(
    null
  );
  const categories = ['Social', 'Academic', 'Sports', 'Arts'];
  const filteredEvents = useMemo(
    () =>
      eventsWithCoordinates.filter((evt) => {
        if (
          searchTerm &&
          !evt.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
          return false;
        if (categoryFilter !== 'All' && evt.category !== categoryFilter)
          return false;
        if (dateFilter) {
          const iso = new Date(evt.date).toISOString().split('T')[0];
          if (iso !== dateFilter) return false;
        }
        return true;
      }),
    [eventsWithCoordinates, searchTerm, categoryFilter, dateFilter]
  );
  const [selectedEvents, setSelectedEvents] = useState<EventWithCoords[]>([]);
  const [panToEvent, setPanToEvent] = useState<EventWithCoords | null>(null);
  const [viewEventDetail, setViewEventDetail] = useState<
    EventWithCoords | null
  >(null);
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
  const sidebarList = viewSelected ? selectedEvents : filteredEvents;
  const sidebarTitle = viewSelected ? 'Selected Events' : 'Nearby Events';
  const toggleLabel = viewSelected
    ? 'Back to Nearby Events'
    : 'Show Selected Events';
  const [mounted, setMounted] = useState(false);
  useEffect(() => void setMounted(true), []);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [hasRSVPd, setHasRSVPd] = useState(false); // New state to track RSVP status
  const handleRSVP = async (evt: EventWithCoords) => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Login Required",
        description: "Please login to RSVP for events",
        variant: "destructive",
      });
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
        toast({
          title: "Already RSVP'd",
          description: "You've already RSVP'd to this event",
        });
        setRsvpLoading(false);
        return;
      }
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("current_attendees, max_attendees")
        .eq("id", evt.id)
        .single();
      if (eventError || !eventData) {
        toast({
          title: "Error",
          description: "Event not found",
          variant: "destructive",
        });
        setRsvpLoading(false);
        return;
      }
      if (eventData.current_attendees >= eventData.max_attendees) {
        toast({
          title: "Event Full",
          description: "This event has reached its maximum capacity",
          variant: "destructive",
        });
        setRsvpLoading(false);
        return;
      }
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("first_name,last_name")
        .eq("id", user.id)
        .single();
      if (profErr || !profile) {
        toast({
          title: "Error",
          description: "Could not fetch your profile info.",
          variant: "destructive",
        });
        setRsvpLoading(false);
        return;
      }
      const { error: rsvpError } = await supabase
        .from("event_rsvps")
        .insert({
          event_id: evt.id,
          user_id: user.id,
          attendee_first: profile.first_name,
          attendee_last: profile.last_name,
        });
      if (rsvpError) {
        toast({
          title: "Error",
          description: rsvpError.message,
          variant: "destructive",
        });
        setRsvpLoading(false);
        return;
      }
      const newAttendeeCount = eventData.current_attendees + 1;
      await supabase
        .from("events")
        .update({ current_attendees: newAttendeeCount })
        .eq("id", evt.id);
      toast({
        title: "RSVP Successful",
        description: "You have successfully RSVP'd to this event",
      });
      setViewEventDetail((detail) =>
        detail && detail.id === evt.id
          ? { ...detail, current_attendees: newAttendeeCount }
          : detail
      );
      setHasRSVPd(true);
    } catch (error) {
      toast({
        title: "RSVP Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setRsvpLoading(false);
    }
  };
  useEffect(() => {
    if (viewEventDetail && isAuthenticated && user) {
      const checkRSVPStatus = async () => {
        const { data: exists } = await supabase
          .from("event_rsvps")
          .select("*")
          .eq("event_id", viewEventDetail.id)
          .eq("user_id", user.id)
          .single();
        setHasRSVPd(!!exists);
      };
      checkRSVPStatus();
    } else {
      setHasRSVPd(false);
    }
  }, [viewEventDetail, isAuthenticated, user]);
  const center: [number, number] = [-97.7364, 30.2862];
  const zoom = 14;
  return (
    <>
      <div className="p-6 space-y-4">
        {/* ut info bar */}
        <div className="bg-white shadow-md rounded-lg p-4">
          <h1 className="text-xl font-bold" style={{ color: '#BF5700' }}>
            University of Texas at Austin Campus Map
          </h1>
          <p className="text-gray-700">
            Explore events happening around University of Texas at Austin. Click on a marker or select "add event" to select an event.
          </p>
        </div>
        {/* filter bar */}
        <div className="bg-[#BF5700] rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1">
            <SearchIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white"
              size={20}
            />
            <input
              type="text"
              placeholder="Search for events…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white rounded-lg text-[#BF5700] placeholder:text-[#BF5700] focus:ring-2 focus:ring-white"
            />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 bg-white rounded-lg text-[#BF5700] focus:ring-2 focus:ring-white"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <FilterIcon
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none"
              size={20}
            />
          </div>
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
            />
            <div className="flex items-center pl-4 pr-10 py-2 bg-white rounded-lg text-[#BF5700]">
              <CalIcon className="mr-2 pointer-events-none" size={20} />
              <span>
                {dateFilter
  ? (() => {
      const [yyyy, mm, dd] = dateFilter.split('-')
      return `${new Date(+yyyy, +mm - 1, +dd).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
      })}`
    })()
  : 'Select date'}
              </span>
            </div>
          </div>
        </div>
        {/* map and sidebar */}
        <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-370px)]">
          <div className="w-full md:w-2/3 h-full rounded-lg overflow-hidden shadow-md">
            {mounted && (
              <LeafletMap
                center={center}
                zoom={zoom}
                events={filteredEvents}
                selectedEvents={selectedEvents}
                selectedEvent={panToEvent ?? undefined}
                onEventSelect={handleMarkerClick}
              />
            )}
          </div>
          <aside className="w-full md:w-1/3 overflow-y-auto bg-white border border-zinc-200 p-4 shadow-md rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-zinc-800">
                {sidebarTitle}
              </h2>
              <button
                onClick={() => setViewSelected((v) => !v)}
                className="bg-[#BF5700] hover:bg-[#a14e00] text-white font-semibold px-4 py-2 rounded-md"
              >
                {toggleLabel}
              </button>
            </div>
            {sidebarList.length === 0 ? (
              viewSelected ? (
                <p className="text-gray-500">
                  You haven’t selected any events yet. Click on a marker or click “add event” to select an event.
                </p>
              ) : (
                <p className="text-gray-500">No nearby events</p>
              )
            ) : (
              <>
                {sidebarList.map((evt) => {
                  const isSelected = selectedEvents.some((e) => e.id === evt.id);
                  return (
                    <div
                      key={evt.id}
                      onClick={() => handleCardClick(evt)}
                      className="relative p-4 mb-4 border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 cursor-pointer"
                    >
                      {/* add/remove button */}
                      {!viewSelected ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(evt);
                          }}
                          className={`absolute top-2 right-2 text-white text-xs font-semibold px-2 py-1 rounded ${
                            isSelected
                              ? 'bg-red-500 hover:bg-red-600'
                              : 'bg-[#BF5700] hover:bg-[#a14e00]'
                          }`}
                        >
                          {isSelected ? 'Remove Event' : 'Add Event'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(evt);
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded"
                        >
                          Remove Event
                        </button>
                      )}
                      {/* view event button */}
                      {viewSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewEventDetail(evt);
                          }}
                          className="absolute bottom-2 right-2 bg-[#BF5700] hover:bg-[#a14e00] text-white text-xs font-semibold px-2 py-1 rounded"
                        >
                          View Event
                        </button>
                      )}
                      {/* event info */}
                      <span className="inline-block bg-red-100 text-red-700 text-sm font-semibold px-3 py-1 rounded-full">
                        {evt.category}
                      </span>
                      <h3 className="text-xl font-semibold text-zinc-800 mt-2 mb-1">
                        {evt.title}
                      </h3>
                      <p className="text-sm text-zinc-500 mb-1 flex items-center">
                        <CalIcon
                          className="inline w-4 h-4 mr-1 text-[#BF5700]"
                        />
                        {evt.date} at {evt.time}
                      </p>
                      <p className="text-sm text-zinc-500 flex items-center">
                        <MapPin
                          className="inline w-4 h-4 mr-1 text-[#BF5700]"
                        />
                        {evt.location}
                      </p>
                      <p className="text-sm text-zinc-500 mt-1">
                        Attendees: {evt.current_attendees}/{evt.max_attendees}
                      </p>
                    </div>
                  );
                })}
                {/* clear events */}
                {viewSelected && selectedEvents.length > 0 && (
                  <button
                    onClick={() => setSelectedEvents([])}
                    className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-md"
                  >
                    Clear All Events
                  </button>
                )}
              </>
            )}
          </aside>
        </div>
      </div>
      {/* view details card */}
      {viewEventDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setViewEventDetail(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <XIcon size={20} />
            </button>
            <h2 className="text-2xl font-bold mb-2">
              {viewEventDetail.title}
            </h2>
            <p className="mb-1">
              <span className="font-semibold">Category:</span>{' '}
              {viewEventDetail.category}
            </p>
            <p className="mb-2 text-sm text-gray-600">
              {viewEventDetail.description}
            </p>
            <p className="mb-1 flex items-center">
              <CalIcon
                className="inline w-4 h-4 mr-1 text-[#BF5700]"
              />
              {viewEventDetail.date} at {viewEventDetail.time}
            </p>
            <p className="mb-1 flex items-center">
              <MapPin
                className="inline w-4 h-4 mr-1 text-[#BF5700]"
              />
              {viewEventDetail.location}
            </p>
            <p className="mb-1">
              <span className="font-semibold">Hosted by:</span>{' '}
              {viewEventDetail.creator_name}
            </p>
            <p className="mb-1">
              <span className="font-semibold">Attendees:</span>{' '}
              {viewEventDetail.current_attendees}/{viewEventDetail.max_attendees}
            </p>
            <button
              onClick={() => handleRSVP(viewEventDetail)}
              disabled={
                rsvpLoading ||
                viewEventDetail.current_attendees >= viewEventDetail.max_attendees ||
                hasRSVPd
              }
              className="mt-4 float-right bg-[#BF5700] hover:bg-[#a14e00] text-white px-4 py-2 rounded-md font-semibold disabled:opacity-50"
            >
              {rsvpLoading
                ? 'RSVP…'
                : viewEventDetail.current_attendees >= viewEventDetail.max_attendees
                ? 'Full'
                : hasRSVPd
                ? 'Already RSVP’d'
                : 'RSVP Now'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}