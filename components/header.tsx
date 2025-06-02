'use client'

import Link from "next/link"
import { Bell, LogOut, User, PlusCircle, CalendarCheck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

export function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = () => {
    logout()
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    })
    router.push("/")
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-b bg-white"
    >
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <button
          onClick={() => router.push(isAuthenticated ? "/dashboard" : "/")}
          style={{ cursor: "pointer" }}
          className="flex items-center"
        >
          <h1 className="text-2xl font-semibold university-primary-text">Herd</h1>
          {isAuthenticated && (
            <>
              <h1 className="text-2xl hidden font-semibold university-primary-text md:pl-1.5">at</h1>
              <span className="text-2xl hidden font-semibold university-primary-text md:pl-1.5">
                {user?.university}
              </span>
            </>
          )}
        </button>

        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <Button
              className="university-primary-bg hover:university-secondary-bg"
              onClick={() => router.push("/create-event")}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          )}


          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar_url || ""} alt={user?.first_name || ""} />
                    <AvatarFallback className="university-button text-primary-foreground">
                      {user?.first_name?.[0]}
                      {user?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {user?.first_name} {user?.last_name}
                </DropdownMenuLabel>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem>
                  <Link href="/profile" className="flex w-full items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <Link href="/my-events" className="flex w-full items-center">
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    My Events
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <Link href="/members" className="flex w-full items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Members
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button className="university-button" asChild>
                <Link href="/signup">
                  <span className="flex items-center gap-1">Sign Up</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.header>
  )
}
