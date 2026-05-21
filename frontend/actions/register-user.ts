"use server";

import { adminDb } from "@/lib/firebase-admin";

export const registerUser = async (values: any) => {
    try {
        const { email, password, name, role } = values;
        
        if (!email || !password || !name) {
            return { error: "Campos obrigatórios ausentes" };
        }

        if (!adminDb) {
            return { error: "Banco de dados indisponível" };
        }

        const userQuery = await adminDb.collection("users").where("email", "==", email).limit(1).get();
        if (!userQuery.empty) {
            return { error: "Usuário já existe" };
        }

        const userRef = adminDb.collection("users").doc();
        await userRef.set({
            id: userRef.id,
            email,
            password, // Em produção, use hash (ex: bcrypt)
            name,
            emailVerified: null,
            createdAt: new Date(),
        });

        await adminDb.collection("profiles").doc().set({
            userId: userRef.id,
            name,
            email,
            role: role || "STUDENT",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return { success: true, userId: userRef.id };
    } catch (error: any) {
        console.error("REGISTER_ERROR:", error.message);
        return { error: "Erro ao criar usuário" };
    }
}
