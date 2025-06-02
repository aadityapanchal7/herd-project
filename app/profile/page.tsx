"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"
import { useTheme } from "@/context/theme-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Camera, Loader2, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { getUniversities, type University } from "@/lib/universities"
import ImageCropper from "@/components/image-cropper"
import { motion } from "framer-motion"

export default function ProfilePage() {
  const { toast } = useToast()
  const router = useRouter()
  const { isAuthenticated, user, loading, refreshSession } = useAuth()
  const { setUniversityColors } = useTheme()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [universities, setUniversities] = useState<University[]>([])
  const [loadingUniversities, setLoadingUniversities] = useState(true)
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    university: "",
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Image cropper state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)

  // Fetch universities when component mounts
  useEffect(() => {
    async function fetchUniversities() {
      setLoadingUniversities(true)
      try {
        const data = await getUniversities()
        setUniversities(data)
      } catch (error) {
        console.error("Error loading universities:", error)
        toast({
          title: "Error",
          description: "Failed to load universities. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setLoadingUniversities(false)
      }
    }

    fetchUniversities()
  }, [toast])

  // Populate form with user data when available
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email || "",
        university: user.university || "",
      })
      setAvatarUrl(user.avatar_url || null)

      // Find the selected university object
      if (user.university && universities.length > 0) {
        const university = universities.find((u) => u.name === user.university) || null
        setSelectedUniversity(university)
      }
    }
  }, [user, universities])

  // Don't redirect immediately - wait for loading to complete
  useEffect(() => {
    // Only redirect if loading is complete AND user is definitely not authenticated
    if (!loading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to view your profile",
        variant: "destructive",
      })
      router.push("/login")
    }
  }, [isAuthenticated, loading, router, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const fileType = file.type
    if (!fileType.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    // Set the selected file and open the cropper
    setSelectedFile(file)
    setIsCropperOpen(true)
  }

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    setIsCropperOpen(false)
    setIsUploading(true)

    try {
      // Get the current user
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        throw new Error("Authentication error")
      }

      // Generate a unique file name
      const fileName = `${authData.user.id}-${Date.now()}.jpg`
      const filePath = `avatars/${fileName}`

      // Upload the cropped image to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, croppedImageBlob, {
        contentType: "image/jpeg",
      })

      if (uploadError) {
        throw uploadError
      }

      // Get the public URL
      const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(filePath)

      // Update avatar URL in state
      setAvatarUrl(urlData.publicUrl)

      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated",
      })
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your profile picture",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setSelectedFile(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    try {
      // Get the current user
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        throw new Error("Authentication error")
      }

      // Update profile in Supabase
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authData.user.id)

      if (updateError) {
        throw updateError
      }

      // Refresh the session to get updated user data
      await refreshSession()

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      })
    } catch (error) {
      setFormError("An error occurred while updating your profile")
      toast({
        title: "Update failed",
        description: "There was a problem updating your profile",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f7fc]">
        <Header />
        <main className="flex-1 container max-w-4xl mx-auto py-10 px-4 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8a70d6] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7fc]">
      <Header />
      <main className="flex-1 container max-w-4xl mx-auto py-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h1 className="text-2xl font-bold university-primary-text mb-6">Edit Profile</h1>
          {formError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 university-border">
                  <AvatarImage src={avatarUrl || ""} alt={`${formData.firstName} ${formData.lastName}`} />
                  <AvatarFallback className="text-2xl bg-muted">
                    {formData.firstName && formData.lastName ? (
                      `${formData.firstName[0]}${formData.lastName[0]}`
                    ) : (
                      <User className="h-12 w-12" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2">
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="university-button rounded-full p-2 shadow-md">
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
              <p className="mt-4 text-sm text-gray-500">Upload a profile picture (max 5MB)</p>
            </motion.div>
            <div className="flex-1">
              <form onSubmit={handleSubmit} className="space-y-6">
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
                    <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" value={formData.email} disabled className="bg-gray-50" />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="university">University</Label>
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
                          ></div>
                        )}
                        <span>{formData.university || "No university selected"}</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">University cannot be changed after account creation</p>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
                    Cancel
                  </Button>
                  <Button type="submit"  className="university-button" onClick={() => router.push("/dashboard")}  disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </main>
      {/* Image Cropper Modal */}
      <ImageCropper
        imageFile={selectedFile}
        isOpen={isCropperOpen}
        onClose={() => {
          setIsCropperOpen(false)
          setSelectedFile(null)
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  )
}
