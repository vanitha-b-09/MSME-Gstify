import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "approved" | "pending" | "flagged";
  className?: string;
}

const statusConfig = {
  approved: {
    label: "Approved",
    classes: "bg-success/10 text-success border-success/20",
  },
  pending: {
    label: "Pending",
    classes: "bg-muted text-muted-foreground border-border",
  },
  flagged: {
    label: "Flagged",
    classes: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}
