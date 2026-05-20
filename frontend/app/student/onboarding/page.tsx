import { auth } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";

export default async function StudentOnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/sign-in");
  }

  await serverApi("/api/profiles/onboard/student", {
    method: "POST",
    retries: 3,
    retryDelayMs: 1500,
    timeoutMs: 30000,
  });

  return redirect("/dashboard");
}
