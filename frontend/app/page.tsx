import Link from "next/link";
import { GraduationCap, ArrowRight, BookOpen, Target, Award, ArrowUpRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { forcePromoteToAdmin } from "@/actions/promote-admin";
import { ScrollReveal } from "@/components/scroll-reveal";
import { KnowledgeBrain } from "@/components/knowledge-brain";
import Image from "next/image";

export default async function Home() {
    const { userId } = await auth();

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white flex flex-col">
            
            {/* Top Navigation */}
            <nav className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary p-2 rounded-none">
                            <GraduationCap className="h-6 w-6 text-black" />
                        </div>
                        <span className="font-bold text-xl tracking-tighter uppercase">LMS PMJG</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {!userId ? (
                            <>
                                <Link href="/sign-in?afterSignInUrl=/student/onboarding">
                                    <Button variant="ghost" className="rounded-full hidden md:inline-flex group">
                                        Entrar como Aluno
                                        <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                    </Button>
                                </Link>
                                <Link href="/sign-in?afterSignInUrl=/teacher/onboarding">
                                    <Button className="rounded-full bg-primary text-black hover:bg-primary/90 font-semibold px-6 group">
                                        Sou Professor
                                        <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            <Link href="/dashboard">
                                <Button className="rounded-full bg-primary text-black hover:bg-primary/90 font-semibold px-8 group">
                                    Ir para o Painel 
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1">
                <section className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 md:pt-48 md:pb-32">
                    
                    {/* Knowledge Brain Animation */}
                    <div className="absolute right-0 top-10 hidden lg:block opacity-80">
                        <ScrollReveal delay={0.5}>
                            <KnowledgeBrain />
                        </ScrollReveal>
                    </div>

                    <ScrollReveal delay={0.1} yOffset={50}>
                        <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black uppercase leading-[0.85] tracking-tighter relative z-10">
                            Domine o <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60" style={{ WebkitTextStroke: "2px hsl(var(--primary))" }}>
                                Futuro.
                            </span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal delay={0.3} yOffset={30}>
                        <div className="mt-12 md:mt-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                            <p className="text-xl md:text-3xl text-muted-foreground font-light leading-snug">
                                A plataforma oficial de capacitação da Prefeitura de Jaboatão dos Guararapes. Desenvolva habilidades para transformar sua carreira.
                            </p>
                            
                            <div className="flex flex-col gap-6 md:pl-12 border-l border-border">
                                <div className="space-y-4">
                                    <h3 className="text-sm uppercase tracking-widest text-primary font-bold">Inicie sua Jornada</h3>
                                    <p className="text-muted-foreground">
                                        Acesse dezenas de cursos gratuitos com certificação, trilhas de conhecimento estruturadas e acompanhamento contínuo.
                                    </p>
                                </div>
                                {!userId && (
                                    <Link href="/sign-in?afterSignInUrl=/student/onboarding">
                                        <Button size="lg" className="rounded-full bg-white text-black hover:bg-white/90 w-fit text-lg h-14 px-8 mt-4 group">
                                            Começar Agora 
                                            <ArrowUpRight className="ml-2 h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </ScrollReveal>
                </section>

                {/* Light Section 1: Concept Image & Text */}
                <section className="bg-white text-black py-24 md:py-32 border-t border-border/20">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <ScrollReveal delay={0.2} yOffset={40}>
                            <div className="relative w-full aspect-[4/3] rounded-none overflow-hidden border border-black/10">
                                <Image 
                                    src="/student-learning.png" 
                                    alt="Estudante aprendendo pelo LMS" 
                                    fill 
                                    className="object-cover hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        </ScrollReveal>
                        <ScrollReveal delay={0.4} yOffset={40}>
                            <div className="space-y-8">
                                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-tight">
                                    Aprenda <br/> <span className="text-primary">Sem Limites</span>
                                </h2>
                                <p className="text-lg text-slate-600 font-light leading-relaxed">
                                    Nossa plataforma foi desenvolvida pensando no estudante moderno. Com acesso 24/7 a materiais de alta qualidade, vídeo aulas interativas e suporte especializado, o seu potencial de aprendizado não tem fronteiras.
                                </p>
                                <Button className="rounded-full bg-black text-white hover:bg-black/80 font-semibold px-8 h-12 group">
                                    Conheça os Cursos
                                    <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                </Button>
                            </div>
                        </ScrollReveal>
                    </div>
                </section>

                {/* Light Section 2: Features Layout with Image */}
                <section className="bg-slate-50 text-black py-24 md:py-32">
                    <div className="max-w-7xl mx-auto px-6">
                        
                        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                            <ScrollReveal delay={0.1}>
                                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                                    Estrutura de <span className="text-primary">Excelência</span>
                                </h2>
                            </ScrollReveal>
                            <ScrollReveal delay={0.2}>
                                <p className="text-slate-500 max-w-sm">Tudo o que você precisa para impulsionar a sua carreira e conquistar novas certificações.</p>
                            </ScrollReveal>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                            {/* Features List */}
                            <div className="md:col-span-5 flex flex-col gap-6">
                                {[
                                    { icon: BookOpen, title: "Cursos Completos", desc: "Acesse um catálogo extenso de aulas em vídeo e materiais de apoio." },
                                    { icon: Target, title: "Trilhas Direcionadas", desc: "Siga caminhos de aprendizagem estruturados para atingir seus objetivos." },
                                    { icon: Award, title: "Certificação Oficial", desc: "Conquiste certificados emitidos pela Prefeitura ao completar cursos." }
                                ].map((feature, i) => (
                                    <ScrollReveal key={i} delay={0.3 + (i * 0.1)} yOffset={30}>
                                        <div className="group p-8 border border-black/10 bg-white hover:border-primary transition-colors duration-300 flex items-start gap-4 h-full">
                                            <div className="bg-slate-100 w-12 h-12 flex-shrink-0 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-colors rounded-none">
                                                <feature.icon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                                <p className="text-slate-600 text-sm">{feature.desc}</p>
                                            </div>
                                        </div>
                                    </ScrollReveal>
                                ))}
                            </div>

                            {/* Large Image */}
                            <div className="md:col-span-7 h-full min-h-[400px]">
                                <ScrollReveal delay={0.4} yOffset={40}>
                                    <div className="relative w-full h-full min-h-[400px] rounded-none overflow-hidden border border-black/10">
                                        <Image 
                                            src="/modern-classroom.png" 
                                            alt="Ambiente de aprendizado moderno" 
                                            fill 
                                            className="object-cover hover:scale-105 transition-transform duration-700"
                                        />
                                    </div>
                                </ScrollReveal>
                            </div>
                        </div>

                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-border py-12 bg-background">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2 opacity-50">
                        <GraduationCap className="h-5 w-5" />
                        <span className="font-bold tracking-tighter uppercase">LMS PMJG &copy; {new Date().getFullYear()}</span>
                    </div>
                    
                    {/* Dev Tools */}
                    <div className="opacity-20 hover:opacity-100 transition">
                        <form action={async () => {
                            "use server";
                            await forcePromoteToAdmin();
                        }}>
                            <Button variant="ghost" size="sm" type="submit" className="text-xs text-muted-foreground rounded-full">
                                [Dev] Promover para Admin
                            </Button>
                        </form>
                    </div>
                </div>
            </footer>
        </div>
    );
}

