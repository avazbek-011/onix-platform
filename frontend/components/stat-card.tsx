import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = "primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: "primary" | "accent" | "success" | "warning" | "destructive";
}) {
  const colorClass = {
    primary: "from-primary/20 to-primary/0 text-primary",
    accent: "from-accent/20 to-accent/0 text-purple-300",
    success: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
    warning: "from-amber-500/20 to-amber-500/0 text-amber-300",
    destructive: "from-red-500/20 to-red-500/0 text-red-300",
  }[color];

  return (
    <div className="glass rounded-xl p-5 relative overflow-hidden group hover:border-primary/30 transition animate-fade-in">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition", colorClass)} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
            <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
            {trend && <div className="mt-1 text-xs text-muted-foreground">{trend}</div>}
          </div>
          <div className={cn("h-11 w-11 rounded-lg grid place-items-center bg-muted/60", colorClass.split(" ").pop())}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
