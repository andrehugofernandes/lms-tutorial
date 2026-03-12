import { db } from "@/lib/db";
import { Attachment, Chapter } from "@prisma/client";

interface GetChapterProps {
  userId: string;
  courseId: string;
  chapterId: string;
}

export const getChapter = async ({
  userId,
  courseId,
  chapterId,
}: GetChapterProps) => {
  try {
    const [purchase, course, chapter, userProgress] = await Promise.all([
      db.purchase.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      }),
      db.course.findUnique({
        where: {
          isPublished: true,
          id: courseId,
        },
        select: {
          price: true,
        },
      }),
      db.chapter.findUnique({
        where: {
          id: chapterId,
          isPublished: true,
        },
      }),
      db.userProgress.findUnique({
        where: {
          userId_chapterId: {
            userId,
            chapterId,
          }
        }
      })
    ]);

    if (!chapter || !course) {
      throw new Error("Chapter or Course not found");
    }

    let muxData = null;
    let attachments: Attachment[] = [];
    let nextChapter: Chapter | null = null;

    if (purchase || chapter.isFree) {
      const [muxDataResult, nextChapterResult, attachmentsResult] = await Promise.all([
        db.muxData.findUnique({
          where: {
            chapterId: chapterId,
          },
        }),
        db.chapter.findFirst({
          where: {
            courseId: courseId,
            isPublished: true,
            position: {
              gt: chapter?.position,
            }
          },
          orderBy: {
            position: "asc",
          },
        }),
        purchase ? db.attachment.findMany({
          where: {
            courseId: courseId,
          },
        }) : Promise.resolve([]),
      ]);

      muxData = muxDataResult;
      nextChapter = nextChapterResult;
      attachments = attachmentsResult as Attachment[];
    }

    return {
      chapter,
      course,
      muxData,
      attachments,
      nextChapter,
      userProgress,
      purchase,
    };

  } catch (error) {
    console.log("[GET_CHAPTER]", error);
    return {
      chapter: null,
      course: null,
      muxData: null,
      attachment: [],
      nextChapter: null,
      userProgress: null,
      purchase: null,
    };
  }
};
