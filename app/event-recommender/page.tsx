"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import TinderCard from "react-tinder-card";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MapPin, Users, Heart, X, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useEvents } from "@/context/events-context";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import type { Event } from "@/lib/types";

export default function EventRecommenderPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { events, userRsvps } = useEvents();
  const router = useRouter();
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedEvents, setSwipedEvents] = useState<Set<number>>(new Set());
  const [isRsvping, setIsRsvping] = useState(false);
  const childRefs = useRef<any[]>([]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to use the event recommender",
        variant: "destructive",
      });
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router, toast]);

  // Filter events that user hasn't RSVP'd to and haven't been swiped
  const availableEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate >= today && // Only upcoming events
        !userRsvps.includes(event.id) && // Not already RSVP'd
        !swipedEvents.has(event.id) // Not already swiped
      );
    });
  }, [events, userRsvps, swipedEvents]);

  // Initialize refs for cards
  useEffect(() => {
    childRefs.current = Array(availableEvents.length)
      .fill(0)
      .map((_, i) => childRefs.current[i] || React.createRef());
  }, [availableEvents.length]);

  const getCategoryColor = (category: string) => {
    return (
      {
        Social: "bg-purple-100 text-purple-800",
        Academic: "bg-green-100 text-green-800", 
        Sports: "bg-red-100 text-red-800",
        Arts: "bg-pink-100 text-pink-800",
      }[category] || "bg-gray-100 text-gray-800"
    );
  };

  const handleRSVP = async (event: Event) => {
    if (!user) return;

    setIsRsvping(true);
    try {
      // Check if user already RSVP'd
      const { data: exists } = await supabase
        .from("event_rsvps")
        .select("*")
        .eq("event_id", event.id)
        .eq("user_id", user.id)
        .single();

      if (exists) {
        toast({ title: "Already RSVP'd to this event!" });
        return;
      }

      // Check if event is full
      const { count } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);

      if (count && count >= event.max_attendees) {
        toast({ 
          title: "Event Full", 
          description: "No spots left for this event!", 
          variant: "destructive" 
        });
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        toast({
          title: "Profile Error",
          description: "Could not load your profile",
          variant: "destructive",
        });
        return;
      }

      // Create RSVP
      const { error: rsvpError } = await supabase
        .from("event_rsvps")
        .insert({
          event_id: event.id,
          user_id: user.id,
          attendee_first: profile.first_name,
          attendee_last: profile.last_name,
          attendee_avatar_url: profile.avatar_url,
        });

      if (rsvpError) throw rsvpError;

      toast({ 
        title: "RSVP Successful!", 
        description: `You're going to ${event.title}` 
      });

    } catch (error: any) {
      console.error("RSVP error:", error);
      toast({
        title: "RSVP Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRsvping(false);
    }
  };

  const onSwipe = (direction: string, event: Event, index: number) => {
    console.log(`Swiped ${direction} on ${event.title}`);
    
    setSwipedEvents(prev => new Set(prev).add(event.id));
    
    if (direction === "right") {
      handleRSVP(event);
    }
    
    setCurrentIndex(index - 1);
  };

  const onCardLeftScreen = (event: Event) => {
    console.log(`${event.title} left the screen`);
  };

  // Programmatic swipe functions
  const swipe = async (dir: string) => {
    if (currentIndex >= 0 && childRefs.current[currentIndex]) {
      await childRefs.current[currentIndex].current?.swipe(dir);
    }
  };

  const goBack = async () => {
    if (currentIndex < availableEvents.length - 1) {
      const lastSwipedEvent = availableEvents[currentIndex + 1];
      setSwipedEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(lastSwipedEvent.id);
        return newSet;
      });
      await childRefs.current[currentIndex + 1].current?.restoreCard();
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#f8f7fc]">
      <Header />
      
      <div className="container max-w-4xl mx-auto px-4 pt-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold university-primary-text mb-2">
            Event Recommender
          </h1>
          <p className="text-gray-600">
            Swipe right to RSVP, left to skip. Find your perfect events!
          </p>
        </div>

        {availableEvents.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
            <p className="text-gray-600">
              You've seen all available events. Check back later for more!
            </p>
            <Button 
              className="mt-4" 
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        ) : (
          <>
            {/* Card Stack */}
            <div className="relative h-[600px] flex justify-center items-center mb-8">
              {availableEvents.map((event, index) => (
                <TinderCard
                  ref={childRefs.current[index]}
                  key={event.id}
                  onSwipe={(dir) => onSwipe(dir, event, index)}
                  onCardLeftScreen={() => onCardLeftScreen(event)}
                  preventSwipe={["up", "down"]}
                  swipeRequirementType="position"
                  swipeThreshold={100}
                  className="absolute"
                >
                  <div 
                    className="bg-white rounded-2xl shadow-lg p-6 w-80 h-96 cursor-grab active:cursor-grabbing"
                    style={{
                      transform: `scale(${1 - index * 0.05}) translateY(${index * -10}px)`,
                      zIndex: availableEvents.length - index,
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className={getCategoryColor(event.category)}>
                        {event.category}
                      </Badge>
                      {event.verified && (
                        <div className="flex items-center text-blue-600 text-sm">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Verified
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-bold mb-2 line-clamp-2">{event.title}</h3>
                    
                    {event.creator_name && (
                      <p className="text-sm text-gray-500 mb-2">
                        <strong>Created by:</strong> {event.creator_name}
                      </p>
                    )}
                    
                    <p className="text-gray-600 mb-4 line-clamp-3">{event.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-500">
                        <CalendarIcon className="w-4 h-4 mr-2 text-[var(--primary-color)]" />
                        <span className="text-sm">{event.date} • {event.time}</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <MapPin className="w-4 h-4 mr-2 text-[var(--primary-color)]" />
                        <span className="text-sm line-clamp-1">{event.location}</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Users className="w-4 h-4 mr-2 text-[var(--primary-color)]" />
                        <span className="text-sm">{event.current_attendees} / {event.max_attendees} attendees</span>
                      </div>
                    </div>

                    {/* Swipe indicators */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="swipe-indicator-left absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full font-bold opacity-0 transform rotate-12 transition-opacity">
                        SKIP
                      </div>
                      <div className="swipe-indicator-right absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full font-bold opacity-0 transform -rotate-12 transition-opacity">
                        RSVP
                      </div>
                    </div>
                  </div>
                </TinderCard>
              ))}
            </div>

            {/* Control Buttons */}
            <div className="flex justify-center items-center gap-6">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-16 h-16 p-0 border-red-200 hover:bg-red-50"
                onClick={() => swipe("left")}
                disabled={currentIndex < 0}
              >
                <X className="w-8 h-8 text-red-500" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-12 h-12 p-0 border-gray-200 hover:bg-gray-50"
                onClick={goBack}
                disabled={currentIndex >= availableEvents.length - 1}
              >
                <RotateCcw className="w-6 h-6 text-gray-500" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className={`rounded-full w-16 h-16 p-0 border-green-200 hover:bg-green-50 ${
                  isRsvping ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => swipe("right")}
                disabled={currentIndex < 0 || isRsvping}
              >
                <Heart className="w-8 h-8 text-green-500" />
              </Button>
            </div>

            {/* Counter */}
            <div className="text-center mt-6 text-gray-500">
              {availableEvents.length - swipedEvents.size} events remaining
            </div>
          </>
        )}
      </div>
    </main>
  );
}