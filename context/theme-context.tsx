"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { getUniversityByName } from "@/lib/universities"
import { supabase } from "@/lib/supabase"

interface ThemeColors {
  primary: string
  secondary: string
  text: string
}

interface MapStyle {
  url: string
  label: string
}

interface ThemeContextType {
  colors: ThemeColors
  mapStyle: MapStyle
  setUniversityColors: (universityName: string) => Promise<void>
  resetColors: () => void
}

const defaultColors: ThemeColors = {
  primary: "#800080",
  secondary: "#800080",
  text: "#FFFFFF",
}

const defaultMapStyle: MapStyle = {
  url: "mapbox://styles/mapbox/streets-v12",
  label: "Streets",
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(defaultColors)
  const [mapStyle, setMapStyle] = useState<MapStyle>(defaultMapStyle)
  const { user, isAuthenticated } = useAuth()

  // Load user's university colors when they log in
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserUniversityColors(user.university)
    } else {
      resetColors()
    }
  }, [isAuthenticated, user])

  // Set up real-time subscription for profile updates
  useEffect(() => {
    if (!isAuthenticated || !user) return

    const subscription = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && payload.new.university) {
            loadUserUniversityColors(payload.new.university)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [isAuthenticated, user])

  const loadUserUniversityColors = async (universityName: string) => {
    try {
      const university = await getUniversityByName(universityName)
      if (university) {
        setColors({
          primary: university.primary_color,
          secondary: university.secondary_color,
          text: university.text_color,
        })

        // Update CSS variables
        document.documentElement.style.setProperty("--primary-color", university.primary_color)
        document.documentElement.style.setProperty("--secondary-color", university.secondary_color)
        document.documentElement.style.setProperty("--text-color", university.text_color)

        // Set map style based on university colors
        // We're using the default style for now, but you could customize this
        // based on university preferences or create custom map styles
        setMapStyle(defaultMapStyle)
      }
    } catch (error) {
      console.error("Error loading university colors:", error)
    }
  }

  const setUniversityColors = async (universityName: string) => {
    await loadUserUniversityColors(universityName)
  }

  const resetColors = () => {
    setColors(defaultColors)
    document.documentElement.style.setProperty("--primary-color", defaultColors.primary)
    document.documentElement.style.setProperty("--secondary-color", defaultColors.secondary)
    document.documentElement.style.setProperty("--text-color", defaultColors.text)
    setMapStyle(defaultMapStyle)
  }

  return (
    <ThemeContext.Provider value={{ colors, mapStyle, setUniversityColors, resetColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
