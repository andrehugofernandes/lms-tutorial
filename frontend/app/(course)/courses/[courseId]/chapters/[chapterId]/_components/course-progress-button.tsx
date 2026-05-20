"use client";
import axios from "axios";
import toast from "react-hot-toast";

import { CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useConfettiStore } from "@/hooks/use-confetti-store";

interface CourseProgressButtonProps {
  chapterId: string;
  courseId: string;
  isCompleted?: boolean;
  nextChapterId?: string;
  onProgressChange?: (isCompleted: boolean) => void;
  showConfettiOnComplete?: boolean;

}
export const CourseProgressButton = ({
  chapterId,
  courseId,
  isCompleted,
  nextChapterId,
  onProgressChange,
  showConfettiOnComplete = true,
}: CourseProgressButtonProps) => {

  const router = useRouter();
  const confeti = useConfettiStore();
  const [isLoading, setIsLoading] = useState(false);
  const onClick = async () => {
    try {
      setIsLoading(true);
      const nextCompleted = !isCompleted;
      await axios.put(`/api/courses/${courseId}/chapters/${chapterId}/progress`, {
        isCompleted: nextCompleted
      });
      onProgressChange?.(nextCompleted);

      if (nextCompleted && !nextChapterId && showConfettiOnComplete) {
        confeti.onOpen();
      }

      if(nextCompleted && nextChapterId) {
        router.push(`/courses/${courseId}/chapters/${nextChapterId}`)
      }

      toast.success("Progresso atualizado");
      router.refresh();


    } catch {
      toast.error("Ocorreu um erro ao atualizar o progresso")
    }finally{
      setIsLoading(false);
    }
  }


  const Icon = isCompleted ? XCircle : CheckCircle;
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      type="button"
      variant={isCompleted ? "outline" : "success"}
      className="w-full md:w-auto"
    >
      {isCompleted ? "Marcar como não concluída" : "Marcar como concluída"}
      <Icon className="h-4 w-4 ml-2" />
    </Button>
  )
}
