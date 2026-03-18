"use client";

import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, Pencil } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import {
  DEFAULT_COURSE_IMAGE_RATIO,
  getCourseImageRatioMeta,
} from "@/lib/course-image-ratios";
import { UploadDropzone } from "@/lib/uploadthing";

interface FileUploadProps {
  onChange: (url?: string) => void;
  endpoint: keyof typeof ourFileRouter;
  disabled?: boolean;
  previewUrl?: string | null;
  onFileSelect?: (file?: File) => void;
}

type UploadStatus = "idle" | "selected" | "uploading" | "complete";

type ImageMeta = ReturnType<typeof getCourseImageRatioMeta>;

const endpointCopy: Record<
  keyof typeof ourFileRouter,
  {
    allowedContent: string;
    buttonLabel: string;
    label: string;
    successMessage: string;
  }
> = {
  courseImage: {
    allowedContent: "Imagem JPG, PNG ou WebP ate 4 MB.",
    buttonLabel: "Selecionar imagem",
    label: "Arraste e solte ou clique aqui para selecionar",
    successMessage: "Imagem enviada com sucesso.",
  },
  courseAttachment: {
    allowedContent: "Documentos, imagens, audios, videos ou PDF.",
    buttonLabel: "Selecionar arquivo",
    label: "Arraste e solte ou clique aqui para selecionar",
    successMessage: "Arquivo enviado com sucesso.",
  },
  chapterVideo: {
    allowedContent: "Video ate 512 GB.",
    buttonLabel: "Selecionar video",
    label: "Arraste e solte ou clique aqui para selecionar",
    successMessage: "Video enviado com sucesso.",
  },
};

const FileUpload = ({
  onChange,
  endpoint,
  disabled,
  previewUrl,
  onFileSelect,
}: FileUploadProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const copy = endpointCopy[endpoint];
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);

  const hasImagePreview = endpoint === "courseImage" && Boolean(previewUrl);
  const showStatusCard = !(endpoint === "courseImage" && hasImagePreview);
  const previewAspectRatio = hasImagePreview
    ? imageMeta?.ratio ?? DEFAULT_COURSE_IMAGE_RATIO
    : undefined;
  const openFileDialog = () => {
    const input = wrapperRef.current?.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement | null;
    input?.click();
  };

  useEffect(() => {
    if (endpoint !== "courseImage" || !previewUrl) {
      setImageMeta(null);
      return;
    }

    const image = new window.Image();
    image.src = previewUrl;
    image.onload = () => {
      setImageMeta(getCourseImageRatioMeta(image.width, image.height));
    };
    image.onerror = () => {
      setImageMeta(null);
    };
  }, [endpoint, previewUrl]);

  return (
    <div ref={wrapperRef} className="relative w-full space-y-3">
      {hasImagePreview && (
        <button
          type="button"
          onClick={openFileDialog}
          disabled={disabled}
          className="absolute -top-12 right-0 z-30 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" />
          Escolher outra capa
        </button>
      )}

      <div
        className="relative w-full"
        style={previewAspectRatio ? { aspectRatio: previewAspectRatio } : undefined}
      >
        {hasImagePreview && (
          <NextImage
            alt="Preview da imagem selecionada"
            className="absolute inset-0 h-full w-full rounded-lg bg-white object-contain"
            fill
            src={previewUrl ?? undefined}
            unoptimized
          />
        )}

        <UploadDropzone
          className="relative z-10"
          endpoint={endpoint}
          config={{
            mode: "auto",
          }}
          disabled={disabled}
          onChange={(files) => {
            const nextFile = files[0];
            onFileSelect?.(nextFile);
            setSelectedFileName(nextFile?.name ?? null);
            setUploadProgress(0);
            setStatus(nextFile ? "selected" : "idle");
          }}
          onUploadBegin={(fileName) => {
            setStatus("uploading");
            setSelectedFileName(fileName);
            setUploadProgress(0);
            toast.loading("Enviando arquivo...", { id: "uploadthing" });
          }}
          onUploadProgress={(progress) => {
            setStatus("uploading");
            setUploadProgress(progress);
          }}
          onUploadError={(error: Error) => {
            const isMissingToken = error.message.includes("Missing token");

            toast.dismiss("uploadthing");
            setStatus("idle");
            setUploadProgress(0);
            toast.error(
              isMissingToken
                ? "UploadThing nao configurado. Adicione UPLOADTHING_TOKEN ao .env e reinicie o servidor."
                : `Erro no upload: ${error.message}`
            );
          }}
          onClientUploadComplete={(res) => {
            const uploadedFile = res?.[0];
            const uploadedUrl = uploadedFile?.ufsUrl ?? uploadedFile?.url;

            toast.dismiss("uploadthing");
            setStatus("complete");
            setUploadProgress(100);
            setSelectedFileName(uploadedFile?.name ?? selectedFileName);

            if (!uploadedUrl) {
              toast.error("Upload concluido, mas a URL nao foi retornada.");
              return;
            }

            toast.success(copy.successMessage);
            onChange(uploadedUrl);
          }}
          appearance={{
            container: hasImagePreview
              ? "h-full min-h-0 w-full overflow-hidden rounded-lg border-0 bg-transparent p-0 transition cursor-pointer flex items-center justify-center shadow-none data-[state=disabled]:cursor-not-allowed data-[state=disabled]:opacity-70"
              : "w-full min-h-[220px] border-dashed border-2 border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center data-[state=uploading]:border-sky-400 data-[state=uploading]:bg-sky-50/50 data-[state=disabled]:cursor-not-allowed data-[state=disabled]:opacity-70",
            uploadIcon: hasImagePreview
              ? "hidden"
              : "text-slate-400",
            button: hasImagePreview
              ? "hidden"
              : "ut-ready:bg-sky-700 ut-uploading:bg-slate-500 bg-sky-700 after:bg-sky-800 rounded-md px-4 py-2 text-white font-medium min-w-[160px]",
            label: hasImagePreview
              ? "hidden"
              : "text-sky-700 hover:text-sky-800 font-semibold mb-2 text-center",
            allowedContent: hasImagePreview
              ? "hidden"
              : "text-slate-500 text-xs mb-4 text-center",
          }}
          content={{
            label: hasImagePreview ? "" : copy.label,
            allowedContent: hasImagePreview ? "" : copy.allowedContent,
            button({ isUploading }) {
              if (isUploading) return "Enviando...";
              return hasImagePreview
                ? "Escolher outra imagem"
                : copy.buttonLabel;
            },
          }}
        />
      </div>

      {selectedFileName && showStatusCard && (
        <div className="w-full rounded-md border border-slate-200 bg-white p-3 text-left shadow-sm">
          <div className="flex items-start gap-3">
            {status === "uploading" ? (
              <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin text-sky-700" />
            ) : status === "complete" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            ) : (
              <FileUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">
                {selectedFileName}
              </p>
              <p className="text-xs text-slate-500">
                {status === "selected" &&
                  "Arquivo selecionado. O upload comeca automaticamente."}
                {status === "uploading" &&
                  `Enviando arquivo... ${Math.round(uploadProgress)}%`}
                {status === "complete" &&
                  "Arquivo enviado. Atualizando o formulario."}
              </p>
            </div>
          </div>

          {status === "uploading" && (
            <Progress
              className="mt-3 h-2 bg-slate-200"
              value={uploadProgress}
            />
          )}
        </div>
      )}

      {endpoint === "courseImage" && imageMeta && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            imageMeta.isAccepted
              ? imageMeta.isRecommended
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-sky-200 bg-sky-50 text-sky-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                imageMeta.isAccepted
                  ? imageMeta.isRecommended
                    ? "border-emerald-300 text-emerald-700"
                    : "border-sky-300 text-sky-700"
                  : "border-amber-300 text-amber-700"
              }
            >
              {imageMeta.isAccepted
                ? `${imageMeta.matchedRatioLabel} OK`
                : "Fora do padrao"}
            </Badge>
            <span>
              {imageMeta.width} x {imageMeta.height}
            </span>
          </div>
          {imageMeta.isAccepted && !imageMeta.isRecommended && (
            <p className="mt-2 text-xs leading-5">
              Esta imagem esta em {imageMeta.matchedRatioLabel}. Essa proporcao
              tambem e aceita e o preview foi ajustado para encaixar corretamente.
            </p>
          )}
          {!imageMeta.isAccepted && (
            <p className="mt-2 text-xs leading-5">
              Esta imagem nao esta em 16:9 nem em 3:2. Ela sera exibida no
              preview, mas recomendamos uma capa nesses formatos para manter um
              banner mais consistente.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
