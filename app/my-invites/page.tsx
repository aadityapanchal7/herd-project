"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/use-toast";
import type { Event } from "@/lib/types";
import { EventCard } from "@/components/event-card";
import { Calendar, Filter, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyInvitesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [invitedEvents, setInvitedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"date-asc" | "date-desc" | "title-asc" | "title-desc">("date-asc");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to view invites",
        variant: "destructive",
      });
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router, toast]);

  useEffect(() => {
    const fetchInvites = async () => {
      if (!isAuthenticated || !user) {
        setInvitedEvents([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // 1) Get the event IDs where this user is invited
        const { data: pe, error: peErr } = await supabase
          .from("private_events")
          .select("event_id")
          .contains("invitee_user_ids", [user.id]);

        if (peErr) throw peErr;

        const ids = (pe ?? []).map((r) => r.event_id);
        if (ids.length === 0) {
          setInvitedEvents([]);
          return;
        }

        // 2) Fetch those events (private only)
        const { data: evts, error: evErr } = await supabase
          .from("events")
          .select("*")
          .in("id", ids)
          .eq("is_private", true);

        if (evErr) throw evErr;
        setInvitedEvents(evts ?? []);
      } catch (err: any) {
        console.error(err);
        toast({ title: "Error", description: err.message || "Failed to load invites", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchInvites();
  }, [isAuthenticated, user, toast]);

  // Search + sort
  const filtered = useMemo(() => {
    let list = [...invitedEvents];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q)
      );
    }

    switch (sortOption) {
      case "date-asc":
        list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "date-desc":
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "title-asc":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        list.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    return list;
  }, [invitedEvents, searchQuery, sortOption]);

  // Upcoming vs past
  const now = new Date();
  const upcoming = filtered.filter((e) => new Date(e.date) >= now);
  const past = filtered.filter((e) => new Date(e.date) < now);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f7fc]">
        <Header />
        <main className="flex-1 container max-w-6xl mx-auto py-10 px-4">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7fc]">
      <Header />
      <div className="university-primary-bg text-white py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold">My Invites</h1>
          <p className="mt-2 text-white/80">Browse private events you’ve been invited to</p>
        </div>
      </div>

      <main className="flex-1 container max-w-6xl mx-auto py-10 px-4">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by title, description or location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as any)}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-asc">Date (Earliest first)</SelectItem>
                <SelectItem value="date-desc">Date (Latest first)</SelectItem>
                <SelectItem value="title-asc">Title (A–Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z–A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="upcoming" className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming" className="flex gap-2 items-center">
              <Calendar className="h-4 w-4" />
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex gap-2 items-center">
              <Calendar className="h-4 w-4" />
              Event History ({past.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcoming.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcoming.map((evt) => (
                  <EventCard key={evt.id} event={evt} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                <Calendar className="h-12 w-12 mx-auto university-primary-text mb-4" />
                <h3 className="text-xl font-semibold mb-2">No upcoming invites</h3>
                <p className="text-gray-600">You don’t have any upcoming invited events.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {past.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {past.map((evt) => (
                  <EventCard key={evt.id} event={evt} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                <Calendar className="h-12 w-12 mx-auto university-primary-text mb-4" />
                <h3 className="text-xl font-semibold mb-2">No past invites</h3>
                <p className="text-gray-600">You haven’t been invited to any past events.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
