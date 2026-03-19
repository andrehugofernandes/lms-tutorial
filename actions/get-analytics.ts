import { db } from "@/lib/db";

export const getAnalytics = async (userId: string) => {
  try {
    // In the institutional LMS, analytics are based on enrollments and course engagement.
    const courses = await db.course.findMany({
      where: { userId },
      include: {
        chapters: {
          include: {
            userProgress: true,
          },
        },
      },
    });

    const data = courses.map((course) => {
      const totalEnrollments = new Set(
        course.chapters.flatMap((ch) => ch.userProgress.map((up) => up.userId))
      ).size;

      const totalCompleted = course.chapters.flatMap((ch) =>
        ch.userProgress.filter((up) => up.isCompleted)
      ).length;

      const totalProgress = course.chapters.flatMap((ch) =>
        ch.userProgress
      ).length;

      const completionRate =
        totalProgress > 0
          ? Math.round((totalCompleted / totalProgress) * 100)
          : 0;

      return {
        name: course.title,
        total: totalEnrollments,
        completionRate,
      };
    });

    const totalEnrollments = data.reduce((acc, curr) => acc + curr.total, 0);
    const totalCourses = courses.length;

    return {
      data,
      totalEnrollments,
      totalCourses,
    };
  } catch (error) {
    console.log("[GET_ANALYTICS]", error);
    return {
      data: [],
      totalEnrollments: 0,
      totalCourses: 0,
    };
  }
};
