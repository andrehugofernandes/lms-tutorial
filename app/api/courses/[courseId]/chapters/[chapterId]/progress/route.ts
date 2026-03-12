import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: Request,
  props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const params = await props.params;
    const { userId } = await auth();
    const { isCompleted } = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const userProgress = await db.userProgress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId: params.chapterId,
        }
      },
      update: {
        isCompleted
      },
      create: {
        userId,
        chapterId: params.chapterId,
        isCompleted,
      }
    })

    // Update Checkpoint (where the user last was)
    if (isCompleted) {
      await db.purchase.update({
        where: {
          userId_courseId: {
            userId,
            courseId: params.courseId,
          }
        },
        data: {
          lastChapterId: params.chapterId,
        }
      });
    }

    // Check for Achievement (Course Completion)
    if (isCompleted) {
      const publishedChapters = await db.chapter.findMany({
        where: {
          courseId: params.courseId,
          isPublished: true,
        }
      });

      const completedChapters = await db.userProgress.findMany({
        where: {
          userId,
          chapterId: {
            in: publishedChapters.map((c) => c.id),
          },
          isCompleted: true,
        }
      });

      if (publishedChapters.length === completedChapters.length) {
        const course = await db.course.findUnique({
          where: { id: params.courseId }
        });

        await db.achievement.upsert({
          where: {
            userId_courseId: {
              userId,
              courseId: params.courseId,
            }
          },
          update: {},
          create: {
            userId,
            courseId: params.courseId,
            title: `Especialista em ${course?.title}`,
            description: `Completou todas as aulas do curso ${course?.title}.`,
            icon: "Trophy",
          }
        });
      }
    }

    return NextResponse.json(userProgress);

  } catch (error) {
    console.log("[CHAPTER_ID_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
