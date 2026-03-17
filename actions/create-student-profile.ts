"use server";

import { auth, currentUser } from "@/lib/auth";
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
                name: user.name ?? "Aluno",
                email: user.email ?? "",
                role: "STUDENT",
            },
        });
    }

    redirect("/search");
}
