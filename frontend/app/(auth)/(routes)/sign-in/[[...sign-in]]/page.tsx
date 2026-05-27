"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const afterSignInUrl = searchParams.get("afterSignInUrl") || "/search";

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                toast.error("Credenciais inválidas");
            } else {
                toast.success("Login realizado com sucesso!");
                window.location.href = afterSignInUrl;
            }
        } catch (error) {
            toast.error("Ocorreu um erro ao fazer login");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            
            <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition">
                <div className="bg-primary p-2 rounded-none">
                    <GraduationCap className="h-6 w-6 text-black" />
                </div>
                <span className="font-bold text-xl tracking-tighter uppercase text-foreground">LMS PMJG</span>
            </Link>

            <div className="p-8 bg-card border border-border flex flex-col items-center space-y-8 w-full max-w-md shadow-2xl">
                <div className="text-center space-y-2 w-full">
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground">Acessar Conta</h1>
                    <p className="text-muted-foreground">Insira suas credenciais para continuar</p>
                </div>

                <form onSubmit={onSubmit} className="w-full space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">E-mail</label>
                        <input
                            type="email"
                            placeholder="exemplo@lms.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 border border-border bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition rounded-none"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Senha</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 border border-border bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition rounded-none"
                            required
                        />
                    </div>
                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-6 rounded-full bg-primary hover:bg-primary/90 text-black font-semibold text-lg"
                    >
                        {isLoading ? "Autenticando..." : "Entrar"}
                    </Button>
                </form>

                <div className="relative w-full py-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
                        <span className="bg-card px-4 text-muted-foreground">Ou continue com</span>
                    </div>
                </div>

                <Button 
                    variant="outline" 
                    onClick={() => signIn("google", { callbackUrl: "/search" })}
                    disabled={isLoading}
                    className="w-full py-6 rounded-full border-border hover:bg-muted text-foreground"
                >
                    <img src="https://authjs.dev/img/providers/google.svg" alt="Google Logo" className="h-5 w-5 mr-2" />
                    Google
                </Button>
            </div>
        </div>
    );
}