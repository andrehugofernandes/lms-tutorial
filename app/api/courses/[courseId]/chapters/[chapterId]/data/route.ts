import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getChapter } from "@/actions/get-chapter";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    const params = await props.params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const [data, quiz] = await Promise.all([
      getChapter({
        userId,
        chapterId: params.chapterId,
        courseId: params.courseId,
      }),
      db.quiz.findUnique({
        where: { chapterId: params.chapterId },
        include: {
          questions: {
            include: {
              options: {
                select: { id: true, text: true }, // do NOT expose isCorrect to client
              },
            },
            orderBy: { position: "asc" },
          },
        },
      }),
    ]);

    return NextResponse.json({ ...data, quiz: quiz ?? null });
  } catch (error) {
    console.log("[CHAPTER_DATA_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
