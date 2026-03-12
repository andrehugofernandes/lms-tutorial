"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export async function createStudentProfile() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        redirect("/sign-in");
    }

    const existingProfile = await db.profile.findUnique({
        where: { userId },
    });

    if (!existingProfile) {
        await db.profile.create({
            data: {
                userId,
                name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
                email: user.emailAddresses[0]?.emailAddress,
                role: "STUDENT",
            },
        });
    }

    redirect("/search");
}
