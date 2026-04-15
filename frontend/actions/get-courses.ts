import { serverApi } from "@/lib/server-api";

type GetCourses = {
  userId?: string;
  title?: string;
  categoryId?: string;
};

export const getCourses = async ({ title, categoryId }: GetCourses) => {
  const params = new URLSearchParams();
  if (title) {
    params.set("title", title);
  }
  if (categoryId) {
    params.set("categoryId", categoryId);
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return serverApi(`/api/meta/courses/catalog${suffix}`);
};
