"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { auth } from "@/lib/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";
import { useUser } from "@/components/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Router } from "lucide-react";
import { useRouter } from "next/navigation";

export const UserButton = () => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const isNextAuth = process.env.NEXT_PUBLIC_AUTH_PROVIDER === "nextauth";

    if (!isLoaded || !user) return null;

    const handleSignOut = async () => {
        if (isNextAuth) {
            await signOut({ callbackUrl: "/" });
        } else {
            if (auth) {
                await firebaseSignOut(auth);
            }
            router.push("/");
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
                    {user.image ? (
                        <img src={user.image} alt="User Avatar" className="h-full w-full object-cover" />
                    ) : (
                        user.name?.charAt(0) || "U"
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

