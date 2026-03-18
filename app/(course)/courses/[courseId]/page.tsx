import Link from "next/link";
import { BookOpen } from "lucide-react";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

const CourseIdPage = async (props: {
  params: Promise<{ courseId: string }>;
}) => {
  const params = await props.params;

  const course = await db.course.findUnique({
    where: {
      id: params.courseId,
    },
    include: {
      chapters: {
        where: {
          isPublished: true,
        },
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  if (!course) {
    return redirect("/");
  }

  const firstPublishedChapter = course.chapters[0];

  if (firstPublishedChapter) {
    return redirect(`/courses/${course.id}/chapters/${firstPublishedChapter.id}`);
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-xl border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <BookOpen className="h-8 w-8 text-slate-500" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          Este curso ainda não tem aulas disponíveis
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Os capítulos publicados vão aparecer aqui assim que o professor liberar
          o conteúdo.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/search">
            <Button variant="outline">Voltar ao catálogo</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseIdPage;
