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
        "flex flex-col gap-y-1 w-full text-left p-4 rounded-lg transition-all border border-slate-200 bg-white hover:bg-slate-50 dark:border-[#222] dark:bg-[#111] dark:hover:bg-[#1a1a1a]",
        isActive && "border-yellow-500/70 bg-yellow-50 hover:bg-yellow-50 dark:border-yellow-500/50 dark:bg-[#1a1500] dark:hover:bg-[#1a1500]",
        isCompleted && !isActive && "border-slate-300 dark:border-[#333]",
        isLocked && "opacity-70 cursor-not-allowed"
      )}
      disabled={isLocked}
    >
      <div className="flex items-start gap-x-3">
        <div className={cn(
          "mt-0.5 rounded-full p-1 border",
          isActive ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/50 dark:text-yellow-500" :
          isCompleted ? "bg-green-500/15 text-green-600 border-green-500/40 dark:bg-green-500/20 dark:text-green-500 dark:border-green-500/50" :
          "bg-slate-100 text-slate-500 border-slate-200 dark:bg-[#222] dark:text-slate-400 dark:border-[#333]"
        )}>
          <Icon size={14} />
        </div>
        <div className="flex flex-col">
          <span className={cn(
            "text-sm font-medium",
            isActive ? "text-yellow-600 dark:text-yellow-500" :
            isCompleted ? "text-slate-700 dark:text-slate-300" :
            "text-slate-600 dark:text-slate-400"
          )}>
            {label}
          </span>
          {isLocked && <span className="text-xs text-slate-500 mt-1 dark:text-slate-600">Bloqueado</span>}
        </div>
      </div>
    </button>
  )
}
