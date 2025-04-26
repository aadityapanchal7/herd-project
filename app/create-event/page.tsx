"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, MapPin } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { geocodeLocation, generateFallbackCoordinates } from "@/lib/geocoding"
import { getUniversityByName } from "@/lib/universities"

export default function CreateEventPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { isAuthenticated, user, loading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [dateError, setDateError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>("")
  const [formError, setFormError] = useState<string | null>(null)
  const [locationCoordinates, setLocationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    time: "",
    maxAttendees: "100",
  })
  const [dateInput, setDateInput] = useState<string>("")

  // Don't redirect immediately - wait for loading to complete
  useEffect(() => {
    // Only redirect if loading is complete AND user is definitely not authenticated
    if (!loading && !isAuthenticated) {
      console.log("Not authenticated and loading complete, redirecting to login")
      toast({
        title: "Authentication Required",
        description: "You must be logged in to create an event",
        variant: "destructive",
      })
      router.push("/login")
    }
  }, [isAuthenticated, loading, router, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Reset coordinates when location changes
    if (name === "location") {
      setLocationCoordinates(null)
    }
  }

  // Handle geocoding when location field loses focus
  const handleLocationBlur = async () => {
    if (!formData.location || formData.location.trim() === "") return

    setIsGeocodingLocation(true)
    try {
      const coordinates = await geocodeLocation(formData.location, user?.university)
      setLocationCoordinates(coordinates)

      if (!coordinates) {
        toast({
          title: "Location Notice",
          description: "Couldn't find exact coordinates for this location. A nearby point will be used on the map.",
        })
      }
    } catch (error) {
      console.error("Error geocoding location:", error)
    } finally {
      setIsGeocodingLocation(false)
    }
  }

  // Handle date selection
  const handleDateSelect = (selectedDate: Date | undefined) => {
    console.log("Date selected:", selectedDate)
    setDate(selectedDate)
    setDateError(null) // Clear any date error when a date is selected
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)
    setDateError(null)

    if (dateInput) {
      try {
        // Simple validation for MM/DD/YYYY format
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
          const [month, day, year] = dateInput.split("/").map(Number)
          const newDate = new Date(year, month - 1, day)

          // Check if it's a valid date
          if (!isNaN(newDate.getTime())) {
            setDate(newDate)
          } else {
            setDateError("Please enter a valid date")
            setIsSubmitting(false)
            return
          }
        } else {
          setDateError("Please enter date in MM/DD/YYYY format")
          setIsSubmitting(false)
          return
        }
      } catch (error) {
        console.error("Error parsing date:", error)
        setDateError("Please enter a valid date in MM/DD/YYYY format")
        setIsSubmitting(false)
        return
      }
    }

    try {
      // Validate date first
      if (!date || isNaN(date.getTime())) {
        setDateError("Please enter a valid date in MM/DD/YYYY format")
        setIsSubmitting(false)
        return
      }

      // Get the current user directly from Supabase
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        console.error("Auth error in form submission:", authError || "No user found")
        setFormError("Authentication error. Please log in again.")
        toast({
          title: "Authentication Error",
          description: "Please log in again to create an event.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Extract form data from state
      const title = formData.title
      const description = formData.description
      const time = formData.time
      const location = formData.location
      const maxAttendees = Number.parseInt(formData.maxAttendees)

      // Format date for database
      const dateValue = format(date, "MMM d, yyyy")

      console.log("Submitting event with date:", dateValue)

      // Validate form data
      if (!title) {
        setFormError("Event title is required")
        setIsSubmitting(false)
        return
      }

      if (!category) {
        setFormError("Please select a category")
        setIsSubmitting(false)
        return
      }

      if (!description) {
        setFormError("Event description is required")
        setIsSubmitting(false)
        return
      }

      if (!time) {
        setFormError("Event time is required")
        setIsSubmitting(false)
        return
      }

      if (!location) {
        setFormError("Event location is required")
        setIsSubmitting(false)
        return
      }

      if (isNaN(maxAttendees) || maxAttendees <= 0) {
        setFormError("Please enter a valid number of maximum attendees")
        setIsSubmitting(false)
        return
      }

      // If we don't have coordinates yet, try to geocode the location
      let coordinates = locationCoordinates
      if (!coordinates) {
        coordinates = await geocodeLocation(location, user?.university)
      }

      // If geocoding failed, generate fallback coordinates
      if (!coordinates && user) {
        const university = await getUniversityByName(user.university)
        if (university) {
          coordinates = generateFallbackCoordinates(
            university.latitude,
            university.longitude,
            Math.floor(Math.random() * 1000), // Use a random number as event ID for now
          )
        }
      }

      // Get the user's university ID
      let universityId = null
      if (user) {
        const university = await getUniversityByName(user.university)
        if (university) {
          universityId = university.id
        }
      }

      // Insert directly using the client-side Supabase instance
      const { data, error } = await supabase
        .from("events")
        .insert({
          title,
          category,
          description,
          date: dateValue,
          time,
          location,
          max_attendees: maxAttendees,
          current_attendees: 0,
          verified: false,
          created_by: authData.user.id,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          university_id: universityId,
        })
        .select()

      if (error) {
        console.error("Error creating event:", error)
        setFormError(error.message)
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Event created successfully!",
        })
        router.push("/")
      }
    } catch (error) {
      console.error("Error creating event:", error)
      setFormError("An unexpected error occurred. Please try again.")
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state while authentication is being checked
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

  // Only show the not authenticated message if we're sure the user is not authenticated
  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f7fc]">
        <Header />
        <main className="flex-1 container max-w-4xl mx-auto py-10 px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              You must be logged in to create an event.{" "}
              <Button variant="link" className="p-0" onClick={() => router.push("/login")}>
                Log in now
              </Button>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7fc]">
      <Header />
      <main className="flex-1 container max-w-4xl mx-auto py-10 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold university-primary-text mb-6">Create New Event</h1>

          {formError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter event title"
                required
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" value={category} onValueChange={setCategory} required>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your event"
                rows={4}
                required
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date">Date (MM/DD/YYYY)</Label>
                <Input
                  id="date"
                  name="date"
                  type="text"
                  placeholder="05/01/2025"
                  required
                  className={dateError ? "border-red-500" : ""}
                  value={dateInput}
                  onChange={(e) => {
                    setDateInput(e.target.value)
                    setDateError(null)
                  }}
                  onBlur={() => {
                    try {
                      if (dateInput) {
                        // Simple validation for MM/DD/YYYY format
                        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
                          const [month, day, year] = dateInput.split("/").map(Number)
                          const newDate = new Date(year, month - 1, day)

                          // Check if it's a valid date
                          if (!isNaN(newDate.getTime())) {
                            setDate(newDate)
                            setDateError(null)
                          } else {
                            setDateError("Please enter a valid date")
                          }
                        } else {
                          setDateError("Please enter date in MM/DD/YYYY format")
                        }
                      } else {
                        setDate(undefined)
                      }
                    } catch (error) {
                      console.error("Error parsing date:", error)
                      setDateError("Please enter a valid date in MM/DD/YYYY format")
                    }
                  }}
                />
                {dateError && <p className="text-sm text-red-500 mt-1">{dateError}</p>}
                <p className="text-xs text-gray-500">Example: 05/01/2025 for May 1, 2025</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input id="time" name="time" type="time" required value={formData.time} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <Input
                  id="location"
                  name="location"
                  placeholder="Event location (e.g., Main Library, Room 101)"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  onBlur={handleLocationBlur}
                  className="pr-10"
                />
                {isGeocodingLocation ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-5 w-5 border-b-2 border-[#8a70d6] rounded-full"></div>
                  </div>
                ) : locationCoordinates ? (
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                ) : (
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-500">
                {locationCoordinates
                  ? "Location found! It will be accurately displayed on the map."
                  : "Enter a specific location for accurate placement on the map."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAttendees">Maximum Attendees</Label>
              <Input
                id="maxAttendees"
                name="maxAttendees"
                type="number"
                min="1"
                placeholder="100"
                required
                value={formData.maxAttendees}
                onChange={handleChange}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => router.push("/")}>
                Cancel
              </Button>
              <Button type="submit" className="university-button hover:bg-[#7a60c6]" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
