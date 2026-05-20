import { Course, Chapter, UserProgress } from "@/lib/types";
import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { CourseSidebar } from "./course-sidebar";

interface CourseMobileSidebarProps {
  course: Course & {
    chapters: (Chapter & {
      userProgress: UserProgress[] | null;
      isLocked?: boolean;
    })[];
  };
  progressCount: number;
  isEnrolled: boolean;
}

export const CourseMobileSidebar = ({
  course,
  progressCount,
  isEnrolled,
}: CourseMobileSidebarProps) => {
  return (
    <Sheet>
      <SheetTrigger className="md:hidden pr-4 opacity-75 transition">
        <Menu size={32} />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-slate-200 bg-white p-0 text-slate-900 dark:border-[#222] dark:bg-[#0a0a0a] dark:text-slate-200">
        <CourseSidebar
          course={course}
          progressCount={progressCount}
          isEnrolled={isEnrolled}
        />
      </SheetContent>
    </Sheet>
  );
};
