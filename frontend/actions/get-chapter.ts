import { serverApi } from "@/lib/server-api";

interface GetChapterProps {
  userId?: string;
  courseId: string;
  chapterId: string;
}

export const getChapter = async ({
  courseId,
  chapterId,
}: GetChapterProps) => {
  const data = await serverApi<any>(
    `/api/courses/${courseId}/chapters/${chapterId}/data`
  );

  return {
    chapter: data.chapter ?? null,
    course: data.course ?? null,
    muxData: data.muxData ?? null,
    attachments: data.attachments ?? [],
    nextChapter: data.nextChapter ?? null,
    userProgress: data.userProgress ?? null,
  };
};
