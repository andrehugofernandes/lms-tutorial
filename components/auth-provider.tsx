"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

type AppUser = {
  userId: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

type AuthContextType = {
  user: AppUser | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const isNextAuth = process.env.NEXT_PUBLIC_AUTH_PROVIDER === "nextauth";
  
  // NextAuth hook (safe to call, but might return unauthenticated if we're not using it)
  const { data: session, status } = useSession();

  const [firebaseUser, setFirebaseUser] = useState<AppUser | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);

  useEffect(() => {
    if (isNextAuth || !auth) {
        setFirebaseLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        setFirebaseUser({
            userId: user.uid,
            email: user.email,
            name: user.displayName,
            image: user.photoURL
        });
        
        // Ensure session cookie exists for server side requests
        const token = await user.getIdToken();
        await fetch("/api/auth/session-cookie", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ token })
        });
      } else {
        setFirebaseUser(null);
        await fetch("/api/auth/session-cookie", { method: "DELETE" });
      }
      setFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, [isNextAuth]);

  let user: AppUser | null = null;
  let isLoading = true;

  if (isNextAuth) {
    if (session?.user) {
        user = {
            // @ts-ignore
            userId: session.user.id as string,
            email: session.user.email || null,
            name: session.user.name || null,
            image: session.user.image || null,
        }
    }
    isLoading = status === "loading";
  } else {
    user = firebaseUser;
    isLoading = firebaseLoading;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useCustomAuth = () => useContext(AuthContext);

// To emulate useAuth() from clerk
export const useAuth = () => {
    const { user, isLoading } = useCustomAuth();
    return {
        userId: user?.userId || null,
        isLoaded: !isLoading,
        isSignedIn: !!user
    }
};

// To emulate currentUser() but on the client (Clerk's useUser)
export const useUser = () => {
    const { user, isLoading } = useCustomAuth();
    return {
        user,
        isLoaded: !isLoading,
        isSignedIn: !!user
    }
}
