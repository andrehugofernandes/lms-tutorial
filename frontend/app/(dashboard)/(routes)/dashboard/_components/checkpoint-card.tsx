import { Clock, BookOpen } from "lucide-react";
import type { Course, Chapter } from "@/lib/types";
import { DashboardNavButton } from "./dashboard-nav-button";

interface CheckpointCardProps {
  course: Course & {
    progress: number | null;
    lastChapter?: Chapter | null;
  };
}

export const CheckpointCard = ({ course }: CheckpointCardProps) => {
  if (!course.lastChapter) return null;

  return (
    <div className="group border border-border/50 rounded-2xl p-6 bg-card/30 backdrop-blur-sm hover:border-primary/50 transition-all shadow-[0_0_15px_rgba(245,158,11,0.05)] relative overflow-hidden flex flex-col justify-between">
      <div className="space-y-2 relative z-10">
        <p className="text-primary text-sm font-semibold">
          Continue de onde parou
        </p>
        <h3 className="font-bold text-2xl text-foreground line-clamp-2">
          {course.title}
        </h3>
        
        <div className="flex items-center gap-x-4 mt-6">
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${course.progress || 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {Math.round(course.progress || 0)}% concluído
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 relative z-10">
        <div className="flex items-center gap-x-4 text-sm text-muted-foreground font-medium">
          <div className="flex items-center gap-x-1">
            <BookOpen className="w-4 h-4" />
            <span>Aulas</span>
          </div>
          <div className="flex items-center gap-x-1">
            <Clock className="w-4 h-4" />
            <span>Conteúdo online</span>
          </div>
        </div>
        
        <DashboardNavButton
          href={`/courses/${course.id}/chapters/${course.lastChapter.id}`}
          label="Continuar"
          loadingLabel="Abrindo..."
          className="px-6 font-bold"
        />
      </div>
    </div>
  );
};

