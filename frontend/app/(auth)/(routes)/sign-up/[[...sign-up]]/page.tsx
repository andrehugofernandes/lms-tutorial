"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { registerUser } from "@/actions/register-user";

export default function SignUpPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("STUDENT");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const result = await registerUser({ email, password, name, role });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Conta criada com sucesso! Agora você pode entrar.");
                router.push("/sign-in");
            }
        } catch (error) {
            toast.error("Ocorreu um erro inesperado");
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
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground">Criar Nova Conta</h1>
                    <p className="text-muted-foreground">Junte-se à nossa plataforma de ensino</p>
                </div>

                <form onSubmit={onSubmit} className="w-full space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Nome Completo</label>
                        <input
                            type="text"
                            placeholder="Seu Nome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-4 border border-border bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition rounded-none"
                            required
                        />
                    </div>
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
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Tipo de Conta</label>
                        <select 
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full p-4 border border-border bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition rounded-none"
                        >
                            <option value="STUDENT">Aluno</option>
                            <option value="TEACHER">Professor</option>
                        </select>
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-6 rounded-full bg-primary hover:bg-primary/90 text-black font-semibold text-lg"
                    >
                        {isLoading ? "Criando conta..." : "Criar Conta"}
                    </Button>
                </form>

                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Já tem uma conta?{" "}
                        <Link href="/sign-in" className="text-primary font-bold hover:underline">
                            Fazer Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}