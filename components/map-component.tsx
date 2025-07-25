// components/map-component.tsx
"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import React, { useEffect, useRef, useState } from "react";
import mapboxgl, { MapboxGeoJSONFeature } from "mapbox-gl";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FallbackMap } from "@/components/fallback-map";
import type { Event } from "@/lib/types";

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  events: (Event & { latitude: number; longitude: number })[];
  primaryColor: string;
  onEventSelect: (evt: Event & { latitude: number; longitude: number }) => void;
  selectedEventId?: number;
}

export default function MapComponent({
  center,
  zoom,
  events,
  primaryColor,
  onEventSelect,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [supported, setSupported] = useState(true);

  // Load Mapbox & check support
  useEffect(() => {
    import("mapbox-gl")
      .then((m) => {
        if (!m.default.supported()) setSupported(false);
        else setMapboxLoaded(true);
      })
      .catch(() => setSupported(false));
  }, []);

  // Initialize map & add markers layer
  useEffect(() => {
    if (!mapContainer.current || !mapboxLoaded || map.current || !supported) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      const geojson = {
        type: "FeatureCollection" as const,
        features: events.map(evt => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [evt.longitude, evt.latitude] },
          properties: {
            id: evt.id,
            title: evt.title,
            date: evt.date,
            time: evt.time,
          },
        })),
      };

      // Add or update source
      if (!map.current!.getSource("events")) {
        map.current!.addSource("events", { type: "geojson", data: geojson });
      } else {
        (map.current!.getSource("events") as mapboxgl.GeoJSONSource).setData(geojson);
      }

      // Add or update circle layer
      if (!map.current!.getLayer("events-layer")) {
        map.current!.addLayer({
          id: "events-layer",
          type: "circle",
          source: "events",
          paint: {
            "circle-radius": 8,
            "circle-color": primaryColor,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });

        // pointer on hover
        map.current!.on("mouseenter", "events-layer", () => {
          map.current!.getCanvas().style.cursor = "pointer";
        });
        map.current!.on("mouseleave", "events-layer", () => {
          map.current!.getCanvas().style.cursor = "";
        });
      }
    });

    // Click handler on markers
    map.current.on("click", "events-layer", (e) => {
      const feat = (e.features?.[0] ?? null) as MapboxGeoJSONFeature;
      if (!feat || feat.geometry.type !== "Point") return;

      const [lng, lat] = feat.geometry.coordinates as [number, number];

      // 1) Fly map
      map.current!.flyTo({ center: [lng, lat], zoom, essential: true });

      // 2) Popup with "View Details" button only
      const popup = new mapboxgl.Popup({ offset: 15 })
        .setLngLat([lng, lat])
        .setHTML(`
          <div style="font-family:system-ui,sans-serif;">
            <h3 style="margin:0 0 4px;">${feat.properties?.title}</h3>
            <small style="color:#555;">${feat.properties?.date} • ${feat.properties?.time}</small>
            <br/>
            <button id="view-details-btn"
              style="
                margin-top:8px;
                padding:4px 8px;
                background:${primaryColor};
                color:#fff;
                border:none;
                border-radius:4px;
                cursor:pointer;
              "
            >
              View Details
            </button>
          </div>
        `)
        .addTo(map.current!);

      // Once added, wire up the button
      // (use a tiny timeout to ensure DOM is ready)
      setTimeout(() => {
        const btn = document.getElementById("view-details-btn");
        if (btn) {
          btn.onclick = () => {
            const id = Number(feat.properties?.id);
            const evt = events.find(ev => ev.id === id);
            if (evt) onEventSelect(evt);
          };
        }
      }, 0);
    });
  }, [mapboxLoaded, supported, center, zoom, events, primaryColor, onEventSelect]);

  if (!supported) {
    return <FallbackMap events={events} primaryColor={primaryColor} onEventSelect={onEventSelect} />;
  }

  return <div ref={mapContainer} className="w-full h-[600px] rounded-lg shadow-md" />;
}
