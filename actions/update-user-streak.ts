import { db } from "@/lib/db";

export const updateUserStreak = async (userId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userStreak = await db.userStreak.findUnique({
      where: { userId }
    });

    if (!userStreak) {
      return await db.userStreak.create({
        data: {
          userId,
          count: 1,
          lastVisit: new Date()
        }
      });
    }

    const lastVisit = new Date(userStreak.lastVisit);
    lastVisit.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Se já visitou hoje, não faz nada
    if (lastVisit.getTime() === today.getTime()) {
      return userStreak;
    }

    // Se a última visita foi ontem, aumenta a streak
    if (lastVisit.getTime() === yesterday.getTime()) {
      return await db.userStreak.update({
        where: { userId },
        data: {
          count: userStreak.count + 1,
          lastVisit: new Date()
        }
      });
    }

    // Se a última visita foi antes de ontem, reseta a streak
    return await db.userStreak.update({
      where: { userId },
      data: {
        count: 1,
        lastVisit: new Date()
      }
    });
  } catch (error) {
    console.log("[UPDATE_USER_STREAK]", error);
    return null;
  }
};
