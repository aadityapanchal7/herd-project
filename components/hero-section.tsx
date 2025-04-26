"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar, Filter, Search, Map, List, School } from "lucide-react"
import { useEvents } from "@/context/events-context"
import { useView } from "@/context/view-context"
import { useAuth } from "@/context/auth-context"
import type { EventCategory } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
    <section className="w-full py-8 bg-[#f0eeff]">
      <div className="container px-4 md:px-6">
        {/* Search and filters bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search for events..."
                className="w-full pl-10 pr-4 py-6 text-base border rounded-lg focus:ring-0"
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
                className="flex items-center gap-2 h-12 px-4 border rounded-lg"
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
                className="flex items-center gap-2 h-12 px-4 border rounded-lg"
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
        </div>

        {/* View toggle buttons */}
        <div className="flex mb-6">
          <div className="inline-flex bg-gray-100 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              className={`px-3 py-3 ${activeView === "list" ? "bg-white text-black font-medium rounded-lg" : "text-gray-600"}`}
              onClick={() => setActiveView("list")}
            >
              <List className="h-4 w-4" />
              List View
            </Button>
            <Button
              variant="ghost"
              className={`px-3 py-3 ${activeView === "map" ? "bg-white text-black font-medium rounded-lg" : "text-gray-600"}`}
              onClick={() => setActiveView("map")}
            >
              <Map className="h-4 w-4" />
              Event Map
            </Button>
            <Button
              variant="ghost"
              className={`px-3 py-3 ${activeView === "locations" ? "bg-white text-black font-medium rounded-lg" : "text-gray-600"}`}
              onClick={() => setActiveView("locations")}
            >
              <Map className="h-4 w-4" />
              Campus Locations
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
