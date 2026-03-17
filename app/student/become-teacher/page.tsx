"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { becomeTeacher } from "@/actions/become-teacher";

const BecomeTeacherPage = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const onClick = async () => {
        try {
            setIsLoading(true);
            const result = await becomeTeacher();

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Parabéns! Você agora é um professor.");
                router.refresh();
                router.push("/teacher/courses");
            }
        } catch (error) {
            toast.error("Algo deu errado. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full max-w-5xl mx-auto flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-xl border overflow-hidden flex flex-col md:flex-row w-full max-w-4xl">
                
                {/* Left Side: Illustration/Text */}
                <div className="bg-sky-700 p-8 md:p-12 text-white flex flex-col justify-center gap-y-6 md:w-1/2">
                    <div className="bg-white/20 p-4 rounded-full w-fit">
                        <GraduationCap className="h-10 w-10" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold mb-4">
                            Compartilhe seu conhecimento
                        </h1>
                        <p className="text-sky-100 text-lg leading-relaxed">
                            Transforme sua experiência em cursos incríveis e ajude centenas de alunos a alcançarem seus objetivos.
                        </p>
                    </div>
                    
                    <div className="space-y-4 mt-6">
                        <div className="flex items-center gap-x-3">
                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                            <span className="text-sm">Crie e gerencie seus próprios cursos</span>
                        </div>
                        <div className="flex items-center gap-x-3">
                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                            <span className="text-sm">Acompanhe o progresso dos seus alunos</span>
                        </div>
                        <div className="flex items-center gap-x-3">
                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                            <span className="text-sm">Painel de controle exclusivo para professores</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: CTA */}
                <div className="p-8 md:p-12 flex flex-col justify-center items-center gap-y-8 md:w-1/2 bg-slate-50">
                    <div className="text-center space-y-4">
                        <h2 className="text-2xl font-semibold text-slate-800">
                            Pronto para começar?
                        </h2>
                        <p className="text-slate-600">
                            Ao clicar no botão abaixo, sua conta será atualizada instantaneamente para o modo Professor.
                        </p>
                    </div>

                    <div className="w-full space-y-4">
                        <Button
                            onClick={onClick}
                            disabled={isLoading}
                            className="w-full py-8 text-lg bg-sky-700 hover:bg-sky-800 transition-all flex items-center justify-center gap-x-2 shadow-md group"
                        >
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    Tornar-me Professor
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition" />
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            disabled={isLoading}
                            className="w-full text-slate-500 hover:text-slate-700"
                        >
                            Agora não, quero continuar como aluno
                        </Button>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
                        Ambiente Seguro & Instantâneo
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BecomeTeacherPage;
