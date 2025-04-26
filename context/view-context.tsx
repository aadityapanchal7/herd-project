"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type ViewType = "list" | "map" | "locations"

interface ViewContextType {
  activeView: ViewType
  setActiveView: (view: ViewType) => void
}

const ViewContext = createContext<ViewContextType | undefined>(undefined)

export function ViewProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ViewType>("list")

  return <ViewContext.Provider value={{ activeView, setActiveView }}>{children}</ViewContext.Provider>
}

export function useView() {
  const context = useContext(ViewContext)
  if (context === undefined) {
    throw new Error("useView must be used within a ViewProvider")
  }
  return context
}
