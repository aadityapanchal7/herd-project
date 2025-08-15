"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/types";
import { AvatarThumb } from "@/components/avatar-thumb";
import { VENUE_COORDS } from "@/lib/school-cords";
import { to12h } from '@/lib/to12hrs'

// simple local date formatter for "YYYY-MM-DD"
const formatLocalDate = (ds: string) => {
  const [y, m, d] = String(ds).split("-").map(Number);
  if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return ds; // fallback
};


type EventCardProps = {
  event: Event;
  // NOTE: keep these props for backward-compat, but we ignore them now
  linkLocation?: boolean;
};

type Attendee = {
  attendee_first: string;
  attendee_last: string;
  attendee_avatar_url: string | null;
};

export function EventCard({
  event,
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
    time_zone
  } = event;

  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const isOwner = !!user && created_by === user.id;

  const [attendeeCount, setAttendeeCount] = useState<number>(0);
  const [hasRSVPd, setHasRSVPd] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const school = useMemo(() => {
    const uni = (user?.university || "").toLowerCase();
    if (uni.includes("texas") && uni.includes("austin")) return "ut_austin";
    return "";
  }, [user?.university]);

  const coordsFromEvent =
    typeof latitude === "number" && typeof longitude === "number"
      ? { latitude, longitude }
      : null;

  const coordsFromVenue =
    school && location ? VENUE_COORDS[school]?.[location] ?? null : null;

  const chosen = coordsFromEvent || coordsFromVenue || null;

  const googleMapsLink = chosen
    ? `https://www.google.com/maps?q=${chosen.latitude},${chosen.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      location || ""
    )}`;

  const categoryTone =
    {
      Social: "bg-purple-100 text-purple-700",
      Academic: "bg-emerald-100 text-emerald-700",
      Sports: "bg-orange-100 text-orange-700",
      Arts: "bg-pink-100 text-pink-700",
    }[category] || "bg-slate-100 text-slate-700";

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
  }, [id]);

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

  const isFull =
    !!allow_rsvp &&
    !!rsvp_limited &&
    attendeeCount >= (max_attendees ?? Number.MAX_SAFE_INTEGER);

  // whole card navigates to details page
  const goToDetails = () => router.push(`/events/${id}`);

  return (
    <article
      onClick={goToDetails}
      className="group/card relative cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition-transform duration-200 hover:scale-[1.01] hover:shadow-md"
      role="link"
      aria-label={title}
    >
      {/* Cover image */}
      <div className="relative h-40 w-full md:h-44 lg:h-48">
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-black/0 to-black/10" />
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

        {/* Category & verified */}
        <div className="absolute left-3 top-3 z-[2] flex items-center gap-2">
          <Badge variant="secondary" className={`backdrop-blur ${categoryTone}`}>
            {category}
          </Badge>
          {verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-sky-700">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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
        <h3 className="mb-1 text-xl font-bold leading-tight">{title}</h3>
        {creator_name && (
          <p className="mb-3 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Created by:</span>{" "}
            {creator_name}
          </p>
        )}
        {description && <p className="mb-4 text-slate-600">{description}</p>}

        {/* Meta */}
        <ul className="space-y-2 text-slate-600">
          <li className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
            <span className="text-[15px]">
              {formatLocalDate(date)} • {to12h(time)}
              {time_zone ? ` ${time_zone}` : ""}
            </span>
          </li>


          <li className="flex items-center">
            {linkLocation && googleMapsLink ? (
              <>
                <MapPin className="mr-2 h-4 w-4 text-primary" />
                <span className="text-[15px]">{location}</span>
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4 text-primary" />
                <span className="text-[15px]">{location}</span>
              </>
            )}
          </li>

          {/* Attendees label */}
          <li className="flex items-center">
            <Users className="mr-2 h-4 w-4 text-primary" />
            <span className="text-[15px]">
              {!allow_rsvp
                ? "No RSVP needed"
                : rsvp_limited
                  ? `${attendeeCount} / ${max_attendees ?? 0} attendees`
                  : `${attendeeCount} attendees`}
            </span>
          </li>
        </ul>

        {/* Status chip (no action buttons in card) */}
        <div className="mt-5 flex items-center justify-between">
          {isOwner ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Your event
            </span>
          ) : hasRSVPd ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              RSVP’d
            </span>
          ) : isFull ? (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
              Event full
            </span>
          ) : (
            <span />
          )}
        </div>
      </div>
    </article>
  );
}
