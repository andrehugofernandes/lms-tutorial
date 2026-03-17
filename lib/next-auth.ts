import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
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

            let user = await db.user.findUnique({
                where: { email: credentials.email }
            });
            
            if (!user) {
                user = await db.user.create({
                    data: {
                        email: credentials.email,
                        // @ts-ignore
                        password: credentials.password,
                        name: credentials.email.split('@')[0],
                    }
                });
                
                await db.profile.create({
                    data: {
                        userId: user.id,
                        name: user.name || "Aluno",
                        email: user.email,
                        role: "STUDENT",
                    }
                });
            }

            // @ts-ignore
            if (user.password === credentials.password) {
                return user;
            }

            return null;
        } catch (error: any) {
            console.error("CRITICAL AUTH ERROR:", error.message);
            return null;
        } finally {
            console.log("--- AUTH DEBUG END ---");
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
