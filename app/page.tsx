"use client";

import { Header } from "@/components/header";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { BrandSparkIcon } from "@/components/icons/BrandSparkIcon"
import { IconWrapper } from "@/components/icons/IconWrapper"
import { DiscoveryIcon } from "@/components/icons/DiscoveryIcon"
import { CommunityIcon } from "@/components/icons/CommunityIcon"
import { MapIcon } from "@/components/icons/MapIcon"
import { HostIcon } from "@/components/icons/HostIcon"
import { ReactTyped } from "react-typed";
import { useAuth } from "@/context/auth-context";

export default function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <main className="relative bg-gradient-to-b from-[#f8f7fc] via-white to-[#fbf9ff] flex flex-col min-h-screen">
      <div className="fixed top-0 left-0 w-full z-10">
        <Header />
      </div>

      {/* Hero */}
      <section className="flex items-center justify-center h-screen pt-24">
        <div className="container max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="text-left"
          >
            {/* Eyebrow brand row — primary pill w/ white text */}
            <div className="mb-6">
              <div
                className="inline-flex items-center gap-2 md:gap-3 rounded-full px-3 py-2 md:px-4 md:py-2
               bg-primary text-white shadow-md"
              >
                <Image
                  src="/herd-logo.jpg"
                  alt="Herd"
                  width={28}
                  height={28}
                  className="rounded-md"
                  priority
                />
                <span className="text-sm md:text-[15px] font-semibold leading-none">
                  Campus social, redesigned
                </span>
              </div>
            </div>



            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4 text-foreground">
              Meet Herd — discover, join, and host campus events
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-6">
              Skip the clutter. Herd centralizes campus happenings and makes RSVPs, meetups, and community discovery effortless.
            </p>

            <div className="flex flex-wrap gap-3">
              {!isAuthenticated ? (
                <>
                  <Button size="lg" className="university-button px-8 py-3 text-lg font-bold" asChild>
                    <Link href="/signup">Get Started</Link>
                  </Button>
                  <Button size="lg" className="bg-white university-primary-text hover:bg-gray-100 px-6 py-3 text-lg font-semibold shadow-md border-none" asChild>
                    <Link href="/login">Log in</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" className="bg-white text-foreground px-6 py-3 font-semibold shadow-md flex items-center gap-2" onClick={() => window.location.assign('/dashboard')}>
                    <IconWrapper size="w-4 h-4">
                      <BrandSparkIcon />
                    </IconWrapper>
                    Go to Dashboard
                  </Button>
                  <Button size="lg" className="university-button px-6 py-3 text-lg font-semibold flex items-center gap-2" asChild>
                    <Link href="/create-public-event"><>
                      <IconWrapper size="w-4 h-4">
                        <BrandSparkIcon />
                      </IconWrapper>
                      Create Event
                    </></Link>
                  </Button>
                </>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="hidden md:flex justify-center"
          >
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold university-primary-text">Upcoming near you</h3>
                  <p className="text-sm text-muted-foreground">Popular this week on campus</p>
                </div>
                <span className="text-sm text-muted-foreground">Live</span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gradient-to-r from-neutral-50 to-white border flex items-start gap-3">
                  <div className="flex-shrink-0 bg-primary w-10 h-10 rounded-lg" />
                  <div>
                    <div className="font-semibold">Study Group: Algorithms</div>
                    <div className="text-sm text-muted-foreground">Today · 6:00 PM · History Library - Room 3</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-neutral-50 border flex items-start gap-3">
                  <div className="flex-shrink-0 bg-accent w-10 h-10 rounded-lg" />
                  <div>
                    <div className="font-semibold">Campus Fair</div>
                    <div className="text-sm text-muted-foreground">Sat · 12:00 PM · Quad Dorms</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-neutral-50 border flex items-start gap-3">
                  <div className="flex-shrink-0 bg-secondary w-10 h-10 rounded-lg" />
                  <div>
                    <div className="font-semibold">Open Mic Night</div>
                    <div className="text-sm text-muted-foreground">Fri · 8:30 PM · Student Center</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature scenes as a polished card grid */}
      <section className="bg-white py-14">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/** Card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="group bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-3 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105">
                  <DiscoveryIcon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Unified Discovery</h3>
              </div>
              <p className="text-sm text-muted-foreground">Search campus events across clubs, departments, and socials in one place — fast filters, clear categories, and saved searches.</p>
            </motion.div>

            {/** Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 }}
              className="group bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-3 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105">
                  <CommunityIcon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Community & RSVPs</h3>
              </div>
              <p className="text-sm text-muted-foreground">RSVP in one tap, see who’s attending, and connect with attendees — build a network around every event.</p>
            </motion.div>

            {/** Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
              className="group bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-3 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105">
                  <MapIcon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Interactive Map</h3>
              </div>
              <p className="text-sm text-muted-foreground">Visualize events by location, route to venues, and discover nearby gatherings — perfect for exploring campus life.</p>
            </motion.div>

            {/** Card 4 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18 }}
              className="group bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-3 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105">
                  <HostIcon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Host with Confidence</h3>
              </div>
              <p className="text-sm text-muted-foreground">Create, promote, and manage events with easy RSVP tools and reminders — keep attendees informed and engaged.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 bg-white border-t">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-gray-400 text-sm">
          <span>&copy; {new Date().getFullYear()} Herd. All rights reserved.</span>
          <span>Made for campus communities.</span>
        </div>
      </footer>
    </main>
  )
}
