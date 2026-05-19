"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Phone,
  LogOut,
  Building2,
  Users,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuth, getStoredUser } from "@/lib/api";
import { useEffect, useState } from "react";

const managerNav = [
  { href: "/dashboard", label: "Guruh qidirish", icon: Search },
  { href: "/dashboard/my-groups", label: "Mening guruhlarim", icon: ListChecks },
  { href: "/dashboard/accounts", label: "Telegram akkount", icon: Phone },
];

const adminNav = [
  { href: "/admin", label: "Xodimlar", icon: Users },
  { href: "/dashboard", label: "Guruh qidirish", icon: Search },
  { href: "/dashboard/my-groups", label: "Mening guruhlarim", icon: ListChecks },
  { href: "/dashboard/accounts", label: "Telegram akkount", icon: Phone },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  const nav = user?.role === "admin" ? adminNav : managerNav;

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border/60 bg-card/40 backdrop-blur-xl">
      <div className="px-6 py-6 border-b border-border/60">
        <Link href={user?.role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center glow-primary">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-base leading-tight">Onix Platform</div>
            <div className="text-xs text-muted-foreground">Real Estate Intel</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 scroll-y overflow-y-auto">
        {nav.map((item) => {
          const exact = item.href === "/dashboard" || item.href === "/admin";
          const active = exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="p-3 border-t border-border/60 space-y-2">
          <div className="px-3 py-2 rounded-lg bg-muted/40 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-xs font-bold text-white">
              {(user.full_name || user.username)[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user.full_name || user.username}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {user.role === "admin" ? (
                  <><ShieldCheck className="h-3 w-3" /> Boshliq</>
                ) : (
                  <>Xodim</>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </button>
        </div>
      )}
    </aside>
  );
}
