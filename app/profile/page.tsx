// app/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Camera, Clipboard, Check, Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getUniversities, type University } from "@/lib/universities";
import ImageCropper from "@/components/image-cropper";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, user, loading, refreshSession } = useAuth();
  const { setUniversityColors } = useTheme();

  // form + ui state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);

  // data
  const [universities, setUniversities] = useState<University[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    university: "",
  });

  // image cropper
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  // copy id feedback
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // subtle “photo updated”
  const [photoUpdated, setPhotoUpdated] = useState(false);
  const photoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // load universities
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingUniversities(true);
      try {
        const data = await getUniversities();
        if (active) setUniversities(data);
      } catch (e) {
        toast({
          title: "Error",
          description: "Failed to load universities. Please try again later.",
          variant: "destructive",
        });
      } finally {
        if (active) setLoadingUniversities(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  // populate form
  useEffect(() => {
    if (!user) return;
    setFormData({
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      email: user.email || "",
      university: user.university || "",
    });
    setAvatarUrl(user.avatar_url || null);
    setDirty(false);

    if (user.university && universities.length > 0) {
      const uni = universities.find((u) => u.name === user.university) || null;
      setSelectedUniversity(uni);
    }
  }, [user, universities]);

  // auth gate
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to view your profile",
        variant: "destructive",
      });
      router.push("/login");
    }
  }, [isAuthenticated, loading, router, toast]);

  // initials for fallback
  const initials = useMemo(() => {
    const f = (formData.firstName || "").trim();
    const l = (formData.lastName || "").trim();
    if (f || l) return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase();
    return "";
  }, [formData.firstName, formData.lastName]);

  // handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 5MB", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    setIsCropperOpen(true);
  };

  const handleCropComplete = async (blob: Blob) => {
    setIsCropperOpen(false);
    setIsUploading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Authentication error");

      const fileName = `${authData.user.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, blob, {
        contentType: "image/jpeg",
      });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(filePath);
      setAvatarUrl(urlData.publicUrl);
      setDirty(true);

      // subtle note
      if (photoTimerRef.current) clearTimeout(photoTimerRef.current);
      setPhotoUpdated(true);
      photoTimerRef.current = setTimeout(() => setPhotoUpdated(false), 1500);
    } catch (e) {
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  };

  const handleCopyId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      setCopied(true);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy your ID to the clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Authentication error");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authData.user.id);

      if (updateError) throw updateError;

      await refreshSession();

      // quiet “Saved” state
      setDirty(false);
      setSavedPulse(true);
      setTimeout(() => setSavedPulse(false), 1000);
    } catch (error) {
      setFormError("An error occurred while updating your profile");
      toast({
        title: "Update failed",
        description: "There was a problem updating your profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (photoTimerRef.current) clearTimeout(photoTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f7fc]">
        <Header />
        <main className="flex-1 container max-w-4xl mx-auto py-10 px-4 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8a70d6] mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7fc]">
      <Header />

      <main className="flex-1 container max-w-5xl mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white rounded-xl shadow p-6"
        >
          <h1 className="text-2xl font-bold university-primary-text mb-6">Edit Profile</h1>

          {formError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-8">
            {/* Left: small avatar column */}
            <div className="w-[220px] shrink-0 flex flex-col items-center">
              <div className="relative">
                {/* ~160px avatar to match screenshot scale */}
                <div
                  className="relative w-40 h-40 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: "var(--primary-color, #b45309)" }}
                >
                  {/* subtle ring */}
                  <div className="absolute inset-2 rounded-full border-4 border-white/90 pointer-events-none" />
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="absolute inset-0 w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "";
                      }}
                    />
                  ) : (
                    <span className="text-white text-5xl font-extrabold tracking-wider select-none">
                      {initials || <User className="w-10 h-10 text-white" />}
                    </span>
                  )}
                </div>

                {/* Camera button */}
                <div className="absolute -bottom-3 -right-3">
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <div
                      className="rounded-full p-3 shadow-md"
                      style={{ backgroundColor: "var(--primary-color, #b45309)" }}
                    >
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      ) : (
                        <Camera className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>

              <p className="mt-5 text-sm text-gray-500 text-center">
                Upload a profile picture (max 5MB)
              </p>
              {photoUpdated && <span className="mt-1 text-xs text-gray-400">Photo updated</span>}
            </div>

            {/* Right: form */}
            <div className="flex-1">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Names row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* User ID row (copyable) */}
                {user?.id && (
                  <div className="space-y-1">
                    <Label>User ID</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center rounded-md border border-input bg-muted/20 px-3 py-2">
                        <code className="text-xs text-zinc-700 break-all">{user.id}</code>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        aria-label="Copy user id"
                        className="h-10 w-10 flex items-center justify-center rounded-md border hover:bg-zinc-50"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Clipboard className="w-4 h-4 text-zinc-700" />}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500">
                      This is your account ID. Share only with trusted parties.
                    </p>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" value={formData.email} disabled className="bg-gray-50" />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>

                {/* University */}
                <div className="space-y-2">
                  <Label>University</Label>
                  <div className="flex items-center h-10 border rounded-md border-input bg-gray-50 px-3">
                    {loadingUniversities ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                        <span className="text-sm text-muted-foreground">Loading university...</span>
                      </>
                    ) : (
                      <>
                        {selectedUniversity && (
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: selectedUniversity.primary_color }}
                          />
                        )}
                        <span>{formData.university || "No university selected"}</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">University cannot be changed after account creation</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className={`${dirty ? "university-button" : "bg-gray-200 text-gray-600 cursor-default"} ${
                      savedPulse ? "animate-pulse" : ""
                    }`}
                    disabled={isSubmitting || !dirty}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : dirty ? (
                      "Save Changes"
                    ) : (
                      "Saved"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Cropper Modal */}
      <ImageCropper
        imageFile={selectedFile}
        isOpen={isCropperOpen}
        onClose={() => {
          setIsCropperOpen(false);
          setSelectedFile(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
