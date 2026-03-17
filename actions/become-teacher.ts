"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@/lib/generated/db";
import { revalidatePath } from "next/cache";

export async function becomeTeacher() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return { error: "Não autorizado" };
        }

        const profile = await db.profile.findUnique({
            where: { userId }
        });

        if (!profile) {
            return { error: "Perfil não encontrado" };
        }

        if (profile.role !== Role.STUDENT) {
            return { error: "Você já é um professor ou administrador" };
        }

        const updatedProfile = await db.profile.update({
            where: { userId },
            data: {
                role: Role.TEACHER,
            },
        });

        revalidatePath("/");
        revalidatePath("/search");

        return { success: true, profile: updatedProfile };
    } catch (error) {
        console.log("[BECOME_TEACHER_ERROR]", error);
        return { error: "Erro interno ao processar a solicitação" };
    }
}

