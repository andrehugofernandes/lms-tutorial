import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/quiz/[quizId]/questions
export async function POST(
  req: Request,
  props: { params: Promise<{ quizId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const params = await props.params;
    const { prompt, isBonus, bonusPoints, pointWeight } = await req.json();

    // Ownership check
    const quiz = await db.quiz.findUnique({
      where: { id: params.quizId },
      include: {
        chapter: { include: { course: true } },
        questions: { orderBy: { position: "asc" } },
      },
    });

    if (!quiz || quiz.chapter.course.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (quiz.questions.length >= quiz.maxQuestions) {
      return new NextResponse(
        `Limite de ${quiz.maxQuestions} questões atingido`,
        { status: 400 }
      );
    }

    const lastPosition = quiz.questions.at(-1)?.position ?? 0;

    const question = await db.question.create({
      data: {
        quizId: params.quizId,
        prompt,
        position: lastPosition + 1,
        isBonus: isBonus ?? false,
        bonusPoints: bonusPoints ?? null,
        pointWeight: pointWeight ?? 1.0,
      },
      include: { options: true },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.log("[QUESTION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
