"use client";

import axios from "axios";
import MuxPlayer from "@mux/mux-player-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { useConfettiStore } from "@/hooks/use-confetti-store";

// Lazy load ReactPlayer to avoid SSR issues
// @ts-ignore
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false }) as any;

interface VideoPlayerProps {
  playbackId?: string | null;
  videoUrl?: string | null;
  embedUrl?: string | null;
  courseId: string;
  chapterId: string;
  nextChapterId?: string;
  isLocked: boolean;
  completeOnEnd: boolean;
  title: string;
  videoSourceType?: "UPLOAD" | "EXTERNAL";
  onPlayerReady?: (player: any) => void;
};

export const VideoPlayer = ({
  playbackId,
  videoUrl,
  embedUrl,
  courseId,
  chapterId,
  nextChapterId,
  isLocked,
  completeOnEnd,
  title,
  videoSourceType = "UPLOAD",
  onPlayerReady,
}: VideoPlayerProps) => {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const confetti = useConfettiStore();

  const onEnd = async () => {
    try {
      if (completeOnEnd) {
        await axios.put(`/api/courses/${courseId}/chapters/${chapterId}/progress`, {
          isCompleted: true,
        });

        if (!nextChapterId) {
          confetti.onOpen();
        }

        toast.success("Progresso atualizado");
        router.refresh();

        if (nextChapterId) {
          router.push(`/courses/${courseId}/chapters/${nextChapterId}`)
        }
      }
    } catch {
      toast.error("Ocorreu um erro ao atualizar o progresso");
    }
  }

  // Determine actual URL to use for External sources
  const urlToPlay = embedUrl || videoUrl || "";

  return (
    <div className="relative aspect-video">
      {!isReady && !isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      )}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 flex-col gap-y-2 text-secondary">
          <Lock className="h-8 w-8" />
          <p className="text-sm">
            Este capítulo está bloqueado
          </p>
        </div>
      )}
      {!isLocked && (
        <>
          {videoSourceType === "UPLOAD" && playbackId ? (
            <MuxPlayer
              title={title}
              className={cn(
                !isReady && "hidden"
              )}
              onCanPlay={() => setIsReady(true)}
              onEnded={onEnd}
              autoPlay
              playbackId={playbackId}
              ref={onPlayerReady}
            />
          ) : (
             <div className={cn("w-full h-full", !isReady && "hidden")}>
                <ReactPlayer
                  url={urlToPlay}
                  width="100%"
                  height="100%"
                  controls
                  onReady={() => setIsReady(true)}
                  onEnded={onEnd}
                  playing={true}
                  // We can't easily get a ref that works like MuxPlayer for timestamps here 
                  // but we pass onPlayerReady just in case
                  ref={onPlayerReady}
                />
             </div>
          )}
        </>
      )}
    </div>
  )
}
