'use client';

import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Event } from '@/lib/types';

// Fix Leaflet’s default icon URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl:        require('leaflet/dist/images/marker-icon.png'),
  shadowUrl:      require('leaflet/dist/images/marker-shadow.png'),
});

export interface EventWithCoords extends Event {
  latitude: number;
  longitude: number;
}

interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  events: EventWithCoords[];
  selectedEvents: EventWithCoords[];
  selectedEvent?: EventWithCoords;
  onEventSelect: (evt: EventWithCoords) => void;
}

function FlyToSelected({
  selectedEvent,
  zoom,
}: {
  selectedEvent?: EventWithCoords;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedEvent) {
      map.flyTo(
        [selectedEvent.latitude, selectedEvent.longitude],
        zoom,
        { animate: true }
      );
    }
  }, [selectedEvent, zoom, map]);
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
    <MapContainer
      center={[center[1], center[0]]}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg shadow-md"
      scrollWheelZoom
    >
      <TileLayer
        attribution=""
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {events.map(evt => {
        const isSelected = selectedEvents.some(e => e.id === evt.id);
        const categoryClass = getCategoryClass(evt.category);
        const selectedClass = isSelected ? 'marker-selected' : '';

        const icon = new L.DivIcon({
          html: `<div class="marker-inner"></div>`,
          className: `custom-marker ${categoryClass} ${selectedClass}`,
          iconAnchor: [12, 24],
          popupAnchor: [0, -28],
        });

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

      <FlyToSelected selectedEvent={selectedEvent} zoom={zoom} />
    </MapContainer>
  );
}
