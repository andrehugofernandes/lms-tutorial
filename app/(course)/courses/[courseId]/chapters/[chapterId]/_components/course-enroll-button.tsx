"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CourseEnrollButtonProps {
  price: number;
  courseId: string;
}

export const CourseEnrollButton = ({
  price,
  courseId,
}: CourseEnrollButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const onClick = async () => {
    try {
      setIsLoading(true);
      await axios.post(`/api/courses/${courseId}/enroll`);
      toast.success("Matrícula realizada! Bom estudo! 🎓");
      router.refresh();
    } catch (error: any) {
      if (error?.response?.status === 400) {
        toast("Você já está matriculado neste curso.");
        router.refresh();
      } else {
        toast.error("Algo deu errado. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      size="sm"
      className="w-full md:w-auto bg-sky-700 hover:bg-sky-800"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Matriculando...
        </>
      ) : price > 0 ? (
        `Matricular-se — Gratuito`
      ) : (
        "Iniciar Curso Gratuitamente"
      )}
    </Button>
  );
};