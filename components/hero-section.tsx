"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar, Filter, Search, Map, List } from "lucide-react"
import { useEvents } from "@/context/events-context"
import { useView } from "@/context/view-context"
import { useAuth } from "@/context/auth-context"
import type { EventCategory } from "@/lib/types"
import { motion } from "framer-motion"

export function HeroSection() {
  const {
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedDate,
    setSelectedDate,
    selectedUniversity,
    setSelectedUniversity,
    universities,
  } = useEvents()
  const { activeView, setActiveView } = useView()
  const { isAuthenticated, user } = useAuth()
  const [searchValue, setSearchValue] = useState("")

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSearchTerm(searchValue)
  }

  return (
    <>
      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="university-primary-bg text-white py-8"
      >
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold">Discover Events</h1>
          <p className="mt-2 text-white/80">Find and join events happening around your campus</p>
        </div>
      </motion.div>

      {/* Search and filters section */}
      <section className="w-full py-8 bg-gradient-to-b from-[#f0edfb] to-[#f8f7fc]">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Search and filters bar */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
            className="bg-white rounded-xl shadow-sm p-4 mb-6"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search for events..."
                  className="w-full pl-10 pr-4 py-6 text-base border rounded-lg"
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value)
                    if (e.target.value === "") {
                      setSearchTerm("")
                    }
                  }}
                />
              </form>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 h-12 px-4 border rounded-lg hover:border-[#8a70d6] hover:text-[#8a70d6]"
                  onClick={() => {
                    // Toggle through categories
                    const categories: EventCategory[] = ["All", "Social", "Academic", "Sports", "Arts"]
                    const currentIndex = categories.indexOf(selectedCategory)
                    const nextIndex = (currentIndex + 1) % categories.length
                    setSelectedCategory(categories[nextIndex])
                  }}
                >
                  <Filter className="h-4 w-4" />
                  <span>Category: {selectedCategory}</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center gap-2 h-12 px-4 border rounded-lg hover:border-[#8a70d6] hover:text-[#8a70d6]"
                  onClick={() => {
                    // Toggle through dates
                    const dates = [
                      "All",
                      "Dec 8, 2023",
                      "Dec 10, 2023",
                      "Dec 12, 2023",
                      "Dec 15, 2023",
                      "Dec 18, 2023",
                      "Dec 20, 2023",
                    ]
                    const currentIndex = dates.indexOf(selectedDate)
                    const nextIndex = (currentIndex + 1) % dates.length
                    setSelectedDate(dates[nextIndex])
                  }}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Date: {selectedDate === "All" ? "All" : selectedDate}</span>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* View toggle buttons */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
              className="flex items-center justify-center mb-6"
            >
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-600"></span>
              <div className="inline-flex bg-gray-100 rounded-full shadow-sm p-1 mx-4">
              <Button
                variant="ghost"
                className={`px-2 py-1 md:px-4 md:py-2 transition-all duration-200 rounded-full ${
                activeView === "list"
                  ? "bg-white university-primary-text font-semibold shadow-md"
                  : "text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => setActiveView("list")}
              >
                <List className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                List View
              </Button>
              <Button
                variant="ghost"
                className={`px-2 py-1 md:px-4 md:py-2 transition-all duration-200 rounded-full ${
                activeView === "map"
                  ? "bg-white university-primary-text font-semibold shadow-md"
                  : "text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => setActiveView("map")}
              >
                <Map className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Event Map
              </Button>
              </div>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-600"></span>
            </motion.div>
        </div>
      </section>
    </>
  )
}
