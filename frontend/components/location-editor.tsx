"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

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

type Coords = { lat: number; lng: number } | null;

export function LocationEditor({
  initialAddress,
  initialLat,
  initialLng,
  onSave,
  saving,
}: {
  initialAddress?: string | null;
  initialLat?: number | null;
  initialLng?: number | null;
  onSave: (data: { manual_address: string; manual_lat: number; manual_lng: number }) => Promise<void>;
  saving: boolean;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [address, setAddress] = useState(initialAddress || "");
  const [coords, setCoords] = useState<Coords>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [searching, setSearching] = useState(false);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const startLat = coords?.lat || 41.3111;
    const startLng = coords?.lng || 69.2797;
    const map = L.map(containerRef.current, {
      center: [startLat, startLng],
      zoom: coords ? 17 : 12,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setCoords({ lat, lng });
    });

    mapRef.current = map;

    if (coords) {
      markerRef.current = L.marker([coords.lat, coords.lng], { icon: markerIcon, draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLatLng();
        setCoords({ lat: ll.lat, lng: ll.lng });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when coords change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !coords) return;
    if (!markerRef.current) {
      markerRef.current = L.marker([coords.lat, coords.lng], { icon: markerIcon, draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLatLng();
        setCoords({ lat: ll.lat, lng: ll.lng });
      });
    } else {
      markerRef.current.setLatLng([coords.lat, coords.lng]);
    }
    map.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
  }, [coords]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  const searchAddress = async () => {
    if (!address.trim()) return;
    setSearching(true);
    try {
      const res = await api.post<{ lat?: number; lng?: number; display_name?: string }>("/api/groups/geocode", { query: address });
      if (res.lat && res.lng) {
        setCoords({ lat: res.lat, lng: res.lng });
        toast.success("Manzil topildi - xaritada belgilang aniqlik uchun");
      } else {
        toast.error("Manzil topilmadi - xaritada qo'lda belgilang");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const save = async () => {
    if (!coords) {
      toast.error("Avval xaritada joylashuvni belgilang");
      return;
    }
    await onSave({
      manual_address: address.trim(),
      manual_lat: coords.lat,
      manual_lng: coords.lng,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Manzil (matn ko'rinishida)</Label>
        <div className="flex gap-2">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Yashnabod tumani, 5-uy, Kichik xalqa yo'li"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchAddress())}
          />
          <Button type="button" variant="secondary" onClick={searchAddress} disabled={searching || !address.trim()}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Qidirish
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Manzil yozib qidiring, so'ng xaritada aniq nuqtani belgilang</p>
      </div>

      <div
        ref={containerRef}
        style={{ height: 360, width: "100%", borderRadius: 12, overflow: "hidden", background: "hsl(220 26% 6%)" }}
      />

      {coords ? (
        <div className="flex items-center gap-2 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Belgilangan: <span className="font-mono">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span></span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <MapPin className="h-4 w-4 text-amber-300" />
          <span className="text-amber-200">Xaritani bosib joylashuvni belgilang</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !coords} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Joylashuvni saqlash
        </Button>
      </div>
    </div>
  );
}
