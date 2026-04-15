import { serverApi } from "@/lib/server-api";

export const getDashboardCourses = async (_userId: string) => {
  return serverApi(`/api/meta/dashboard-courses`);
};
