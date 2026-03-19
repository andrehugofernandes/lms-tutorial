import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/quiz/[quizId]  — update quiz settings
export async function PATCH(
  req: Request,
  props: { params: Promise<{ quizId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const params = await props.params;
    const values = await req.json();

    // Ensure the quiz belongs to a chapter of a course owned by the user
    const quiz = await db.quiz.findUnique({
      where: { id: params.quizId },
      include: { chapter: { include: { course: true } } },
    });

    if (!quiz || quiz.chapter.course.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const updated = await db.quiz.update({
      where: { id: params.quizId },
      data: {
        isPublished:  values.isPublished  ?? undefined,
        isRequired:   values.isRequired   ?? undefined,
        maxQuestions: values.maxQuestions  ?? undefined,
        timeLimit:    values.timeLimit     ?? undefined,
        passingScore: values.passingScore  ?? undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.log("[QUIZ_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE /api/quiz/[quizId]
export async function DELETE(
  req: Request,
  props: { params: Promise<{ quizId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const params = await props.params;

    const quiz = await db.quiz.findUnique({
      where: { id: params.quizId },
      include: { chapter: { include: { course: true } } },
    });

    if (!quiz || quiz.chapter.course.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await db.quiz.delete({ where: { id: params.quizId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[QUIZ_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
