"use client";

import { redirect } from "next/navigation";
import { File, Trophy, Brain } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

import { Banner } from "@/components/banner";
import { Separator } from "@/components/ui/separator";
import { Preview } from "@/components/preview";
import { Progress } from "@/components/ui/progress";

import { VideoPlayer } from "./_components/video-player";
import { CourseProgressButton } from "./_components/course-progress-button";
import { ChapterNotes } from "./_components/chapter-notes";
import { ZenModeToggle } from "./_components/zen-mode-toggle";
import { QuizPlayer } from "@/components/quiz/quiz-player";

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
        const [chapterRes, layoutRes] = await Promise.all([
          axios.get(`/api/courses/${params.courseId}/chapters/${params.chapterId}/data`),
          axios.get(`/api/meta/courses/${params.courseId}/layout`)
        ]);

        setData({
          ...chapterRes.data,
          courseMeta: layoutRes.data
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
      <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (!data?.chapter || !data?.course) {
    return redirect("/");
  }

  const { chapter, course, courseMeta, muxData, attachments, nextChapter, userProgress } = data;
  const quiz = data.quiz ?? null;

  const completeOnEnd = !userProgress?.isCompleted;

  const getCurrentTime = () => playerRef?.currentTime || 0;
  const seekTo = (time: number) => {
    if (playerRef) playerRef.currentTime = time;
  };

  const completedChaptersCount = courseMeta?.chapters?.filter((c: any) => c.userProgress?.[0]?.isCompleted).length || 0;
  const totalChapters = courseMeta?.chapters?.length || 1;
  const progressPercentage = Math.round((completedChaptersCount / totalChapters) * 100);

  return (
    <div className="min-h-full bg-[#0a0a0a] text-slate-200">
      {userProgress?.isCompleted && (
        <Banner variant="success" label="Você já completou este capítulo." />
      )}
      
      <div className="flex flex-col max-w-5xl mx-auto pb-20 pt-6 px-4 md:px-8">
        
        {/* HERO SECTION */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-y-4">
          <div>
            <h3 className="text-yellow-500 font-semibold mb-1 text-sm tracking-wider uppercase">Trilha de {course.title}</h3>
            <h1 className="text-3xl font-bold text-white mb-2">{chapter.title}</h1>
            <div className="flex items-center gap-x-4 text-sm text-slate-400">
              <span className="flex items-center gap-x-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Progresso da aula
              </span>
            </div>
          </div>
          
          <div className="w-full md:w-64 bg-[#111] p-3 rounded-lg border border-[#222]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-yellow-500 font-semibold">{progressPercentage}%</span>
              <span className="text-xs text-slate-400 px-2 py-1 bg-[#222] rounded-md">{completedChaptersCount} / {totalChapters} aulas</span>
            </div>
            <Progress value={progressPercentage} className="h-1.5 bg-[#222]" variant="warning" />
          </div>
        </div>

        <div className="relative">
          {/* VIDEO PLAYER */}
          <div className="rounded-xl overflow-hidden shadow-[0_0_20px_rgba(234,179,8,0.05)] ring-1 ring-yellow-500/20 bg-black">
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
            />
          </div>
          
          <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-y-4">
            <div className="flex items-center gap-x-2">
              <ZenModeToggle />
            </div>
            <CourseProgressButton
              chapterId={params.chapterId}
              courseId={params.courseId}
              nextChapterId={nextChapter?.id}
              isCompleted={!!userProgress?.isCompleted}
            />
          </div>
        </div>

        {/* NOTES SECTION */}
        <div className="mt-8">
          <ChapterNotes
            courseId={params.courseId}
            chapterId={params.chapterId}
            getCurrentTime={getCurrentTime}
            seekTo={seekTo}
          />
        </div>

        {/* QUIZ SECTION */}
        {quiz?.isPublished && (
          <div className="mt-12 bg-gradient-to-br from-[#1a1500] to-[#0a0a0a] border border-yellow-500/30 rounded-xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Brain className="w-32 h-32 text-yellow-500" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-x-3 mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Brain className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Desafio Final</h2>
                  <p className="text-slate-400 text-sm">Responda ao quiz para desbloquear a próxima aula</p>
                </div>
              </div>

              <div className="bg-[#111]/80 backdrop-blur-sm border border-[#222] rounded-xl p-6 mt-6">
                <QuizPlayer
                  quiz={quiz}
                  onComplete={(passed, xp) => {
                    if (passed) toast.success(`🎉 Quiz concluído! +${xp} XP`);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {!!attachments.length && (
          <div className="mt-8 pt-8 border-t border-[#222]">
            <h3 className="text-lg font-semibold text-white mb-4">Materiais de apoio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attachments.map((attachment: any) => (
                <a
                  href={attachment.url}
                  target="_blank"
                  key={attachment.id}
                  className="flex items-center p-3 bg-[#111] border border-[#222] text-slate-300 rounded-lg hover:border-yellow-500/50 hover:bg-[#1a1500] transition"
                >
                  <File className="h-5 w-5 text-yellow-500 mr-3" />
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
