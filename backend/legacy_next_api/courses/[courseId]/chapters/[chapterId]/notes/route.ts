import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    const params = await props.params;
    const { content, timestamp } = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const note = await db.userNote.create({
      data: {
        userId,
        chapterId: params.chapterId,
        content,
        timestamp
      }
    });

    return NextResponse.json(note);
  } catch (error) {
    console.log("[PLAYER_NOTES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    const params = await props.params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const notes = await db.userNote.findMany({
      where: {
        userId,
        chapterId: params.chapterId,
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.log("[PLAYER_NOTES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
