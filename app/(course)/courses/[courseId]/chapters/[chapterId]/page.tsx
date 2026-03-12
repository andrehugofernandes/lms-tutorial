"use client";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { File, Clock, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";

import { Banner } from "@/components/banner";
import { Separator } from "@/components/ui/separator";
import { Preview } from "@/components/preview";

import { VideoPlayer } from "./_components/video-player";
import { CourseEnrollButton } from "./_components/course-enroll-button";
import { CourseProgressButton } from "./_components/course-progress-button";
import { ChapterNotes } from "./_components/chapter-notes";
import axios from "axios";

const ChapterIdPage = (props: {
  params: Promise<{ courseId: string; chapterId: string }>;
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [playerRef, setPlayerRef] = useState<any>(null);
  const [params, setParams] = useState<any>(null);

  useEffect(() => {
    props.params.then(p => setParams(p));
  }, [props.params]);

  useEffect(() => {
    if (!params) return;

    const fetchData = async () => {
      try {
        const response = await axios.get(`/api/courses/${params.courseId}/chapters/${params.chapterId}/data`);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching chapter data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params]);

  if (loading || !params) {
    return (
        <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-700" />
        </div>
    );
  }

  if (!data?.chapter || !data?.course) {
    return redirect("/");
  }

  const {
    chapter,
    course,
    muxData,
    attachments,
    nextChapter,
    userProgress,
    purchase,
  } = data;

  const isLocked = !chapter.isFree && !purchase;
  const completeOnEnd = !!purchase && !userProgress?.isCompleted;

  const getCurrentTime = () => {
    return playerRef?.currentTime || 0;
  };

  const seekTo = (time: number) => {
    if (playerRef) {
      playerRef.currentTime = time;
    }
  };

  return (
    <div>
      {userProgress?.isCompleted && (
        <Banner variant="success" label="Você já completou este capítulo." />
      )}
      {isLocked && (
        <Banner
          variant="warning"
          label="Você precisa adquirir este curso para assistir a este capítulo."
        />
      )}
      <div className="flex flex-col max-w-4xl mx-auto pb-20">
        <div className="p-4">
          <VideoPlayer
            chapterId={params.chapterId}
            title={chapter.title}
            courseId={params.courseId}
            nextChapterId={nextChapter?.id}
            playbackId={muxData?.playbackId!}
            isLocked={isLocked}
            completeOnEnd={completeOnEnd}
            onPlayerReady={setPlayerRef}
          />
        </div>
        <div>
          <div className="p-4 flex flex-col items-center justify-between md:flex-row">
            <h2 className="text-2xl font-semibold mb-2">{chapter.title}</h2>
            {purchase ? (
              <CourseProgressButton
                chapterId={params.chapterId}
                courseId={params.courseId}
                nextChapterId={nextChapter?.id}
                isCompleted={!!userProgress?.isCompleted}
              />
            ) : (
              <CourseEnrollButton
                courseId={params.courseId}
                price={course.price!}
              />
            )}
          </div>
          <Separator />
          <div>
            <Preview value={chapter.description!} />
          </div>

          {!isLocked && purchase && (
            <>
              <Separator />
              <ChapterNotes
                courseId={params.courseId}
                chapterId={params.chapterId}
                getCurrentTime={getCurrentTime}
                seekTo={seekTo}
              />
            </>
          )}

          {!!attachments.length && (
            <>
              <Separator />
              <div className="p-4">
                {attachments.map((attachment: any) => (
                  <a
                    href={attachment.url}
                    target="_blank"
                    key={attachment.id}
                    className="flex items-center p-2 w-full bg-sky-200 border
                   text-sky-700 rounded-md hover:underline"
                  >
                    <File />
                    <p className="line-clamp-1 ml-2">{attachment.name}</p>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChapterIdPage;
