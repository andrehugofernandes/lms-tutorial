import { getServerSession } from "next-auth";
import { authOptions } from "./next-auth";
import { adminAuth } from "./firebase-admin";
import { cookies } from "next/headers";

const isNextAuth = process.env.NEXT_PUBLIC_AUTH_PROVIDER === "nextauth";

export const getCurrentUser = async () => {
  try {
    if (isNextAuth) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) return null;
      return {
        // @ts-ignore
        userId: session.user.id as string,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      };
    } else {
      // Firebase Route
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("session")?.value;

      if (!sessionCookie) return null;

      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
      return {
        userId: decodedClaims.uid,
        email: decodedClaims.email,
        name: decodedClaims.name,
        image: decodedClaims.picture,
      };
    }
  } catch (error) {
    console.log("[GET_CURRENT_USER_ERROR]", error);
    return null;
  }
};

// Emulate Clerk's `auth()` behavior for server components
export const auth = async () => {
    const user = await getCurrentUser();
    return {
        userId: user?.userId || null,
        user
    }
};

// Emulate Clerk's `currentUser()` behavior
export const currentUser = async () => {
    return await getCurrentUser();
};

