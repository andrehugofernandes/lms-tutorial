import { db } from "@/lib/db";
import { Achievement, Chapter, Course, Purchase } from "@prisma/client";
import { getProgress } from "@/actions/get-progress";

type CourseWithProgressWithChapters = Course & {
  chapters: Chapter[];
  progress: number | null;
};

interface StudentMetrics {
  totalHoursWatched: number;
  totalHoursTarget: number;
  completedCoursesCount: number;
  coursesInProgress: (CourseWithProgressWithChapters & { lastChapter?: Chapter | null })[];
  achievements: Achievement[];
  streakCount: number;
}

export const getStudentMetrics = async (userId: string): Promise<StudentMetrics> => {
  try {
    const purchasedCourses = await db.purchase.findMany({
      where: {
        userId,
      },
      include: {
        course: {
          include: {
            category: true,
            chapters: {
              where: {
                isPublished: true,
              },
              orderBy: {
                position: "asc",
              },
            },
          },
        },
      },
    });

    const courses = purchasedCourses.map((purchase) => ({
      ...purchase.course,
      lastChapterId: purchase.lastChapterId,
    }));

    let totalMinutesWatched = 0;
    let totalMinutesTarget = 0;
    let completedCoursesCount = 0;
    const coursesInProgress: (CourseWithProgressWithChapters & { lastChapter?: Chapter | null })[] = [];

    await Promise.all(
      courses.map(async (course) => {
        const progress = await getProgress(userId, course.id);
        
        // Calculate hours
        const courseTotalMinutes = course.chapters.reduce((acc, chapter) => acc + (chapter.duration || 0), 0);
        totalMinutesTarget += courseTotalMinutes;

        // Fetch completed chapters for this user to calculate watched time
        const completedChapters = await db.userProgress.findMany({
          where: {
            userId,
            chapterId: {
              in: course.chapters.map((c) => c.id),
            },
            isCompleted: true,
          },
          include: {
            chapter: true,
          },
        });

        const watchedMinutes = completedChapters.reduce((acc, up) => acc + (up.chapter.duration || 0), 0);
        totalMinutesWatched += watchedMinutes;

        const courseWithMetadata = {
          ...course,
          category: course.category,
          chapters: course.chapters,
          progress,
          lastChapter: course.chapters.find((c) => c.id === course.lastChapterId) || course.chapters[0],
        };

        if (progress === 100) {
          completedCoursesCount++;
        } else {
          coursesInProgress.push(courseWithMetadata as any);
        }
      })
    );

    const achievements = await db.achievement.findMany({
      where: {
        userId,
      },
    });

    const userStreak = await db.userStreak.findUnique({
      where: { userId }
    });

    return {
      totalHoursWatched: Math.round(totalMinutesWatched / 60 * 10) / 10,
      totalHoursTarget: Math.round(totalMinutesTarget / 60 * 10) / 10,
      completedCoursesCount,
      coursesInProgress,
      achievements,
      streakCount: userStreak?.count || 0,
    };
  } catch (error) {
    console.log("[GET_STUDENT_METRICS]", error);
    return {
      totalHoursWatched: 0,
      totalHoursTarget: 0,
      completedCoursesCount: 0,
      coursesInProgress: [],
      achievements: [],
      streakCount: 0,
    };
  }
};
