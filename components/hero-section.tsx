// components/hero‑section.tsx
"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Filter as FilterIcon, Calendar as CalIcon } from "lucide-react";
import { useEvents } from "@/context/events-context";

interface HeroSectionProps {
  title: string;
  subtitle: string;
}

export function HeroSection({ title, subtitle }: HeroSectionProps) {
  const { setSearchTerm, selectedCategory, setSelectedCategory, selectedDate, setSelectedDate } = useEvents();

  // Local state for the search input
  const [searchValue, setSearchValue] = useState("");

  // Ref to the hidden date input
  const dateInputRef = useRef<HTMLInputElement & { showPicker?: () => void }>(null);

  // Helper to format YYYY-MM-DD to "Jul 28, 2025"
  function formatLocalDate(iso: string) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // When the search form is submitted
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(searchValue);
  }

  // Your category options
  const categories = ["All", "Social", "Academic", "Sports", "Arts"];

  return (
    <>
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="university-primary-bg text-white py-8"
      >
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
          <p className="mt-2 text-white/80">{subtitle}</p>
        </div>
      </motion.div>

      {/* Filter bar */}
      <section className="w-full py-8 bg-gradient-to-b from-[#f0edfb] to-[#f8f7fc]">
        <div className="container max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
            className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-center"
          >
            {/* Search box */}
            <form onSubmit={handleSearch} className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search for events..."
                className="w-full pl-10 pr-4 py-4 text-base border rounded-lg"
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  if (e.target.value === "") setSearchTerm("");
                }}
              />
            </form>

            {/* Category select */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="appearance-none pl-4 pr-10 py-2 bg-white border rounded-lg text-current focus:ring-2 focus:ring-current"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
              <FilterIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-current" size={20} />
            </div>

            {/* Date picker */}
            <div
              className="relative w-full md:w-auto cursor-pointer"
              onClick={() => dateInputRef.current?.showPicker?.()}
            >
              {/* Invisible native date input */}
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate === "All" ? "" : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || "All")}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                style={{ pointerEvents: "none" }}
                tabIndex={-1}
              />

              {/* Styled “button” */}
              <div className="flex items-center pl-4 pr-10 py-2 bg-white border rounded-lg text-current select-none">
                <CalIcon className="mr-2" size={20} />
                <span>
                  Date:{" "}
                  {selectedDate === "All" ? (
                    "All"
                  ) : (
                    formatLocalDate(selectedDate)
                  )}
                </span>
              </div>

              {/* Clear “×” */}
              {selectedDate !== "All" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate("All");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-400 z-20"
                  aria-label="Clear date"
                >
                  ×
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
