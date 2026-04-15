"use server";

import { redirect } from "next/navigation";

import { serverApi } from "@/lib/server-api";

export async function createStudentProfile() {
  await serverApi("/api/profiles/onboard/student", {
    method: "POST",
  });

  redirect("/dashboard");
}
