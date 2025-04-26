import { NextResponse } from "next/server"
import { generateSampleEvents } from "@/scripts/generate-sample-events"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET() {
  try {
    // Check if this is a development environment
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "This endpoint is only available in development mode" }, { status: 403 })
    }

    // Create server-side Supabase client
    const supabase = createServerSupabaseClient()

    // Check if the user is authenticated and has admin privileges
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Generate sample events
    await generateSampleEvents()

    return NextResponse.json({ success: true, message: "Sample events generated successfully" })
  } catch (error) {
    console.error("Error generating sample events:", error)
    return NextResponse.json({ error: "Failed to generate sample events", details: String(error) }, { status: 500 })
  }
}
