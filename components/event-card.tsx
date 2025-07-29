"use client"

import { useState, useEffect } from "react";
import { CalendarIcon, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import type { Event } from "@/lib/types";

interface EventCardProps {
  event: Event;
  allowRemoveRSVP?: boolean;
  onRemoveRSVP?: () => void;
}

interface Attendee {
  attendee_first: string;
  attendee_last: string;
  attendee_avatar_url: string | null;
}

export function EventCard({ event, allowRemoveRSVP, onRemoveRSVP }: EventCardProps) {
  const {
    title,
    category,
    description,
    date,
    time,
    location,
    max_attendees,
    id,
    creator_name,
    verified,
  } = event;

  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [isRsvping, setIsRsvping] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState<number>(0);
  const [hasRSVPd, setHasRSVPd] = useState(false);
  const [showAttendeeList, setShowAttendeeList] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const filteredAttendees = attendees.filter(
    a =>
      (a.attendee_first + " " + a.attendee_last)
        .toLowerCase()
        .includes(attendeeSearch.toLowerCase())
  );

  function getCategoryColor(c: string) {
    return (
      {
        Social: "bg-purple-100 text-purple-800",
        Academic: "bg-green-100 text-green-800",
        Sports: "bg-red-100 text-red-800",
        Arts: "bg-pink-100 text-pink-800",
      }[c] || "bg-gray-100 text-gray-800"
    );
  }

  useEffect(() => {
    setLoadingAttendees(true);
    supabase
      .from("event_rsvps")
      .select("attendee_first, attendee_last, attendee_avatar_url", { count: "exact", head: false })
      .eq("event_id", id)
      .then(({ data, count }) => {
        setAttendees(data || []);
        setAttendeeCount(count || (data ? data.length : 0));
        setLoadingAttendees(false);
      });
  }, [id, isRsvping]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setHasRSVPd(false);
      return;
    }
    supabase
      .from("event_rsvps")
      .select("*")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setHasRSVPd(!!data));
  }, [isAuthenticated, user, id, isRsvping]);

  const handleRSVP = async () => {
    if (!isAuthenticated || !user) {
      toast({ title: "Login Required", description: "Please login to RSVP", variant: "destructive" });
      return;
    }
    if (hasRSVPd) {
      toast({ title: "Already RSVP'd" });
      return;
    }
    if (attendeeCount >= max_attendees) {
      toast({ title: "Event Full", description: "No spots left!", variant: "destructive" });
      return;
    }
    setIsRsvping(true);
    try {
      const { data: exists } = await supabase
        .from("event_rsvps")
        .select("*")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .single();
      if (exists) {
        toast({ title: "Already RSVP'd" });
        setHasRSVPd(true);
        return;
      }
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
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
          event_id: id,
          user_id: user.id,
          attendee_first: prof.first_name,
          attendee_last: prof.last_name,
          attendee_avatar_url: prof.avatar_url,
        });
      if (insErr) throw insErr;

      toast({ title: "RSVP Successful" });
      setHasRSVPd(true);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "RSVP Failed",
        description: err.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsRsvping(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6 transition-shadow hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <Badge variant="outline" className={getCategoryColor(category)}>
          {category}
        </Badge>
        {verified && (
          <div className="flex items-center text-blue-600 text-sm">
            <svg
              className="w-4 h-4 mr-1 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Verified Host
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold mb-2">{title}</h3>
      {creator_name && (
        <p className="text-sm text-gray-500 mb-2">
          <strong>Hosted by:</strong> {creator_name}
        </p>
      )}
      <p className="text-gray-600 mb-4">{description}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-gray-500">
          <CalendarIcon className="w-4 h-4 mr-2 university-primary-text" />
          <span>{date} • {time}</span>
        </div>
        <div className="flex items-center text-gray-500">
          <MapPin className="w-4 h-4 mr-2 university-primary-text" />
          <span>{location}</span>
        </div>
        <div className="flex items-center text-gray-500">
          <Users className="w-4 h-4 mr-2 text-orange-700" />
          <span className="text-base">{attendeeCount} / {max_attendees} attendees</span>
          <button
  type="button"
  className="ml-2 px-3 py-1 rounded-md border font-bold bg-white text-base transition focus:outline-none
    text-[var(--primary-color)] border-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white"
  onClick={() => setShowAttendeeList(true)}
  title="View attendees"
>
  View
</button>

        </div>
      </div>

      <div className="flex justify-end">
        {/* Only on manage page, upcoming tab, show remove button */}
        {allowRemoveRSVP && onRemoveRSVP ? (
          <Button
            variant="outline"
            className="border-orange-700 text-orange-700 font-semibold mt-4"
            onClick={onRemoveRSVP}
          >
            Remove RSVP
          </Button>
        ) : (
          // Only show Already RSVP'd on dashboard or any page that doesn't allow remove
          hasRSVPd && (
            <span className="bg-green-100 text-green-800 rounded-lg px-4 py-2 font-semibold mt-4 block">
              Already RSVP'd
            </span>
          )
        )}
      </div>

      {/* --- Modal for RSVP List --- */}
      {showAttendeeList && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
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
  );
}
