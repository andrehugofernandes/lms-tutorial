import { auth, currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function StudentOnboardingPage() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        redirect("/sign-in");
    }

    // Check if profile already exists
    const existingProfile = await db.profile.findUnique({
        where: { userId },
    });

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

    // Always redirect to the course catalog
    redirect("/search");
}
