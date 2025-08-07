'use client';

import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { StaticImageData } from 'next/image';
import 'leaflet/dist/leaflet.css';
import type { Event } from '@/lib/types';

// your colored‑pin assets
import pinSocial    from '@/assets/pin-social.png';
import pinAcademic  from '@/assets/pin-academic.png';
import pinSports    from '@/assets/pin-sports.png';
import pinArts      from '@/assets/pin-arts.png';
import pinDefault   from '@/assets/pin-default.png';
import pinSelectedUT from '@/assets/pin-selected-UT.png';

// Leaflet’s built‑in icons + shadow as StaticImageData
import markerIcon2x  from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon    from 'leaflet/dist/images/marker-icon.png';
import markerShadow  from 'leaflet/dist/images/marker-shadow.png';

// 1) Override Leaflet’s defaults so the shadow actually loads:
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl:       markerIcon.src,
  shadowUrl:     markerShadow.src,
});

// 2) Force Leaflet to recalc its size on mount
function RecalculateMapSizeOnLoad() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 0);
  }, [map]);
  return null;
}

// 3) Utility to turn any StaticImageData into a perfectly sized L.Icon
function createIcon(img: StaticImageData) {
  const { src, width, height } = img;
  return new L.Icon({
    iconUrl:     src,
    shadowUrl:   markerShadow.src,
    iconSize:    [width, height],
    iconAnchor:  [width / 2, height],
    popupAnchor: [0, -height],
    shadowSize:  [41, 41],
  });
}

// 4) Build once, reused for every marker
const PIN_LOOKUP: Record<string, L.Icon> = {
  'marker-social':   createIcon(pinSocial),
  'marker-academic': createIcon(pinAcademic),
  'marker-sports':   createIcon(pinSports),
  'marker-arts':     createIcon(pinArts),
  'marker-default':  createIcon(pinDefault),
};
const SELECTED_ICON = createIcon(pinSelectedUT);

export interface EventWithCoords extends Event {
  latitude: number;
  longitude: number;
}

interface LeafletMapProps {
  center: [number, number];
  zoom: number;            // initial zoom for the map
  events: EventWithCoords[];
  selectedEvents: EventWithCoords[];
  selectedEvent?: EventWithCoords;
  onEventSelect: (evt: EventWithCoords) => void;
}

// FlyToSelected now uses a hardcoded zoom level when a marker is clicked
function FlyToSelected({
  selectedEvent,
}: {
  selectedEvent?: EventWithCoords;
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedEvent) {
      map.flyTo(
        [selectedEvent.latitude, selectedEvent.longitude],
        17, // Hardcoded zoom on click
        { animate: true }
      );
    }
  }, [selectedEvent, map]);
  return null;
}

export default function LeafletMap({
  center,
  zoom,
  events,
  selectedEvents,
  selectedEvent,
  onEventSelect,
}: LeafletMapProps) {
  // original category logic
  const getCategoryClass = (category: string) => {
    switch (category) {
      case 'Social':   return 'marker-social';
      case 'Academic': return 'marker-academic';
      case 'Sports':   return 'marker-sports';
      case 'Arts':     return 'marker-arts';
      default:         return 'marker-default';
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={[center[1], center[0]]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg shadow-md"
        scrollWheelZoom
      >
        <RecalculateMapSizeOnLoad />

        <TileLayer
          attribution=""
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {events.map(evt => {
          const isSelected    = selectedEvents.some(e => e.id === evt.id);
          const categoryClass = getCategoryClass(evt.category);
          const icon          = isSelected
            ? SELECTED_ICON
            : PIN_LOOKUP[categoryClass] ?? PIN_LOOKUP['marker-default'];

          return (
            <Marker
              key={evt.id}
              position={[evt.latitude, evt.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onEventSelect(evt),
              }}
            />
          );
        })}

        <FlyToSelected selectedEvent={selectedEvent} />
      </MapContainer>

      {/* Icons8 attribution, bottom‑left */}
      <div
        style={{
          position:    'absolute',
          bottom:      4,
          left:        4,
          background:  'rgba(255,255,255,0.8)',
          padding:     '2px 6px',
          borderRadius:'4px',
          fontSize:    '0.75rem',
          zIndex:      1000,
        }}
      >
        <a
          href="https://icons8.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Location icon by Icons8
        </a>
      </div>
    </div>
  );
}
