import { LucideIcon } from "lucide-react";
import { IconBadge } from "@/components/icon-badge";
import { Card } from "@/components/ui/card";

interface StreakCardProps {
  icon: LucideIcon;
  label: string;
  count: number;
}

export const StreakCard = ({
  icon: Icon,
  label,
  count,
}: StreakCardProps) => {
  return (
    <Card className="flex items-center gap-x-4 p-4 border-none bg-orange-50/50">
      <IconBadge
        variant="success"
        icon={Icon}
      />
      <div>
        <p className="font-medium text-lg text-orange-700">
          {count} {count === 1 ? "Dia" : "Dias"}
        </p>
        <p className="text-orange-600 text-sm">
          {label}
        </p>
      </div>
    </Card>
  )
}
