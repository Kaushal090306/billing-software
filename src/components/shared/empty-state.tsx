import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center bg-card/50">
      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted/60 text-muted-foreground mb-4 border border-border">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs font-normal text-muted-foreground max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="bg-[#09090b] dark:bg-white text-white dark:text-[#09090b] cursor-pointer rounded-md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
