import Mux from "@mux/mux-node";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { startTranscription } from "@/lib/transcribe";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const { video } = mux;

export async function DELETE(
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
        userId,
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

    if (!chapter) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (chapter.videoUrl) {
      const existingMuxData = await db.muxData.findFirst({
        where: {
          chapterId: params.chapterId,
        }
      });

      if (existingMuxData) {
        await video.assets.delete(existingMuxData.assetId);
        await db.muxData.delete({
          where: {
            id: existingMuxData.id,
          }
        });
      }
    }

    const deletedChapter = await db.chapter.delete({
      where: {
        id: params.chapterId
      }
    });

    const publishedChaptersInCourse = await db.chapter.findMany({
      where: {
        courseId: params.courseId,
        isPublished: true,
      }
    });

    if (!publishedChaptersInCourse.length) {
      await db.course.update({
        where: {
          id: params.courseId,
        },
        data: {
          isPublished: false,
        }
      });
    }

    return NextResponse.json(deletedChapter);
  } catch (error) {
    console.log("[CHAPTER_ID_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const params = await props.params;
    const { userId } = await auth();
    const { isPublished, ...values } = await req.json();

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

    // Logic for External URLs (YouTube / Vimeo conversion)
    if (values.externalUrl && values.videoSourceType === "EXTERNAL") {
      const url = values.externalUrl;
      
      // YouTube
      const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-0_-]{11})/;
      const ytMatch = url.match(youtubeRegex);
      
      if (ytMatch && ytMatch[1]) {
        values.embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
        values.videoProvider = "YOUTUBE";
      } 
      // Vimeo
      else {
        const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
        const vimeoMatch = url.match(vimeoRegex);
        
        if (vimeoMatch && vimeoMatch[1]) {
          values.embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
          values.videoProvider = "VIMEO";
        } else {
          values.videoProvider = "OTHER";
          values.embedUrl = url; // Fallback
        }
      }
    }

    const chapter = await db.chapter.update({
      where: {
        id: params.chapterId,
        courseId: params.courseId,
      },
      data: {
        ...values,
      }
    });

    if (values.externalUrl && values.videoSourceType === "EXTERNAL") {
      // Background transcription
      startTranscription(chapter.id, chapter.videoProvider!, chapter.externalUrl);
    }

    if (values.videoUrl && values.videoSourceType === "UPLOAD") {
      const existingMuxData = await db.muxData.findFirst({
        where: {
          chapterId: params.chapterId,
        }
      });

      if (existingMuxData) {
        try {
          await video.assets.delete(existingMuxData.assetId);
        } catch (e) {
          console.log("Mux asset delete failed", e);
        }
        await db.muxData.delete({
          where: {
            id: existingMuxData.id,
          }
        });
      }

      try {
        const asset = await video.assets.create({
          inputs: [{ url: values.videoUrl }],
          playback_policy: ["public"],
          test: false,
        });

        await db.muxData.create({
          data: {
            chapterId: params.chapterId,
            assetId: asset.id,
            playbackId: asset.playback_ids?.[0]?.id,
          }
        });
      } catch (muxError) {
        console.log("MUX_ERROR", muxError);
      }
    }

    return NextResponse.json(chapter);
  } catch (error) {
    console.log("[COURSES_CHAPTER_ID]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}