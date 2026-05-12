"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "../auth-provider";
import { ThemeProvider } from "./theme-provider";

export const ClientProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            <SessionProvider>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </SessionProvider>
        </ThemeProvider>
    );
};
