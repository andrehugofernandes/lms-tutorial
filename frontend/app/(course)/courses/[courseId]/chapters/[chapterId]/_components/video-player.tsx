"use client";

import axios from "axios";
import MuxPlayer from "@mux/mux-player-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

import { useConfettiStore } from "@/hooks/use-confetti-store";

// Lazy load ReactPlayer to avoid SSR issues.
// @ts-ignore
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false }) as any;

interface VideoPlayerProps {
  playbackId?: string | null;
  videoUrl?: string | null;
  externalUrl?: string | null;
  embedUrl?: string | null;
  courseId: string;
  chapterId: string;
  nextChapterId?: string;
  isLocked: boolean;
  completeOnEnd: boolean;
  title: string;
  videoSourceType?: "UPLOAD" | "EXTERNAL";
  onPlayerReady?: (player: any) => void;
}

export const VideoPlayer = ({
  playbackId,
  videoUrl,
  externalUrl,
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
  const [hasError, setHasError] = useState(false);
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
          router.push(`/courses/${courseId}/chapters/${nextChapterId}`);
        }
      }
    } catch {
      toast.error("Ocorreu um erro ao atualizar o progresso");
    }
  };

  const urlToPlay = externalUrl || videoUrl || embedUrl || "";
  const hasExternalVideo = videoSourceType === "EXTERNAL" && Boolean(urlToPlay);
  const hasUploadedVideo = videoSourceType === "UPLOAD" && Boolean(playbackId);

  return (
    <div className="relative aspect-video">
      {!isReady && !isLocked && !hasError && hasUploadedVideo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800/90">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      )}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 flex-col gap-y-2 text-secondary">
          <Lock className="h-8 w-8" />
          <p className="text-sm">Este capítulo está bloqueado</p>
        </div>
      )}
      {!isLocked && (
        <>
          {hasUploadedVideo ? (
            <MuxPlayer
              title={title}
              className="h-full w-full"
              onCanPlay={() => setIsReady(true)}
              onError={() => setHasError(true)}
              onEnded={onEnd}
              playbackId={playbackId ?? undefined}
              ref={onPlayerReady}
            />
          ) : hasExternalVideo ? (
            <div className="w-full h-full">
              <ReactPlayer
                src={urlToPlay}
                width="100%"
                height="100%"
                controls
                onReady={() => setIsReady(true)}
                onError={() => setHasError(true)}
                onEnded={onEnd}
                config={{
                  youtube: {
                    playerVars: {
                      autoplay: 0,
                      modestbranding: 1,
                      rel: 0,
                    },
                  },
                }}
                ref={onPlayerReady}
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-sm text-slate-200">
              Vídeo indisponível para este capítulo.
            </div>
          )}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 px-4 text-center text-sm text-slate-200">
              Não foi possível carregar o vídeo. Tente recarregar a página ou abra o link original.
            </div>
          )}
        </>
      )}
    </div>
  );
};
