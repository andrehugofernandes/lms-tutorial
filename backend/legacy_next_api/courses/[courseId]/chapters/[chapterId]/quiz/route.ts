import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/courses/[courseId]/chapters/[chapterId]/quiz
export async function GET(
  req: Request,
  props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const params = await props.params;

    const quiz = await db.quiz.findUnique({
      where: { chapterId: params.chapterId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json(quiz);
  } catch (error) {
    console.log("[QUIZ_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST /api/courses/[courseId]/chapters/[chapterId]/quiz
export async function POST(
  req: Request,
  props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const params = await props.params;

    // Verify course ownership
    const course = await db.course.findUnique({
      where: { id: params.courseId, userId },
    });
    if (!course) return new NextResponse("Unauthorized", { status: 401 });

    const existingQuiz = await db.quiz.findUnique({
      where: { chapterId: params.chapterId },
    });
    if (existingQuiz) {
      return new NextResponse("Quiz already exists", { status: 400 });
    }

    const quiz = await db.quiz.create({
      data: { chapterId: params.chapterId },
    });

    return NextResponse.json(quiz);
  } catch (error) {
    console.log("[QUIZ_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
