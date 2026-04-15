"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
    const isNextAuth = process.env.NEXT_PUBLIC_AUTH_PROVIDER === "nextauth";

    if (!isNextAuth) {
        // Here you would implement Firebase UI or custom Firebase sign-up
        return (
            <div className="flex min-h-screen items-center justify-center">
                <h2>Firebase Sign-Up (Coming Soon)</h2>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="p-8 border shadow-lg rounded-md flex flex-col items-center space-y-4">
                <h1 className="text-2xl font-bold">LMS Sign Up</h1>
                <Button onClick={() => signIn("google", { callbackUrl: "/search" })}>
                    Sign Up with Google
                </Button>
                <Button variant="outline" onClick={() => signIn("credentials", { callbackUrl: "/search" })}>
                    Sign Up with Credentials
                </Button>
            </div>
        </div>
    );
}