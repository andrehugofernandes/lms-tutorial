"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { Chapter } from "@/lib/types";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Editor } from "@/components/editor";
import { Preview } from "@/components/preview";

interface ChapterDescriptionFormProps {
  initialData: Chapter;
  courseId: string;
  chapterId: string;
}

const formSchema = z.object({
  description: z.string().min(1),
});

export const ChapterDescriptionForm = ({
  initialData,
  courseId,
  chapterId,
}: ChapterDescriptionFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const toggleEdit = () => setIsEditing((current) => !current);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}`, values);
      toast.success("Descrição do capítulo atualizada.");
      toggleEdit();
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar a descrição do capítulo.");
    }
  };

  return (
    <div className="rounded-lg border border-[#242424] bg-[#111111] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">
            Descrição do capítulo
          </p>
          {!isEditing && (
            <div
              className={cn(
                "mt-3 text-sm leading-6 text-white [&_.ql-container]:font-inherit [&_.ql-editor]:p-0 [&_.ql-editor]:text-white",
                !initialData.description && "italic text-[#7A7A7A]"
              )}
            >
              {!initialData.description && "Sem descrição."}
              {initialData.description && <Preview value={initialData.description} />}
            </div>
          )}
        </div>
        <Button
          onClick={toggleEdit}
          type="button"
          variant="outline"
          className="border-[#333333] bg-[#181818] text-white hover:border-[#FF9F00] hover:bg-[#181818] hover:text-white"
        >
          {isEditing ? (
            "Cancelar"
          ) : (
            <>
              <Pencil className="mr-2 h-4 w-4 text-[#FF9F00]" />
              Editar descrição
            </>
          )}
        </Button>
      </div>
      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="overflow-hidden rounded-lg border border-[#333333] bg-white text-black">
                      <Editor {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              disabled={!isValid || isSubmitting}
              type="submit"
              className="bg-[#FF9F00] text-black hover:bg-[#E68F00]"
            >
              Salvar descrição
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
};
