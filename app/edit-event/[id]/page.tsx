"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { getUniversityByName } from "@/lib/universities";
import { VENUE_COORDS } from "@/lib/ut-venue-coordinates";
import { motion } from "framer-motion";
import type { Event } from "@/lib/types";

export default function EditEventPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, user, loading } = useAuth();

  // derive `school` key
  let school = "";
  if (user?.university) {
    const uni = user.university.toLowerCase();
    if (uni.includes("texas") && uni.includes("austin")) {
      school = "ut_austin";
    }
  }

  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    date: "",
    time: "",
    location: "",
    maxAttendees: "100",
    creator_name: "",
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);

  // track the chosen venue's coords
  const [locationCoords, setLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // require login before showing form
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to edit an event",
        variant: "destructive",
      });
      router.push("/login");
    }
  }, [loading, isAuthenticated, router, toast]);

  // Fetch event data
  useEffect(() => {
    async function fetchEvent() {
      if (!eventId || !isAuthenticated) return;

      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .single();

        if (error) {
          throw error;
        }

        // Check if user is the creator of this event
        if (data.created_by !== user?.id) {
          toast({
            title: "Access Denied",
            description: "You can only edit events you created",
            variant: "destructive",
          });
          router.push("/dashboard");
          return;
        }

        setEvent(data);
        
        // Convert date format for input field
        const eventDate = new Date(data.date);
        const formattedDate = eventDate.toISOString().split('T')[0];

        setFormData({
          title: data.title,
          category: data.category,
          description: data.description,
          date: formattedDate,
          time: data.time,
          location: data.location,
          maxAttendees: data.max_attendees.toString(),
          creator_name: data.creator_name || "",
        });

        setLocationCoords({
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
        });
      } catch (error: any) {
        console.error("Error fetching event:", error);
        toast({
          title: "Error",
          description: "Failed to load event data",
          variant: "destructive",
        });
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    }

    if (isAuthenticated && user) {
      fetchEvent();
    }
  }, [eventId, isAuthenticated, user, router, toast]);

  // whenever the school key or selected location changes, update coords
  useEffect(() => {
    const coords =
      VENUE_COORDS[school]?.[formData.location] ?? null;
    setLocationCoords(coords);
  }, [school, formData.location]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const {
      title,
      category,
      description,
      date,
      time,
      location,
      maxAttendees,
      creator_name,
    } = formData;

    // basic validation
    if (
      !title ||
      !category ||
      !description ||
      !date ||
      !time ||
      !location ||
      !creator_name
    ) {
      setFormError("Please fill out all required fields.");
      setIsSubmitting(false);
      return;
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      setFormError("Please select a valid date.");
      setIsSubmitting(false);
      return;
    }

    const maxAtt = parseInt(maxAttendees, 10);
    if (isNaN(maxAtt) || maxAtt < 1) {
      setFormError("Please enter a valid maximum number of attendees.");
      setIsSubmitting(false);
      return;
    }

    // re-check auth from Supabase
    const { data: authData, error: authErr } =
      await supabase.auth.getUser();
    if (authErr || !authData.user) {
      setFormError("Authentication error. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    // look up university_id if available
    let universityId: number | null = null;
    if (user) {
      const uni = await getUniversityByName(user.university);
      universityId = uni?.id ?? null;
    }

    // update the event
    try {
      const { error } = await supabase
        .from("events")
        .update({
          title,
          category,
          description,
          date: format(parsedDate, "MMM d, yyyy"),
          time,
          location,
          max_attendees: maxAtt,
          creator_name,
          latitude: locationCoords?.latitude,
          longitude: locationCoords?.longitude,
          university_id: universityId,
        })
        .eq("id", eventId)
        .eq("created_by", authData.user.id); // Ensure user can only update their own events

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event updated successfully!",
      });
      router.push("/dashboard");
    } catch (err: any) {
      setFormError(err.message || "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Event not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7fc] flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-6 rounded-lg shadow"
        >
          <h1 className="text-2xl font-bold university-primary-text mb-6">
            Edit Event
          </h1>

          {formError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.07 } },
            }}
          >
            {/* Host name */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              className="space-y-2"
            >
              <Label htmlFor="creator_name">
                Name of Person/Organization Hosting Event
              </Label>
              <Input
                id="creator_name"
                name="creator_name"
                placeholder="e.g., Longhorn Lockpicking Club, Jane Doe"
                value={formData.creator_name}
                onChange={handleChange}
                required
              />
            </motion.div>

            {/* Title */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              className="space-y-2"
            >
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter event title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </motion.div>

            {/* Category */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              className="space-y-2"
            >
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Social">Social</SelectItem>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Arts">Arts</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {/* Description */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              className="space-y-2"
            >
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your event..."
                value={formData.description}
                onChange={handleChange}
                rows={4}
                required
              />
            </motion.div>

            {/* Date and Time */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  ref={dateRef}
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  name="time"
                  type="time"
                  ref={timeRef}
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>
            </motion.div>

            {/* Location */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              className="space-y-2"
            >
              <Label htmlFor="location">Location</Label>
              <Select
                value={formData.location}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, location: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(VENUE_COORDS[school] || {}).map((venue) => (
                    <SelectItem key={venue} value={venue}>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {venue}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* Max Attendees */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              className="space-y-2"
            >
              <Label htmlFor="maxAttendees">Maximum Attendees</Label>
              <Input
                id="maxAttendees"
                name="maxAttendees"
                type="number"
                min="1"
                placeholder="100"
                value={formData.maxAttendees}
                onChange={handleChange}
                required
              />
            </motion.div>

            {/* Submit Button */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              className="flex gap-4 pt-4"
            >
              <Button
                type="submit"
                className="university-button flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update Event"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </main>
    </div>
  );
} 