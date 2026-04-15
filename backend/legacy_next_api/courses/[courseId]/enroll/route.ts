import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// In the institutional LMS, enrollment is free and automatic.
// This route tracks students who have started a course by creating
// a UserProgress record for the first published chapter.
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
      include: {
        chapters: {
          where: { isPublished: true },
          orderBy: { position: "asc" },
          take: 1,
        },
      },
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    const firstChapter = course.chapters[0];
    if (!firstChapter) {
      return new NextResponse("No published chapters found", { status: 404 });
    }

    // Check if already enrolled (has progress on the first chapter)
    const existingProgress = await db.userProgress.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId: firstChapter.id,
        },
      },
    });

    if (existingProgress) {
      return new NextResponse("Already enrolled", { status: 400 });
    }

    // Create initial progress entry to mark enrollment
    await db.userProgress.create({
      data: {
        userId,
        chapterId: firstChapter.id,
        isCompleted: false,
      },
    });

    return NextResponse.json({ enrolled: true });
  } catch (error) {
    console.log("[ENROLL]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
