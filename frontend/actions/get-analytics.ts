import { serverApi } from "@/lib/server-api";

export const getAnalytics = async (_userId: string) => {
  return serverApi(`/api/meta/teacher-analytics`);
};
