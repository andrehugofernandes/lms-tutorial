import { auth } from "@/lib/auth";
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { isTeacher } from "@/lib/teacher";
export async function POST(
  req: Request,
) {
  try {
    const { userId } = await auth();
    const { title } = await req.json();

    const isAuthorized = await isTeacher(userId);
    if (!userId || !isAuthorized) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!title) {
      return new NextResponse("Bad Request", { status: 400 });
    }

    const course = await db.course.create({
      data: {
        userId,
        title,
      }
    });

    return new NextResponse(JSON.stringify(course), { status: 201 });
  } catch (error) {
    console.log("[COURSES]", error)
    return new NextResponse("Internal Error", { status: 500 });
  }
}