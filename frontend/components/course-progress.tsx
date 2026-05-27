import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CourseProgressProps {
  value: number;
  variant?: "default" | "success" | "warning" | "gold",
  size?: "default" | "sm";
};

const colorByVariant = {
  default: "text-sky-700",
  success: "text-emerald-700",
  warning: "text-amber-600 dark:text-amber-400",
  gold: "text-[#FF9F00]",
}

const sizeByVariant = {
  default: "text-sm",
  sm: "text-xs",
}

export const CourseProgress = ({
  value,
  variant,
  size,
}: CourseProgressProps) => {
  const normalizedValue = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), 100)
    : 0;
  const progressLabel = normalizedValue <= 0
    ? "Comece a assistir"
    : `${Math.round(normalizedValue)}% completo`;

  return (
    <div>
      <Progress
        className="h-2"
        value={normalizedValue}
        variant={variant}
      />
      <p className={cn(
        "font-medium mt-2",
        colorByVariant[variant || "default"],
        sizeByVariant[size || "default"],
      )}>
        {progressLabel}
      </p>
    </div>
  )
}
