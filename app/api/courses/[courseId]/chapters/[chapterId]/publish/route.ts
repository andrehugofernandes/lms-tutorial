import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const params = await props.params;
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const ownCourse = await db.course.findUnique({
      where: {
        id: params.courseId,
        userId
      }
    });

    if (!ownCourse) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const chapter = await db.chapter.findUnique({
      where: {
        id: params.chapterId,
        courseId: params.courseId,
      }
    });

    const muxData = await db.muxData.findUnique({
      where: {
        chapterId: params.chapterId,
      }
    });

    if (!chapter) {
      return new NextResponse("Capitulo nao encontrado", { status: 404 });
    }

    const missingFields: string[] = [];
    const hasExternalVideo =
      chapter.videoSourceType === "EXTERNAL" &&
      Boolean(chapter.externalUrl || chapter.embedUrl);
    const hasUploadedVideo = Boolean(chapter.videoUrl && muxData);

    if (!chapter.title?.trim()) {
      missingFields.push("titulo do capitulo");
    }

    if (!chapter.description?.trim()) {
      missingFields.push("descricao do capitulo");
    }

    if (!hasExternalVideo && !hasUploadedVideo) {
      missingFields.push("video do capitulo");
    }

    if (missingFields.length > 0) {
      return new NextResponse(
        `Campos obrigatorios faltando: ${missingFields.join(", ")}`,
        { status: 400 },
      );
    }

    const publishedChapter = await db.chapter.update({
      where: {
        id: params.chapterId,
        courseId: params.courseId,
      },
      data: {
        isPublished: true,
      }
    });

    return NextResponse.json(publishedChapter);
  } catch (error) {
    console.log("[CHAPTER_PUBLISH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
