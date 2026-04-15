"use server";

import { serverApi } from "@/lib/server-api";

export async function updateUserStreak() {
  return serverApi("/api/profiles/streak", {
    method: "POST",
  });
}
