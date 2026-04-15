import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { CourseSidebar } from "./_components/course-sidebar";
import { CourseNavbar } from "./_components/course-navbar";
import { ZenWrapper } from "./_components/zen-wrapper";
import { serverApi } from "@/lib/server-api";

const CourseLayout = async (props: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) => {
  const { children } = props;
  const params = await props.params;
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  let course: any;
  try {
    course = await serverApi(`/api/meta/courses/${params.courseId}/layout`);
  } catch {
    return redirect("/");
  }

  return (
    <ZenWrapper
      navbar={
        <CourseNavbar
          course={course}
          progressCount={course.progressCount}
          isEnrolled={course.isEnrolled}
        />
      }
      sidebar={
        <CourseSidebar
          course={course}
          progressCount={course.progressCount}
          isEnrolled={course.isEnrolled}
        />
      }
    >
      {children}
    </ZenWrapper>
  );
};

export default CourseLayout;
