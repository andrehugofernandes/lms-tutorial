"use client";

import * as z from "zod";
import axios from "axios";
import MuxPlayer from "@mux/mux-player-react";
import { 
  Pencil, 
  PlusCircle, 
  Video, 
  Youtube, 
  Upload, 
  Link as LinkIcon,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Chapter, MuxData, VideoSourceType, VideoProvider } from "@prisma/client";

import { Button } from "@/components/ui/button";
import FileUpload from "@/components/file-upload";
import { Input } from "@/components/ui/input";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ChapterVideoFormProps {
  initialData: Chapter & { muxData?: MuxData | null };
  courseId: string;
  chapterId: string;
};

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
  const [activeTab, setActiveTab] = useState<string>(initialData.videoSourceType || "UPLOAD");
  const [urlInput, setUrlInput] = useState(initialData.externalUrl || "");

  const toggleEdit = () => setIsEditing((current) => !current);

  const router = useRouter();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsUpdating(true);
      await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}`, values);
      toast.success("Chapter updated");
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  }

  const onExternalUrlSubmit = () => {
    if (!urlInput) return;
    onSubmit({
      videoSourceType: "EXTERNAL",
      externalUrl: urlInput,
    });
  }

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between mb-4">
        Vídeo do Capítulo
        <Button onClick={toggleEdit} variant="outline" disabled={isUpdating}>
          {isEditing && (
            <>Cancelar</>
          )}
          {!isEditing && !initialData.videoUrl && !initialData.externalUrl && (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Adicionar vídeo
            </>
          )}
          {!isEditing && (initialData.videoUrl || initialData.externalUrl) && (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Alterar mídia
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        (!initialData.videoUrl && !initialData.externalUrl) ? (
          <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md">
            <Video className="h-10 w-10 text-slate-500" />
          </div>
        ) : (
          <div className="relative aspect-video mt-2">
            {initialData.videoSourceType === "UPLOAD" ? (
              <MuxPlayer
                playbackId={initialData?.muxData?.playbackId || ""}
              />
            ) : (
              <div className="w-full h-full bg-slate-900 rounded-md flex flex-col items-center justify-center text-white p-4 text-center gap-y-2">
                 {initialData.videoProvider === "YOUTUBE" ? (
                    <Youtube className="h-12 w-12 text-rose-500" />
                 ) : (
                    <ExternalLink className="h-12 w-12 text-sky-400" />
                 )}
                 <div className="space-y-1">
                    <p className="font-bold text-sm">Vídeo Externo Configurado</p>
                    <p className="text-xs text-slate-400 truncate max-w-[250px]">{initialData.externalUrl}</p>
                 </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-none">
                    <CheckCircle className="h-3 w-3 mr-1" /> Pronto para o aluno
                  </Badge>
              </div>
            )}
          </div>
        )
      )}
      {isEditing && (
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
           <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="UPLOAD" className="gap-x-2">
                 <Upload className="h-4 w-4" /> Upload Local
              </TabsTrigger>
              <TabsTrigger value="EXTERNAL" className="gap-x-2">
                 <LinkIcon className="h-4 w-4" /> Link Externo
              </TabsTrigger>
           </TabsList>
           
           <TabsContent value="UPLOAD" className="space-y-4">
              <FileUpload
                endpoint="chapterVideo"
                onChange={(url) => {
                  if (url) {
                    onSubmit({ 
                      videoUrl: url,
                      videoSourceType: "UPLOAD" 
                    });
                  }
                }}
              />
              <div className="text-xs text-muted-foreground mt-4">
                Envie um arquivo de vídeo do seu computador (Mux Storage).
              </div>
           </TabsContent>

           <TabsContent value="EXTERNAL" className="space-y-4">
              <div className="space-y-2">
                 <Input 
                   placeholder="Cole aqui o link do YouTube ou Vimeo"
                   value={urlInput}
                   onChange={(e) => setUrlInput(e.target.value)}
                   disabled={isUpdating}
                 />
                 <Button 
                   onClick={onExternalUrlSubmit} 
                   disabled={isUpdating || !urlInput}
                   className="w-full bg-sky-700 hover:bg-sky-800"
                 >
                   Salvar Link Externo
                 </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-4">
                 Suporte nativo para YouTube e Vimeo. Converção automática para Iframe.
              </div>
           </TabsContent>
        </Tabs>
      )}
      {(initialData.videoUrl || initialData.externalUrl) && !isEditing && (
        <div className="text-xs text-muted-foreground mt-2">
          {initialData.videoSourceType === "UPLOAD" 
            ? "O processamento do vídeo pode levar alguns minutos." 
            : "Vídeo externo configurado com sucesso."}
        </div>
      )}
    </div>
  )
}