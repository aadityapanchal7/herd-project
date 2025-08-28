// app/create-public-event/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, MapPin, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { parse, format } from "date-fns";
import { getUniversityByName } from "@/lib/universities";
import { VENUE_COORDS } from "@/lib/school-cords";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

const DEFAULT_MAX_ATTENDEES = 100;

export default function CreatePublicEventPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();
  const isMobile = useIsMobile();

  // derive school key (expand as needed)
  let school = "";
  if (user?.university) {
    const uni = user.university.toLowerCase();
    if (uni.includes("texas") && uni.includes("austin")) school = "ut_austin";
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
    maxAttendees: `${DEFAULT_MAX_ATTENDEES}`,
    time_zone: "",
  });

  // RSVP controls
  const [allowRsvp, setAllowRsvp] = useState<"yes" | "no">("yes");
  const [limitMode, setLimitMode] = useState<"limited" | "unlimited">("limited");

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationCoords, setLocationCoords] =
    useState<{ latitude: number; longitude: number } | null>(null);

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

  useEffect(() => {
    const coords = VENUE_COORDS[school]?.[formData.location] ?? null;
    setLocationCoords(coords);
  }, [school, formData.location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file || null);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  // drag & drop handlers (uses handleImageChange)
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const synthetic = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleImageChange(synthetic);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const { title, category, description, date, time, location, maxAttendees, time_zone } = formData;
    if (!title || !category || !description || !date || !time || !location || !time_zone) {
      setFormError("Please fill out all required fields.");
      return;
    }

    // RSVP flags for DB
    const allow_rsvp_flag = allowRsvp === "yes";
    const rsvp_limited_flag = limitMode === "limited";

    // Compute max_attendees to save (handle NOT NULL by using 0 when RSVPs are off)
    let maxAttToSave: number;

    if (allow_rsvp_flag && rsvp_limited_flag) {
      const maxAtt = parseInt(formData.maxAttendees, 10);
      if (isNaN(maxAtt) || maxAtt < 1) {
        setFormError("Please enter a valid maximum number of attendees.");
        return;
      }
      maxAttToSave = maxAtt;
    } else if (allow_rsvp_flag && !rsvp_limited_flag) {
      maxAttToSave = 50000; // unlimited
    } else {
      maxAttToSave = 0; // RSVPs not allowed (use 0 to satisfy NOT NULL)
    }

    setIsSubmitting(true);

    const parsedDate = parse(date, "yyyy-MM-dd", new Date());
    if (isNaN(parsedDate.getTime())) {
      setFormError("Please select a valid date.");
      setIsSubmitting(false);
      return;
    }

    // auth check
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user) {
      setFormError("Authentication error. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    // compute creator_name from current user profile data
    const creatorName =
      `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
      authData.user.email?.split("@")[0] ||
      "Unknown Host";

    // optional university id
    let universityId: number | null = null;
    if (user?.university) {
      const uni = await getUniversityByName(user.university);
      universityId = uni?.id ?? null;
    }

    // 0) Upload flyer to storage if present
    let imageUrl: string | null = null;
    if (imageFile) {
      try {
        const path = `${authData.user.id}/${Date.now()}_${imageFile.name}`;
        const bucket = supabase.storage.from("event-images");

        const { error: uploadErr } = await bucket.upload(path, imageFile, {
          upsert: false,
          cacheControl: "3600",
          contentType: imageFile.type,
        });
        if (uploadErr) throw uploadErr;

        const { data: pub } = bucket.getPublicUrl(path);
        imageUrl = pub.publicUrl;
      } catch (err: any) {
        setFormError(err.message || "Image upload failed.");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // 1) Insert event and get its id
      const { data: inserted, error: insErr } = await supabase
        .from("events")
        .insert({
          title,
          category,
          description,
          date: format(parsedDate, "MMM d, yyyy"),
          time,
          location,
          max_attendees: maxAttToSave,
          current_attendees: 0,
          verified: false,
          created_by: authData.user.id,
          creator_name: creatorName,
          latitude: locationCoords?.latitude,
          longitude: locationCoords?.longitude,
          university_id: universityId,
          is_private: false,
          image_url: imageUrl,
          allow_rsvp: allow_rsvp_flag,
          rsvp_limited: rsvp_limited_flag,
          time_zone,
        })
        .select("id")
        .single();

      if (insErr) throw insErr;
      const eventId = inserted?.id;
      if (!eventId) throw new Error("Event insert returned no id.");

      // 2) Ensure a chat row exists for this new event
      const { error: chatUpsertErr } = await supabase
        .from("event_chats")
        .upsert({ event_id: eventId, name: "Event Chat" }, { onConflict: "event_id" });
      if (chatUpsertErr) {
        // Non-fatal: the chat hook also creates it, but this avoids race conditions.
        console.warn("event_chats upsert failed (will fallback in hook):", chatUpsertErr);
      }

      // 3) Done
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8f7fc] flex flex-col">
      <Header />
      <main className={`container mx-auto px-4 ${isMobile ? 'py-6' : 'py-10'}`}>
        {/* Tabs to switch routes */}
        <Tabs
          value="public"
          onValueChange={(v) =>
            router.push(v === "private" ? "/create-private-event" : "/create-public-event")
          }
          className={isMobile ? 'mb-4' : 'mb-6'}
        >
          <TabsList className={isMobile ? 'text-sm' : ''}>
            <TabsTrigger value="public" className={isMobile ? 'text-sm px-3' : ''}>
              {isMobile ? 'Public' : 'Create Public Event'}
            </TabsTrigger>
            <TabsTrigger value="private" className={isMobile ? 'text-sm px-3' : ''}>
              {isMobile ? 'Private' : 'Create Private Event'}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`bg-white rounded-lg shadow ${isMobile ? 'p-4' : 'p-6'}`}
        >
          <h1 className={`font-bold university-primary-text ${
            isMobile ? 'text-xl mb-4' : 'text-2xl mb-6'
          }`}>
            Create New Public Event
          </h1>

          {formError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className={isMobile ? 'space-y-4' : 'space-y-6'}>
            {/* Title */}
            <FormRow label="Event Title" id="title">
              <Input
                id="title"
                name="title"
                placeholder="Enter event title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </FormRow>

            {/* Category */}
            <FormRow label="Category" id="category">
              <Select
                name="category"
                value={formData.category}
                onValueChange={(val) => setFormData((p) => ({ ...p, category: val }))}
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
            </FormRow>

            {/* Description */}
            <FormRow label="Description" id="description">
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your event"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                required
              />
            </FormRow>

            {/* Date and Time */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="grid grid-cols-1 gap-4 md:grid-cols-4"
            >
              {/* Date (spans 2 cols so Time + TZ sit side-by-side) */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="date">Date</Label>
                <div
                  className="relative"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const el = dateRef.current;
                    if (!el) return;
                    // @ts-ignore - showPicker is supported on modern browsers
                    if (typeof el.showPicker === "function") el.showPicker();
                    else el.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      const el = dateRef.current;
                      if (!el) return;
                      // @ts-ignore
                      if (typeof el.showPicker === "function") el.showPicker();
                      else el.focus();
                    }
                  }}
                >
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    ref={dateRef}
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {/* Time (col 3) */}
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <div
                  className="relative"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const el = timeRef.current;
                    if (!el) return;
                    // @ts-ignore
                    if (typeof el.showPicker === "function") el.showPicker();
                    else el.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      const el = timeRef.current;
                      if (!el) return;
                      // @ts-ignore
                      if (typeof el.showPicker === "function") el.showPicker();
                      else el.focus();
                    }
                  }}
                >
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    ref={timeRef}
                    value={formData.time}
                    onChange={handleChange}
                    required
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {/* Time Zone (col 4) */}
              <div className="space-y-2">
                <Label htmlFor="time_zone">Time Zone</Label>
                <Select
                  value={formData.time_zone}
                  onValueChange={(value) => setFormData((p: any) => ({ ...p, time_zone: value }))}
                >
                  <SelectTrigger id="time_zone">
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EST">EST</SelectItem>
                    <SelectItem value="CST">CST</SelectItem>
                    <SelectItem value="MST">MST</SelectItem>
                    <SelectItem value="PST">PST</SelectItem>
                    <SelectItem value="AKST">AKST</SelectItem>
                    <SelectItem value="HST">HST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Location */}
            <motion.div className="space-y-2">
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
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Start typing to filter venues or scroll to select.
              </div>
            </motion.div>

            {/* RSVP Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Allow RSVPs?</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setAllowRsvp("yes")}
                    className={`px-4 py-2 rounded-md font-semibold hover:bg-inherit ${allowRsvp === "yes" ? "bg-primary text-white" : "bg-gray-200 text-gray-700"
                      }`}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setAllowRsvp("no")}
                    className={`px-4 py-2 rounded-md font-semibold hover:bg-inherit ${allowRsvp === "no" ? "bg-primary text-white" : "bg-gray-200 text-gray-700"
                      }`}
                  >
                    No
                  </Button>
                </div>
              </div>

              {allowRsvp === "yes" && (
                <div className="space-y-2">
                  <Label>RSVP Limit</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => setLimitMode("limited")}
                      className={`px-4 py-2 rounded-md font-semibold hover:bg-inherit ${limitMode === "limited" ? "bg-primary text-white" : "bg-gray-200 text-gray-700"
                        }`}
                    >
                      Limited
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setLimitMode("unlimited")}
                      className={`px-4 py-2 rounded-md font-semibold hover:bg-inherit ${limitMode === "unlimited" ? "bg-[var(--primary-color)] text-white" : "bg-gray-200 text-gray-700"
                        }`}
                    >
                      No limit
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Max attendees: only when limited */}
            {allowRsvp === "yes" && limitMode === "limited" && (
              <FormRow label="Maximum Attendees" id="maxAttendees">
                <Input
                  id="maxAttendees"
                  name="maxAttendees"
                  type="number"
                  min="1"
                  placeholder={`${DEFAULT_MAX_ATTENDEES}`}
                  value={formData.maxAttendees}
                  onChange={handleChange}
                  required
                />
              </FormRow>
            )}

            {/* Flyer / Poster - Drag & Drop */}
            <div className="space-y-2">
              <Label htmlFor="flyer">Event Flyer / Poster (optional)</Label>

              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && document.getElementById("flyer")?.click()}
                onClick={() => document.getElementById("flyer")?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={[
                  "rounded-lg border-2 border-dashed transition-colors cursor-pointer",
                  "p-4 sm:p-5 md:p-6",
                  "flex items-center gap-4 sm:gap-5",
                  isDragOver ? "border-primary bg-primary/5" : "border-zinc-300 bg-zinc-50",
                ].join(" ")}
              >
                <div className="shrink-0">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Flyer preview"
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-md object-cover border"
                    />
                  ) : (
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-md bg-white border flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium text-zinc-800">
                    {imagePreview ? "Replace image" : "Select an image"}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-500">
                    <span className="underline"></span> (max ~10 MB)
                  </p>
                </div>
              </div>

              <Input
                id="flyer"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <div className={`flex ${
              isMobile 
                ? 'flex-col space-y-2' 
                : 'justify-end space-x-4'
            }`}>
              <Button
                variant="outline"
                type="button"
                onClick={() => router.push("/dashboard")}
                size={isMobile ? "sm" : "default"}
                className={isMobile ? 'w-full' : ''}
              >
                <span className={isMobile ? 'text-sm' : ''}>Cancel</span>
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={`university-button hover:bg-[#7a60c6] ${isMobile ? 'w-full' : ''}`}
                size={isMobile ? "sm" : "default"}
              >
                <span className={isMobile ? 'text-sm' : ''}>
                  {isSubmitting ? "Creating..." : "Create Event"}
                </span>
              </Button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}

function FormRow({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
      className="space-y-2"
    >
      <Label htmlFor={id}>{label}</Label>
      {children}
    </motion.div>
  );
}
