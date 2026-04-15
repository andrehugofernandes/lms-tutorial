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
  });

  return redirect("/dashboard");
}
