// app/edit-event/[id]/page.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
import {
  AlertCircle,
  MapPin,
  Search as SearchIcon,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format, parse } from "date-fns";
import { getUniversityByName } from "@/lib/universities";
import { VENUE_COORDS } from "@/lib/school-cords";
import { motion } from "framer-motion";
import type { Event } from "@/lib/types";
import { AvatarThumb } from "@/components/avatar-thumb";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

function uniqById<T extends { id: string }>(arr: T[]): T[] {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return Array.from(m.values());
}

/** ---- Date helpers (fixes "one day earlier" bug) ----
 * Never construct `new Date('YYYY-MM-DD')` (it’s parsed as UTC).
 * We:
 *  - Parse DB display dates like "Aug 17, 2025" in LOCAL time
 *  - Convert to "YYYY-MM-DD" for the <input type="date">
 *  - On save, parse that "YYYY-MM-DD" in LOCAL time and
 *    reformat to "MMM d, yyyy" (to match what you store today)
 */
function dateToYMDLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dbDateToYMD(dbDate: string | null | undefined): string {
  if (!dbDate) return "";
  // already yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(dbDate)) return dbDate;

  // try "MMM d, yyyy" (your current storage format)
  const viaPretty = parse(dbDate, "MMM d, yyyy", new Date());
  if (!isNaN(viaPretty.getTime())) return dateToYMDLocal(viaPretty);

  // last resort: let JS parse it, then normalize to YMD (still local)
  const fallback = new Date(dbDate);
  if (!isNaN(fallback.getTime())) return dateToYMDLocal(fallback);

  return "";
}
function ymdToPrettyLocal(ymd: string): string {
  // Parse the date string in LOCAL time, then format pretty.
  const d = parse(ymd, "yyyy-MM-dd", new Date());
  return format(d, "MMM d, yyyy");
}

const UNLIMITED_CAP = 50_000;

export default function EditEventPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, user, loading } = useAuth();

  // tolerate numeric or uuid ids
  const eventKey: string | number = /^\d+$/.test(eventId) ? Number(eventId) : eventId;

  // derive school key
  let school = "";
  if (user?.university) {
    const u = user.university.toLowerCase();
    if (u.includes("texas") && u.includes("austin")) school = "ut_austin";
  }

  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    date: "",          // <-- always "YYYY-MM-DD" in state
    time: "",
    location: "",
    maxAttendees: "100", // used if public + limited
    creator_name: "",
    time_zone: ""
  });

  // RSVP settings (public only)
  const [allowRsvp, setAllowRsvp] = useState<"yes" | "no">("yes");
  const [limitMode, setLimitMode] = useState<"limited" | "unlimited">("limited");

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);

  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Private invitees
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [originalInviteeIds, setOriginalInviteeIds] = useState<Set<string>>(new Set());
  const [seedProfiles, setSeedProfiles] = useState<Profile[]>([]);

  const isPrivate = !!event?.is_private;

  // auth gate
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

  // load event
  useEffect(() => {
    async function fetchEvent() {
      if (!eventId || !isAuthenticated) return;
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventKey)
          .single();
        if (error) throw error;

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

        // Normalize DB date → "YYYY-MM-DD" for the date input (no TZ shift)
        const ymd = dbDateToYMD(data.date);

        setFormData((prev) => ({
          ...prev,
          title: data.title,
          category: data.category,
          description: data.description,
          date: ymd,
          time: data.time,
          location: data.location,
          maxAttendees: data.max_attendees?.toString?.() ?? "100",
          creator_name: data.creator_name || "",
          time_zone: data.time_zone || "",
        }));

        // RSVP flags from DB (public events only)
        setAllowRsvp(data.allow_rsvp === false ? "no" : "yes");
        setLimitMode(
          data.allow_rsvp === false ? "limited" : data.rsvp_limited ? "limited" : "unlimited"
        );

        // Image
        const url = data.image_url ?? null;
        setExistingImageUrl(url);
        setImagePreview(url);

        setLocationCoords({
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
        });

        // private extras
        if (data.is_private) {
          const { data: priv } = await supabase
            .from("private_events")
            .select("invitee_user_ids")
            .eq("event_id", eventKey)
            .maybeSingle();

          const ids: string[] = priv?.invitee_user_ids ?? [];
          const uniq = new Set(ids);
          setSelectedIds(new Set(uniq));
          setOriginalInviteeIds(new Set(uniq));

          if (ids.length > 0) {
            const { data: profs } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, avatar_url")
              .in("id", Array.from(uniq));

            setSeedProfiles(uniqById((profs as Profile[]) ?? []));
          }
        }

        setProfilesLoading(true);
        const { data: directory } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .order("first_name", { ascending: true });
        setAllProfiles((directory as Profile[]) ?? []);
        setProfilesLoading(false);
      } catch (err) {
        console.error(err);
        toast({ title: "Error", description: "Failed to load event data", variant: "destructive" });
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    }

    if (isAuthenticated && user) fetchEvent();
  }, [eventId, eventKey, isAuthenticated, user, router, toast]);

  // venue coords
  useEffect(() => {
    const c = VENUE_COORDS[school]?.[formData.location] ?? null;
    setLocationCoords(c);
  }, [school, formData.location]);

  // handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(existingImageUrl ?? null);
    }
  };

  function openInviteModal() {
    setInviteModalOpen(true);
  }
  function toggleSelect(uid: string, profile?: Profile) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
    if (profile) setSeedProfiles((prev) => uniqById([...(prev ?? []), profile]));
  }

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

  const selectedProfiles = useMemo(() => {
    const byId = new Map<string, Profile>();
    for (const p of allProfiles) byId.set(p.id, p);
    for (const p of seedProfiles) if (!byId.has(p.id)) byId.set(p.id, p);
    const arr: Profile[] = [];
    for (const id of selectedIds) {
      const p = byId.get(id);
      if (p) arr.push(p);
    }
    return uniqById(arr);
  }, [allProfiles, seedProfiles, selectedIds]);

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const {
      title,
      category,
      description,
      date, // "YYYY-MM-DD"
      time,
      location,
      maxAttendees,
      creator_name,
      time_zone,
    } = formData;

    if (!title || !category || !description || !date || !time || !location || !creator_name || !time_zone) {
      setFormError("Please fill out all required fields.");
      setIsSubmitting(false);
      return;
    }

    // validate public/private
    let computedMax: number | null = null;
    if (!isPrivate) {
      if (allowRsvp === "yes") {
        if (limitMode === "unlimited") {
          computedMax = UNLIMITED_CAP;
        } else {
          const parsed = parseInt(maxAttendees, 10);
          if (isNaN(parsed) || parsed < 1) {
            setFormError("Please enter a valid maximum number of attendees.");
            setIsSubmitting(false);
            return;
          }
          computedMax = parsed;
        }
      }
    } else if (selectedIds.size === 0) {
      setFormError("Select at least one invitee.");
      setIsSubmitting(false);
      return;
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user) {
      setFormError("Authentication error. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    let universityId: number | null = null;
    if (user) {
      const uni = await getUniversityByName(user.university);
      universityId = uni?.id ?? null;
    }

    try {
      // ✅ Parse the "YYYY-MM-DD" string in LOCAL time, not UTC
      // then reformat to your stored display format.
      const prettyDate = ymdToPrettyLocal(date);

      // image upload (if new)
      let imageUrlToSave: string | null | undefined = undefined;
      if (imageFile) {
        const path = `${authData.user.id}/${Date.now()}_${imageFile.name}`;
        const bucket = supabase.storage.from("event-images");
        const { error: uploadErr } = await bucket.upload(path, imageFile, {
          upsert: false,
          cacheControl: "3600",
          contentType: imageFile.type,
        });
        if (uploadErr) throw uploadErr;
        const { data: pub } = bucket.getPublicUrl(path);
        imageUrlToSave = pub.publicUrl;
      }

      const updates: any = {
        title,
        category,
        description,
        date: prettyDate, // <-- fixed: no UTC conversion
        time,
        location,
        creator_name,
        latitude: locationCoords?.latitude,
        longitude: locationCoords?.longitude,
        university_id: universityId,
        time_zone,
      };

      // image field precedence
      if (typeof imageUrlToSave !== "undefined") {
        updates.image_url = imageUrlToSave;
      } else if (imagePreview === null) {
        // user clicked remove
        updates.image_url = null;
      }

      if (!isPrivate) {
        const allow = allowRsvp === "yes";
        updates.allow_rsvp = allow;
        updates.rsvp_limited = allow ? limitMode === "limited" : false; // never null

        if (allow) {
          updates.max_attendees = computedMax ?? UNLIMITED_CAP;
        }
      }

      const { error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", eventKey)
        .eq("created_by", authData.user.id);

      if (error) throw error;

      // private invitees save + prune
      if (isPrivate) {
        const newInvitees = Array.from(selectedIds);
        const prevInvitees = Array.from(originalInviteeIds);
        const removed = prevInvitees.filter((id) => !selectedIds.has(id));

        const { error: peUpdateErr, status } = await supabase
          .from("private_events")
          .update({ invitee_user_ids: newInvitees })
          .eq("event_id", eventKey);

        if (peUpdateErr && status !== 406) throw peUpdateErr;

        if (status === 406) {
          const { error: peInsertErr } = await supabase
            .from("private_events")
            .insert({
              event_id: eventKey,
              creator_id: authData.user.id,
              invitee_user_ids: newInvitees,
            });
          if (peInsertErr) throw peInsertErr;
        }

        if (removed.length > 0) {
          const { error: delErr } = await supabase
            .from("event_rsvps")
            .delete()
            .eq("event_id", eventKey)
            .in("user_id", removed);
          if (delErr) throw delErr;

          setOriginalInviteeIds(new Set(newInvitees));
        }
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !isAuthenticated || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center">Event not found</div>;
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
          <h1 className="text-2xl font-bold university-primary-text mb-6">Edit Event</h1>

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
            {/* Host name */}
            <FormBlock>
              <Label htmlFor="creator_name">Name of Person/Organization Hosting Event</Label>
              <Input
                id="creator_name"
                name="creator_name"
                placeholder="e.g., Student Union, Jane Doe"
                value={formData.creator_name}
                onChange={handleChange}
                required
              />
            </FormBlock>

            {/* Title */}
            <FormBlock>
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter event title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </FormBlock>

            {/* Category */}
            <FormBlock>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
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
            </FormBlock>

            {/* Description */}
            <FormBlock>
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
            </FormBlock>

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
            <FormBlock>
              <Label htmlFor="location">Location</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
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
            </FormBlock>

            {/* Image uploader – mobile-first */}
            <div className="space-y-2">
              <Label>Event Flyer / Poster (optional)</Label>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Clickable drop area / preview */}
                <label
                  htmlFor="flyer"
                  className="group relative w-full sm:w-64 overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 hover:border-zinc-400 bg-white transition-colors"
                >
                  <div className="aspect-video w-full">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Flyer preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center">
                        <div className="text-center">
                          <div className="mx-auto mb-2 h-10 w-10 rounded-md border grid place-items-center">
                            <ImageIcon className="h-5 w-5 text-zinc-400" />
                          </div>
                          <p className="text-sm font-medium text-zinc-800">Select Image</p>
                          <p className="text-xs text-zinc-500">PNG/JPG, up to ~10MB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pointer-events-none absolute inset-0 hidden sm:flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                    <span className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-zinc-700 shadow">
                      Change
                    </span>
                  </div>

                  <Input
                    id="flyer"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageChange}
                  />
                </label>

                <div className="flex w-full sm:w-auto gap-2 sm:flex-col">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("flyer")?.click()}
                    className="w-full sm:w-32"
                  >
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setExistingImageUrl(null);
                    }}
                    className="w-full sm:w-32"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>

            {/* RSVP Settings (public only) */}
            {!isPrivate && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Allow RSVPs?</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={allowRsvp === "yes" ? "default" : "outline"}
                      className={
                        allowRsvp === "yes"
                          ? "university-button text-white hover:opacity-100"
                          : "border-primary text-primary hover:opacity-100"
                      }
                      onClick={() => setAllowRsvp("yes")}
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      variant={allowRsvp === "no" ? "default" : "outline"}
                      className={
                        allowRsvp === "no"
                          ? "university-button text-white hover:opacity-100"
                          : "border-primary text-primary hover:opacity-100"
                      }
                      onClick={() => setAllowRsvp("no")}
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
                        variant={limitMode === "limited" ? "default" : "outline"}
                        className={
                          limitMode === "limited"
                            ? "university-button text-white hover:opacity-100"
                            : "border-primary text-primary hover:opacity-100"
                        }
                        onClick={() => setLimitMode("limited")}
                      >
                        Limited
                      </Button>
                      <Button
                        type="button"
                        variant={limitMode === "unlimited" ? "default" : "outline"}
                        className={
                          limitMode === "unlimited"
                            ? "university-button text-white hover:opacity-100"
                            : "border-[var(--primary-color)] text-[var(--primary-color)] hover:opacity-100"
                        }
                        onClick={() => setLimitMode("unlimited")}
                      >
                        No limit
                      </Button>
                    </div>

                    {limitMode === "limited" && (
                      <div className="mt-3">
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Private: Invitee selector */}
            {isPrivate && (
              <FormBlock>
                <Label>Invitees</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button type="button" className="university-button text-white" onClick={openInviteModal}>
                    Select People ({selectedIds.size})
                  </Button>

                  {selectedProfiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedProfiles.slice(0, 6).map((p) => {
                        const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed User";
                        return (
                          <div key={p.id} className="flex items-center gap-2 bg-zinc-100 rounded-full px-3 py-1">
                            <AvatarThumb url={p.avatar_url} first={p.first_name} last={p.last_name} size={24} />
                            <span className="text-sm">{name}</span>
                            <button
                              type="button"
                              className="text-zinc-500 hover:text-zinc-700 ml-1"
                              onClick={() => toggleSelect(p.id)}
                              aria-label="Remove invitee"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                      {selectedProfiles.length > 6 && (
                        <span className="text-sm text-zinc-600">+{selectedProfiles.length - 6} more</span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">Only the creator and selected invitees will see this event.</p>
              </FormBlock>
            )}

            {/* Submit */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="flex gap-4 pt-4"
            >
              <Button type="submit" className="university-button flex-1" disabled={isSubmitting}>
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

      {/* Invite Picker Modal */}
      {isPrivate && inviteModalOpen && (
        <div
          className="fixed inset-0 z-[11000] bg-black/40 flex items-center justify-center"
          onClick={() => setInviteModalOpen(false)}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg" onClick={(e) => e.stopPropagation()}>
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
                        onClick={() => toggleSelect(p.id, p)}
                      >
                        <div className="flex items-center gap-3">
                          <AvatarThumb url={p.avatar_url} first={p.first_name} last={p.last_name} size={36} />
                          <div className="flex flex-col">
                            <span className="font-medium">{full}</span>
                          </div>
                        </div>
                        <input type="checkbox" readOnly checked={checked} className="w-4 h-4 accent-primary" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedIds(new Set());
                  setSeedProfiles([]);
                }}
              >
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

function FormBlock({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="space-y-2">
      {children}
    </motion.div>
  );
}
