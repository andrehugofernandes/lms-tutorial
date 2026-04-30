"use client";

import axios from "axios";
import MuxPlayer from "@mux/mux-player-react";
import dynamic from "next/dynamic";
import { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [showFaltaPouco, setShowFaltaPouco] = useState(false);
  const router = useRouter();
  const confetti = useConfettiStore();
  
  const internalPlayerRef = useRef<any>(null);

  const setPlayerRefs = (player: any) => {
    internalPlayerRef.current = player;
    if (onPlayerReady) onPlayerReady(player);
  };

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
      setShowFaltaPouco(false);
    } catch {
      toast.error("Ocorreu um erro ao atualizar o progresso");
    }
  };

  const handleTimeUpdate = (e: any) => {
    if (!completeOnEnd) return;
    
    // For MuxPlayer, target is the video element
    const videoElement = e.target;
    if (videoElement && videoElement.duration) {
      const percentage = (videoElement.currentTime / videoElement.duration) * 100;
      if (percentage > 80 && percentage < 99 && !showFaltaPouco) {
        setShowFaltaPouco(true);
      }
    }
  };

  const handleReactPlayerProgress = (state: { playedSeconds: number, loadedSeconds: number, totalSeconds?: number, played: number }) => {
    if (!completeOnEnd) return;
    if (state.played > 0.8 && state.played < 0.99 && !showFaltaPouco) {
      setShowFaltaPouco(true);
    }
  };

  const urlToPlay = externalUrl || videoUrl || embedUrl || "";
  const hasExternalVideo = videoSourceType === "EXTERNAL" && Boolean(urlToPlay);
  const hasUploadedVideo = videoSourceType === "UPLOAD" && Boolean(playbackId);

  return (
    <div className="relative aspect-video bg-black group">
      {!isReady && !isLocked && !hasError && hasUploadedVideo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      )}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] flex-col gap-y-2 text-slate-400">
          <Lock className="h-8 w-8 text-slate-500" />
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
              onTimeUpdate={handleTimeUpdate}
              playbackId={playbackId ?? undefined}
              ref={setPlayerRefs}
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
                onProgress={handleReactPlayerProgress}
                config={{
                  youtube: {
                    playerVars: {
                      autoplay: 0,
                      modestbranding: 1,
                      rel: 0,
                    },
                  },
                }}
                ref={setPlayerRefs}
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black text-sm text-slate-400">
              Vídeo indisponível para este capítulo.
            </div>
          )}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black px-4 text-center text-sm text-red-500">
              Não foi possível carregar o vídeo. Tente recarregar a página ou abra o link original.
            </div>
          )}
          
          {/* Falta Pouco Banner */}
          {showFaltaPouco && completeOnEnd && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-lg bg-[#111]/90 backdrop-blur-md border border-yellow-500/50 rounded-xl p-4 shadow-[0_0_30px_rgba(234,179,8,0.2)] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between gap-x-4">
                <div className="flex items-center gap-x-3">
                  <div className="p-2 bg-yellow-500/20 rounded-full animate-pulse">
                    <Brain className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Falta pouco!</h4>
                    <p className="text-xs text-slate-300">Assista até o final para continuar sua jornada.</p>
                  </div>
                </div>
                <Button 
                  onClick={onEnd} 
                  variant="outline" 
                  className="bg-transparent border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-colors"
                >
                  Marcar como concluída
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
