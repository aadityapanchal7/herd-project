"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (userData: {
    firstName: string
    lastName: string
    email: string
    password: string
    university: string
  }) => Promise<boolean>
  logout: () => Promise<void>
  loading: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const [isSigningUp, setIsSigningUp] = useState(false)

  // Function to refresh the session
  const refreshSession = async () => {
    try {
      console.log("Refreshing session...")
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("Missing Supabase environment variables")
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        console.log("Session found during refresh:", session.user.id)
        const { data: userData, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

        if (error) {
          console.error("Error fetching user profile:", error)
          return
        }

        if (userData) {
          console.log("User profile found during refresh:", userData.id)
          setUser({
            id: userData.id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            university: userData.university,
            avatar_url: userData.avatar_url,
          })
          setIsAuthenticated(true)
        }
      } else {
        console.log("No session found during refresh")
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error("Error refreshing session:", error)
    }
  }

  // Check for session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Checking session on mount...")
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.error("Missing Supabase environment variables")
          setLoading(false)
          return
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          console.log("Session found on mount:", session.user.id)
          const { data: userData, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (error) {
            console.error("Error fetching user profile:", error)
            setLoading(false)
            return
          }

          if (userData) {
            console.log("User profile found on mount:", userData.id)
            setUser({
              id: userData.id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              email: userData.email,
              university: userData.university,
              avatar_url: userData.avatar_url,
            })
            setIsAuthenticated(true)
          }
        } else {
          console.log("No session found on mount")
        }
      } catch (error) {
        console.error("Error checking session:", error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id)

      if (event === "SIGNED_IN" && session && !isSigningUp) {
        try {
          const { data: userData, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (error) {
            console.error("Error fetching user profile after sign in:", error)
            return
          }

          if (userData) {
            console.log("User profile found after sign in:", userData.id)
            setUser({
              id: userData.id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              email: userData.email,
              university: userData.university,
              avatar_url: userData.avatar_url,
            })
            setIsAuthenticated(true)
          }
        } catch (error) {
          console.error("Error processing sign in:", error)
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setIsAuthenticated(false)
        console.log("User signed out")
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [toast])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("Attempting login for:", email)
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        toast({
          title: "Configuration Error",
          description: "Authentication service is not properly configured.",
          variant: "destructive",
        })
        return false
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Login error:", error.message)
        return false
      }

      console.log("Login successful, user ID:", data.user?.id)

      // Wait a moment for the session to be established
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Refresh the session immediately after login
      await refreshSession()

      return true
    } catch (error) {
      console.error("Login failed:", error)
      return false
    }
  }

  const signup = async (userData: {
    firstName: string
    lastName: string
    email: string
    password: string
    university: string
  }): Promise<boolean> => {
    try {
      setIsSigningUp(true)
      console.log("Attempting signup for:", userData.email)
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        toast({
          title: "Configuration Error",
          description: "Authentication service is not properly configured.",
          variant: "destructive",
        })
        return false
      }

      // Sign up with Supabase Auth and include user metadata
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            university: userData.university,
          },
        },
      })

      if (error) {
        console.error("Signup error:", error.message)
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        })
        return false
      }

      if (!data.user) {
        console.error("Signup failed: No user returned")
        return false
      }

      console.log("Signup successful, user ID:", data.user.id)

      // Wait a moment for the trigger to complete
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Refresh the session
      await refreshSession()

      setTimeout(() => {
        setIsSigningUp(false)
      }, 2000)

      return true
    } catch (error) {
      console.error("Signup failed:", error)
      toast({
        title: "Signup Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
      return false
    }
  }

  const logout = async () => {
    try {
      console.log("Attempting logout")
      await supabase.auth.signOut()
      setUser(null)
      setIsAuthenticated(false)
      console.log("Logout successful")
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
      toast({
        title: "Logout Error",
        description: "There was a problem logging out.",
        variant: "destructive",
      })
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout, loading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
