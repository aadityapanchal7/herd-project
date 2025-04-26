import { createClient } from "@supabase/supabase-js"

// Check if environment variables are available
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error("Missing Supabase environment variables")
}

// Create Supabase client with fallback empty strings to prevent initialization errors
// The client will still not work correctly, but at least it won't throw during initialization
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
)
