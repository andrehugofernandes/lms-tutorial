"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { Course } from "@/lib/types";
import { Combobox } from "@/components/ui/combobox";
import { Pencil, PlusCircle } from "lucide-react";

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

interface CategoryFormProps {
  initialData: Course;
  courseId: string;
  options: { label: string; value: string }[];
}

const formSchema = z.object({
  categoryId: z.string().min(1),
});

export const CategoryForm = ({
  initialData,
  courseId,
  options: initialOptions,
}: CategoryFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [options, setOptions] = useState(initialOptions);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: initialData?.categoryId || "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const toggleEdit = () => {
    setIsEditing((current) => !current);
    setIsCreating(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.patch(`/api/courses/${courseId}`, values);
      toast.success("Categoria do curso atualizada.");
      toggleEdit();
      router.refresh();
    } catch {
      toast.error("Algo deu errado.");
    }
  };

  const onCreateCategory = async () => {
    try {
      if (!newCategoryName) return;
      const response = await axios.post("/api/categories", {
        name: newCategoryName,
      });
      const newCategory = response.data;

      setOptions((prev) =>
        [...prev, { label: newCategory.name, value: newCategory.id }].sort(
          (a, b) => a.label.localeCompare(b.label)
        )
      );
      form.setValue("categoryId", newCategory.id);
      setIsCreating(false);
      setNewCategoryName("");
      toast.success("Nova categoria criada.");
    } catch {
      toast.error("Erro ao criar categoria.");
    }
  };

  const selectedOption = options.find(
    (option) => option.value === initialData.categoryId
  );

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted-foreground">
            Categoria do curso
          </p>
          {!isEditing && (
            <p
              className={cn(
                "mt-3 text-base font-semibold text-foreground",
                !initialData.categoryId && "italic text-muted-foreground"
              )}
            >
              {selectedOption?.label || "Sem categoria."}
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
              Editar categoria
            </>
          )}
        </Button>
      </div>

      {isEditing && (
        <div className="mt-4 space-y-4">
          {!isCreating ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Combobox options={options} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={!isValid || isSubmitting}
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Salvar categoria
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreating(true)}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova categoria
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Ex.: Marketing Digital"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={onCreateCategory}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Criar categoria
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsCreating(false)}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
