'use client';

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useEvents } from "@/context/events-context";
import { useAuth } from "@/context/auth-context";

export function HeroSection() {
  const {
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedDate,
    setSelectedDate,
  } = useEvents();
  const { isAuthenticated, user } = useAuth();

  const [searchValue, setSearchValue] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement & { showPicker?: () => void }>(
    null
  );

  // Close category dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(e.target as Node)
      ) {
        setCategoryOpen(false);
      }
    }
    if (categoryOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [categoryOpen]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearchTerm(searchValue);
  };

  const categories = useMemo(() => {
    return ["All", "Social", "Academic", "Sports", "Arts"];
  }, []);

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
          <p className="mt-2 text-white/80">
            Find and join events happening around your campus
          </p>
        </div>
      </motion.div>

      {/* filter bar */}
      <section className="w-full py-8 bg-gradient-to-b from-[#f0edfb] to-[#f8f7fc]">
        <div className="container max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
            className="bg-white rounded-xl shadow-sm p-4 mb-6"
          >
            <div className="flex flex-col md:flex-row gap-4">
              {/* search */}
              <form onSubmit={handleSearch} className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search for events..."
                  className="w-full pl-10 pr-4 py-6 text-base border rounded-lg"
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    if (e.target.value === "") setSearchTerm("");
                  }}
                />
              </form>

              <div className="flex gap-3 items-center">
                {/* category */}
                <div ref={categoryRef} className="relative inline-block text-left">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 h-12 px-4 border rounded-lg hover:border-[#8a70d6] hover:text-[#8a70d6]"
                    onClick={() => setCategoryOpen((o) => !o)}
                  >
                    <Filter className="h-4 w-4" />
                    <span>Category: {selectedCategory}</span>
                  </Button>

                  {categoryOpen && (
                    <ul className="absolute right-0 z-10 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-md">
                      {categories.map((cat) => (
                        <li
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat as any);
                            setCategoryOpen(false);
                          }}
                          className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                            cat === selectedCategory
                              ? "font-semibold text-[#8a70d6]"
                              : "text-gray-700"
                          }`}
                        >
                          {cat}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* date */}
                <div className="relative inline-block">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 h-12 px-4 border rounded-lg hover:border-[#8a70d6] hover:text-[#8a70d6] relative z-10"
                    onClick={() => {
                      const el = dateInputRef.current;
                      if (!el) return;
                      if (typeof el.showPicker === "function") {
                        el.showPicker();
                      } else {
                        el.focus();
                        el.click();
                      }
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Date: {selectedDate}</span>
                  </Button>

                  <input
                    ref={dateInputRef}
                    type="date"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
                    value={selectedDate === "All" ? "" : selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value || "All")}
                  />
                </div>
              </div>
            </div>
          </motion.div>
          {/* ← Toggle removed from here */}
        </div>
      </section>
    </>
  );
}