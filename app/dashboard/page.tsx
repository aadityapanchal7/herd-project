'use client'

import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ConfigCheck } from "@/components/config-check"
import { ViewSelector } from "@/components/view-selector"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"  
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"



export default function Dashboard() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to view the dashboard",
        variant: "destructive",
      })
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router, toast])

  return (
    <main className="min-h-screen bg-[#f8f7fc]">
      <Header />
      <div className="container px-4 md:px-6 pt-4">
        <ConfigCheck />
      </div>
      <HeroSection />
      <ViewSelector />
    </main>
  )
}
