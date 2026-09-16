import { LucideIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2 bg-[#09090b] dark:bg-white text-white dark:text-[#09090b] hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer">
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
