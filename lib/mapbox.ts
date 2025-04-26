// Generate a deterministic but random-looking coordinate offset based on an ID
export function getEventCoordinateOffset(id: number, radius = 0.01) {
  // Use the event ID to generate a "random" but consistent coordinate
  const angle = (id * 137.5) % 360 // Golden angle to ensure good distribution
  const distance = (((id * 13) % 100) / 100) * radius // Random distance within radius

  // Convert polar coordinates to Cartesian offsets
  const latOffset = distance * Math.cos((angle * Math.PI) / 180)
  const lngOffset = distance * Math.sin((angle * Math.PI) / 180)

  return {
    latOffset,
    lngOffset,
  }
}

// Generate event coordinates around a center point (university)
export function getEventCoordinates(eventId: number, centerLat: number, centerLng: number, radius = 0.01) {
  const { latOffset, lngOffset } = getEventCoordinateOffset(eventId, radius)

  return {
    latitude: centerLat + latOffset,
    longitude: centerLng + lngOffset,
  }
}
