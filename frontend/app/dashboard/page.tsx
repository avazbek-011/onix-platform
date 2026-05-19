"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import {
  Search,
  Loader2,
  Users2,
  MapPin,
  Hash,
  Building2,
  ExternalLink,
  Info,
  Wifi,
  AlertTriangle,
  Sparkles,
  Copy,
  CheckCircle2,
  Save,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type Group, type LookupResult } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/map-view").then(m => m.MapView), { ssr: false });

export default function LookupPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.post<LookupResult>("/api/lookup", { query: query.trim() }));
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveGroup = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const saved = await api.post<Group>("/api/groups/save", { query: query.trim() });
      toast.success("Guruh saqlandi");
      router.push(`/dashboard/groups/${saved.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Telegram guruh ma'lumotlarini olish</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Guruhni qidirib oling
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
          Guruhning havolasi, <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm">@username</code> yoki ID raqamini kiriting — ma'lumot olib, ro'yxatga saqlang.
        </p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <form onSubmit={submit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-9 h-12 text-base"
              placeholder="https://t.me/...  yoki  @group_name  yoki  -1001234567890"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" disabled={loading || !query.trim()} className="md:w-44">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Qidirilmoqda…" : "Qidirish"}
          </Button>
        </form>
      </Card>

      {error && (
        <Card className="max-w-3xl mx-auto border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-300">Xatolik</div>
              <div className="text-sm text-muted-foreground mt-1">{error}</div>
            </div>
          </div>
        </Card>
      )}

      {result && (
        <div className="max-w-3xl mx-auto space-y-4">
          <ResultCard result={result} />
          {!result.join_required && (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setResult(null); setQuery(""); }}>
                Bekor qilish
              </Button>
              <Button onClick={saveGroup} disabled={saving} size="lg">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Ro'yxatga saqlash <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: LookupResult }) {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center glow-primary">
          <Building2 className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold tracking-tight truncate">{result.title}</h2>
            {result.is_megagroup && <Badge variant="primary">Megagroup</Badge>}
            {result.is_broadcast && <Badge variant="accent">Kanal</Badge>}
            {result.join_required && <Badge variant="warning">Yopiq guruh - avval qo'shiling</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground flex-wrap">
            {result.username && (
              <a href={`https://t.me/${result.username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                @{result.username} <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {result.tg_id && (
              <button onClick={() => copy(String(result.tg_id))} className="inline-flex items-center gap-1 hover:text-foreground transition">
                <Hash className="h-3 w-3" /> {result.tg_id}
                {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Users2} label="A'zolar" value={formatNumber(result.members_count)} accent="primary" />
        <Stat icon={Wifi} label="Onlayn" value={result.online_count ? formatNumber(result.online_count) : "—"} accent="success" />
      </div>

      {result.about && (
        <div>
          <Label className="mb-2 block">Tavsif</Label>
          <div className="text-sm text-foreground whitespace-pre-wrap rounded-lg bg-muted/40 p-3 border border-border/40">
            {result.about}
          </div>
        </div>
      )}

      {(result.district || result.address_hints.length > 0) && (
        <div>
          <Label className="mb-2 block">Avtomatik aniqlangan</Label>
          <div className="space-y-2">
            {result.district && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tuman:</span>
                <span className="font-medium">{result.district}</span>
              </div>
            )}
            {result.address_hints.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex gap-1 flex-wrap">
                  {result.address_hints.map((h, i) => (
                    <Badge key={i} variant="primary">{h}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border/40">
        💡 Saqlagandan keyin guruh kartochkasiga kirib, <b>aniq joylashuvni qo'lda</b> kiritishingiz mumkin (manzil yozib qidirish + xaritada belgilash).
      </div>
    </Card>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "primary" | "success" }) {
  const colorClass = accent === "primary" ? "text-primary bg-primary/15" : "text-emerald-300 bg-emerald-500/15";
  return (
    <div className="p-4 rounded-lg bg-muted/40 border border-border/40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={`h-7 w-7 rounded-md grid place-items-center ${colorClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
