import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/quiz/[quizId]/questions/[questionId]
export async function PATCH(
  req: Request,
  props: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const params = await props.params;
    const values = await req.json();

    const quiz = await db.quiz.findUnique({
      where: { id: params.quizId },
      include: { chapter: { include: { course: true } } },
    });

    if (!quiz || quiz.chapter.course.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Handle options upsert if provided
    if (values.options) {
      // Delete existing options and recreate (simplest pattern for small sets)
      await db.option.deleteMany({ where: { questionId: params.questionId } });
      await db.option.createMany({
        data: values.options.map((opt: { text: string; isCorrect: boolean }) => ({
          questionId: params.questionId,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
      });
    }

    const updated = await db.question.update({
      where: { id: params.questionId },
      data: {
        prompt:      values.prompt      ?? undefined,
        isBonus:     values.isBonus     ?? undefined,
        bonusPoints: values.bonusPoints ?? undefined,
        pointWeight: values.pointWeight ?? undefined,
        position:    values.position    ?? undefined,
      },
      include: { options: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.log("[QUESTION_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE /api/quiz/[quizId]/questions/[questionId]
export async function DELETE(
  req: Request,
  props: { params: Promise<{ quizId: string; questionId: string }> }
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

    await db.question.delete({ where: { id: params.questionId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[QUESTION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
