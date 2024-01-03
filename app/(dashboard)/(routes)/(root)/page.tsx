import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

import { getDashboardCourses } from "@/actions/get-dashboard-courses";
import { CoursesList } from "@/components/courses-list";
import { InfoCard } from "./_components/info-card";

export default async function Dashboard() {
  const { userId } = auth();

  if(!userId){
    return redirect("/");
  }

  const {
    coursesInProgress,
    completedCourses,
  } = await getDashboardCourses(userId);
  
  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard 
          icon={Clock}
          label="In Progress"
          numberOfItems={coursesInProgress.length}
        />  
        <InfoCard 
          variant="success"
          icon={Clock}
          label="Completed"
          numberOfItems={completedCourses.length}
        />
      </div>
      <CoursesList 
        items={[...coursesInProgress, ...completedCourses]}
      />
    </div>
  );
}
