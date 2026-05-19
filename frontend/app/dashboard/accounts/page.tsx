"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Phone, Plus, ShieldCheck, ShieldAlert, Trash2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { api, type Account } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [authPhone, setAuthPhone] = useState<string | null>(null);

  const reload = () =>
    api
      .get<Account[]>("/api/accounts/")
      .then(setAccounts)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const remove = async (id: number) => {
    if (!confirm("Akkountni o'chirishni xohlaysizmi?")) return;
    try {
      await api.del(`/api/accounts/${id}`);
      toast.success("O'chirildi");
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Akkountlar</h1>
          <p className="text-muted-foreground mt-1">Telethon userbot akkountlarini boshqarish</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Yangi akkount
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <div className="text-muted-foreground">Yuklanmoqda…</div>}
        {!loading && accounts.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
            <Phone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <CardTitle>Hozircha akkount yo'q</CardTitle>
            <CardDescription className="mt-1">Boshlash uchun "Yangi akkount" tugmasini bosing</CardDescription>
          </Card>
        )}
        {accounts.map((a) => (
          <Card key={a.id} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-lg">{a.display_name || a.phone}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Phone className="h-3.5 w-3.5" /> {a.phone}
                </div>
              </div>
              {a.is_authorized ? (
                <Badge variant="success">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Faol
                </Badge>
              ) : (
                <Badge variant="warning">
                  <ShieldAlert className="h-3 w-3 mr-1" /> Avtorizatsiya kerak
                </Badge>
              )}
            </div>
            {a.notes && <div className="text-sm text-muted-foreground line-clamp-2">{a.notes}</div>}
            <div className="text-xs text-muted-foreground">{formatDate(a.created_at)}</div>
            <div className="flex gap-2 pt-2 border-t border-border/60">
              {!a.is_authorized && (
                <Button size="sm" variant="primary" onClick={() => setAuthPhone(a.phone)}>
                  <KeyRound className="h-3.5 w-3.5" /> Login
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => remove(a.id)} className="text-destructive ml-auto">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <AddAccountDialog open={addOpen} onClose={() => setAddOpen(false)} onCreated={reload} />
      <AuthDialog phone={authPhone} onClose={() => setAuthPhone(null)} onAuthorized={reload} />
    </div>
  );
}

function AddAccountDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/accounts/", { phone, display_name: displayName || null, notes: notes || null });
      toast.success("Akkount yaratildi. Endi 'Login' tugmasini bosing.");
      onCreated();
      onClose();
      setPhone("");
      setDisplayName("");
      setNotes("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Yangi Telethon akkount">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Telefon raqami (xalqaro formatda)</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" required />
        </div>
        <div className="space-y-2">
          <Label>Ko'rsatiladigan nom (ixtiyoriy)</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Sotuv menejer 1" />
        </div>
        <div className="space-y-2">
          <Label>Eslatma</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Qaysi maqsadlar uchun ishlatiladi" />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          Yaratish
        </Button>
      </form>
    </Dialog>
  );
}

function AuthDialog({
  phone,
  onClose,
  onAuthorized,
}: {
  phone: string | null;
  onClose: () => void;
  onAuthorized: () => void;
}) {
  const [step, setStep] = useState<"send" | "code">("send");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [need2fa, setNeed2fa] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (phone) {
      setStep("send");
      setCode("");
      setPassword("");
      setNeed2fa(false);
    }
  }, [phone]);

  const sendCode = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      await api.post("/api/accounts/auth/start", { phone });
      toast.success("Kod yuborildi — Telegramni tekshiring");
      setStep("code");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      await api.post("/api/accounts/auth/complete", { phone, code, password: password || null });
      toast.success("Akkount avtorizatsiyadan o'tdi!");
      onAuthorized();
      onClose();
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("2FA")) {
        setNeed2fa(true);
        toast("2FA parol kerak", { icon: "🔐" });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!phone} onClose={onClose} title="Telegram avtorizatsiya">
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Raqam: <span className="font-medium text-foreground">{phone}</span>
        </div>
        {step === "send" && (
          <>
            <p className="text-sm">SMS yoki Telegram orqali kod yuborilsinmi?</p>
            <Button onClick={sendCode} disabled={loading} className="w-full">
              Kod yuborish
            </Button>
          </>
        )}
        {step === "code" && (
          <>
            <div className="space-y-2">
              <Label>Telegramdan kelgan kod</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="12345" autoFocus />
            </div>
            {need2fa && (
              <div className="space-y-2">
                <Label>2FA parol (agar yoqilgan bo'lsa)</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}
            <Button onClick={submit} disabled={loading || !code} className="w-full">
              Tasdiqlash
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}
