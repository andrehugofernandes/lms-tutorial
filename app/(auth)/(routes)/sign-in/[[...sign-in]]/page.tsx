"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function SignInPage() {
    const isNextAuth = process.env.NEXT_PUBLIC_AUTH_PROVIDER === "nextauth";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    if (!isNextAuth) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <h2>Firebase Sign-In (Coming Soon)</h2>
            </div>
        );
    }

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
                window.location.href = "/search";
            }
        } catch (error) {
            toast.error("Ocorreu um erro ao fazer login");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
            <div className="p-8 bg-white border shadow-xl rounded-2xl flex flex-col items-center space-y-6 w-full max-w-md">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-slate-800">LMS Login</h1>
                    <p className="text-slate-500">Entre na sua conta para continuar</p>
                </div>

                <form onSubmit={onSubmit} className="w-full space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">E-mail</label>
                        <input
                            type="email"
                            placeholder="exemplo@lms.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Senha</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition"
                            required
                        />
                    </div>
                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-6 bg-sky-700 hover:bg-sky-800 text-white font-semibold text-lg"
                    >
                        {isLoading ? "Entrando..." : "Entrar com Credenciais"}
                    </Button>
                </form>

                <div className="relative w-full py-2">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-500">Ou continue com</span>
                    </div>
                </div>

                <Button 
                    variant="outline" 
                    onClick={() => signIn("google", { callbackUrl: "/search" })}
                    disabled={isLoading}
                    className="w-full py-6 border-slate-300 hover:bg-slate-50"
                >
                    <img src="https://authjs.dev/img/providers/google.svg" className="h-5 w-5 mr-2" />
                    Google
                </Button>
            </div>
        </div>
    );
}