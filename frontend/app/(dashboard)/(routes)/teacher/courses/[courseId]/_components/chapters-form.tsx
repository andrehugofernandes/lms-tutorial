"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { Chapter, Course } from "@/lib/types";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { ChaptersList } from "./chapters-list";

interface ChaptersFormProps {
  initialData: Course & { chapters: Chapter[] };
  courseId: string;
}

const formSchema = z.object({
  title: z.string().min(1),
});

export const ChaptersForm = ({
  initialData,
  courseId,
}: ChaptersFormProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const toggleCreating = () => {
    setIsCreating((current) => !current);
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.post(`/api/courses/${courseId}/chapters`, values);
      toast.success("Capítulo criado.");
      toggleCreating();
      router.refresh();
    } catch {
      toast.error("Algo deu errado.");
    }
  };

  const onReorder = async (updateData: { id: string; position: number }[]) => {
    try {
      setIsUpdating(true);

      await axios.put(`/api/courses/${courseId}/chapters/reorder`, {
        list: updateData,
      });
      toast.success("Capítulos reordenados.");
      router.refresh();
    } catch {
      toast.error("Algo deu errado.");
    } finally {
      setIsUpdating(false);
    }
  };

  const onEdit = (id: string) => {
    router.push(`/teacher/courses/${courseId}/chapters/${id}`);
  };

  return (
    <div className="relative rounded-lg border border-border bg-card p-5">
      {isUpdating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/50">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Capítulos do curso
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Organize a sequência que os alunos irão seguir.
          </p>
        </div>
        <Button
          onClick={toggleCreating}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isCreating ? (
            "Cancelar"
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar capítulo
            </>
          )}
        </Button>
      </div>
      {isCreating && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mb-5 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="Ex.: Introdução ao curso"
                      className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Criar capítulo
            </Button>
          </form>
        </Form>
      )}
      {!isCreating && (
        <div
          className={cn(
            "text-sm",
            !initialData.chapters.length && "italic text-muted-foreground"
          )}
        >
          {!initialData.chapters.length && "Nenhum capítulo"}
          <ChaptersList
            onEdit={onEdit}
            onReorder={onReorder}
            items={initialData.chapters || []}
          />
        </div>
      )}
      {!isCreating && initialData.chapters.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Arraste e solte para reordenar os capítulos
        </p>
      )}
    </div>
  );
};
