import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateQuizQuestions } from "@/lib/ai";

export async function POST(
  req: Request,
  props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const params = await props.params;

    // 1. Verify ownership
    const course = await db.course.findUnique({
      where: {
        id: params.courseId,
        userId,
      },
    });

    if (!course) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Get Chapter Data for Context
    const chapter = await db.chapter.findUnique({
      where: {
        id: params.chapterId,
        courseId: params.courseId,
      },
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    const context = `
      Título do Curso: ${course.title}
      Título do Capítulo: ${chapter.title}
      Descrição do Capítulo: ${chapter.description || "Sem descrição"}
    `;

    // 3. Ensure Quiz exists
    let quiz = await db.quiz.findUnique({
      where: { chapterId: params.chapterId },
    });

    if (!quiz) {
      quiz = await db.quiz.create({
        data: {
          chapterId: params.chapterId,
          maxQuestions: 5,
        },
      });
    }

    // 4. Generate Questions via AI
    const generatedQuestions = await generateQuizQuestions(context, 5);

    // 5. Save generated questions to DB
    // We transactionally save them to ensure data integrity
    const savedQuestions = await db.$transaction(
      generatedQuestions.map((q: any, index: number) => 
        db.question.create({
          data: {
            quizId: quiz!.id,
            prompt: q.prompt,
            position: index,
            options: {
              create: q.options.map((opt: any) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
              })),
            },
          },
        })
      )
    );

    return NextResponse.json({
      quizId: quiz.id,
      questionsCount: savedQuestions.length,
    });
  } catch (error) {
    console.log("[QUIZ_GENERATE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
