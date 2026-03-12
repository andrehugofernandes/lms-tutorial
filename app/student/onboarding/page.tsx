import { auth, currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function StudentOnboardingPage() {
    const { userId } = await auth();

    if (!userId) {
        return redirect("/sign-in");
    }

    // Parallel fetch for speed
    const [user, existingProfile] = await Promise.all([
        currentUser(),
        db.profile.findUnique({
            where: { userId },
        })
    ]);

    if (!user) {
        return redirect("/sign-in");
    }

    // Create STUDENT profile if it doesn't exist yet
    if (!existingProfile) {
        await db.profile.create({
            data: {
                userId,
                name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Aluno",
                email: user.emailAddresses[0]?.emailAddress ?? "",
                role: "STUDENT",
            },
        });
    }

    // Update Student Streak - we can do this without blocking the final redirect if it's not the first time
    // or keep it awaited but at least we saved time above
    try {
        const { updateUserStreak } = await import("@/actions/update-user-streak");
        await updateUserStreak(userId);
    } catch (error) {
        console.log("Onboarding Streak Error:", error);
    }

    // Always redirect to the student dashboard
    return redirect("/dashboard");
}
