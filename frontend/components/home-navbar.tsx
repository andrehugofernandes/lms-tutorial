"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface HomeNavbarProps {
    userId: string | null;
}

export const HomeNavbar = ({ userId }: HomeNavbarProps) => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Ativa os botões extras quando o scroll passar de 300px
            if (window.scrollY > 300) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-primary p-2 rounded-none">
                        <GraduationCap className="h-6 w-6 text-black" />
                    </div>
                    <span className="font-bold text-xl tracking-tighter uppercase">LMS PMJG</span>
                </div>
                
                <div className="flex items-center gap-4 transition-all duration-500">
                    {!userId ? (
                        <>
                            {/* Estes botões aparecem apenas no scroll */}
                            <div className={`flex items-center gap-2 transition-all duration-300 ${isScrolled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[-10px] pointer-events-none hidden md:flex"}`}>
                                <Link href="/sign-in">
                                    <Button variant="ghost" className="rounded-full text-slate-600 hover:text-primary hover:bg-primary/5 font-medium">
                                        Já sou aluno
                                    </Button>
                                </Link>
                                <Link href="/sign-in">
                                    <Button variant="ghost" className="rounded-full text-slate-600 hover:text-primary hover:bg-primary/5 font-medium">
                                        Sou Professor
                                    </Button>
                                </Link>
                            </div>

                            <Link href="/sign-up">
                                <Button variant="outline" className="rounded-full border-primary text-primary hover:bg-primary/10 font-semibold px-6">
                                    Quero me cadastrar
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
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    );
};
