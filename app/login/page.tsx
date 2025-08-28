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
import { motion } from "framer-motion"
import { useIsMobile } from "@/hooks/use-mobile"

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useIsMobile()
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
      <div className={`container flex items-center ${isMobile ? 'h-14 px-4' : 'h-16 px-4 md:px-6'}`}>
        <Link href="/" className="flex items-center">
          <h1 className={`font-semibold university-primary-text ${isMobile ? 'text-xl' : 'text-2xl'}`}>Herd</h1>
        </Link>
      </div>
      <div className={`flex-1 flex items-center justify-center ${isMobile ? 'px-4' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`mx-auto w-full bg-white rounded-lg shadow-md ${
            isMobile ? 'max-w-sm space-y-4 p-4' : 'max-w-md space-y-6 p-6'
          }`}
        >
          <div className={`text-center ${isMobile ? 'space-y-1' : 'space-y-2'}`}>
            <h1 className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>Login to Herd</h1>
            <p className={`text-gray-500 ${isMobile ? 'text-sm' : ''}`}>Enter your credentials to access your account</p>
          </div>
          <form onSubmit={handleSubmit} className={isMobile ? 'space-y-3' : 'space-y-4'}>
            <div className="space-y-2">
              <Label htmlFor="email" className={isMobile ? 'text-sm' : ''}>Email</Label>
              <Input
                id="email"
                name="email"
                placeholder="m@example.com"
                required
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={isMobile ? 'text-sm' : ''}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className={isMobile ? 'text-sm' : ''}>Password</Label>
                <Link className={`university-primary-text ${isMobile ? 'text-xs' : 'text-sm'}`} href="#">
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
                className={isMobile ? 'text-sm' : ''}
              />
            </div>
            <Button 
              className="w-full university-primary-button" 
              type="submit" 
              disabled={isLoading}
              size={isMobile ? "sm" : "default"}
            >
              <span className={isMobile ? 'text-sm' : ''}>
                {isLoading ? "Logging in..." : "Login"}
              </span>
            </Button>
            <div className={`text-center ${isMobile ? 'text-xs' : 'text-sm'}`}>
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
