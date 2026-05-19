"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  Users2,
  Wifi,
  Hash,
  ExternalLink,
  MapPin,
  Loader2,
  RefreshCw,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { api, type Group } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/map-view").then(m => m.MapView), { ssr: false });
const LocationEditor = dynamic(() => import("@/components/location-editor").then(m => m.LocationEditor), { ssr: false });

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setGroup(await api.get<Group>(`/api/groups/${id}`));
    } catch (e: any) {
      toast.error(e.message);
      router.push("/dashboard/my-groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const g = await api.post<Group>(`/api/groups/${id}/refresh`);
      setGroup(g);
      toast.success("Ma'lumotlar yangilandi");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const remove = async () => {
    if (!confirm("Bu guruhni ro'yxatdan o'chirishni xohlaysizmi?")) return;
    try {
      await api.del(`/api/groups/${id}`);
      toast.success("O'chirildi");
      router.push("/dashboard/my-groups");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveLocation = async (data: { manual_address: string; manual_lat: number; manual_lng: number }) => {
    setSaving(true);
    try {
      const updated = await api.patch<Group>(`/api/groups/${id}/location`, data);
      setGroup(updated);
      toast.success("Joylashuv saqlandi");
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center text-muted-foreground py-20">Yuklanmoqda…</div>;
  if (!group) return null;

  const hasLocation = group.manual_lat != null && group.manual_lng != null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/my-groups">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" /> Orqaga
          </Button>
        </Link>
      </div>

      <Card className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center glow-primary">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight truncate">{group.title}</h1>
              {group.is_megagroup && <Badge variant="primary">Megagroup</Badge>}
              {group.is_broadcast && <Badge variant="accent">Kanal</Badge>}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              {group.username && (
                <a href={`https://t.me/${group.username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  @{group.username} <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" /> {group.tg_id}</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(group.saved_at)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={refresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Yangilash
            </Button>
            <Button size="sm" variant="ghost" onClick={remove} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatBox icon={Users2} label="Jami a'zolar" value={formatNumber(group.members_count)} color="primary" />
          <StatBox icon={Wifi} label="Onlayn" value={group.online_count ? formatNumber(group.online_count) : "—"} color="success" />
          <StatBox
            icon={MapPin}
            label="Joylashuv"
            value={hasLocation ? "Belgilangan" : "Belgilanmagan"}
            color={hasLocation ? "success" : "warning"}
          />
        </div>

        {group.about && (
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Tavsif</div>
            <div className="text-sm whitespace-pre-wrap rounded-lg bg-muted/40 p-3 border border-border/40">{group.about}</div>
          </div>
        )}

        {group.last_sync_at && (
          <div className="text-xs text-muted-foreground">
            Oxirgi yangilanish: {formatDate(group.last_sync_at)}
          </div>
        )}
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-border/60 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Joylashuv (uy lokatsiyasi)</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {hasLocation ? "Belgilangan joylashuvni tahrirlash mumkin" : "Aniq uy joylashuvini xaritada belgilang"}
            </p>
          </div>
          {hasLocation && !editing && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Edit3 className="h-3.5 w-3.5" /> Tahrirlash
            </Button>
          )}
        </div>

        <div className="p-5">
          {editing ? (
            <LocationEditor
              initialAddress={group.manual_address}
              initialLat={group.manual_lat}
              initialLng={group.manual_lng}
              onSave={saveLocation}
              saving={saving}
            />
          ) : hasLocation ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  {group.manual_address && <div className="font-medium text-emerald-100">{group.manual_address}</div>}
                  <div className="text-xs text-emerald-300/70 font-mono mt-0.5">
                    {group.manual_lat?.toFixed(6)}, {group.manual_lng?.toFixed(6)}
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${group.manual_lat},${group.manual_lng}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="rounded-lg overflow-hidden">
                <MapView lat={group.manual_lat!} lng={group.manual_lng!} label={group.title} height={360} />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                <AlertCircle className="h-4 w-4 text-amber-300 shrink-0" />
                <span className="text-amber-200">Joylashuv hali kiritilmagan. Pastdagi xaritada belgilang yoki manzil yozib qidiring.</span>
              </div>
              <LocationEditor
                initialAddress={group.auto_district || ""}
                initialLat={group.auto_lat}
                initialLng={group.auto_lng}
                onSave={saveLocation}
                saving={saving}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: "primary" | "success" | "warning";
}) {
  const cls = {
    primary: "text-primary bg-primary/15",
    success: "text-emerald-300 bg-emerald-500/15",
    warning: "text-amber-300 bg-amber-500/15",
  }[color];
  return (
    <div className="p-4 rounded-lg bg-muted/40 border border-border/40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={`h-7 w-7 rounded-md grid place-items-center ${cls}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="text-xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
