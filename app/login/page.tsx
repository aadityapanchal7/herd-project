"use client"

import type React from "react"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/auth-context"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion" // <-- Add this import

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const success = await login(formData.email, formData.password)
      if (success) {
        toast({
        })
        router.push("/dashboard")
      } else {
        toast({
          title: "Login failed",
          description: "Invalid email or password",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "An error occurred during login",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  

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
            <h1 className="text-3xl font-bold">Login to Herd</h1>
            <p className="text-gray-500">Enter your credentials to access your account</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link className="text-sm university-primary-text" href="#">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                required
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <Button className="w-full university-primary-button" type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            <div className="text-center text-sm">
              Don't have an account?{" "}
              <Link className="university-primary-text" href="/signup">
                Sign up
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
