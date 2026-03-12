import Link from "next/link";
import { GraduationCap, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfile } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { forcePromoteToAdmin } from "@/actions/promote-admin";
import { Role } from "@prisma/client";

export default async function Home() {
    const { userId } = await auth();

    if (userId) {
        const profile = await getProfile(userId);
        
        if (profile?.role === Role.STUDENT) {
            return redirect("/dashboard");
        }

        if (profile?.role === Role.TEACHER || profile?.role === Role.ADMIN) {
            return redirect("/teacher/courses");
        }
    }

    return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-100/50">
            <div className="flex flex-col items-center justify-center w-full max-w-4xl px-4 py-8">

                {/* Brand Banner */}
                <div className="mb-8 flex flex-col items-center gap-y-4">
                    <div className="bg-sky-700 p-4 rounded-full">
                        <GraduationCap className="h-12 w-12 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-800 text-center">
                        Bem-vindo ao LMS PMJG
                    </h1>
                    <p className="text-muted-foreground text-center text-lg max-w-2xl">
                        A plataforma de cursos online da Prefeitura Municipal de Jaboatão dos Guararapes.
                        {userId ? (
                            <span className="block mt-2 font-semibold text-emerald-600">Você já está autenticado!</span>
                        ) : (
                            <span className="block mt-2">Selecione seu perfil de acesso para continuar.</span>
                        )}
                    </p>
                </div>

                {/* Access Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mt-8">

                    {/* Student Area */}
                    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border hover:shadow-md transition gap-y-6">
                        <div className="bg-sky-100 p-4 rounded-full">
                            <Users className="h-10 w-10 text-sky-700" />
                        </div>
                        <div className="flex flex-col items-center text-center gap-y-2">
                            <h2 className="text-2xl font-semibold text-slate-800">
                                Sou Aluno
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Acesse o catálogo de cursos, assista suas aulas e acompanhe seu progresso.
                            </p>
                        </div>
                        <Link href={userId ? "/student/onboarding" : "/sign-in?afterSignInUrl=/student/onboarding"} className="w-full">
                            <Button className="w-full text-md py-6 bg-sky-700 hover:bg-sky-800">
                                {userId ? "Acessar como Aluno" : "Entrar como Aluno"}
                            </Button>
                        </Link>
                    </div>

                    {/* Teacher Area */}
                    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border hover:shadow-md transition gap-y-6">
                        <div className="bg-emerald-100 p-4 rounded-full">
                            <GraduationCap className="h-10 w-10 text-emerald-700" />
                        </div>
                        <div className="flex flex-col items-center text-center gap-y-2">
                            <h2 className="text-2xl font-semibold text-slate-800">
                                Sou Professor
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Acesse o painel para criar e gerenciar cursos e aulas.
                            </p>
                        </div>
                        <Link href={userId ? "/teacher/courses" : "/sign-in?afterSignInUrl=/teacher/courses"} className="w-full">
                            <Button variant="outline" className="w-full text-md py-6 border-emerald-700 text-emerald-700 hover:bg-emerald-50">
                                {userId ? "Ir para o Painel" : "Entrar como Professor"}
                            </Button>
                        </Link>
                    </div>

                </div>

                {/* Dev Tools */}
                <div className="mt-8 opacity-50 hover:opacity-100 transition">
                    <form action={async () => {
                        "use server";
                        await forcePromoteToAdmin();
                    }}>
                        <Button variant="ghost" size="sm" type="submit" className="text-xs text-muted-foreground">
                            [Dev] Promover para Admin
                        </Button>
                    </form>
                </div>

            </div>
        </div>
    );
}
