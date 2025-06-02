"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { useTheme } from "@/context/theme-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getUniversities, type University } from "@/lib/universities"
import { Loader2 } from "lucide-react"
import { motion } from "framer-motion"

export default function SignupPage() {
  const { signup } = useAuth()
  const { setUniversityColors } = useTheme()
  const router = useRouter()
  const { isAuthenticated, user, loading, refreshSession } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [universities, setUniversities] = useState<University[]>([])
  const [loadingUniversities, setLoadingUniversities] = useState(true)
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    university: "",
  })

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleUniversityChange = (value: string) => {
    setFormData((prev) => ({ ...prev, university: value }))

    // Find the selected university object
    const university = universities.find((u) => u.name === value) || null
    setSelectedUniversity(university)

    // Preview the university colors
    if (university) {
      setUniversityColors(university.name)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const success = await signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        university: formData.university,
      })

      if (success) {
        toast({
          title: "Account created",
          description: "Welcome to Herd! Your account has been created successfully.",
        })
        // Add a small delay before redirecting
        setTimeout(() => {
          router.push("/")
        }, 500)
      } else {
        toast({
          title: "Signup failed",
          description: "An error occurred during signup",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Signup failed",
        description: "An error occurred during signup",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
      // Only redirect if loading is complete AND user is definitely not authenticated
      if (isAuthenticated) {
        toast({
          title: "Visit your dashboard",
          description: "Explore Events!",
          variant: "default",
        })
        router.push("/dashboard")
      }
    }, [isAuthenticated, loading, router, toast])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center">
          <h1 className="text-2xl font-semibold university-primary-text">Herd</h1>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mx-auto max-w-md space-y-6 p-6 bg-white rounded-lg shadow-md"
        >
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="text-gray-500">Enter your information to get started</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First name</Label>
                <Input
                  id="first-name"
                  name="firstName"
                  placeholder="John"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="focus:university-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input
                  id="last-name"
                  name="lastName"
                  placeholder="Doe"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="focus:university-ring"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                placeholder="m@example.com"
                required
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="focus:university-ring"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                required
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="focus:university-ring bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="university">University</Label>
              {loadingUniversities ? (
                <div className="flex items-center justify-center h-10 border rounded-md border-input bg-background">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading universities...</span>
                </div>
              ) : (
                <Select required value={formData.university} onValueChange={handleUniversityChange}>
                  <SelectTrigger id="university" className="focus:university-ring">
                    <SelectValue placeholder="Select your university" />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.length > 0 ? (
                      universities.map((university) => (
                        <SelectItem key={university.id} value={university.name}>
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: university.primary_color }}
                            ></div>
                            {university.name}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-universities" disabled>
                        No universities available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedUniversity && (
              <div className="p-3 border rounded-md">
                <p className="text-sm font-medium mb-2">University Theme Preview:</p>
                <div className="flex space-x-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: selectedUniversity.primary_color }}
                    title="Primary Color"
                  ></div>
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: selectedUniversity.secondary_color }}
                    title="Secondary Color"
                  ></div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded text-sm"
                    style={{
                      backgroundColor: selectedUniversity.primary_color,
                      color: selectedUniversity.text_color,
                    }}
                  >
                    Primary
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded text-sm"
                    style={{
                      backgroundColor: selectedUniversity.secondary_color,
                      color: selectedUniversity.text_color,
                    }}
                  >
                    Secondary
                  </button>
                </div>
              </div>
            )}

            <Button className="w-full university-button" type="submit" disabled={isLoading || loadingUniversities}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link className="university-primary-text" href="/login">
                Login
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
