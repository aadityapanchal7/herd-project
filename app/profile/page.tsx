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
import { useIsMobile } from "@/hooks/use-mobile";

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, user, loading, refreshSession } = useAuth();
  const { setUniversityColors } = useTheme();
  const isMobile = useIsMobile();

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

      <main className={`flex-1 container mx-auto px-4 ${isMobile ? 'py-4 max-w-full' : 'py-8 max-w-5xl'}`}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`bg-white rounded-xl shadow ${isMobile ? 'p-4' : 'p-6'}`}
        >
          <h1 className={`font-bold university-primary-text ${isMobile ? 'text-xl mb-4' : 'text-2xl mb-6'}`}>Edit Profile</h1>

          {formError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className={`${isMobile ? 'flex flex-col gap-6' : 'flex gap-8'}`}>
            {/* Avatar section */}
            <div className={`${isMobile ? 'flex flex-col items-center w-full' : 'w-[220px] shrink-0 flex flex-col items-center'}`}>
              <div className="relative">
                {/* Avatar with responsive size */}
                <div
                  className={`relative rounded-full flex items-center justify-center overflow-hidden ${
                    isMobile ? 'w-32 h-32' : 'w-40 h-40'
                  }`}
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
                    <span className={`text-white font-extrabold tracking-wider select-none ${
                      isMobile ? 'text-4xl' : 'text-5xl'
                    }`}>
                      {initials || <User className={`text-white ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`} />}
                    </span>
                  )}
                </div>

                {/* Camera button */}
                <div className={`absolute ${isMobile ? '-bottom-2 -right-2' : '-bottom-3 -right-3'}`}>
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <div
                      className={`rounded-full shadow-md ${isMobile ? 'p-2' : 'p-3'}`}
                      style={{ backgroundColor: "var(--primary-color, #b45309)" }}
                    >
                      {isUploading ? (
                        <Loader2 className={`animate-spin text-white ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      ) : (
                        <Camera className={`text-white ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
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

              <p className={`text-gray-500 text-center ${isMobile ? 'mt-3 text-xs' : 'mt-5 text-sm'}`}>
                Upload a profile picture (max 5MB)
              </p>
              {photoUpdated && <span className={`text-gray-400 ${isMobile ? 'mt-0.5 text-xs' : 'mt-1 text-xs'}`}>Photo updated</span>}
            </div>

            {/* Form section */}
            <div className="flex-1">
              <form onSubmit={handleSubmit} className={isMobile ? 'space-y-4' : 'space-y-6'}>
                {/* Names row */}
                <div className={`grid grid-cols-1 gap-4 ${isMobile ? '' : 'md:grid-cols-2 gap-6'}`}>
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
                    <Label className={isMobile ? 'text-sm' : ''}>User ID</Label>
                    <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                      <div className={`flex-1 flex items-center rounded-md border border-input bg-muted/20 ${isMobile ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
                        <code className={`text-zinc-700 break-all ${isMobile ? 'text-xs' : 'text-xs'}`}>
                          {isMobile ? user.id.substring(0, 20) + "..." : user.id}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        aria-label="Copy user id"
                        className={`flex items-center justify-center rounded-md border hover:bg-zinc-50 ${isMobile ? 'h-8 w-8' : 'h-10 w-10'}`}
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <Check className={`text-green-600 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                        ) : (
                          <Clipboard className={`text-zinc-700 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                        )}
                      </button>
                    </div>
                    <p className={`text-zinc-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                      This is your account ID. Share only with trusted parties.
                    </p>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className={isMobile ? 'text-sm' : ''}>Email</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    value={formData.email} 
                    disabled 
                    className={`bg-gray-50 ${isMobile ? 'text-sm' : ''}`} 
                  />
                  <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>Email cannot be changed</p>
                </div>

                {/* University */}
                <div className="space-y-2">
                  <Label className={isMobile ? 'text-sm' : ''}>University</Label>
                  <div className={`flex items-center border rounded-md border-input bg-gray-50 ${isMobile ? 'h-9 px-2' : 'h-10 px-3'}`}>
                    {loadingUniversities ? (
                      <>
                        <Loader2 className={`animate-spin text-muted-foreground mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                        <span className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Loading university...</span>
                      </>
                    ) : (
                      <>
                        {selectedUniversity && (
                          <div
                            className={`rounded-full mr-2 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`}
                            style={{ backgroundColor: selectedUniversity.primary_color }}
                          />
                        )}
                        <span className={isMobile ? 'text-sm' : ''}>{formData.university || "No university selected"}</span>
                      </>
                    )}
                  </div>
                  <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>University cannot be changed after account creation</p>
                </div>

                {/* Actions */}
                <div className={`flex pt-2 ${isMobile ? 'flex-col gap-2' : 'justify-end gap-3'}`}>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push("/dashboard")}
                    size={isMobile ? "sm" : "default"}
                    className={isMobile ? 'w-full' : ''}
                  >
                    <span className={isMobile ? 'text-sm' : ''}>Cancel</span>
                  </Button>
                  <Button
                    type="submit"
                    className={`${dirty ? "university-button" : "bg-gray-200 text-gray-600 cursor-default"} ${
                      savedPulse ? "animate-pulse" : ""
                    } ${isMobile ? 'w-full' : ''}`}
                    disabled={isSubmitting || !dirty}
                    size={isMobile ? "sm" : "default"}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className={`mr-2 animate-spin ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                        <span className={isMobile ? 'text-sm' : ''}>Saving…</span>
                      </>
                    ) : dirty ? (
                      <span className={isMobile ? 'text-sm' : ''}>Save Changes</span>
                    ) : (
                      <span className={isMobile ? 'text-sm' : ''}>Saved</span>
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
