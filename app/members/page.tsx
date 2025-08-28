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
import { useIsMobile } from "@/hooks/use-mobile"

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
  const isMobile = useIsMobile()

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
        <div className={`university-primary-bg text-white ${isMobile ? 'py-6' : 'py-8'}`}>
          <div className={`container mx-auto px-4 ${isMobile ? 'max-w-full' : 'max-w-6xl'}`}>
            <Skeleton className={`bg-white/20 ${isMobile ? 'h-8 w-40' : 'h-10 w-48'}`} />
            <Skeleton className={`bg-white/20 mt-2 ${isMobile ? 'h-5 w-56' : 'h-6 w-64'}`} />
          </div>
        </div>
        <main className={`flex-1 container mx-auto px-4 ${isMobile ? 'py-6 max-w-full' : 'py-10 max-w-6xl'}`}>
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
      <div className={`university-primary-bg text-white ${isMobile ? 'py-6' : 'py-8'}`}>
        <div className={`container mx-auto px-4 ${isMobile ? 'max-w-full' : 'max-w-6xl'}`}>
          <h1 className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl md:text-4xl'}`}>Members</h1>
          <p className={`mt-2 text-white/80 ${isMobile ? 'text-sm' : ''}`}>
            Connect with other students{university ? ` from ${university}` : ""}
          </p>
        </div>
      </div>

      <main className={`flex-1 container mx-auto px-4 ${isMobile ? 'py-6 max-w-full' : 'py-10 max-w-6xl'}`}>
        {filteredMembers.length > 0 ? (
          <>
            <div className={`flex justify-between gap-4 ${isMobile ? 'flex-col mb-6' : 'flex-col md:flex-row mb-8'}`}>
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                <Input
                  placeholder="Search members by name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`bg-white ${isMobile ? 'pl-8 text-sm' : 'pl-10'}`}
                />
              </div>
              <div className="flex gap-2 items-center">
                <Filter className={`text-gray-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className={`bg-white ${isMobile ? 'w-full text-sm' : 'w-[180px]'}`}>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc" className={isMobile ? 'text-sm' : ''}>Name (A–Z)</SelectItem>
                    <SelectItem value="name-desc" className={isMobile ? 'text-sm' : ''}>Name (Z–A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={`flex items-center mb-6 ${isMobile ? 'flex-col gap-3' : 'justify-between'}`}>
              <div className="flex items-center gap-2">
                <Users className={`university-primary-text ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                <h2 className={`font-semibold ${isMobile ? 'text-lg' : 'text-xl'}`}>All Members ({filteredMembers.length})</h2>
              </div>
              {university && (
                <div className="flex items-center gap-2">
                  <School className={`university-primary-text ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{university}</span>
                </div>
              )}
            </div>

            <AnimatePresence>
              <motion.div
                layout
                className={`grid gap-4 ${
                  isMobile 
                    ? 'grid-cols-2' 
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
                }`}
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
                    <Card className={`flex flex-col items-center bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow ${
                      isMobile ? 'p-3' : 'p-6'
                    }`}>
                      <Avatar className={`border-2 university-border ${
                        isMobile ? 'w-12 h-12 mb-2' : 'w-16 h-16 mb-3'
                      }`}>
                        <AvatarImage
                          src={m.avatar_url ?? ""}
                          alt={`${m.first_name} ${m.last_name}`}
                        />
                        <AvatarFallback className={isMobile ? 'text-xs' : ''}>
                          {`${(m.first_name?.[0] ?? "").toUpperCase()}${(m.last_name?.[0] ?? "").toUpperCase()}`}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className={`font-medium text-center ${
                        isMobile ? 'text-sm leading-tight' : 'text-lg'
                      }`}>
                        {m.first_name} {m.last_name}
                      </h3>

                      <button
                        className={`university-primary-text hover:underline ${
                          isMobile ? 'mt-2 text-xs' : 'mt-3 text-sm'
                        }`}
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
          <div className={`text-center bg-white rounded-xl shadow-sm mt-4 ${isMobile ? 'py-12 px-4' : 'py-16'}`}>
            <Users className={`mx-auto text-[#8a70d6] mb-4 ${isMobile ? 'h-12 w-12' : 'h-16 w-16'}`} />
            <h2 className={`font-bold mb-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>No Members Found</h2>
            <p className={`text-gray-600 mx-auto mb-8 ${isMobile ? 'text-sm max-w-sm' : 'max-w-md'}`}>
              No members have joined{university ? ` from ${university}` : ""} yet. Invite your classmates!
            </p>
            <Button size={isMobile ? "default" : "lg"} className="bg-[#8a70d6] hover:bg-[#7860c0] text-white">
              <UserPlus className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              <span className={isMobile ? 'text-sm' : ''}>Invite Classmates</span>
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
