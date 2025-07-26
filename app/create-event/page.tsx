"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

export default function CreateEventPage() {
  const { toast } = useToast();
  const router = useRouter();
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
        description: "You must be logged in to create an event",
        variant: "destructive",
      });
      router.push("/login");
    }
  }, [loading, isAuthenticated, router, toast]);

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

    // finally insert
    try {
      const { error } = await supabase.from("events").insert({
        title,
        category,
        description,
        date: format(parsedDate, "MMM d, yyyy"),
        time,
        location,
        max_attendees: maxAtt,
        current_attendees: 0,
        verified: false,
        created_by: authData.user.id,
        creator_name,
        latitude: locationCoords?.latitude,
        longitude: locationCoords?.longitude,
        university_id: universityId,
      });
      if (error) throw error;

      toast({
        title: "Success",
        description: "Event created!",
      });
      router.push("/dashboard");
    } catch (err: any) {
      setFormError(err.message || "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
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
            Create New Event
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
                name="category"
                value={formData.category}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, category: val }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
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
                placeholder="Describe your event"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                required
              />
            </motion.div>

            {/* Date & Time */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
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
                  onFocus={(e) =>
                    (e.target as HTMLInputElement).showPicker?.()
                  }
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
                  onFocus={(e) =>
                    (e.target as HTMLInputElement).showPicker?.()
                  }
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
              className="space-y-2 relative"
            >
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                list="venue-list"
                placeholder="Type to search venues…"
                value={formData.location}
                onChange={handleChange}
                required
                className="pr-10"
              />
              <datalist id="venue-list">
                {Object.keys(VENUE_COORDS[school] || {}).map((venue) => (
                  <option key={venue} value={venue} />
                ))}
              </datalist>
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <p className="text-xs text-gray-500">
                Start typing to filter venues or scroll to select.
              </p>
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
                value={formData.maxAttendees}
                onChange={handleChange}
                required
              />
            </motion.div>

            {/* Buttons */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              className="flex justify-end space-x-4"
            >
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="university-button hover:bg-[#7a60c6]"
              >
                {isSubmitting ? "Creating..." : "Create Event"}
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </main>
    </div>
  );
}
