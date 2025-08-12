"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, MapPin, Users, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/use-toast";
import type { Event } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AvatarThumb } from "@/components/avatar-thumb";

interface EventCardCreatorProps {
  event: Event;
  onEventDeleted?: (eventId: number) => void;
}

type Attendee = {
  attendee_first: string;
  attendee_last: string;
  attendee_avatar_url: string | null;
};

export function EventCardCreator({ event, onEventDeleted }: EventCardCreatorProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    id,
    title,
    category,
    description,
    date,
    time,
    location,
    creator_name,
    is_private,
    verified,
    max_attendees,
    // extended fields used for RSVP + hero image
    allow_rsvp,
    rsvp_limited,
    image_url,
  } = event as Event & {
    allow_rsvp?: boolean | null;
    rsvp_limited?: boolean | null;
    image_url?: string | null;
  };

  const [attendeeCount, setAttendeeCount] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // attendee modal state
  const [showAttendeeList, setShowAttendeeList] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState("");

  const filteredAttendees = attendees.filter((a) =>
    `${a.attendee_first} ${a.attendee_last}`.toLowerCase().includes(attendeeSearch.toLowerCase())
  );

  // Initial load + realtime count updates
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, count } = await supabase
        .from("event_rsvps")
        .select("attendee_first, attendee_last, attendee_avatar_url", { head: false, count: "exact" })
        .eq("event_id", id);

      if (!mounted) return;
      setAttendees(data || []);
      setAttendeeCount(count ?? data?.length ?? 0);
    })();

    const channel = supabase
      .channel(`creator-card-${id}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "event_rsvps", event: "INSERT", filter: `event_id=eq.${id}` },
        () => setAttendeeCount((c) => c + 1)
      )
      .on(
        "postgres_changes",
        { schema: "public", table: "event_rsvps", event: "DELETE", filter: `event_id=eq.${id}` },
        () => setAttendeeCount((c) => Math.max(0, c - 1))
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  const categoryClasses = useMemo(() => {
    switch (category) {
      case "Social":
        return "bg-purple-100 text-purple-800";
      case "Academic":
        return "bg-green-100 text-green-800";
      case "Sports":
        return "bg-red-100 text-red-800";
      case "Arts":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, [category]);

  // RSVP display logic (3 states)
  const rsvpEnabled = is_private ? true : allow_rsvp !== false; // default to enabled unless explicitly false
  const rsvpIsLimited = !!rsvp_limited;
  const canOpenAttendees = is_private || rsvpEnabled;

  const rsvpLabel = is_private
    ? `${attendeeCount} attendees`
    : !rsvpEnabled
    ? "RSVP disabled"
    : rsvpIsLimited
    ? `${attendeeCount} / ${max_attendees ?? 0} attendees`
    : `${attendeeCount} attendees`;

  const handleEdit = () => router.push(`/edit-event/${id}`);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("events").delete().eq("id", id).eq("created_by", user?.id || "");
      if (error) throw error;
      toast({ title: "Event Deleted", description: "Your event has been successfully deleted." });
      onEventDeleted?.(id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete event", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Hero image like normal event card */}
      <div className="relative aspect-[16/9] w-full bg-zinc-100">
        {image_url ? (
          <img src={image_url} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-100 to-zinc-200" />
        )}

{/* Chips row (category + visibility) */}
<div className="absolute left-3 top-3 flex items-center gap-2">
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${categoryClasses}`}>
    {category}
  </span>
  <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-gray-100 text-gray-700">
    {is_private ? "Private" : "Public"}
  </span>
</div>

      </div>

      {/* Body */}
      <div className="p-5 sm:p-6">
        <h3 className="mb-2 text-2xl font-bold">{title}</h3>

        {creator_name && (
          <p className="mb-2 text-sm text-gray-500">
            <span className="font-medium">Created by:</span> {creator_name}
            {verified && <span className="ml-2 text-blue-600">• Verified</span>}
          </p>
        )}

        {description && <p className="mb-4 line-clamp-3 text-gray-600">{description}</p>}

        {/* Meta rows */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center text-gray-500">
            <CalendarIcon className="mr-2 h-4 w-4" style={{ color: "var(--primary-color)" }} />
            <span>
              {date} • {time}
            </span>
          </div>

          <div className="flex items-center text-gray-500">
            <MapPin className="mr-2 h-4 w-4" style={{ color: "var(--primary-color)" }} />
            <span>{location}</span>
          </div>

          {/* Attendees row (button only if RSVPs enabled or private) */}
          <div className="flex items-center text-gray-500">
            {canOpenAttendees ? (
              <button
                type="button"
                className="group mr-2 flex h-8 w-8 items-center justify-center rounded-md border border-[var(--primary-color)] bg-white transition-colors hover:bg-[var(--primary-color)] focus:outline-none"
                onClick={async () => {
                  setShowAttendeeList(true);
                  setLoadingAttendees(true);
                  const { data } = await supabase
                    .from("event_rsvps")
                    .select("attendee_first, attendee_last, attendee_avatar_url")
                    .eq("event_id", id);
                  setAttendees(data || []);
                  setLoadingAttendees(false);
                }}
                title="View attendees"
              >
                <Users className="h-5 w-5 text-[var(--primary-color)] transition-colors group-hover:text-white" />
              </button>
            ) : (
              <Users className="mr-2 h-4 w-4 text-[var(--primary-color)]" />
            )}
            <span className="text-base">{rsvpLabel}</span>
          </div>
        </div>

        {/* Where RSVP CTA would be – use Edit/Delete */}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={handleEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete “{title}”? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Attendee Modal */}
      {showAttendeeList && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
          onClick={() => setShowAttendeeList(false)}
        >
          <div className="w-full max-w-xs rounded-lg bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold">Attendees</h4>
              <button
                className="text-2xl text-gray-400 hover:text-gray-700"
                onClick={() => setShowAttendeeList(false)}
                aria-label="Close attendees list"
              >
                &times;
              </button>
            </div>

            <input
              type="text"
              className="mb-3 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring"
              placeholder="Search by name…"
              value={attendeeSearch}
              onChange={(e) => setAttendeeSearch(e.target.value)}
            />

            {loadingAttendees ? (
              <div>Loading…</div>
            ) : filteredAttendees.length === 0 ? (
              <div className="text-sm text-gray-500">No one has RSVP’d yet.</div>
            ) : (
              <ul className="max-h-64 space-y-3 overflow-y-auto">
                {filteredAttendees.map((a, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <AvatarThumb url={a.attendee_avatar_url} first={a.attendee_first} last={a.attendee_last} size={32} />
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
