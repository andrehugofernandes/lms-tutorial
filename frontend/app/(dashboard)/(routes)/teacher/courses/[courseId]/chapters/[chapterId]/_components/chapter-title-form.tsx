"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Pencil } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChapterTitleFormProps {
  initialData: {
    title: string;
  };
  courseId: string;
  chapterId: string;
}

const formSchema = z.object({
  title: z.string().min(1),
});

export const ChapterTitleForm = ({
  initialData,
  courseId,
  chapterId,
}: ChapterTitleFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const toggleEdit = () => setIsEditing((current) => !current);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}`, values);
      toast.success("Título do capítulo atualizado.");
      toggleEdit();
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar o título do capítulo.");
    }
  };

  return (
    <div className="rounded-lg border border-[#242424] bg-[#111111] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">
            Título do capítulo
          </p>
          {!isEditing && (
            <p className="mt-3 break-words text-base font-semibold leading-6 text-white">
              {initialData.title || "Sem título definido."}
            </p>
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
              Editar título
            </>
          )}
        </Button>
      </div>
      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="Ex.: Introdução ao curso"
                      className="border-[#333333] bg-black text-white placeholder:text-[#7A7A7A] focus-visible:ring-[#FF9F00]"
                      {...field}
                    />
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
              Salvar título
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
};
