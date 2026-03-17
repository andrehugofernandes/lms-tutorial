import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getProgress } from "@/actions/get-progress";
import { CourseSidebar } from "./_components/course-sidebar";
import { CourseNavbar } from "./_components/course-navbar";
import { ZenWrapper } from "./_components/zen-wrapper";

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

  const course = await db.course.findUnique({
    where: {
      id: params.courseId,
    },
    include: {
      chapters: {
        where: {
          isPublished: true,
        },
        include: {
          userProgress: {
            where: {
              userId,
            },
          },
        },
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  if (!course) {
    return redirect("/");
  }

  const progressCount = await getProgress(userId, course.id);

    return (
    <ZenWrapper
      navbar={<CourseNavbar course={course} progressCount={progressCount} />}
      sidebar={<CourseSidebar course={course} progressCount={progressCount} />}
    >
      {children}
    </ZenWrapper>
  );
};

export default CourseLayout;
