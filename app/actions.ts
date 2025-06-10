"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// Helper to get server-side Supabase client
async function getSupabase() {
  return createServerSupabaseClient()
}

// Create a new event
export async function createEvent(formData: FormData) {
  const supabase = await getSupabase()

  // Get the current user with more robust error handling
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error("Auth error in createEvent:", authError)
    return { error: "Authentication error: " + authError.message }
  }

  if (!user) {
    console.error("No user found in createEvent")
    return { error: "You must be logged in to create an event. Please log in and try again." }
  }

  console.log("Creating event for user:", user.id)

  // Extract form data
  const title = formData.get("title") as string
  const category = formData.get("category") as string
  const description = formData.get("description") as string
  const date = formData.get("date") as string
  const time = formData.get("time") as string
  const location = formData.get("location") as string
  const maxAttendees = Number.parseInt(formData.get("maxAttendees") as string)

  // Validate form data
  if (!title || !category || !description || !date || !time || !location || !maxAttendees) {
    return { error: "All fields are required" }
  }

  try {
    // Insert into database
    const { data, error } = await supabase
      .from("events")
      .insert({
        title,
        category,
        description,
        date,
        time,
        location,
        max_attendees: maxAttendees,
        current_attendees: 0,
        verified: false,
        created_by: user.id,
      })
      .select()

    if (error) {
      console.error("Error creating event:", error)
      return { error: error.message }
    }

    console.log("Event created successfully:", data)

    // Revalidate the events page
    revalidatePath("/")

    return { success: true, data }
  } catch (error) {
    console.error("Unexpected error creating event:", error)
    return { error: "An unexpected error occurred while creating the event" }
  }
}

// RSVP to an event
export async function rsvpToEvent(eventId: number) {
  const supabase = await getSupabase()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be logged in to RSVP" }
  }

  // Check if already RSVP'd
  const { data: existingRsvp } = await supabase
    .from("event_rsvps")
    .select()
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single()

  if (existingRsvp) {
    return { error: "You have already RSVP'd to this event" }
  }

  // Start a transaction
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("current_attendees, max_attendees")
    .eq("id", eventId)
    .single()

  if (eventError) {
    return { error: "Event not found" }
  }

  if (event.current_attendees >= event.max_attendees) {
    return { error: "Event is full" }
  }

  // Insert RSVP
  const { error: rsvpError } = await supabase.from("event_rsvps").insert({
    event_id: eventId,
    user_id: user.id,
  })

  if (rsvpError) {
    return { error: rsvpError.message }
  }



  // Revalidate the events page
  revalidatePath("/")

  return { success: true }
}

// Get user RSVPs
export async function getUserRsvps() {
  const supabase = await getSupabase()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [] }
  }

  const { data, error } = await supabase.from("event_rsvps").select("event_id").eq("user_id", user.id)

  if (error) {
    console.error("Error fetching RSVPs:", error)
    return { data: [] }
  }

  return { data: data.map((rsvp) => rsvp.event_id) }
}

// Get all events
export async function getEvents() {
  const supabase = await getSupabase()

  const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true })

  if (error) {
    console.error("Error fetching events:", error)
    return { data: [] }
  }

  return { data }
}
