import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calcScore, calcQuizXP, calcLevel } from "@/lib/quiz-xp";

interface SubmitPayload {
  answers: { questionId: string; optionId: string; timeRemaining?: number }[];
}

// POST /api/quiz/[quizId]/submit
export async function POST(
  req: Request,
  props: { params: Promise<{ quizId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const params = await props.params;
    const { answers }: SubmitPayload = await req.json();

    // Fetch quiz with all questions and correct options
    const quiz = await db.quiz.findUnique({
      where: { id: params.quizId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!quiz || !quiz.isPublished) {
      return new NextResponse("Quiz not found", { status: 404 });
    }

    // Check if already submitted (no redo without teacher reset)
    const existing = await db.quizResult.findUnique({
      where: { userId_quizId: { userId, quizId: params.quizId } },
    });

    if (existing) {
      return NextResponse.json({ alreadySubmitted: true, result: existing });
    }

    // Evaluate answers
    const questionResults = answers.map((ans) => {
      const question = quiz.questions.find((q) => q.id === ans.questionId);
      if (!question) return null;

      const selectedOption = question.options.find((o) => o.id === ans.optionId);
      const isCorrect = selectedOption?.isCorrect ?? false;

      return {
        isCorrect,
        isBonus: question.isBonus,
        bonusPoints: question.bonusPoints,
        pointWeight: question.pointWeight,
        timeRemaining: ans.timeRemaining,
      };
    }).filter(Boolean) as any[];

    const score = calcScore(questionResults);
    const xpEarned = calcQuizXP(questionResults);
    const passed = score >= quiz.passingScore;

    // Save individual answers
    await Promise.all(
      answers.map((ans) =>
        db.answer.upsert({
          where: {
            userId_questionId: { userId, questionId: ans.questionId },
          },
          update: { optionId: ans.optionId },
          create: { userId, questionId: ans.questionId, optionId: ans.optionId },
        })
      )
    );

    // Save quiz result
    const result = await db.quizResult.create({
      data: { userId, quizId: params.quizId, score, xpEarned, passed },
    });

    // Update global XP
    const userXP = await db.userXP.upsert({
      where: { userId },
      update: { totalXp: { increment: xpEarned } },
      create: { userId, totalXp: xpEarned, level: 1 },
    });

    // Recalculate level
    const newLevel = calcLevel(userXP.totalXp);
    if (newLevel !== userXP.level) {
      await db.userXP.update({
        where: { userId },
        data: { level: newLevel },
      });
    }

    return NextResponse.json({ result, xpEarned, score, passed, totalXp: userXP.totalXp });
  } catch (error) {
    console.log("[QUIZ_SUBMIT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// GET /api/quiz/[quizId]/submit  — fetch existing result
export async function GET(
  req: Request,
  props: { params: Promise<{ quizId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const params = await props.params;

    const result = await db.quizResult.findUnique({
      where: { userId_quizId: { userId, quizId: params.quizId } },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.log("[QUIZ_RESULT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
