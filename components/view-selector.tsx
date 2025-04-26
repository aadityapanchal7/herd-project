"use client"

import { EventsList } from "@/components/events-list"
import { MapView } from "@/components/map-view"
import { CampusLocationsMap } from "@/components/campus-locations-map"
import { useView } from "@/context/view-context"

export function ViewSelector() {
  const { activeView } = useView()

  return (
    <section className="w-full py-4">
      <div className="container px-4 md:px-6">
        {activeView === "list" && <EventsList />}
        {activeView === "map" && <MapView />}
        {activeView === "locations" && <CampusLocationsMap />}
      </div>
    </section>
  )
}
