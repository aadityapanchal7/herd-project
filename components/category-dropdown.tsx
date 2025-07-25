import React, { useState } from "react";
import { Filter } from "lucide-react";
import type { EventCategory } from "@/lib/types";

export function CategoryDropdown({
  selectedCategory,
  setSelectedCategory,
  categories,
}: {
  selectedCategory: EventCategory;
  setSelectedCategory: (c: EventCategory) => void;
  categories: EventCategory[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      {/* trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          flex items-center gap-2 
          h-12 px-4 
          border border-gray-200 
          bg-white 
          rounded-lg 
          text-gray-800 
          hover:bg-gray-50
        "
      >
        <Filter className="h-4 w-4 text-gray-600" />
        <span>Category: {selectedCategory}</span>
      </button>

      {/* dropdown menu */}
      {open && (
        <ul
          className="
            absolute right-0 mt-1 w-40 
            bg-white border border-gray-200 
            rounded-lg shadow-lg 
            z-10
          "
        >
          {categories.map((cat) => (
            <li
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setOpen(false);
              }}
              className={`
                px-4 py-2 text-sm cursor-pointer 
                hover:bg-gray-100
                ${cat === selectedCategory
                  ? "font-semibold text-indigo-600"
                  : "text-gray-700"}
              `}
            >
              {cat}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
