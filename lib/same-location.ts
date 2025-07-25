// lib/with-same-location-events.ts
import type { Event } from "@/lib/types";

export function withSameLocationEvents(
  allEvents: Event[],
  selected: Event | null
): Event[] {
  if (!selected) return [];
  return allEvents.filter((evt) => evt.location === selected.location);
}
