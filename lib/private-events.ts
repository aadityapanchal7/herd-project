// lib/private-events.ts
"use client";

import { supabase } from "@/lib/supabase";

/**
 * Update private_events.invitee_user_ids and delete RSVPs for removed invitees.
 */
export async function saveInviteesAndPruneRsvps(
  eventId: number | string,
  nextInviteeIds: string[]
): Promise<{ removedIds: string[] }> {
  // 1) Read existing row (if any)
  const { data: existing, error: readErr } = await supabase
    .from("private_events")
    .select("invitee_user_ids")
    .eq("event_id", eventId)
    .maybeSingle();

  if (readErr) throw readErr;

  const currentIds = new Set<string>(existing?.invitee_user_ids ?? []);
  const nextIds = new Set<string>(nextInviteeIds);

  // removed = in current but not in next
  const removedIds = Array.from(currentIds).filter((id) => !nextIds.has(id));

  // 2) Update if exists, else insert
  if (existing) {
    const { error: updErr } = await supabase
      .from("private_events")
      .update({ invitee_user_ids: Array.from(nextIds) })
      .eq("event_id", eventId);
    if (updErr) throw updErr;
  } else {
    const { error: insErr } = await supabase
      .from("private_events")
      .insert({ event_id: eventId, invitee_user_ids: Array.from(nextIds) });
    if (insErr) throw insErr;
  }

  // 3) Delete RSVPs for removed users (no-op if none)
  if (removedIds.length > 0) {
    const { error: delErr } = await supabase
      .from("event_rsvps")
      .delete()
      .eq("event_id", eventId)
      .in("user_id", removedIds);
    if (delErr) throw delErr;
  }

  return { removedIds };
}
