import { auth } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";

export default async function TeacherOnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  await serverApi("/api/profiles/onboard/teacher", {
    method: "POST",
  });

  redirect("/teacher/courses");
}
