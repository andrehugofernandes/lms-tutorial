"use server";

import { serverApi } from "@/lib/server-api";

export async function becomeTeacher() {
  try {
    return await serverApi("/api/profiles/become-teacher", {
      method: "POST",
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Erro interno ao processar a solicitacao",
    };
  }
}
