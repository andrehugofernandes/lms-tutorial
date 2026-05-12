import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Clock, Compass, Flame, Medal, PlayCircle, Trophy, GraduationCap } from "lucide-react";

import { CoursesList } from "@/components/courses-list";
import { InfoCard } from "./_components/info-card";
import { Button } from "@/components/ui/button";
import { CheckpointCard } from "./_components/checkpoint-card";
import { TeacherDashboard } from "./_components/teacher-dashboard";
import { serverApi } from "@/lib/server-api";
import { ScrollReveal } from "@/components/scroll-reveal";
import { KnowledgeBrain } from "@/components/knowledge-brain";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  const dashboard = await serverApi<any>("/api/meta/dashboard");

  if (dashboard.mode === "teacher") {
    return (
      <TeacherDashboard
        courses={dashboard.courses}
        stats={dashboard.stats}
      />
    );
  }

  const {
    totalHoursWatched,
    totalHoursTarget,
    completedCoursesCount,
    coursesInProgress,
    achievements,
    streakCount,
  } = dashboard;

  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto min-h-screen">
      <ScrollReveal delay={0.1}>
        <div className="flex flex-col lg:flex-row items-center justify-between bg-card/30 backdrop-blur-sm border border-border/50 rounded-3xl p-8 md:p-12 relative overflow-hidden">
          {/* Abstract glow */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="flex flex-col gap-y-4 z-10 max-w-xl">
            <h1 className="text-5xl md:text-7xl font-black text-foreground tracking-tight leading-none uppercase">
              Continue<br/>
              <span className="text-primary">Evoluindo.</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-4 font-medium">
              Seu progresso está sendo construído todos os dias.
            </p>
            <Link href="/search">
              <Button size="lg" className="rounded-full px-8 py-6 text-md font-bold bg-primary hover:bg-primary/90 text-primary-foreground w-fit flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all">
                <PlayCircle className="w-5 h-5 fill-current" />
                Continuar estudando
              </Button>
            </Link>
          </div>

          <div className="w-full lg:w-[600px] h-[300px] md:h-[400px] relative z-10 mt-8 lg:mt-0 flex items-center justify-center">
             <KnowledgeBrain />
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.2} yOffset={20}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <InfoCard
            variant="warning"
            icon={Flame}
            label="Ofensiva de estudos"
            numberOfItems={streakCount}
            suffix={streakCount === 1 ? "dia" : "dias"}
            actionText="🔥 Em andamento"
          />
          <InfoCard
            variant="info"
            icon={Clock}
            label="Horas estudadas"
            numberOfItems={totalHoursWatched}
            suffix="h"
            actionText="↑ 15% esta semana"
          />
          <InfoCard
            variant="success"
            icon={CheckCircle}
            label="Cursos concluídos"
            numberOfItems={completedCoursesCount}
            actionText="Ver certificados"
          />
          <InfoCard
            variant="info"
            icon={PlayCircle}
            label="Cursos em andamento"
            numberOfItems={coursesInProgress.length}
            actionText="Continuar agora"
          />
          <InfoCard
            variant="gold"
            icon={Medal}
            label="Medalhas ganhas"
            numberOfItems={achievements.length}
            actionText="Ver conquistas"
          />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.4} yOffset={60}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Seus Cursos</h2>
            <Link href="/search">
              <Button variant="ghost" className="text-primary hover:text-primary/80 transition-all font-semibold hover:bg-primary/10 rounded-full px-4">
                Ver catálogo completo &rarr;
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {coursesInProgress.length > 0 && (
               <CheckpointCard course={coursesInProgress[0]} />
            )}
            <div className="border border-border/50 rounded-2xl p-6 bg-card/30 backdrop-blur-sm hover:border-primary/50 transition-all shadow-[0_0_15px_rgba(245,158,11,0.05)] flex flex-col justify-between group">
              <div className="space-y-4">
                 <div className="p-3 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-all">
                   <GraduationCap className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                 </div>
                 <h3 className="text-2xl font-bold text-foreground">Explore novos conhecimentos</h3>
                 <p className="text-muted-foreground font-medium">Descubra novos cursos e acelere sua jornada de aprendizado.</p>
              </div>
              <div className="mt-8">
                <Link href="/search">
                   <Button variant="outline" className="rounded-full border-primary/50 text-primary hover:bg-primary/10 hover:border-primary w-fit px-6 font-bold">
                     Explorar cursos
                   </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
