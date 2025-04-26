"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"

export function ConfigCheck() {
  const [missingConfig, setMissingConfig] = useState(false)

  useEffect(() => {
    // Check if Supabase environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMissingConfig(true)
    }
  }, [])

  if (!missingConfig) return null

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Configuration Error</AlertTitle>
      <AlertDescription>
        Supabase environment variables are missing. Please make sure NEXT_PUBLIC_SUPABASE_URL and
        NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment.
      </AlertDescription>
    </Alert>
  )
}
