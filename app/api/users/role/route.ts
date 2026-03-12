import { auth } from "@/lib/auth";
import { isTeacher, isAdmin } from "@/lib/teacher";
import { hasRole } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const authorizedAsTeacher = await isTeacher(userId);
        const authorizedAsAdmin = await isAdmin(userId);
        const authorizedAsStudent = await hasRole(userId, ["STUDENT"]);

        return NextResponse.json({
            isTeacher: authorizedAsTeacher,
            isAdmin: authorizedAsAdmin,
            isStudent: authorizedAsStudent,
        });
    } catch (error) {
        console.log("[ROLE_VERIFICATION]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
