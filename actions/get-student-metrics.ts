import { db } from "@/lib/db";
import { Achievement, Chapter, Course, Purchase } from "@prisma/client";
import { getProgress } from "@/actions/get-progress"; // This can be removed if not used elsewhere, but keeping for now as it might be used in other files. Actually, I will remove it from here.

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
    // 1. Fetch purchases, courses, and chapters in one bulk query
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

    // 2. Fetch ALL userProgress for this user in one go to avoid N+1 queries
    const allUserProgress = await db.userProgress.findMany({
      where: {
        userId,
        isCompleted: true,
      },
    });

    // Create a Set of completed chapter IDs for O(1) lookup speed
    const completedChapterIds = new Set(allUserProgress.map((up) => up.chapterId));

    // 3. Fetch Achievements and Streak in parallel
    const [achievements, userStreak] = await Promise.all([
      db.achievement.findMany({
        where: { userId },
      }),
      db.userStreak.findUnique({
        where: { userId }
      })
    ]);

    let totalMinutesWatched = 0;
    let totalMinutesTarget = 0;
    let completedCoursesCount = 0;
    const coursesInProgress: (CourseWithProgressWithChapters & { lastChapter?: Chapter | null })[] = [];

    // 4. Process metrics in-memory
    for (const purchase of purchasedCourses) {
      const course = purchase.course;
      const publishedChapters = course.chapters;
      
      // Calculate Course Target Hours
      const courseTotalMinutes = publishedChapters.reduce((acc, ch) => acc + (ch.duration || 0), 0);
      totalMinutesTarget += courseTotalMinutes;

      // Identify which chapters from THIS course are completed
      const courseCompletedChapters = publishedChapters.filter((ch) => completedChapterIds.has(ch.id));
      
      // Calculate watched time
      const watchedMinutes = courseCompletedChapters.reduce((acc, ch) => acc + (ch.duration || 0), 0);
      totalMinutesWatched += watchedMinutes;

      // Calculate progress percentage
      const progress = publishedChapters.length > 0 
        ? (courseCompletedChapters.length / publishedChapters.length) * 100 
        : 0;

      const courseWithMetadata = {
        ...course,
        progress,
        lastChapter: publishedChapters.find((c) => c.id === purchase.lastChapterId) || publishedChapters[0],
      };

      if (progress === 100) {
        completedCoursesCount++;
      } else {
        coursesInProgress.push(courseWithMetadata as any);
      }
    }

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
