"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { getUniversityByName } from "@/lib/universities"
import { supabase } from "@/lib/supabase"
import { hexToHsl, getLightnessFromHex } from "@/lib/color"

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

        // Update CSS variables (set both hex tokens used by components and HSL tokens used by Tailwind config)
        const primaryHex = university.primary_color
        const secondaryHex = university.secondary_color
        const textHex = university.text_color

        document.documentElement.style.setProperty("--primary-color", primaryHex)
        document.documentElement.style.setProperty("--secondary-color", secondaryHex)
        document.documentElement.style.setProperty("--text-color", textHex)

        // compute HSL tokens so Tailwind config that uses --primary (H S% L%) picks up the value
        const primaryHsl = hexToHsl(primaryHex)
        document.documentElement.style.setProperty("--primary", primaryHsl)

        // choose a readable foreground for primary based on lightness
        const primaryL = getLightnessFromHex(primaryHex)
        const primaryForeground = primaryL < 50 ? '0 0% 98%' : '222.2 84% 4.9%'
        document.documentElement.style.setProperty("--primary-foreground", primaryForeground)

        // persist primary color to a cookie so we can hydrate on first paint (SSR-safe quick paint)
        try {
          document.cookie = `uni_color=${encodeURIComponent(primaryHex)};path=/;max-age=${60 * 60 * 24 * 365}`
        } catch (e) {
          // ignore
        }

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
    // Also set Tailwind HSL token and cookie
    const hexToHsl = (hex: string) => {
      const h = hex.replace('#','')
      const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16)
      const r = (bigint >> 16) & 255
      const g = (bigint >> 8) & 255
      const b = bigint & 255
      const rNorm = r / 255
      const gNorm = g / 255
      const bNorm = b / 255
      const max = Math.max(rNorm, gNorm, bNorm)
      const min = Math.min(rNorm, gNorm, bNorm)
      let hDeg = 0
      let s = 0
      const l = (max + min) / 2
      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
          case rNorm:
            hDeg = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)
            break
          case gNorm:
            hDeg = (bNorm - rNorm) / d + 2
            break
          case bNorm:
            hDeg = (rNorm - gNorm) / d + 4
            break
        }
        hDeg = Math.round(hDeg * 60)
      }
      const hOut = Math.round(hDeg || 0)
      const sOut = Math.round(s * 100)
      const lOut = Math.round(l * 100)
      return `${hOut} ${sOut}% ${lOut}%`
    }
    document.documentElement.style.setProperty("--primary", hexToHsl(defaultColors.primary))
    try { document.cookie = `uni_color=${encodeURIComponent(defaultColors.primary)};path=/;max-age=${60 * 60 * 24 * 365}` } catch(e){}
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
