import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export const getProfile = async (userId: string | null) => {
    if (!userId) return null;

    try {
        const profile = await db.profile.findUnique({
            where: {
                userId,
            },
        });

        return profile;
    } catch (error) {
        console.log("[GET_PROFILE_ERROR]", error);
        return null;
    }
};

export const hasRole = async (userId: string | null, allowedRoles: Role[]) => {
    if (!userId) return false;

    const profile = await getProfile(userId);

    if (!profile) return false;

    return allowedRoles.includes(profile.role);
};
