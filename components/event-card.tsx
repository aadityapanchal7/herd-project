// components/event-card.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import type { Event } from "@/lib/types";
import { AvatarThumb } from "@/components/avatar-thumb";
import { VENUE_COORDS } from "@/lib/school-cords";

type EventCardProps = {
  event: Event;
  allowRemoveRSVP?: boolean;
  onRemoveRSVP?: () => void;
  linkLocation?: boolean;
};

type Attendee = {
  attendee_first: string;
  attendee_last: string;
  attendee_avatar_url: string | null;
};

export function EventCard({
  event,
  allowRemoveRSVP = false,
  onRemoveRSVP,
  linkLocation = false,
}: EventCardProps) {
  const {
    id,
    title,
    category,
    description,
    date,
    time,
    location,
    max_attendees,
    creator_name,
    verified,
    created_by,
    latitude,
    longitude,
    image_url,
    allow_rsvp,
    rsvp_limited,
  } = event;

  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const isOwner = !!user && created_by === user.id;

  const [isRsvping, setIsRsvping] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState<number>(0);
  const [hasRSVPd, setHasRSVPd] = useState(false);
  const [showAttendeeList, setShowAttendeeList] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  // ----- School key (for coords fallback)
  const school = useMemo(() => {
    const uni = (user?.university || "").toLowerCase();
    if (uni.includes("texas") && uni.includes("austin")) return "ut_austin";
    return "";
  }, [user?.university]);

  // Build Google Maps link
  const coordsFromEvent =
    typeof latitude === "number" && typeof longitude === "number"
      ? { latitude, longitude }
      : null;

  const coordsFromVenue =
    school && location ? VENUE_COORDS[school]?.[location] ?? null : null;

  const chosen = coordsFromEvent || coordsFromVenue || null;

  const googleMapsLink = chosen
    ? `https://www.google.com/maps?q=${chosen.latitude},${chosen.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location || "")}`;

  // ----- Category pill colors
  const categoryTone =
    {
      Social: "bg-purple-100 text-purple-700",
      Academic: "bg-emerald-100 text-emerald-700",
      Sports: "bg-orange-100 text-orange-700",
      Arts: "bg-pink-100 text-pink-700",
    }[category] || "bg-slate-100 text-slate-700";

  // ----- Load attendees (count + list)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAttendees(true);
      const { data, count } = await supabase
        .from("event_rsvps")
        .select("attendee_first, attendee_last, attendee_avatar_url", {
          count: "exact",
          head: false,
        })
        .eq("event_id", id);

      if (!cancelled) {
        setAttendees(data || []);
        setAttendeeCount(count ?? data?.length ?? 0);
        setLoadingAttendees(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isRsvping]);

  // ----- Check if the current user RSVP'd
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setHasRSVPd(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("event_rsvps")
        .select("*")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .single();
      if (!cancelled) setHasRSVPd(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, id]);

  // ----- Full/disabled logic
  const isFull =
    !!allow_rsvp &&
    !!rsvp_limited &&
    attendeeCount >= (max_attendees ?? Number.MAX_SAFE_INTEGER);

  const disabled = !allow_rsvp ? true : isOwner || hasRSVPd || isFull;

  // ----- RSVP handler
  const handleRSVP = async () => {
    if (!allow_rsvp) return;
    if (isOwner || !isAuthenticated || !user?.id || hasRSVPd || isFull) return;

    setIsRsvping(true);
    try {
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (profErr || !prof) throw new Error("Could not load your profile.");

      const { error: insErr } = await supabase.from("event_rsvps").insert({
        event_id: id,
        user_id: user.id,
        attendee_first: prof.first_name,
        attendee_last: prof.last_name,
        attendee_avatar_url: prof.avatar_url,
      });
      if (insErr) throw insErr;

      setHasRSVPd(true);
      setAttendeeCount((c) => c + 1);
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

  // ----- Filtered attendees for the modal
  const filteredAttendees = useMemo(() => {
    const q = attendeeSearch.toLowerCase();
    return attendees.filter((a) =>
      `${a.attendee_first} ${a.attendee_last}`.toLowerCase().includes(q)
    );
  }, [attendees, attendeeSearch]);

  return (
    <article
      className="group/card relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md"
      role="region"
      aria-label={title}
    >
      {/* Cover image (banner) */}
      <div className="relative h-40 w-full md:h-44 lg:h-48">
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/10 z-[1]" />
        {image_url ? (
          <img
            src={image_url}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200" />
        )}

        {/* Category & verified chips */}
        <div className="absolute top-3 left-3 z-[2] flex items-center gap-2">
          <Badge variant="secondary" className={`backdrop-blur ${categoryTone}`}>
            {category}
          </Badge>
          {verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-sky-700">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.435a1 1 0 111.414-1.414l3.222 3.222 6.657-6.657a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 md:p-6">
        <h3 className="text-xl font-bold leading-tight mb-1">{title}</h3>
        {creator_name && (
          <p className="mb-3 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Created by:</span>{" "}
            {creator_name}
          </p>
        )}
        {description && <p className="text-slate-600 mb-4">{description}</p>}

        {/* Meta */}
        <ul className="space-y-2 text-slate-600">
          {/* Date */}
          <li className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4 text-[var(--primary-color)]" />
            <span className="text-[15px]">
              {date} • {time}
            </span>
          </li>

          {/* Location */}
          <li className="flex items-center">
            {linkLocation && googleMapsLink ? (
              <>
                <a
                  href={googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in Google Maps"
                  className="group/map mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--primary-color)] bg-white text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white transition-colors"
                >
                  <MapPin className="h-5 w-5 transition-colors group-hover/map:text-white" />
                </a>
                <span className="text-[15px]">{location}</span>
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4 text-[var(--primary-color)]" />
                <span className="text-[15px]">{location}</span>
              </>
            )}
          </li>

          {/* Attendees row */}
          {allow_rsvp ? (
            // RSVPs enabled → show button + counts
            <li className="flex items-center">
              <button
                type="button"
                className="group/att mr-2 flex h-9 w-9 items-center justify-center rounded-md border border-[var(--primary-color)] bg-white transition-colors hover:bg-[var(--primary-color)] focus:outline-none"
                onClick={() => setShowAttendeeList(true)}
                title="View attendees"
              >
                <Users className="h-5 w-5 text-[var(--primary-color)] transition-colors group-hover/att:text-white" />
              </button>
              <span className="text-[15px]">
                {rsvp_limited
                  ? `${attendeeCount} / ${max_attendees ?? 0} attendees`
                  : `${attendeeCount} attendees`}
              </span>
            </li>
          ) : (
            // RSVPs disabled → non-clickable Users icon + text
            <li className="flex items-center">
  <Users className="mr-2 h-4 w-4 text-[var(--primary-color)]" />
  <span className="text-[15px] text-slate-600">No RSVP needed</span>
</li>
          )}
        </ul>

        {/* Footer actions */}
        <div className="mt-5 flex items-center justify-between">
          {/* left status badge */}
          {isOwner ? (
            <span className="text-xs font-medium rounded-full bg-slate-100 text-slate-700 px-3 py-1">
              Your event
            </span>
          ) : hasRSVPd ? (
            <span className="text-xs font-medium rounded-full bg-green-100 text-green-700 px-3 py-1">
              Already RSVP’d
            </span>
          ) : isFull ? (
            <span className="text-xs font-medium rounded-full bg-rose-100 text-rose-700 px-3 py-1">
              Event full
            </span>
          ) : (
            <span />
          )}

          {/* right CTA */}
          {allowRemoveRSVP && onRemoveRSVP ? (
            <Button
              variant="outline"
              className="border-rose-700 text-rose-700 hover:bg-rose-600 hover:text-white font-semibold"
              onClick={onRemoveRSVP}
            >
              Remove RSVP
            </Button>
          ) : allow_rsvp ? (
            <Button
              className="university-button px-5 py-5"
              onClick={handleRSVP}
              disabled={disabled || isRsvping}
            >
              {isRsvping ? "Processing…" : "RSVP"}
            </Button>
          ) : (
            <span /> // RSVPs disabled → no CTA
          )}
        </div>
      </div>

      {/* Attendees modal (only when RSVPs enabled) */}
      {showAttendeeList && allow_rsvp && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
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
    </article>
  );
}
