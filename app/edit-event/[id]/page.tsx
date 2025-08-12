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
import { AlertCircle, MapPin, Search as SearchIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
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

export default function EditEventPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated, user, loading } = useAuth();

  // tolerate numeric or uuid ids
  const eventKey: string | number = /^\d+$/.test(eventId) ? Number(eventId) : eventId;

  // derive `school` key (extend as needed)
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

  // chosen venue coords
  const [locationCoords, setLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // ---------- Private invitee selector state ----------
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");

  // selected invitees (current state)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // previously-saved invitees (loaded from DB) to compute removals
  const [originalInviteeIds, setOriginalInviteeIds] = useState<Set<string>>(new Set());

  // Profiles we fetched for existing invitees (if missing from directory)
  const [seedProfiles, setSeedProfiles] = useState<Profile[]>([]);

  const isPrivate = !!event?.is_private;

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

  // Fetch event data (+ existing invitees if private)
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

        // Only the creator can edit
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

        // date for input
        const eventDate = new Date(data.date);
        const formattedDate = eventDate.toISOString().split("T")[0];

        setFormData((prev) => ({
          ...prev,
          title: data.title,
          category: data.category,
          description: data.description,
          date: formattedDate,
          time: data.time,
          location: data.location,
          maxAttendees: data.max_attendees?.toString?.() ?? "100", // ignored for private
          creator_name: data.creator_name || "",
        }));

        setLocationCoords({
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
        });

        // If private, load invitees and their basic profiles
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

        // Preload directory list for invite modal (optional: paginate)
        setProfilesLoading(true);
        const { data: directory } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .order("first_name", { ascending: true });
        setAllProfiles((directory as Profile[]) ?? []);
        setProfilesLoading(false);
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
  }, [eventId, eventKey, isAuthenticated, user, router, toast]);

  // whenever the school key or selected location changes, update coords
  useEffect(() => {
    const coords = VENUE_COORDS[school]?.[formData.location] ?? null;
    setLocationCoords(coords);
  }, [school, formData.location]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // -------- Invitee helpers --------
  function openInviteModal() {
    setInviteModalOpen(true);
  }

  function toggleSelect(uid: string, profile?: Profile) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

    // Seed profile cache so chips show names even if not in directory list
    if (profile) {
      setSeedProfiles((prev) => uniqById([...(prev ?? []), profile]));
    }
  }

  // Search by name OR ID, but do NOT display the ID anywhere
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

  // Derive selectedProfiles uniquely from selectedIds using directory+seed
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

  // -------- Submit / Save --------
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
    if (!title || !category || !description || !date || !time || !location || !creator_name) {
      setFormError("Please fill out all required fields.");
      setIsSubmitting(false);
      return;
    }

    // validate per public/private
    let maxAtt: number | null = null;
    if (!isPrivate) {
      const parsed = parseInt(maxAttendees, 10);
      if (isNaN(parsed) || parsed < 1) {
        setFormError("Please enter a valid maximum number of attendees.");
        setIsSubmitting(false);
        return;
      }
      maxAtt = parsed;
    } else {
      if (selectedIds.size === 0) {
        setFormError("Select at least one invitee.");
        setIsSubmitting(false);
        return;
      }
    }

    // re-check auth from Supabase
    const { data: authData, error: authErr } = await supabase.auth.getUser();
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
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        setFormError("Please select a valid date.");
        setIsSubmitting(false);
        return;
      }

      const updates: any = {
        title,
        category,
        description,
        date: format(parsedDate, "MMM d, yyyy"),
        time,
        location,
        creator_name,
        latitude: locationCoords?.latitude,
        longitude: locationCoords?.longitude,
        university_id: universityId,
      };

      // Public: update max_attendees; Private: leave unchanged
      if (!isPrivate) {
        updates.max_attendees = maxAtt;
      }

      const { error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", eventKey)
        .eq("created_by", authData.user.id);

      if (error) throw error;

      // For private events: update invitees and prune removed RSVPs
      if (isPrivate) {
        const newInvitees = Array.from(selectedIds); // string[]
        const prevInvitees = Array.from(originalInviteeIds); // string[]

        // Compute removed IDs
        const removed = prevInvitees.filter((id) => !selectedIds.has(id));

        // 1) Try updating existing private_events row
        const { error: peUpdateErr, status } = await supabase
          .from("private_events")
          .update({ invitee_user_ids: newInvitees })
          .eq("event_id", eventKey);

        if (peUpdateErr && status !== 406) throw peUpdateErr;

        // 2) If no row, insert (ensure creator_id set)
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

        // 3) Prune RSVPs for removed users
        if (removed.length > 0) {
          const { error: delErr } = await supabase
            .from("event_rsvps")
            .delete()
            .eq("event_id", eventKey)
            .in("user_id", removed);
          if (delErr) throw delErr;

          // Update local baseline so subsequent saves compute correctly
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
                placeholder="e.g., Student Union, Jane Doe"
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

            {/* Public: Maximum Attendees | Private: Invitee Selector */}
            {!isPrivate ? (
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
            ) : (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="space-y-2"
              >
                <Label>Invitees</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    type="button"
                    className="university-button text-white"
                    onClick={openInviteModal}
                  >
                    Select People ({selectedIds.size})
                  </Button>

                  {/* Chips (max 6 + +X) */}
                  {selectedProfiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedProfiles.slice(0, 6).map((p) => {
                        const name =
                          `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
                          "Unnamed User";
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 bg-zinc-100 rounded-full px-3 py-1"
                          >
                            <AvatarThumb
                              url={p.avatar_url}
                              first={p.first_name}
                              last={p.last_name}
                              size={24}
                            />
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
                        <span className="text-sm text-zinc-600">
                          +{selectedProfiles.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Only the creator and selected invitees will see this event.
                </p>
              </motion.div>
            )}

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

      {/* Invite Picker Modal (only relevant if private) */}
      {isPrivate && inviteModalOpen && (
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
                    const full =
                      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
                      "Unnamed User";
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
                            {/* Intentionally NOT rendering the ID to keep it private */}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          readOnly
                          checked={checked}
                          className="w-4 h-4 accent-[var(--primary-color)]"
                        />
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
              <Button
                className="university-button text-white"
                onClick={() => setInviteModalOpen(false)}
              >
                Done ({selectedIds.size} selected)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
