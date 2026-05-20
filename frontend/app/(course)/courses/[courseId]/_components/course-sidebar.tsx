import { Chapter, Course, UserProgress } from "@/lib/types";
import { CourseSidebarItem } from "./course-sidebar-item";
import { Progress } from "@/components/ui/progress";
import { Trophy, Brain } from "lucide-react";

interface CourseSidebarProps {
  course: Course & {
    chapters: (Chapter & {
      userProgress: UserProgress[] | null;
      isLocked?: boolean;
    })[];
  };
  progressCount: number;
  isEnrolled: boolean;
}

export const CourseSidebar = ({
  course,
  progressCount,
  isEnrolled,
}: CourseSidebarProps) => {
  const completedCount = course.chapters.filter(
    (chapter) => chapter.userProgress?.[0]?.isCompleted
  ).length;

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-white text-slate-900 dark:bg-[#0a0a0a] dark:text-slate-200">
      <div className="p-6 flex flex-col border-b border-slate-200 dark:border-[#222]">
        <div className="flex items-center gap-x-2 text-yellow-500 mb-2">
          <Trophy className="h-5 w-5" />
          <h2 className="font-semibold text-sm">Seu progresso na trilha</h2>
        </div>
        
        {isEnrolled && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Progresso geral</span>
              <span className="text-xl font-bold text-yellow-500">{Math.round(progressCount)}%</span>
            </div>
            <Progress value={progressCount} className="h-2 bg-slate-200 dark:bg-[#222]" variant="warning" />
            <p className="text-xs text-slate-500 mt-2 dark:text-slate-500">
              {completedCount} de {course.chapters.length} aulas concluídas
            </p>
          </div>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-200">Aulas da Trilha</h3>
        <div className="flex flex-col gap-y-2 w-full flex-1">
          {course.chapters.map((chapter) => (
            <CourseSidebarItem
              key={chapter.id}
              id={chapter.id}
              label={chapter.title}
              isCompleted={!!chapter.userProgress?.[0]?.isCompleted}
              courseId={course.id}
              isLocked={chapter.isLocked ?? (!chapter.isFree && !isEnrolled)}
            />
          ))}
        </div>

        {/* Quiz Placeholder Block at the bottom */}
        <div className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-50 p-4 dark:border-yellow-500/20 dark:bg-gradient-to-br dark:from-[#1a1500] dark:to-[#0a0a0a]">
          <div className="flex items-start gap-x-3">
            <Brain className="h-6 w-6 text-yellow-500 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900 text-sm dark:text-slate-200">Desafio ao final da aula</h4>
              <p className="text-xs text-slate-600 mt-1 dark:text-slate-400">Responda ao quiz e prove que aprendeu!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
