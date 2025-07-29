// components/AttendeeList.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Type for attendees
interface Attendee {
  attendee_first: string;
  attendee_last: string;
  attendee_avatar_url: string | null;
}

interface AttendeeListProps {
  eventId: number;
}

export const AttendeeList: React.FC<AttendeeListProps> = ({ eventId }) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchAttendees() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("event_rsvps")
          .select("attendee_first, attendee_last, attendee_avatar_url")
          .eq("event_id", eventId);

        if (!isMounted) return;

        if (error) {
          setAttendees([]);
        } else {
          setAttendees(data || []);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAttendees();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  const filtered = attendees.filter(a =>
    `${a.attendee_first} ${a.attendee_last}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        value={search}
        placeholder="Search attendee…"
        onChange={e => setSearch(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded border border-zinc-300 focus:outline-none focus:ring"
      />

      {loading ? (
        <div>Loading attendees…</div>
      ) : filtered.length === 0 ? (
        <div>No attendees found.</div>
      ) : (
        <ul className="space-y-3 max-h-64 overflow-y-auto">
          {filtered.map((a, idx) => (
            <li key={idx} className="flex items-center gap-3">
              <img
                src={a.attendee_avatar_url || "/default-avatar.png"}
                alt={`${a.attendee_first} ${a.attendee_last}`}
                className="w-10 h-10 rounded-full object-cover border"
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
  );
};
