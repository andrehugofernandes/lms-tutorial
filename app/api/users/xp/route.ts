import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calcLevel, getLevelProgress, LEVEL_LABELS } from "@/lib/quiz-xp";

// GET /api/users/xp
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const userXP = await db.userXP.findUnique({ where: { userId } });

    if (!userXP) {
      return NextResponse.json({
        totalXp: 0,
        level: 1,
        levelLabel: LEVEL_LABELS[1],
        progress: { current: 0, max: 200, level: 1 },
      });
    }

    const progress = getLevelProgress(userXP.totalXp);
    return NextResponse.json({
      totalXp: userXP.totalXp,
      level: userXP.level,
      levelLabel: LEVEL_LABELS[userXP.level] ?? "Especialista",
      progress,
    });
  } catch (error) {
    console.log("[USER_XP_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
