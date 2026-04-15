import { serverApi } from "@/lib/server-api";

export const getStudentMetrics = async (_userId: string) => {
  return serverApi(`/api/meta/student-metrics`);
};
