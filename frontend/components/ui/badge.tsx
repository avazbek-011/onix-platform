import { cn } from "@/lib/utils";

const variants = {
  default: "bg-muted text-foreground border-border",
  success: "bg-success/15 text-emerald-300 border-emerald-500/30",
  warning: "bg-warning/15 text-amber-300 border-amber-500/30",
  destructive: "bg-destructive/15 text-red-300 border-red-500/30",
  primary: "bg-primary/15 text-sky-300 border-sky-500/30",
  accent: "bg-accent/15 text-purple-300 border-purple-500/30",
} as const;

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}
