import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function forcePromoteToAdmin() {
    const { userId } = await auth();

    if (!userId) {
        return { error: "User not authenticated" };
    }

    try {
        const profile = await db.profile.upsert({
            where: {
                userId,
            },
            update: {
                role: Role.ADMIN,
            },
            create: {
                userId,
                role: Role.ADMIN,
            },
        });

        return { success: profile };
    } catch (error) {
        console.log("[PROMOTE_ERROR]", error);
        return { error: "Failed to promote user" };
    }
}
