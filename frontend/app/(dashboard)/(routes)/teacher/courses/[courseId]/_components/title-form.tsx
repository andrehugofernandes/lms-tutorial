"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TitleFormProps {
  initialData: {
    title: string;
  };
  courseId: string;
}

const formSchema = z.object({
  title: z.string().min(1, {
    message: "Informe o título do curso.",
  }),
});

export const TitleForm = ({ initialData, courseId }: TitleFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  const { isSubmitting, isValid } = form.formState;

  const toggleEdit = () => setIsEditing((current) => !current);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.patch(`/api/courses/${courseId}`, values);
      toast.success("Título do curso atualizado.");
      toggleEdit();
      router.refresh();
    } catch {
      toast.error("Algo deu errado.");
    }
  };

  return (
    <div className="border-b border-border p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted-foreground">
            Título do curso
          </p>
          {!isEditing && (
            <p className="mt-3 break-words text-base font-semibold text-foreground">
              {initialData.title}
            </p>
          )}
        </div>
        <Button
          onClick={toggleEdit}
          variant="outline"
          className="border-primary/50 bg-background text-foreground hover:border-primary hover:bg-muted hover:text-foreground"
        >
          {isEditing ? (
            "Cancelar"
          ) : (
            <>
              <Pencil className="mr-2 h-4 w-4 text-primary" />
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
                      placeholder="Ex.: Desenvolvimento Web Avançado"
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
              Salvar título
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
};
