import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  color?: "green" | "teal" | "blue" | "orange" | "purple" | "red";
  className?: string;
}

const colorMap = {
  green: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    pill: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  teal: {
    bg: "bg-teal-500/10",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-500/20",
    pill: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    pill: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  orange: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    pill: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
    pill: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
    pill: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "purple",
  className,
}: StatCardProps) {
  const colors = colorMap[color] || colorMap.purple;

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-purple-500/30 hover:shadow-sm flex flex-col justify-between group",
        className
      )}
    >
      {/* Top Folder Header: Icon Badge on Left + Trend/Pill Badge on Right */}
      <div className="flex items-center justify-between mb-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md border transition-transform duration-200 group-hover:scale-105",
            colors.bg,
            colors.border
          )}
        >
          <Icon className={cn("h-4.5 w-4.5", colors.text)} />
        </div>

        {trend ? (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-mono font-medium px-2 h-5.5 border",
              trend.value >= 0
                ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/5"
                : "text-red-600 border-red-500/20 bg-red-500/5"
            )}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] font-mono font-medium px-2 h-5.5 text-muted-foreground">
            Active
          </Badge>
        )}
      </div>

      {/* Main Content with Lightweight Typography */}
      <div className="space-y-1">
        <p className="text-xs font-normal text-muted-foreground tracking-normal">{title}</p>
        <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        {subtitle && (
          <p className="text-[11px] font-light text-muted-foreground pt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
