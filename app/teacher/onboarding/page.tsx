import { auth, currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export default async function TeacherOnboardingPage() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        redirect("/sign-in");
    }

    // Check if profile already exists
    const existingProfile = await db.profile.findUnique({
        where: { userId },
    });

    // Create TEACHER profile if it doesn't exist yet
    if (!existingProfile) {
        await db.profile.create({
            data: {
                userId,
                name: user.name ?? "Professor",
                email: user.email ?? "",
                role: Role.TEACHER,
            },
        });
    } else if (existingProfile.role === Role.STUDENT) {
        // Upgrade to TEACHER if they are currently a STUDENT
        await db.profile.update({
            where: { userId },
            data: {
                role: Role.TEACHER,
            },
        });
    }

    // Redirect to the teacher courses page
    redirect("/teacher/courses");
}
