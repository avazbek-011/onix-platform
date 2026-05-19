"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Users2,
  MapPin,
  ListChecks,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { api, type Group, type User } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<User>(`/api/admin/users/${id}`),
      api.get<Group[]>(`/api/admin/users/${id}/groups`),
    ]).then(([u, g]) => {
      setUser(u);
      setGroups(g);
    }).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [id]);

  const filtered = useMemo(
    () => groups.filter(g => !search || g.title.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );

  const withLoc = groups.filter(g => g.manual_lat).length;
  const totalMembers = groups.reduce((s, g) => s + g.members_count, 0);

  if (loading) return <div className="text-center text-muted-foreground py-20">Yuklanmoqda…</div>;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <Link href="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Xodimlar ro'yxati</Button></Link>

      <Card>
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center font-bold text-white text-2xl shrink-0">
            {(user.full_name || user.username)[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{user.full_name || user.username}</h1>
              {user.role === "admin" ? (
                <Badge variant="accent"><ShieldCheck className="h-3 w-3 mr-1" /> Boshliq</Badge>
              ) : (
                <Badge variant="default">Xodim</Badge>
              )}
              {!user.is_active && <Badge variant="destructive">Bloklangan</Badge>}
            </div>
            <div className="text-sm text-muted-foreground mt-1">@{user.username} · Ro'yxatdan o'tgan: {formatDate(user.created_at)}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="!p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Jami guruhlar</span>
            <div className="h-7 w-7 rounded-md grid place-items-center text-primary bg-primary/15">
              <ListChecks className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold">{groups.length}</div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Joylashuvi belgilanganlari</span>
            <div className="h-7 w-7 rounded-md grid place-items-center text-emerald-300 bg-emerald-500/15">
              <MapPin className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold">{withLoc}</div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Jami a'zolar (yig'indi)</span>
            <div className="h-7 w-7 rounded-md grid place-items-center text-purple-300 bg-accent/15">
              <Users2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold">{formatNumber(totalMembers)}</div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Guruhlari ({groups.length})</h2>
        <div className="relative max-w-xs">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Qidirish…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Guruh</TH>
              <TH className="text-right">A'zolar</TH>
              <TH className="text-right">Onlayn</TH>
              <TH>Joylashuv</TH>
              <TH>Qo'shilgan</TH>
            </tr>
          </THead>
          <tbody>
            {filtered.length === 0 && (
              <TR><TD colSpan={5} className="text-center text-muted-foreground py-12">
                {groups.length === 0 ? "Bu xodim hozircha guruh qo'shmagan" : "Topilmadi"}
              </TD></TR>
            )}
            {filtered.map((g) => (
              <TR key={g.id}>
                <TD>
                  <Link href={`/dashboard/groups/${g.id}`} className="flex items-start gap-3 group">
                    <div className="h-9 w-9 grid place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 group-hover:from-primary group-hover:to-accent transition shrink-0">
                      <Users2 className="h-4 w-4 text-primary group-hover:text-white transition" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold group-hover:text-primary transition truncate max-w-[280px]">{g.title}</div>
                      {g.username && <div className="text-xs text-muted-foreground">@{g.username}</div>}
                    </div>
                  </Link>
                </TD>
                <TD className="text-right font-mono text-base font-semibold">{formatNumber(g.members_count)}</TD>
                <TD className="text-right text-emerald-300 font-mono">{g.online_count ? formatNumber(g.online_count) : "—"}</TD>
                <TD>
                  {g.manual_lat ? (
                    <div className="flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="truncate max-w-[200px]">{g.manual_address || `${g.manual_lat.toFixed(4)}, ${g.manual_lng?.toFixed(4)}`}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-sm text-amber-300">
                      <AlertCircle className="h-4 w-4" /> Belgilanmagan
                    </div>
                  )}
                </TD>
                <TD className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(g.saved_at)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
