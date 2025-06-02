"use client";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Users, Map, MessageCircle, Sparkles } from "lucide-react";
import { ReactTyped } from "react-typed"; // Add this import

// Color tip: This will match the modern university-brand style you set in your CSS/theme.

export default function Home() {
  return (
    <main className="relative bg-[#f8f7fc] flex flex-col">
      <div className="fixed top-0 left-0 w-full z-10">
        <Header />
      </div>

      {/* Hero */}
      <section className="university-primary-text text-white shadow-sm flex items-center justify-center h-screen pt-20">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 drop-shadow-lg"
          >
            Meet <span className="text-secondary-color font-black">Herd</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: "easeOut" }}
            className="text-xl md:text-2xl university-secondary-text font-medium max-w-2xl mx-auto mb-6"
          >
            Find your next
            <ReactTyped
              strings={[
                "Party",
                "Study Group",
                "Club Meeting",
                "Event",
                "Pop-up",
                "Hangout",
                "Friend",
                "Adventure",
              ]}
              typeSpeed={60}
              backSpeed={30}
              loop
              className="text-secondary-color ml-2 font-bold"
            />
          </motion.p>
          <div className="flex flex-col md:flex-row gap-3 justify-center mt-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="w-auto"
            >
              <Button
                size="sm"
                className="university-button hover:university-secondary-bg md:px-8 px-5 py-3 text-lg font-bold shadow-lg"
                asChild
              >
                <Link href="/signup">Get Started</Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="w-full md:w-auto"
            >
              <Button
                size="sm"
                className="bg-white university-primary-text hover:bg-gray-100 md:px-8 px-11 py-3 text-lg font-bold shadow-lg border-none"
                asChild
              >
                <Link href="/login">Login</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature scenes as "cards" in a white section */}
      <section className="bg-white py-14">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center text-center"
            >
              <Sparkles className="h-10 w-10 text-secondary-color mb-3" />
              <h2 className="text-2xl font-bold university-primary-text mb-2">Discover Everything, Instantly</h2>
              <p className="text-gray-600 text-base">
                No more hunting through flyers or group chats. Search all campus happenings in seconds—from parties and popups to academic events and club meetups.
              </p>
            </motion.div>
            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center text-center"
            >
              <Users className="h-10 w-10 text-secondary-color mb-3" />
              <h2 className="text-2xl font-bold university-primary-text mb-2">Meet Your Herd</h2>
              <p className="text-gray-600 text-base">
                RSVP in one tap. See who’s going. Instantly connect with new friends and groups—Herd is more than events, it’s your social hub.
              </p>
            </motion.div>
            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center text-center"
            >
              <Map className="h-10 w-10 text-secondary-color mb-3" />
              <h2 className="text-2xl font-bold university-primary-text mb-2">Explore Your Campus</h2>
              <p className="text-gray-600 text-base">
                See what’s happening and where. The interactive campus map helps you navigate, explore, and even discover hidden gems.
              </p>
            </motion.div>
            {/* Feature 4 */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center text-center"
            >
              <MessageCircle className="h-10 w-10 text-secondary-color mb-3" />
              <h2 className="text-2xl font-bold university-primary-text mb-2">Host & Hype Up</h2>
              <p className="text-gray-600 text-base">
                Ready to lead? Post your own event, manage RSVPs, and watch your group grow. It’s never been easier to share what you’re passionate about.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="university-primary-bg py-12 text-white text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Ready to join your Herd?</h2>
          <p className="text-xl mb-7">Sign up free and start exploring today. The best events—and your next friends—are waiting.</p>
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="w-full md:w-auto"
            >
              <Button size="lg" className="university-button px-10 py-4 text-lg font-bold" asChild>
                <Link href="/signup">Sign Up Free</Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="w-full md:w-auto"
            >
              <Button size="lg" className="bg-white university-primary-text hover:bg-gray-100 px-10 py-4 text-lg font-bold shadow-lg border-none" asChild>
                <Link href="/login">Login</Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 bg-white border-t">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-gray-400 text-sm">
          <span>&copy; {new Date().getFullYear()} Herd. All rights reserved.</span>
          <span>Made for campus communities.</span>
        </div>
      </footer>
    </main>
  );
}
