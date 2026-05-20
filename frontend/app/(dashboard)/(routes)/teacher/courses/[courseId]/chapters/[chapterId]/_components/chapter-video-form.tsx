"use client";

import * as z from "zod";
import axios from "axios";
import MuxPlayer from "@mux/mux-player-react";
import {
  CheckCircle,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  Pencil,
  PlusCircle,
  Upload,
  Video,
  Youtube,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { Chapter, MuxData } from "@/lib/types";
import { TranscriptStatus, VideoProvider, VideoSourceType } from "@/lib/types";

import { Button } from "@/components/ui/button";
import FileUpload from "@/components/file-upload";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ChapterVideoFormProps {
  initialData: Chapter & { muxData?: MuxData | null };
  courseId: string;
  chapterId: string;
}

const formSchema = z.object({
  videoUrl: z.string().optional(),
  videoSourceType: z.nativeEnum(VideoSourceType).optional(),
  externalUrl: z.string().optional(),
});

export const ChapterVideoForm = ({
  initialData,
  courseId,
  chapterId,
}: ChapterVideoFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(
    initialData.videoSourceType || "UPLOAD"
  );
  const [urlInput, setUrlInput] = useState(initialData.externalUrl || "");

  const router = useRouter();
  const hasVideo = Boolean(initialData.videoUrl || initialData.externalUrl);

  const toggleEdit = () => setIsEditing((current) => !current);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsUpdating(true);
      await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}`, values);
      toast.success("Vídeo do capítulo atualizado.");
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar o vídeo do capítulo.");
    } finally {
      setIsUpdating(false);
    }
  };

  const onExternalUrlSubmit = () => {
    if (!urlInput) return;
    void onSubmit({
      videoSourceType: VideoSourceType.EXTERNAL,
      externalUrl: urlInput,
    });
  };

  return (
    <div className="rounded-xl border border-[#242424] bg-[#0B0B0B] p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Vídeo do capítulo</h3>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Configure a mídia que será exibida para o aluno.
          </p>
        </div>
        <Button
          onClick={toggleEdit}
          variant="outline"
          disabled={isUpdating}
          className="border-[#333333] bg-[#111111] text-white hover:border-[#FF9F00] hover:bg-[#111111] hover:text-white"
        >
          {isEditing && "Cancelar"}
          {!isEditing && !hasVideo && (
            <>
              <PlusCircle className="mr-2 h-4 w-4 text-[#FF9F00]" />
              Adicionar vídeo
            </>
          )}
          {!isEditing && hasVideo && (
            <>
              <Pencil className="mr-2 h-4 w-4 text-[#FF9F00]" />
              Alterar mídia
            </>
          )}
        </Button>
      </div>

      {!isEditing &&
        (!hasVideo ? (
          <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-[#333333] bg-[#111111]">
            <Video className="h-10 w-10 text-[#7A7A7A]" />
          </div>
        ) : (
          <div className="relative aspect-video overflow-hidden rounded-lg border border-[#242424] bg-[#07111F]">
            {initialData.videoSourceType === VideoSourceType.UPLOAD ? (
              initialData?.muxData?.playbackId ? (
                <MuxPlayer playbackId={initialData.muxData.playbackId || ""} />
              ) : initialData.videoUrl ? (
                <video
                  controls
                  className="h-full w-full bg-black"
                  src={initialData.videoUrl}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#111827] px-6 text-center text-sm text-[#B5B5B5]">
                  Vídeo enviado. O processamento ainda não gerou playback.
                </div>
              )
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_center,rgba(0,102,179,0.18),transparent_45%),#0B1324] p-6 text-center text-white">
                {initialData.videoProvider === VideoProvider.YOUTUBE ? (
                  <Youtube className="h-12 w-12 text-rose-500" />
                ) : (
                  <ExternalLink className="h-12 w-12 text-sky-400" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">Vídeo externo configurado</p>
                  <p className="max-w-[360px] truncate text-xs text-[#B5B5B5]">
                    {initialData.externalUrl}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-none bg-[#00C27A]/10 text-[#00C27A]"
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Pronto para o aluno
                </Badge>
                {initialData.transcriptStatus === TranscriptStatus.PROCESSING && (
                  <Badge
                    variant="outline"
                    className="border-none bg-[#FF9F00]/10 text-[#FF9F00]"
                  >
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Transcrevendo legenda
                  </Badge>
                )}
                {initialData.transcriptStatus === TranscriptStatus.COMPLETED && (
                  <Badge
                    variant="outline"
                    className="border-none bg-[#0066B3]/20 text-sky-300"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Legenda automática ativa
                  </Badge>
                )}
                {initialData.transcriptStatus === TranscriptStatus.FAILED && (
                  <Badge
                    variant="outline"
                    className="border-none bg-[#FF4D4D]/10 text-[#FF4D4D]"
                  >
                    Erro ao transcrever legenda
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}

      {isEditing && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-2 border border-[#242424] bg-[#111111]">
            <TabsTrigger
              value="UPLOAD"
              className="gap-x-2 text-[#B5B5B5] data-[state=active]:bg-[#FF9F00] data-[state=active]:text-black"
            >
              <Upload className="h-4 w-4" />
              Upload local
            </TabsTrigger>
            <TabsTrigger
              value="EXTERNAL"
              className="gap-x-2 text-[#B5B5B5] data-[state=active]:bg-[#FF9F00] data-[state=active]:text-black"
            >
              <LinkIcon className="h-4 w-4" />
              Link externo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="UPLOAD" className="space-y-4">
            <FileUpload
              endpoint="chapterVideo"
              onChange={(url) => {
                if (url) {
                  void onSubmit({
                    videoUrl: url,
                    videoSourceType: VideoSourceType.UPLOAD,
                  });
                }
              }}
            />
            <div className="text-xs text-[#A1A1AA]">
              Envie um arquivo de vídeo do seu computador.
            </div>
          </TabsContent>

          <TabsContent value="EXTERNAL" className="space-y-4">
            <div className="space-y-3">
              <Input
                placeholder="Cole aqui o link do YouTube ou Vimeo"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                disabled={isUpdating}
                className="border-[#333333] bg-black text-white placeholder:text-[#7A7A7A] focus-visible:ring-[#FF9F00]"
              />
              <Button
                onClick={onExternalUrlSubmit}
                disabled={isUpdating || !urlInput}
                className="w-full bg-[#FF9F00] text-black hover:bg-[#E68F00]"
              >
                Salvar link externo
              </Button>
            </div>
            <div className="text-xs text-[#A1A1AA]">
              Suporte nativo para YouTube e Vimeo com conversão automática para iframe.
            </div>
          </TabsContent>
        </Tabs>
      )}

      {hasVideo && !isEditing && (
        <div className="mt-4 rounded-lg border border-[#242424] bg-[#111111] px-4 py-3 text-xs text-[#B5B5B5]">
          {initialData.videoSourceType === VideoSourceType.UPLOAD
            ? "O processamento do vídeo pode levar alguns minutos."
            : "Vídeo externo configurado com sucesso."}
        </div>
      )}
    </div>
  );
};
