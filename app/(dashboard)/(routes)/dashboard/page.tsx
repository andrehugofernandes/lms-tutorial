import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Clock, Compass, Flame, Medal, PlayCircle, Trophy } from "lucide-react";

import { getStudentMetrics } from "@/actions/get-student-metrics";
import { CoursesList } from "@/components/courses-list";
import { InfoCard } from "./_components/info-card";
import { Button } from "@/components/ui/button";
import { CheckpointCard } from "./_components/checkpoint-card";
import { StreakCard } from "./_components/streak-card";

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  const { 
    totalHoursWatched, 
    totalHoursTarget, 
    completedCoursesCount, 
    coursesInProgress,
    achievements,
    streakCount 
  } = await getStudentMetrics(userId);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header section with focus on Progress */}
      <div className="flex flex-col gap-y-2">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-x-2">
          Meu Painel de Estudos <Trophy className="h-8 w-8 text-amber-500" />
        </h1>
        <p className="text-slate-500">
          Você já completou <span className="font-bold text-sky-700">{totalHoursWatched}h</span> de um total de {totalHoursTarget}h planejadas.
        </p>
      </div>

      <div className="flex items-center gap-x-2">
        <StreakCard
          icon={Flame}
          label="Ofensiva de Estudos"
          count={streakCount}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard
          icon={Clock}
          label="Horas Estudadas"
          numberOfItems={totalHoursWatched}
          suffix="Hours"
        />
        <InfoCard
          variant="success"
          icon={CheckCircle}
          label="Cursos Concluídos"
          numberOfItems={completedCoursesCount}
          suffix="Courses"
        />
        <InfoCard
          icon={PlayCircle}
          label="Cursos em Andamento"
          numberOfItems={coursesInProgress.length}
          suffix="Courses"
        />
        <InfoCard
          variant="success"
          icon={Medal}
          label="Medalhas Ganhas"
          numberOfItems={achievements.length}
          suffix="Medals"
        />
      </div>

      {/* Checkpoints / Continue Watching */}
      {coursesInProgress.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Continuar Assistindo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coursesInProgress.slice(0, 2).map((course) => (
              <CheckpointCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}

      {/* Course List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Meus Cursos</h2>
          <Link href="/search">
            <Button variant="ghost" className="text-sky-700 hover:text-sky-800">
              Ver catálogo completo →
            </Button>
          </Link>
        </div>
        
        {coursesInProgress.length > 0 || completedCoursesCount > 0 ? (
          <CoursesList items={coursesInProgress} />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center gap-y-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-10">
            <Compass className="h-12 w-12 text-slate-400" />
            <h3 className="text-xl font-medium text-slate-600">Nenhum curso ainda</h3>
            <p className="text-muted-foreground max-w-xs">
              Comece sua jornada de aprendizado explorando nosso catálogo.
            </p>
            <Link href="/search">
              <Button className="bg-sky-700 hover:bg-sky-800">
                Explorar Cursos
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
