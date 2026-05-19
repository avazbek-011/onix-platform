"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 28px; height: 28px;
    background: linear-gradient(135deg, hsl(199 89% 48%), hsl(262 83% 58%));
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 0 0 4px rgba(56, 189, 248, 0.2);
    display: flex; align-items: center; justify-content: center;
  "><div style="width:10px;height:10px;background:white;border-radius:50%;transform:rotate(45deg);"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export function MapView({
  lat,
  lng,
  label,
  height = 320,
}: {
  lat: number;
  lng: number;
  label?: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 16);
      return;
    }
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);
    L.marker([lat, lng], { icon: markerIcon })
      .addTo(map)
      .bindPopup(label || "Lokatsiya")
      .openPopup();
    mapRef.current = map;
  }, [lat, lng, label]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", borderRadius: 12, overflow: "hidden", background: "hsl(220 26% 6%)" }}
    />
  );
}
