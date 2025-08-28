"use client"

import Image from 'next/image'
import Link from "next/link"
import { Mail, LogOut, User, PlusCircle, CalendarCheck, Users, Calendar, Heart } from "lucide-react"
import { IconWrapper } from "@/components/icons/IconWrapper"
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
import { useIsMobile } from "@/hooks/use-mobile"

export function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const handleLogout = () => {
    logout()
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
          className="flex items-center gap-2 sm:gap-3"
        >
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <Image
              src="/herd-logo.jpg"
              alt="Herd"
              width={isMobile ? 32 : 40}
              height={isMobile ? 32 : 40}
              className="rounded-md"
            />
            <span className={`font-semibold university-primary-text ${isMobile ? 'text-lg' : 'text-xl'}`}>
              Herd
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-4">
          {isAuthenticated && (
            <Button
              className="university-button university-button:hover"
              onClick={() => router.push("/create-public-event")}
              size={isMobile ? "sm" : "default"}
            >
              <IconWrapper>
                <PlusCircle className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
              </IconWrapper>
              <span className={`ml-1 sm:ml-2 ${isMobile ? 'text-sm' : ''}`}>
                {isMobile ? "Create" : "Create Event"}
              </span>
            </Button>
          )}


          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`relative rounded-full p-0 ${isMobile ? 'h-8 w-8' : 'h-10 w-10'}`}>
                  <Avatar className={isMobile ? "h-8 w-8" : "h-10 w-10"}>
                    <AvatarImage src={user?.avatar_url || ""} alt={user?.first_name || ""} />
                    <AvatarFallback className={`university-button font-semibold text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {user?.first_name?.[0].toUpperCase()}
                      {user?.last_name?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={`${isMobile ? 'w-56' : 'w-64'}`}>
                <DropdownMenuLabel className={isMobile ? "text-sm" : ""}>
                  {user?.first_name} {user?.last_name}
                </DropdownMenuLabel>
                <DropdownMenuLabel className={`font-normal text-muted-foreground ${isMobile ? 'text-xs' : 'text-xs'}`}>
                  {isMobile ? user?.email?.substring(0, 25) + (user?.email && user?.email.length > 25 ? "..." : "") : user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem>
                  <Link href="/profile" className="flex w-full items-center">
                    <User className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className={isMobile ? 'text-sm' : ''}>Profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <Link href="/my-events" className="flex w-full items-center">
                    <CalendarCheck className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className={isMobile ? 'text-sm' : ''}>
                      {isMobile ? "My Events" : "Manage My Events"}
                    </span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <Link href="/my-created-events" className="flex w-full items-center">
                    <Calendar className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className={isMobile ? 'text-sm' : ''}>
                      {isMobile ? "Created Events" : "My Created Events"}
                    </span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <Link href="/my-invites" className="flex w-full items-center">
                    <Mail className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className={isMobile ? 'text-sm' : ''}>My Invites</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <Link href="/members" className="flex w-full items-center">
                    <Users className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className={isMobile ? 'text-sm' : ''}>Members</span>
                  </Link>
                </DropdownMenuItem>



                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  <span className={isMobile ? 'text-sm' : ''}>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="outline" asChild size={isMobile ? "sm" : "default"}>
                <Link href="/login" className={isMobile ? 'text-sm' : ''}>Login</Link>
              </Button>
              <Button className="university-button" asChild size={isMobile ? "sm" : "default"}>
                <Link href="/signup">
                  <span className={`flex items-center gap-1 ${isMobile ? 'text-sm' : ''}`}>Sign Up</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.header>
  )
}
