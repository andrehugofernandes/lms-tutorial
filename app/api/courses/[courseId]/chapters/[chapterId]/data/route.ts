import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getChapter } from "@/actions/get-chapter";

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

    const data = await getChapter({
      userId,
      chapterId: params.chapterId,
      courseId: params.courseId,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.log("[CHAPTER_DATA_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
