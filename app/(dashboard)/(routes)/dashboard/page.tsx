import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Clock, Compass } from "lucide-react";

import { getDashboardCourses } from "@/actions/get-dashboard-courses";
import { CoursesList } from "@/components/courses-list";
import { InfoCard } from "./_components/info-card";
import { Button } from "@/components/ui/button";

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  const { coursesInProgress, completedCourses } =
    await getDashboardCourses(userId);

  const hasAnyCourse = coursesInProgress.length > 0 || completedCourses.length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard
          icon={Clock}
          label="Em andamento"
          numberOfItems={coursesInProgress.length}
        />
        <InfoCard
          variant="success"
          icon={CheckCircle}
          label="Concluídos"
          numberOfItems={completedCourses.length}
        />
      </div>

      {hasAnyCourse ? (
        <>
          <CoursesList items={[...coursesInProgress, ...completedCourses]} />

          {/* Explore more */}
          <div className="flex justify-center pt-4">
            <Link href="/search">
              <Button variant="outline" className="gap-x-2">
                <Compass className="h-4 w-4" />
                Explorar mais cursos
              </Button>
            </Link>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-y-4">
          <div className="bg-sky-100 p-6 rounded-full">
            <Compass className="h-12 w-12 text-sky-700" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800">
            Você ainda não tem cursos!
          </h2>
          <p className="text-muted-foreground max-w-sm">
            Explore nosso catálogo de cursos e se inscreva gratuitamente para começar a aprender.
          </p>
          <Link href="/search">
            <Button className="bg-sky-700 hover:bg-sky-800 gap-x-2">
              <Compass className="h-4 w-4" />
              Ver Catálogo de Cursos
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
