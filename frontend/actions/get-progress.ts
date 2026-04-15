import { serverApi } from "@/lib/server-api";

export const getProgress = async (
  _userId: string,
  courseId: string
): Promise<number> => {
  const data = await serverApi<{ progress: number }>(
    `/api/meta/courses/${courseId}/progress`
  );
  return data.progress ?? 0;
};
