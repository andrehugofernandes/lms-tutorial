"use client";

import { CheckCircle, Lock, PlayCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

interface CourseSidebarItemProps {
  label: string;
  id: string;
  isCompleted: boolean;
  courseId: string;
  isLocked: boolean;
};

export const CourseSidebarItem = ({
  label,
  id,
  isCompleted,
  courseId,
  isLocked,
}: CourseSidebarItemProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const Icon = isLocked ? Lock : (isCompleted ? CheckCircle : PlayCircle);
  const isActive = pathname?.includes(id);

  const onClick = () => {
    router.push(`/courses/${courseId}/chapters/${id}`);
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "flex flex-col gap-y-1 w-full text-left p-4 rounded-lg transition-all border border-[#222] bg-[#111] hover:bg-[#1a1a1a]",
        isActive && "border-yellow-500/50 bg-[#1a1500] hover:bg-[#1a1500]",
        isCompleted && !isActive && "border-[#333]",
        isLocked && "opacity-70 cursor-not-allowed"
      )}
      disabled={isLocked}
    >
      <div className="flex items-start gap-x-3">
        <div className={cn(
          "mt-0.5 rounded-full p-1 border",
          isActive ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/50" : 
          isCompleted ? "bg-green-500/20 text-green-500 border-green-500/50" : 
          "bg-[#222] text-slate-400 border-[#333]"
        )}>
          <Icon size={14} />
        </div>
        <div className="flex flex-col">
          <span className={cn(
            "text-sm font-medium",
            isActive ? "text-yellow-500" :
            isCompleted ? "text-slate-300" :
            "text-slate-400"
          )}>
            {label}
          </span>
          {isLocked && <span className="text-xs text-slate-600 mt-1">Bloqueado</span>}
        </div>
      </div>
    </button>
  )
}