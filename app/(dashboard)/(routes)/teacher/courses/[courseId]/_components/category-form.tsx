"use client"
import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Course } from "@prisma/client";
import { Combobox } from "@/components/ui/combobox";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface CategoryFormProps {
  initialData: Course;
  courseId: string;
  options: { label: string, value: string; }[]
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: initialData?.categoryId || ""
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const toggleEdit = () => {
    setIsEditing((current) => !current);
    setIsCreating(false);
  };
  
  const router = useRouter();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.patch(`/api/courses/${courseId}`, values);
      toast.success("Categoria do curso atualizada!");
      toggleEdit();
      router.refresh();
    } catch {
      toast.error("Algo deu errado!");
    }
  }

  const onCreateCategory = async () => {
    try {
      if (!newCategoryName) return;
      const response = await axios.post("/api/categories", { name: newCategoryName });
      const newCategory = response.data;
      
      setOptions((prev) => [...prev, { label: newCategory.name, value: newCategory.id }].sort((a,b) => a.label.localeCompare(b.label)));
      form.setValue("categoryId", newCategory.id);
      setIsCreating(false);
      setNewCategoryName("");
      toast.success("Nova categoria criada!");
    } catch {
      toast.error("Erro ao criar categoria");
    }
  }

  const selectedOption = options.find((option) => option.value === initialData.categoryId);

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Categoria do curso
        <Button onClick={toggleEdit} variant="outline">
          {isEditing ? (
            <>Cancelar</>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Editar categoria
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        <p className={cn(
          "text-sm mt-2",
          !initialData.categoryId && "text-slate-500 italic"
        )}>
          {selectedOption?.label || "Sem categoria."}
        </p>
      )}
      {isEditing && (
        <div className="space-y-4 mt-4">
          {!isCreating ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Combobox
                          options={options}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center gap-x-2">
                  <Button
                    disabled={!isValid || isSubmitting}
                    type="submit"
                  >
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-x-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Nova categoria
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Ex: Marketing Digital"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <div className="flex items-center gap-x-2">
                <Button onClick={onCreateCategory}>
                  Criar Categoria
                </Button>
                <Button variant="ghost" onClick={() => setIsCreating(false)}>
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// export default CategoryForm