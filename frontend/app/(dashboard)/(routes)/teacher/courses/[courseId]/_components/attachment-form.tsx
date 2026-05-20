"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { Attachment, Course } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { File, FolderOpen, PlusCircle, X } from "lucide-react";
import FileUpload from "@/components/file-upload";

interface AttachmentFormProps {
  initialData: Course & { attachments: Attachment[] };
  courseId: string;
}

const formSchema = z.object({
  url: z.string().min(1),
});

export const AttachmentForm = ({
  initialData,
  courseId,
}: AttachmentFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const toggleEdit = () => setIsEditing((current) => !current);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.post(`/api/courses/${courseId}/attachments`, values);
      toast.success("Anexo do curso atualizado.");
      toggleEdit();
      router.refresh();
    } catch {
      toast.error("Algo deu errado.");
    }
  };

  const onDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await axios.delete(`/api/courses/${courseId}/attachments/${id}`);
      toast.success("Anexo do curso excluído.");
      router.refresh();
    } catch {
      toast.error("Algo deu errado.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-[#242424] bg-[#0B0B0B] p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#B5B5B5]">
            Anexos do curso
          </p>
          <p className="mt-1 text-xs text-[#7A7A7A]">
            Arquivos complementares para apoiar o aprendizado.
          </p>
        </div>
        <Button
          onClick={toggleEdit}
          className="bg-[#FF9F00] text-black hover:bg-[#E68F00]"
        >
          {isEditing ? (
            "Cancelar"
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar um arquivo
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        <>
          {initialData.attachments.length === 0 && (
            <div className="flex min-h-[210px] flex-col items-center justify-center rounded-xl border border-dashed border-[#333333] bg-[#111111] p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#7A7A7A]/50 text-[#B5B5B5]">
                <FolderOpen className="h-8 w-8" />
              </span>
              <p className="mt-5 text-lg font-bold text-white">
                Nenhum anexo adicionado.
              </p>
              <p className="mt-2 max-w-md text-sm text-[#A1A1AA]">
                Adicione arquivos complementares para enriquecer o aprendizado.
              </p>
            </div>
          )}
          {initialData.attachments.length > 0 && (
            <div className="space-y-2">
              {initialData.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex w-full items-center rounded-lg border border-[#333333] bg-black p-3 text-[#D4D4D8]"
                >
                  <File className="mr-2 h-4 w-4 flex-shrink-0 text-[#FF9F00]" />
                  <p className="line-clamp-1 text-xs">{attachment.name}</p>
                  {deletingId !== attachment.id && (
                    <button
                      onClick={() => onDelete(attachment.id)}
                      className="ml-auto text-[#B5B5B5] transition hover:text-[#FF4D4D]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {isEditing && (
        <div>
          <FileUpload
            endpoint="courseAttachment"
            onChange={(url) => {
              if (url) {
                void onSubmit({ url });
              }
            }}
          />
          <div className="mt-4 text-xs text-[#A1A1AA]">
            Adicione qualquer recurso que seus alunos possam precisar.
          </div>
        </div>
      )}
    </div>
  );
};
