// app/create-private-event/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { Image as ImageIcon, AlertCircle, MapPin, Search as SearchIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { parse, format } from "date-fns";
import { getUniversityByName } from "@/lib/universities";
import { VENUE_COORDS } from "@/lib/school-cords";
import { motion } from "framer-motion";
import { AvatarThumb } from "@/components/avatar-thumb";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

const DEFAULT_MAX_ATTENDEES = 1000; // keep non-null in events

export default function CreatePrivateEventPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();

  // derive school key (extend as needed)
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
    time_zone: "",
  });

  // image upload (same as public)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // chosen venue coords
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // invite picker state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // gate by auth
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

  // update coords when school/location changes
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

  // drag & drop handlers
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

  // load profiles into modal
  async function loadProfiles() {
    setProfilesLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url")
      .order("first_name", { ascending: true });

    if (!error && data) setAllProfiles(data as Profile[]);
    setProfilesLoading(false);
  }

  function openInviteModal() {
    setInviteModalOpen(true);
    if (allProfiles.length === 0) loadProfiles();
  }

  function toggleSelect(uid: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  // Search by name OR ID, but do NOT display ID in the UI
  const filteredProfiles = useMemo(() => {
    const q = profileSearch.trim().toLowerCase();
    if (!q) return allProfiles;
    return allProfiles.filter((p) => {
      const first = (p.first_name || "").toLowerCase();
      const last = (p.last_name || "").toLowerCase();
      const full = `${first} ${last}`;
      const id = (p.id || "").toLowerCase();
      return first.includes(q) || last.includes(q) || full.includes(q) || id.includes(q);
    });
  }, [allProfiles, profileSearch]);

  const selectedProfiles = useMemo(
    () => allProfiles.filter((p) => selectedIds.has(p.id)),
    [allProfiles, selectedIds]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const { title, category, description, date, time, location, time_zone } = formData;

    if (!title || !category || !description || !date || !time || !location || !time_zone) {
      setFormError("Please fill out all required fields.");
      return;
    }
    if (selectedIds.size === 0) {
      setFormError("Select at least one invitee.");
      return;
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

    // compute creator_name from current user profile
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

    // optional image upload
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
      // 1) Insert the event, marked private
      const { data: inserted, error: insErr } = await supabase
        .from("events")
        .insert({
          title,
          category,
          description,
          date: format(parsedDate, "MMM d, yyyy"),
          time,
          location,
          max_attendees: DEFAULT_MAX_ATTENDEES, // events.max_attendees is NOT NULL
          current_attendees: 0,
          verified: false,
          created_by: authData.user.id,
          creator_name: creatorName,
          latitude: locationCoords?.latitude,
          longitude: locationCoords?.longitude,
          university_id: universityId,
          is_private: true,
          image_url: imageUrl,
          time_zone
        })
        .select("id")
        .single();

      if (insErr) throw insErr;
      const eventId = inserted?.id;
      if (!eventId) throw new Error("Event insert failed.");

      const { error: chatUpsertErr } = await supabase
        .from("event_chats")
        .upsert({ event_id: eventId, name: "Event Chat" }, { onConflict: "event_id" });
      if (chatUpsertErr) {
        // Non-fatal: your hook also tries to create it, but this avoids race conditions
        console.warn("event_chats upsert failed (will fallback in hook):", chatUpsertErr);
      }

      // 2) Insert into private_events with array of invitee IDs
      const inviteeIds = Array.from(selectedIds); // string[]
      const { error: peErr } = await supabase
        .from("private_events")
        .insert({
          event_id: eventId,
          creator_id: authData.user.id,
          invitee_user_ids: inviteeIds, // uuid[]
        });

      if (peErr) throw peErr;

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
      <main className="container mx-auto px-4 py-10">
        {/* Tabs to switch routes */}
        <Tabs
          value="private"
          onValueChange={(v) =>
            router.push(v === "public" ? "/create-public-event" : "/create-private-event")
          }
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="public">Create Public Event</TabsTrigger>
            <TabsTrigger value="private">Create Private Event</TabsTrigger>
          </TabsList>
        </Tabs>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-6 rounded-lg shadow"
        >
          <h1 className="text-2xl font-bold university-primary-text mb-6">
            Create New Private Event
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
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          >
            {/* Title */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
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
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="space-y-2"
            >
              <Label htmlFor="category">Category</Label>
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
            </motion.div>

            {/* Description */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
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
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
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
              <p className="text-xs text-gray-500">Start typing to filter venues or scroll to select.</p>
            </motion.div>

            {/* Invitees */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="space-y-2"
            >
              <Label>Choose Invitees</Label>
              <div className="flex items-center gap-3 flex-wrap">
                <Button type="button" className="university-button text-white" onClick={openInviteModal}>
                  Select People ({selectedIds.size})
                </Button>

                {/* Selected chips */}
                {selectedProfiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedProfiles.slice(0, 6).map((p) => (
                      <div key={p.id} className="flex items-center gap-2 bg-zinc-100 rounded-full px-3 py-1">
                        <AvatarThumb url={p.avatar_url} first={p.first_name} last={p.last_name} size={24} />
                        <span className="text-sm">
                          {(p.first_name || "").trim()} {(p.last_name || "").trim()}
                        </span>
                        <button
                          className="text-zinc-500 hover:text-zinc-700 ml-1"
                          type="button"
                          onClick={() => toggleSelect(p.id)}
                          aria-label="Remove invitee"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {selectedProfiles.length > 6 && (
                      <span className="text-sm text-zinc-600">+{selectedProfiles.length - 6} more</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">Only the creator and selected invitees will see this event.</p>
            </motion.div>

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
                  isDragOver ? "border-[var(--primary-color)] bg-[var(--primary-color)]/5" : "border-zinc-300 hover:border-zinc-400 bg-zinc-50"
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
                    <span className="underline"></span>(max ~10 MB)
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

            {/* Buttons */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="flex justify-end space-x-4"
            >
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="university-button hover:bg-[#7a60c6]">
                {isSubmitting ? "Creating..." : "Create Event"}
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </main>

      {/* Invite Picker Modal */}
      {inviteModalOpen && (
        <div
          className="fixed inset-0 z-[11000] bg-black/40 flex items-center justify-center"
          onClick={() => setInviteModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-lg">Select Invitees</h4>
              <button
                className="text-gray-400 hover:text-gray-700 text-2xl"
                onClick={() => setInviteModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                placeholder="Search by name or ID…"
                className="pl-9"
              />
            </div>

            <div className="max-h-80 overflow-y-auto border rounded-md">
              {profilesLoading ? (
                <div className="p-4 text-sm text-zinc-500">Loading…</div>
              ) : filteredProfiles.length === 0 ? (
                <div className="p-4 text-sm text-zinc-500">No profiles found.</div>
              ) : (
                <ul className="divide-y">
                  {filteredProfiles.map((p) => {
                    const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed User";
                    const checked = selectedIds.has(p.id);
                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between p-3 hover:bg-zinc-50 cursor-pointer"
                        onClick={() => toggleSelect(p.id)}
                      >
                        <div className="flex items-center gap-3">
                          <AvatarThumb url={p.avatar_url} first={p.first_name} last={p.last_name} size={36} />
                          <div className="flex flex-col">
                            <span className="font-medium">{full}</span>
                            {/* ID is intentionally NOT displayed */}
                          </div>
                        </div>
                        <input type="checkbox" readOnly checked={checked} className="w-4 h-4 accent-[var(--primary-color)]" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
              <Button className="university-button text-white" onClick={() => setInviteModalOpen(false)}>
                Done ({selectedIds.size} selected)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
