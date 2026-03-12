import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
    req: Request,
    props: { params: Promise<{ courseId: string }> }
) {
    try {
        const params = await props.params;
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
                id: params.courseId,
                isPublished: true,
            },
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        const existingPurchase = await db.purchase.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId: params.courseId,
                },
            },
        });

        if (existingPurchase) {
            return new NextResponse("Already enrolled", { status: 400 });
        }

        const purchase = await db.purchase.create({
            data: {
                userId,
                courseId: params.courseId,
            },
        });

        return NextResponse.json(purchase);
    } catch (error) {
        console.log("[ENROLL]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
