import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { adminDb } from "./firebase-admin";

export const authOptions: NextAuthOptions = {
  // @ts-ignore
  adapter: FirestoreAdapter(adminDb),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
            if (!credentials?.email || !credentials?.password) {
                return null;
            }

            if (!adminDb) return null;

            // Search for user in Firestore
            const userQuery = await adminDb.collection("users")
                .where("email", "==", credentials.email)
                .limit(1)
                .get();
            
            let user: any = null;

            if (userQuery.empty) {
                // Do NOT create user. Only allow existing migrated users.
                console.log("Sign-in attempt for non-existent user:", credentials.email);
                return null;
            }

            user = { id: userQuery.docs[0].id, ...userQuery.docs[0].data() };

            if (user.password === credentials.password) {
                return user;
            }

            return null;
        } catch (error: any) {
            console.error("CRITICAL AUTH ERROR:", error.message);
            return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        // @ts-ignore
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  }
};

