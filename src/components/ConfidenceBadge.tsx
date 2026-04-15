import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  score: number;
  className?: string;
}

export function ConfidenceBadge({ score, className }: ConfidenceBadgeProps) {
  const color =
    score >= 90
      ? "text-success bg-success/10"
      : score >= 75
      ? "text-warning bg-warning/10"
      : "text-destructive bg-destructive/10";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        color,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {score}%
    </span>
  );
}
