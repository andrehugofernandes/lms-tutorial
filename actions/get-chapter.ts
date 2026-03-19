import { db } from "@/lib/db";
import { Attachment, Chapter } from "@/lib/generated/db";

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
    const [course, chapter, userProgress] = await Promise.all([
      db.course.findUnique({
        where: {
          isPublished: true,
          id: courseId,
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
          },
        },
      }),
    ]);

    if (!chapter || !course) {
      throw new Error("Chapter or Course not found");
    }

    // All chapters in the institutional LMS are accessible to enrolled users.
    const [muxData, nextChapter, attachments] = await Promise.all([
      db.muxData.findUnique({
        where: { chapterId },
      }),
      db.chapter.findFirst({
        where: {
          courseId,
          isPublished: true,
          position: { gt: chapter.position },
        },
        orderBy: { position: "asc" },
      }),
      db.attachment.findMany({
        where: { courseId },
      }),
    ]);

    return {
      chapter,
      course,
      muxData,
      attachments,
      nextChapter,
      userProgress,
    };
  } catch (error) {
    console.log("[GET_CHAPTER]", error);
    return {
      chapter: null,
      course: null,
      muxData: null,
      attachments: [],
      nextChapter: null,
      userProgress: null,
    };
  }
};
