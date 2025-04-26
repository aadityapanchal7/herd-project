"use client"

import { useState } from "react"
import { Building, GraduationCap, Library, Coffee, Utensils, Home, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

// Mock campus location data
const campusLocations = [
  {
    id: 1,
    name: "Main Library",
    description: "Central campus library with study spaces and resources",
    category: "Academic",
    latitude: 40.7128,
    longitude: -74.006,
    icon: <Library className="h-6 w-6 text-blue-600" />,
    color: "bg-blue-100",
  },
  {
    id: 2,
    name: "Student Union",
    description: "Center for student activities and services",
    category: "Social",
    latitude: 40.7138,
    longitude: -74.005,
    icon: <Building className="h-6 w-6 text-purple-600" />,
    color: "bg-purple-100",
  },
  {
    id: 3,
    name: "Science Building",
    description: "Home to science departments and research labs",
    category: "Academic",
    latitude: 40.7118,
    longitude: -74.008,
    icon: <GraduationCap className="h-6 w-6 text-green-600" />,
    color: "bg-green-100",
  },
  {
    id: 4,
    name: "Campus Cafe",
    description: "Popular coffee shop for students",
    category: "Dining",
    latitude: 40.7135,
    longitude: -74.007,
    icon: <Coffee className="h-6 w-6 text-amber-600" />,
    color: "bg-amber-100",
  },
  {
    id: 5,
    name: "Dining Hall",
    description: "Main campus dining facility",
    category: "Dining",
    latitude: 40.7125,
    longitude: -74.004,
    icon: <Utensils className="h-6 w-6 text-red-600" />,
    color: "bg-red-100",
  },
  {
    id: 6,
    name: "Dormitories",
    description: "Student housing complex",
    category: "Housing",
    latitude: 40.7145,
    longitude: -74.0065,
    icon: <Home className="h-6 w-6 text-teal-600" />,
    color: "bg-teal-100",
  },
]

export function CampusLocationsMap() {
  const [selectedLocation, setSelectedLocation] = useState<(typeof campusLocations)[0] | null>(null)

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-semibold text-[#8a70d6] mb-2">Campus Locations</h2>
        <p className="text-gray-600">
          This is a simplified campus map view. In a production environment, this would display a Mapbox map with campus
          location markers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campusLocations.map((location) => (
          <div
            key={location.id}
            className={`${location.color} rounded-lg border p-6 transition-shadow hover:shadow-md cursor-pointer`}
            onClick={() => setSelectedLocation(location)}
          >
            <div className="flex items-center mb-4">
              {location.icon}
              <h3 className="text-xl font-bold ml-2">{location.name}</h3>
            </div>
            <p className="text-gray-600 mb-4">{location.description}</p>
            <div className="flex items-center text-gray-500 mb-4">
              <MapPin className="w-4 h-4 mr-2" />
              <span>
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-500">Category: {location.category}</div>
            <Button className="w-full mt-4 bg-[#8a70d6] hover:bg-[#7a60c6]">View Details</Button>
          </div>
        ))}
      </div>

      {selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${selectedLocation.color} rounded-lg max-w-md w-full p-6`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                {selectedLocation.icon}
                <h3 className="text-xl font-bold ml-2">{selectedLocation.name}</h3>
              </div>
              <button onClick={() => setSelectedLocation(null)} className="text-gray-500 hover:text-gray-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-4">{selectedLocation.description}</p>
            <div className="flex items-center text-gray-500 mb-2">
              <MapPin className="w-4 h-4 mr-2" />
              <span>
                Coordinates: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-500 mb-4">Category: {selectedLocation.category}</div>
            <Button className="w-full bg-[#8a70d6] hover:bg-[#7a60c6]">Get Directions</Button>
          </div>
        </div>
      )}
    </div>
  )
}
