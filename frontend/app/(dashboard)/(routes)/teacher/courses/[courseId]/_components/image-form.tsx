"use client";

import * as z from "zod";
import axios from "axios";
import Image from "next/image";
import type { Course } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import FileUpload from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import {
  COURSE_IMAGE_RATIO_HELPER_TEXT,
  DEFAULT_COURSE_IMAGE_RATIO,
} from "@/lib/course-image-ratios";

interface ImageFormProps {
  initialData: Course;
  courseId: string;
}

const formSchema = z.object({
  imageUrl: z.string().min(1, {
    message: "Image is required",
  }),
});

export const ImageForm = ({ initialData, courseId }: ImageFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(
    initialData.imageUrl ?? ""
  );
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(
    DEFAULT_COURSE_IMAGE_RATIO
  );

  const router = useRouter();
  const localPreviewUrlRef = useRef<string | null>(null);
  const currentImageUrl = uploadedImageUrl || initialData.imageUrl || "";
  const hasPersistedImage = Boolean(currentImageUrl);

  const toggleEdit = () => setIsEditing((current) => !current);

  const clearLocalPreview = () => {
    if (!localPreviewUrlRef.current) return;
    URL.revokeObjectURL(localPreviewUrlRef.current);
    localPreviewUrlRef.current = null;
  };

  useEffect(() => {
    clearLocalPreview();
    setUploadedImageUrl(initialData.imageUrl ?? "");
    setDraftPreviewUrl(null);
  }, [initialData.imageUrl]);

  useEffect(() => {
    return () => {
      clearLocalPreview();
    };
  }, []);

  useEffect(() => {
    if (!currentImageUrl) {
      setImageAspectRatio(DEFAULT_COURSE_IMAGE_RATIO);
      return;
    }

    const image = new window.Image();
    image.src = currentImageUrl;
    image.onload = () => {
      setImageAspectRatio(image.width / image.height);
    };
    image.onerror = () => {
      setImageAspectRatio(DEFAULT_COURSE_IMAGE_RATIO);
    };
  }, [currentImageUrl]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSaving(true);
      await axios.patch(`/api/courses/${courseId}`, values);
      toast.success("Imagem do curso atualizada!");
      setIsEditing(false);
      router.refresh();
    } catch {
      clearLocalPreview();
      setUploadedImageUrl(initialData.imageUrl ?? "");
      setDraftPreviewUrl(null);
      toast.error("Algo deu errado!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-b border-[#242424] p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-[#B5B5B5]">
          Imagem do curso
        </p>
        {hasPersistedImage && (
          <Button
            onClick={toggleEdit}
            variant="outline"
            disabled={isSaving}
            className="border-[#FF9F00]/60 bg-[#111111] text-white hover:border-[#FF9F00] hover:bg-[#181818] hover:text-white"
          >
            {isEditing ? (
              <>Cancelar</>
            ) : (
              <>
                <Pencil className="mr-2 h-4 w-4 text-[#FF9F00]" />
                Trocar capa
              </>
            )}
          </Button>
        )}
      </div>

      {!isEditing && hasPersistedImage ? (
        <div
          className="relative mt-2 overflow-hidden rounded-lg border border-[#333333] bg-black"
          style={{ aspectRatio: imageAspectRatio }}
        >
          <Image
            alt="Imagem do curso"
            fill
            className="object-cover"
            src={currentImageUrl}
          />
          {isSaving && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 text-sm font-medium text-white">
              Salvando imagem...
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-col items-center justify-center text-center">
          <FileUpload
            endpoint="courseImage"
            disabled={isSaving}
            previewUrl={draftPreviewUrl || currentImageUrl || null}
            onFileSelect={(file) => {
              if (!file) return;

              clearLocalPreview();

              const localPreviewUrl = URL.createObjectURL(file);
              localPreviewUrlRef.current = localPreviewUrl;
              setDraftPreviewUrl(localPreviewUrl);
            }}
            onChange={(url) => {
              if (!url) return;

              clearLocalPreview();
              setDraftPreviewUrl(url);
              setUploadedImageUrl(url);
              void onSubmit({ imageUrl: url });
            }}
          />

          <div className="mt-4 text-center text-xs text-[#A1A1AA]">
            {isSaving
              ? "Salvando imagem do curso..."
              : COURSE_IMAGE_RATIO_HELPER_TEXT}
          </div>
        </div>
      )}
    </div>
  );
};
