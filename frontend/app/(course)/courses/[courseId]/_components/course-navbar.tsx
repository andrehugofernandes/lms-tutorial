import { Course, Chapter, UserProgress } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { NavbarRoutes } from "@/components/navbar-routes";
import { CourseMobileSidebar } from "./course-mobile-sidebar";

interface CourseNavbarProps {
  course: Course & {
    chapters: (Chapter & {
      userProgress: UserProgress[] | null;
    })[];
  };
  progressCount: number;
  isEnrolled: boolean;
}

export const CourseNavbar = ({
  course,
  progressCount,
  isEnrolled,
}: CourseNavbarProps) => {
  return (
    <div className="p-4 h-full flex items-center bg-transparent">
      <CourseMobileSidebar
        course={course}
        progressCount={progressCount}
        isEnrolled={isEnrolled}
      />
      <div className="hidden md:flex items-center ml-4">
        <Link href="/search" className="flex items-center text-sm text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para meus cursos
        </Link>
      </div>
      <NavbarRoutes />
    </div>
  );
};
