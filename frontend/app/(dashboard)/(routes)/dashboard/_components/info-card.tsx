import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoCardProps {
  numberOfItems: number | string;
  variant?: "default" | "success" | "warning" | "info" | "gold";
  label: string;
  icon: LucideIcon;
  suffix?: string;
  actionText?: string;
  actionIcon?: LucideIcon;
}

export const InfoCard = ({
  variant = "default",
  icon: Icon,
  numberOfItems,
  label,
  suffix = "",
  actionText,
  actionIcon: ActionIcon
}: InfoCardProps) => {
  const variantStyles = {
    default: "text-primary bg-primary/10 border-primary/20",
    success: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    info: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    gold: "text-amber-500 bg-amber-500/10 border-amber-500/20"
  };

  const actionColors = {
    default: "text-primary",
    success: "text-emerald-500",
    warning: "text-orange-500",
    info: "text-sky-500",
    gold: "text-amber-500"
  };

  return (
    <div className="border border-border/50 rounded-2xl flex items-center gap-x-4 p-5 bg-card/30 backdrop-blur-sm hover:border-primary/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.05)] transition-all group">
      <div className={cn("p-3 rounded-full border", variantStyles[variant])}>
        <Icon size={24} className="group-hover:scale-110 transition-transform" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <p className="font-bold text-2xl text-foreground">
            {numberOfItems}
          </p>
          {suffix && <span className="text-lg font-medium text-foreground">{suffix}</span>}
        </div>
        <p className="text-muted-foreground text-sm font-medium">
          {label}
        </p>
        {actionText && (
          <div className={cn("flex items-center gap-1 mt-1 text-xs font-semibold cursor-pointer hover:underline opacity-90", actionColors[variant])}>
            {ActionIcon && <ActionIcon size={12} />}
            {actionText}
          </div>
        )}
      </div>
    </div>
  )
}
