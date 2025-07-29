"use client";

import { useState, useEffect } from "react"
import { CalendarIcon, MapPin, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import type { Event } from "@/lib/types"
import { supabase } from "@/lib/supabase"

interface EventCardProps {
  event: Event;
}

interface Attendee {
  attendee_first: string;
  attendee_last: string;
  attendee_avatar_url: string | null;
}

export function EventCard({ event }: EventCardProps) {
  const { title, category, description, date, time, location, max_attendees, id, creator_name, verified } = event
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()
  const [isRsvping, setIsRsvping] = useState(false)
  const [attendeeCount, setAttendeeCount] = useState<number>(0)
  const [hasRSVPd, setHasRSVPd] = useState(false)

  // Fetch RSVP count & RSVP status for this event
  useEffect(() => {
    setLoadingAttendees(true);
    supabase
      .from("event_rsvps")
      .select("attendee_first, attendee_last, attendee_avatar_url", { count: "exact", head: false })
      .eq("event_id", id)
      .then(({ data, count }) => {
        setAttendees(data || []);
        setCount(count || (data ? data.length : 0));
        setLoadingAttendees(false);
      });
  }, [id, isRsvping]);

  // 2) check if this user already RSVPd
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

  // 3) RSVP handler now pulls name + avatar
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
      // make sure they haven't already RSVPd
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

      // fetch their profile info (first, last, avatar)
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

      // insert RSVP with avatar
      const { error: insErr } = await supabase
        .from("event_rsvps")
        .insert({
          event_id:            id,
          user_id:             user.id,
          attendee_first:      prof.first_name,
          attendee_last:       prof.last_name,
          attendee_avatar_url: prof.avatar_url, // ← new column
        });

      if (insErr) throw insErr;

      toast({ title: "RSVP Successful" });
      // flip immediately so UI updates
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
  }

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
              xmlns="http://www.w3.org/2000/svg"
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
          <CalendarIcon className="w-4 h-4 mr-2" />
          <span>{date} • {time}</span>
        </div>
        <div className="flex items-center text-gray-500">
          <MapPin className="w-4 h-4 mr-2" />
          <span>{location}</span>
        </div>
        <div className="flex items-center text-gray-500">
          <Users className="w-4 h-4 mr-2 university-primary-text" />
          <span>{attendeeCount} / {max_attendees} attendees</span>
          <button
            type="button"
            className="ml-2 px-2 py-1 rounded-md border border-zinc-200 bg-white text-xs font-semibold transition hover:bg-zinc-50 focus:outline-none"
            style={{
              borderColor: "var(--primary-color)",
              color: "var(--primary-color)"
            }}
            onClick={() => setShowAttendeeList(true)}
            title="View attendees"
          >
            View
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          className={hasRSVPd ? "bg-green-600 hover:bg-green-700" : "university-button"}
          onClick={handleRSVP}
          disabled={hasRSVPd || attendeeCount >= max_attendees || isRsvping}
        >
          {isRsvping
            ? "Processing…"
            : hasRSVPd
            ? "Already RSVP'd"
            : attendeeCount >= max_attendees
            ? "Full"
            : "RSVP"}
        </Button>
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
            {loadingAttendees ? (
              <div>Loading…</div>
            ) : attendees.length === 0 ? (
              <div className="text-gray-500 text-sm">No one has RSVP'd yet.</div>
            ) : (
              <ul className="space-y-3 max-h-64 overflow-y-auto">
                {attendees.map((a, idx) => (
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
