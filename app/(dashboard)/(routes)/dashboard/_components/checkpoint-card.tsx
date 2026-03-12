import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { Course, Chapter } from "@prisma/client";
import { IconBadge } from "@/components/icon-badge";

interface CheckpointCardProps {
  course: Course & {
    progress: number | null;
    lastChapter?: Chapter | null;
  };
}

export const CheckpointCard = ({
  course
}: CheckpointCardProps) => {
  if (!course.lastChapter) return null;

  return (
    <Link href={`/courses/${course.id}/chapters/${course.lastChapter.id}`}>
      <div className="group border rounded-lg p-4 bg-white hover:border-sky-500 transition-all shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-x-4">
          <div className="bg-sky-100 p-2 rounded-md group-hover:bg-sky-200 transition">
            <PlayCircle className="h-6 w-6 text-sky-700" />
          </div>
          <div className="flex flex-col">
            <p className="font-semibold text-slate-800 line-clamp-1">
              Continuar: {course.title}
            </p>
            <p className="text-xs text-muted-foreground">
              Checkpoint: {course.lastChapter.title} • {course.progress}% concluído
            </p>
          </div>
        </div>
        <div className="text-sky-700 font-medium text-sm hidden md:block">
          Retomar aula →
        </div>
      </div>
    </Link>
  );
};
