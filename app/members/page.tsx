"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Users, School, Search, Filter, UserPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"

type Profile = {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

export default function MembersPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Profile[]>([])
  const [university, setUniversity] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState("name-asc")
  const router = useRouter()
  const { toast } = useToast()

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to view members",
        variant: "destructive",
      })
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router, toast])

  // Fetch your profile, then peers
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    const loadMembers = async () => {
      setLoading(true)

      // 1) Grab current user's university
      const { data: me, error: meErr } = await supabase
        .from("profiles")
        .select("university")
        .eq("id", user.id)
        .single()

      if (meErr || !me) {
        toast({ title: "Error", description: "Could not load your profile.", variant: "destructive" })
        setLoading(false)
        return
      }
      setUniversity(me.university ?? "")

      // 2) Everyone in the same university
      const { data: peers, error: peersErr } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .eq("university", me.university)

      if (peersErr) {
        toast({ title: "Error", description: "Could not load members.", variant: "destructive" })
        setMembers([])
        setFilteredMembers([])
      } else {
        setMembers(peers || [])
        setFilteredMembers(peers || [])
      }
      setLoading(false)
    }

    loadMembers()
  }, [isAuthenticated, user, toast])

  // Filter + sort
  useEffect(() => {
    if (!members.length) return
    let filtered = [...members]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(q))
    }

    switch (sortOption) {
      case "name-asc":
        filtered.sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        )
        break
      case "name-desc":
        filtered.sort((a, b) =>
          `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`)
        )
        break
    }

    setFilteredMembers(filtered)
  }, [searchQuery, sortOption, members])

  // Loading skeleton
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#f0edfb] to-[#f8f7fc]">
        <Header />
        <div className="university-primary-bg text-white py-8">
          <div className="container max-w-6xl mx-auto px-4">
            <Skeleton className="h-10 w-48 bg-white/20" />
            <Skeleton className="h-6 w-64 mt-2 bg-white/20" />
          </div>
        </div>
        <main className="flex-1 container max-w-6xl mx-auto py-10 px-4">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  // Render members
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#f0edfb] to-[#f8f7fc]">
      <Header />
      <div className="university-primary-bg text-white py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold">Members</h1>
          <p className="mt-2 text-white/80">
            Connect with other students{university ? ` from ${university}` : ""}
          </p>
        </div>
      </div>

      <main className="flex-1 container max-w-6xl mx-auto py-10 px-4">
        {filteredMembers.length > 0 ? (
          <>
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search members by name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z–A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 university-primary-text" />
                <h2 className="text-xl font-semibold">All Members ({filteredMembers.length})</h2>
              </div>
              {university && (
                <div className="flex items-center gap-2">
                  <School className="h-5 w-5 university-primary-text" />
                  <span className="text-sm font-medium">{university}</span>
                </div>
              )}
            </div>

            <AnimatePresence>
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              >
                {filteredMembers.map((m, idx) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 32 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: idx * 0.05 }}
                    layout
                  >
                    <Card className="flex flex-col items-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <Avatar className="w-16 h-16 mb-3 border-2 university-border">
                        <AvatarImage
                          src={m.avatar_url ?? ""}
                          alt={`${m.first_name} ${m.last_name}`}
                        />
                        <AvatarFallback>
                          {`${(m.first_name?.[0] ?? "").toUpperCase()}${(m.last_name?.[0] ?? "").toUpperCase()}`}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-medium text-lg text-center">
                        {m.first_name} {m.last_name}
                      </h3>

                      <button
                        className="mt-3 text-sm university-primary-text hover:underline"
                        onClick={() => router.push(`/members/${m.id}`)}
                      >
                        View Profile
                      </button>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm mt-4">
            <Users className="h-16 w-16 mx-auto text-[#8a70d6] mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Members Found</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              No members have joined{university ? ` from ${university}` : ""} yet. Invite your classmates!
            </p>
            <Button size="lg" className="bg-[#8a70d6] hover:bg-[#7860c0] text-white">
              <UserPlus className="mr-2 h-5 w-5" />
              Invite Classmates
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
