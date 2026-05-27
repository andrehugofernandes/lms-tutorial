"use client";

import axios from "axios";
import { Eye, EyeOff, Trash } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { useConfettiStore } from "@/hooks/use-confetti-store";

interface ActionsProps {
  disabled: boolean;
  courseId: string;
  isPublished: boolean;
}

export const Actions = ({
  disabled,
  courseId,
  isPublished,
}: ActionsProps) => {
  const router = useRouter();
  const confetti = useConfettiStore();
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    try {
      setIsLoading(true);

      if (isPublished) {
        await axios.patch(`/api/courses/${courseId}/unpublish`);
        toast.success("Curso despublicado.");
      } else {
        await axios.patch(`/api/courses/${courseId}/publish`);
        toast.success("Curso publicado.");
        confetti.onOpen();
      }

      router.refresh();
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data === "string"
          ? error.response.data
          : "Algo deu errado.";

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setIsLoading(true);

      await axios.delete(`/api/courses/${courseId}`);

      toast.success("Curso excluído.");
      router.refresh();
      router.push(`/teacher/courses`);
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data === "string"
          ? error.response.data
          : "Algo deu errado.";

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        variant="outline"
        size="sm"
        className="border-border bg-background px-5 text-foreground hover:border-primary hover:bg-muted hover:text-foreground"
      >
        {isPublished ? (
          <>
            <EyeOff className="mr-2 h-4 w-4" />
            Despublicar
          </>
        ) : (
          <>
            <Eye className="mr-2 h-4 w-4" />
            Publicar
          </>
        )}
      </Button>
      <ConfirmModal onConfirm={onDelete}>
        <Button
          size="icon"
          disabled={isLoading}
          variant="outline"
          className="border-red-500/40 bg-red-500/10 text-red-600 hover:border-red-500 hover:bg-red-500 hover:text-white dark:text-red-400"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </ConfirmModal>
    </div>
  );
};
