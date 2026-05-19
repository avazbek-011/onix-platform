"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Search,
  Users2,
  MapPin,
  ListChecks,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { api, type Group } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

export default function MyGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<Group[]>("/api/groups/mine").then(setGroups).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => groups.filter(g => !search || g.title.toLowerCase().includes(search.toLowerCase()) || (g.manual_address || "").toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );

  const withLocation = groups.filter(g => g.manual_lat).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mening guruhlarim</h1>
          <p className="text-muted-foreground mt-1">
            Saqlangan: <b>{groups.length}</b>  ·  Joylashuvi belgilangan: <b>{withLocation}</b>
          </p>
        </div>
        <Link href="/dashboard">
          <Button>
            <Plus className="h-4 w-4" /> Yangi guruh qo'shish
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Guruh nomi yoki manzil bo'yicha qidirish…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Guruh nomi</TH>
              <TH className="text-right">A'zolar</TH>
              <TH className="text-right">Onlayn</TH>
              <TH>Joylashuv</TH>
              <TH>Qo'shilgan</TH>
            </tr>
          </THead>
          <tbody>
            {loading && (
              <TR><TD colSpan={5} className="text-center text-muted-foreground py-8">Yuklanmoqda…</TD></TR>
            )}
            {!loading && filtered.length === 0 && groups.length === 0 && (
              <TR>
                <TD colSpan={5}>
                  <div className="text-center py-12">
                    <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <CardTitle>Hozircha guruhlar yo'q</CardTitle>
                    <CardDescription className="mt-1">"Guruh qidirish" sahifasiga o'tib birinchi guruhni qo'shing</CardDescription>
                    <Link href="/dashboard" className="inline-block mt-4">
                      <Button><Plus className="h-4 w-4" /> Guruh qo'shish</Button>
                    </Link>
                  </div>
                </TD>
              </TR>
            )}
            {!loading && filtered.length === 0 && groups.length > 0 && (
              <TR><TD colSpan={5} className="text-center text-muted-foreground py-8">Hech narsa topilmadi</TD></TR>
            )}
            {filtered.map((g) => (
              <TR key={g.id} className="cursor-pointer">
                <TD>
                  <Link href={`/dashboard/groups/${g.id}`} className="flex items-start gap-3 group">
                    <div className="h-9 w-9 grid place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 group-hover:from-primary group-hover:to-accent transition shrink-0">
                      <Users2 className="h-4 w-4 text-primary group-hover:text-white transition" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold group-hover:text-primary transition truncate max-w-[300px]">{g.title}</div>
                      {g.username && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          @{g.username}
                        </div>
                      )}
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
                    <Link href={`/dashboard/groups/${g.id}`} className="inline-flex items-center gap-1.5 text-sm text-amber-300 hover:underline">
                      <AlertCircle className="h-4 w-4" /> Joylashuv kiritilmagan
                    </Link>
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
