import { auth, currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function StudentOnboardingPage() {
    console.time("🚀 [ONBOARDING_AUTH]");
    const { userId } = await auth();
    console.timeEnd("🚀 [ONBOARDING_AUTH]");

    if (!userId) {
        return redirect("/sign-in");
    }

    console.time("🚀 [ONBOARDING_FETCH]");
    // Parallel fetch for speed
    const [user, existingProfile] = await Promise.all([
        currentUser(),
        db.profile.findUnique({
            where: { userId },
        })
    ]);
    console.timeEnd("🚀 [ONBOARDING_FETCH]");

    if (!user) {
        return redirect("/sign-in");
    }

    // Create STUDENT profile if it doesn't exist yet
    if (!existingProfile) {
        console.time("🚀 [ONBOARDING_CREATE_PROFILE]");
        await db.profile.create({
            data: {
                userId,
                name: user.name ?? "Aluno",
                email: user.email ?? "",
                role: "STUDENT",
            },
        });
        console.timeEnd("🚀 [ONBOARDING_CREATE_PROFILE]");
    }

    // Update Student Streak
    try {
        console.time("🚀 [ONBOARDING_STREAK]");
        const { updateUserStreak } = await import("@/actions/update-user-streak");
        await updateUserStreak(userId);
        console.timeEnd("🚀 [ONBOARDING_STREAK]");
    } catch (error) {
        console.log("Onboarding Streak Error:", error);
    }

    console.log("🚀 [ONBOARDING_REDIRECT] -> /dashboard");
    // Always redirect to the student dashboard
    return redirect("/dashboard");
}
