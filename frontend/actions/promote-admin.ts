"use server";

import { serverApi } from "@/lib/server-api";

export async function forcePromoteToAdmin() {
  try {
    return await serverApi("/api/profiles/promote-admin", {
      method: "POST",
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to promote user",
    };
  }
}
