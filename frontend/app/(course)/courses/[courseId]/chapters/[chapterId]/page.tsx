"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { Brain, File, Trophy } from "lucide-react";

import { Banner } from "@/components/banner";
import { Progress } from "@/components/ui/progress";
import { QuizPlayer } from "@/components/quiz/quiz-player";

import { ChapterForum } from "./_components/chapter-forum";
import { ChapterNotes } from "./_components/chapter-notes";
import { CourseLeaderboard } from "./_components/course-leaderboard";
import { CourseProgressButton } from "./_components/course-progress-button";
import { VideoPlayer } from "./_components/video-player";
import { ZenModeToggle } from "./_components/zen-mode-toggle";

const ChapterIdPage = (props: {
  params: Promise<{ courseId: string; chapterId: string }>;
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [playerRef, setPlayerRef] = useState<any>(null);
  const [params, setParams] = useState<any>(null);

  useEffect(() => {
    props.params.then((resolvedParams) => setParams(resolvedParams));
  }, [props.params]);

  useEffect(() => {
    if (!params) return;

    const fetchData = async () => {
      try {
        const [chapterRes, layoutRes] = await Promise.all([
          axios.get(`/api/courses/${params.courseId}/chapters/${params.chapterId}/data`),
          axios.get(`/api/meta/courses/${params.courseId}/layout`),
        ]);

        setData({
          ...chapterRes.data,
          courseMeta: layoutRes.data,
        });
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
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (!data?.chapter || !data?.course) {
    return redirect("/");
  }

  const {
    chapter,
    course,
    courseMeta,
    muxData,
    attachments = [],
    nextChapter,
    userProgress,
  } = data;
  const quiz = data.quiz ?? null;
  const quizResult = data.quizResult ?? null;
  const hasPublishedQuiz = Boolean(quiz?.isPublished);
  const isChapterCompleted = Boolean(userProgress?.isCompleted);
  const completeOnEnd = !isChapterCompleted;
  const nextChapterHref = nextChapter
    ? `/courses/${params.courseId}/chapters/${nextChapter.id}`
    : null;

  const updateChapterCompletion = (isCompleted: boolean) => {
    setData((current: any) => {
      if (!current) return current;

      return {
        ...current,
        courseMeta: {
          ...(current.courseMeta ?? {}),
          chapters: (current.courseMeta?.chapters ?? []).map((item: any) =>
            item.id === params.chapterId
              ? {
                  ...item,
                  userProgress: [
                    {
                      ...(item.userProgress?.[0] ?? {}),
                      isCompleted,
                    },
                  ],
                }
              : item
          ),
        },
        userProgress: {
          ...(current.userProgress ?? {}),
          isCompleted,
        },
      };
    });
  };

  const getCurrentTime = () => playerRef?.currentTime || 0;
  const seekTo = (time: number) => {
    if (playerRef) playerRef.currentTime = time;
  };

  const completedChaptersCount =
    courseMeta?.chapters?.filter((item: any) => item.userProgress?.[0]?.isCompleted)
      .length || 0;
  const totalChapters = courseMeta?.chapters?.length || 1;
  const progressPercentage = Math.round((completedChaptersCount / totalChapters) * 100);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-[#0a0a0a] dark:text-slate-200">
      {isChapterCompleted && (
        <Banner variant="success" label="Você já completou este capítulo." />
      )}

      <div className="mx-auto flex max-w-5xl flex-col px-4 pb-20 pt-6 md:px-8">
        <div className="mb-6 flex flex-col items-start justify-between gap-y-4 md:flex-row md:items-end">
          <div>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-yellow-500">
              Trilha de {course.title}
            </h3>
            <h1 className="mb-2 text-3xl font-bold text-slate-950 dark:text-white">{chapter.title}</h1>
            <div className="flex items-center gap-x-4 text-sm text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-x-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Progresso da aula
              </span>
            </div>
          </div>

          <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-[#222] dark:bg-[#111] md:w-64">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-yellow-500">
                {progressPercentage}%
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-[#222] dark:text-slate-400">
                {completedChaptersCount} / {totalChapters} aulas
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1.5 bg-slate-200 dark:bg-[#222]" variant="warning" />
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-xl bg-black shadow-sm ring-1 ring-yellow-500/30 dark:shadow-[0_0_20px_rgba(234,179,8,0.05)] dark:ring-yellow-500/20">
            <VideoPlayer
              chapterId={params.chapterId}
              title={chapter.title}
              courseId={params.courseId}
              nextChapterId={nextChapter?.id}
              playbackId={muxData?.playbackId}
              videoUrl={chapter.videoUrl}
              externalUrl={chapter.externalUrl}
              isLocked={false}
              completeOnEnd={completeOnEnd}
              videoSourceType={chapter.videoSourceType as "UPLOAD" | "EXTERNAL"}
              embedUrl={chapter.embedUrl}
              onPlayerReady={setPlayerRef}
              shouldAutoNavigateOnComplete={!hasPublishedQuiz}
              onCompleted={() => updateChapterCompletion(true)}
              showConfettiOnComplete={!hasPublishedQuiz}
            />
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-y-4 md:flex-row">
            <div className="flex items-center gap-x-2">
              <ZenModeToggle />
            </div>
            <CourseProgressButton
              chapterId={params.chapterId}
              courseId={params.courseId}
              nextChapterId={hasPublishedQuiz ? undefined : nextChapter?.id}
              isCompleted={isChapterCompleted}
              onProgressChange={updateChapterCompletion}
              showConfettiOnComplete={!hasPublishedQuiz}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <ChapterNotes
            courseId={params.courseId}
            chapterId={params.chapterId}
            getCurrentTime={getCurrentTime}
            seekTo={seekTo}
          />
          <CourseLeaderboard courseId={params.courseId} />
        </div>

        <div className="mt-8">
          <ChapterForum
            courseId={params.courseId}
            chapterId={params.chapterId}
          />
        </div>

        {hasPublishedQuiz && (
          <div className="relative mt-12 overflow-hidden rounded-[28px] border border-yellow-500/30 bg-white p-5 shadow-sm dark:border-[#FF9F00]/30 dark:bg-[linear-gradient(135deg,rgba(255,159,0,0.10),rgba(0,0,0,0.96)_42%)] md:p-8">
            <div className="pointer-events-none absolute right-8 top-8 hidden opacity-[0.08] md:block">
              <Brain className="h-36 w-36 text-[#FF9F00]" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-start gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#FF9F00]/35 bg-[#FF9F00]/10">
                  <Brain className="h-8 w-8 text-[#FF9F00]" />
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-950 dark:text-white">Desafio final</h2>
                  <p className="mt-1 text-base text-slate-600 dark:text-zinc-300">
                    {isChapterCompleted
                      ? "Conclua este quiz para liberar a próxima aula da trilha."
                      : "Conclua este capítulo para desbloquear o quiz."}
                  </p>
                </div>
              </div>

              <QuizPlayer
                quiz={quiz}
                isLocked={!isChapterCompleted}
                initialResult={quizResult}
                nextChapterHref={nextChapterHref}
                onComplete={(passed, xp, result) => {
                  setData((current: any) =>
                    current ? { ...current, quizResult: result } : current
                  );

                  if (passed) {
                    toast.success(`Quiz concluído! +${xp} XP`);
                  }
                }}
              />
            </div>
          </div>
        )}

        {!!attachments.length && (
          <div className="mt-8 border-t border-slate-200 pt-8 dark:border-[#222]">
            <h3 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Materiais de apoio</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {attachments.map((attachment: any) => (
                <a
                  href={attachment.url}
                  target="_blank"
                  key={attachment.id}
                  className="flex items-center rounded-lg border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition hover:border-yellow-500/60 hover:bg-yellow-50 dark:border-[#222] dark:bg-[#111] dark:text-slate-300 dark:hover:border-yellow-500/50 dark:hover:bg-[#1a1500]"
                >
                  <File className="mr-3 h-5 w-5 text-yellow-500" />
                  <p className="line-clamp-1">{attachment.name}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChapterIdPage;
