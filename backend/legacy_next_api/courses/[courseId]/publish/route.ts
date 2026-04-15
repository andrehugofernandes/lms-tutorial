import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ courseId: string }> }
) {
  try {
    const params = await props.params;
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const course = await db.course.findUnique({
      where: {
        id: params.courseId,
        userId: userId,
      },
      include: {
        chapters: {
          include: {
            muxData: true,
          },
        },
      },
    });

    if (!course) {
      return new NextResponse("Not found", { status: 404 });
    }

    const hasPublishedChapter = course.chapters.some(
      (chapter) => chapter.isPublished
    );

    const missingFields: string[] = [];

    if (!course.title?.trim()) {
      missingFields.push("titulo do curso");
    }

    if (!course.description?.trim()) {
      missingFields.push("descricao do curso");
    }

    if (!course.imageUrl) {
      missingFields.push("imagem de capa");
    }

    if (!course.categoryId) {
      missingFields.push("categoria do curso");
    }


    if (!hasPublishedChapter) {
      missingFields.push("pelo menos 1 capitulo publicado");
    }

    if (missingFields.length > 0) {
      return new NextResponse(
        `Campos obrigatorios faltando: ${missingFields.join(", ")}`,
        { status: 400 },
      );
    }

    const publishedCourse = await db.course.update({
      where: {
        id: params.courseId,
        userId,
      },
      data: {
        isPublished: true,
      }
    });

    return NextResponse.json(publishedCourse);

  } catch (error) {

    console.log("[COURSE_ID_PUBLISH]", error);
    return new NextResponse("Internal Error", { status: 500 });

  };
};
