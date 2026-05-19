"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Users,
  Plus,
  Trash2,
  ShieldCheck,
  UserCircle,
  ListChecks,
  Phone,
  MapPin,
  Lock,
  Unlock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { api, getStoredUser, type AdminUserSummary } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const me = getStoredUser();

  const reload = () =>
    api.get<AdminUserSummary[]>("/api/admin/users").then(setUsers).catch(e => toast.error(e.message)).finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  const toggleActive = async (u: AdminUserSummary) => {
    try {
      await api.patch(`/api/admin/users/${u.id}`, { is_active: !u.is_active });
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (u: AdminUserSummary) => {
    if (!confirm(`${u.full_name || u.username} ni o'chirishni xohlaysizmi? Uning barcha guruhlari ham o'chiriladi!`)) return;
    try {
      await api.del(`/api/admin/users/${u.id}`);
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
          <h1 className="text-3xl font-bold tracking-tight">Xodimlar</h1>
          <p className="text-muted-foreground mt-1">Tizim foydalanuvchilarini boshqarish</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Yangi xodim
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <div className="text-muted-foreground">Yuklanmoqda…</div>}
        {users.map((u) => (
          <Card key={u.id} className="space-y-4 hover:border-primary/40 transition group">
            <div className="flex items-start justify-between">
              <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 group-hover:text-primary transition flex-1 min-w-0">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center font-bold text-white text-lg shrink-0">
                  {(u.full_name || u.username)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{u.full_name || u.username}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserCircle className="h-3 w-3" /> {u.username}
                  </div>
                </div>
              </Link>
              {u.role === "admin" ? (
                <Badge variant="accent"><ShieldCheck className="h-3 w-3 mr-1" /> Boshliq</Badge>
              ) : (
                <Badge variant="default">Xodim</Badge>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat icon={Phone} value={u.accounts_count} label="TG" />
              <MiniStat icon={ListChecks} value={u.groups_count} label="Guruh" />
              <MiniStat icon={MapPin} value={u.groups_with_location} label="Manzil" />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <div className="text-xs text-muted-foreground">{formatDate(u.created_at)}</div>
              <div className="flex gap-1">
                {me?.id !== u.id && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActive(u)}
                      title={u.is_active ? "Bloklash" : "Faollashtirish"}
                    >
                      {u.is_active ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(u)} className="text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {!u.is_active && (
              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 inline-block">
                Bloklangan
              </div>
            )}
          </Card>
        ))}
      </div>

      <CreateUserDialog open={creating} onClose={() => setCreating(false)} onCreated={reload} />
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
      <div className="flex items-center justify-center mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function CreateUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "manager">("manager");
  const [loading, setLoading] = useState(false);

  const reset = () => { setUsername(""); setFullName(""); setPassword(""); setRole("manager"); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/admin/users", { username, password, full_name: fullName || null, role });
      toast.success("Xodim yaratildi");
      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Yangi xodim qo'shish">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>To'liq ism</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Akmal Yuldashev" />
        </div>
        <div className="space-y-2">
          <Label>Login</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="akmal" required minLength={3} />
        </div>
        <div className="space-y-2">
          <Label>Parol</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} />
        </div>
        <div className="space-y-2">
          <Label>Rol</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("manager")}
              className={`p-3 rounded-lg border text-left transition ${role === "manager" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
            >
              <div className="font-medium text-sm">Xodim</div>
              <div className="text-xs text-muted-foreground">Faqat o'z guruhlari</div>
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`p-3 rounded-lg border text-left transition ${role === "admin" ? "border-accent bg-accent/10" : "border-border hover:bg-muted/40"}`}
            >
              <div className="font-medium text-sm">Boshliq</div>
              <div className="text-xs text-muted-foreground">Barcha xodimlar</div>
            </button>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Yaratish
        </Button>
      </form>
    </Dialog>
  );
}
