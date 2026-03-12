import { LucideIcon } from "lucide-react";

import { IconBadge } from "@/components/icon-badge"

interface InfoCardProps {
  numberOfItems: number;
  variant?: "default" | "success";
  label: string;
  icon: LucideIcon;
  suffix?: string;
}

export const InfoCard = ({
  variant,
  icon: Icon,
  numberOfItems,
  label,
  suffix = "Courses",
}: InfoCardProps) => {
  return (
    <div className="border rounded-md flex items-center gap-x-2 p-3 bg-white shadow-sm">
      <IconBadge
        variant={variant}
        icon={Icon}
      />
      <div>
        <p className="font-semibold text-slate-700">
          {label}
        </p>
        <p className="text-gray-500 text-sm">
          {numberOfItems} {numberOfItems === 1 ? suffix.replace(/s$/, "") : suffix}
        </p>
      </div>
    </div>
  )
}