// AttendeeList.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Update this path if different
// import { useToast } from "@/components/ui/use-toast"; // Uncomment if using toasts

type Attendee = {
  attendee_first: string;
  attendee_last: string;
  attendee_avatar_url: string | null;
};

interface AttendeeListProps {
  eventId: number;
}

export function AttendeeList({ eventId }: AttendeeListProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  // const { toast } = useToast(); // Uncomment if using toasts

  useEffect(() => {
    setLoading(true);
    supabase
      .from("event_rsvps")
      .select("attendee_first, attendee_last, attendee_avatar_url")
      .eq("event_id", eventId)
      .then(({ data, error }) => {
        if (error) {
          // toast?.({ title: "Error", description: error.message, variant: "destructive" });
          setAttendees([]);
        } else {
          setAttendees(data || []);
        }
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return <div className="py-4 text-gray-500">Loading attendees…</div>;
  }

  if (!attendees.length) {
    return <div className="py-4 text-gray-500">No attendees yet.</div>;
  }

  return (
    <div className="py-4">
      <ul>
        {attendees.map((a, i) => (
          <li
            key={i}
            className="flex items-center gap-3 mb-2"
          >
            <img
              src={a.attendee_avatar_url || "/default-profile.png"}
              alt={`${a.attendee_first} ${a.attendee_last}'s profile picture`}
              className="w-8 h-8 rounded-full object-cover border"
            />
            <span className="font-medium">
              {a.attendee_first} {a.attendee_last}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AttendeeList;
