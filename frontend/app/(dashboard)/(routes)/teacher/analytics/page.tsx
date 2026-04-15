import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { getAnalytics } from "@/actions/get-analytics";
import { DataCard } from "./_components/data-card";
import { Chart } from "./_components/chart";

const AnalyticsPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  const { data, totalEnrollments, totalCourses } = await getAnalytics(userId);

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <DataCard label="Total de Inscricoes" value={totalEnrollments} />
        <DataCard label="Total de Cursos" value={totalCourses} />
      </div>
      <Chart data={data} />
    </div>
  );
};

export default AnalyticsPage;
