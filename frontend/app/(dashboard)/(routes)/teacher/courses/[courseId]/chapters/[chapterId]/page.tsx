import { redirect } from "next/navigation";
import Link from "next/link";
import { Banner } from "@/components/banner";
import { ArrowLeft, LayoutDashboard, Video, HelpCircle } from "lucide-react";
import { ChapterActions } from "./_components/chapter.actions";

import { IconBadge } from "@/components/icon-badge";
import { ChapterTitleForm } from "./_components/chapter-title-form";
import { ChapterDescriptionForm } from "./_components/chapter-description-form";

import { ChapterVideoForm } from "./_components/chapter-video-form";

import { ChapterQuizForm } from "./_components/chapter-quiz-form";
import { CompletionInfo } from "../../_components/completion-info";
import { serverApi } from "@/lib/server-api";

const ChapterIdPage = async (props: {
  params: Promise<{ courseId: string; chapterId: string }>;
}) => {
  const params = await props.params;

  let chapter: any;
  try {
    chapter = await serverApi(
      `/api/meta/teacher/courses/${params.courseId}/chapters/${params.chapterId}`
    );
  } catch {
    return redirect("/");
  }

  const requiredFields = [
    {
      label: "Titulo do capitulo",
      complete: Boolean(chapter.title?.trim()),
    },
    {
      label: "Descricao do capitulo",
      complete: Boolean(chapter.description?.trim()),
    },
    {
      label: "Video do capitulo",
      complete: Boolean(chapter.videoUrl || chapter.externalUrl),
    },
    {
      label: "Quiz do capitulo",
      complete: Boolean(chapter.quiz?.questions?.length),
    },
  ];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter((field) => field.complete).length;
  const missingFields = requiredFields
    .filter((field) => !field.complete)
    .map((field) => field.label);

  const completionText = `(${completedFields}/${totalFields})`;

  const isComplete = requiredFields.every((field) => field.complete);

  return (
    <>
      {!chapter.isPublished && (
        <Banner
          variant="warning"
          label="Este capitulo nao esta publicado. Ele nao sera visivel no curso."
        />
      )}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div
            className="p-4 w-full rounded-md border bg-slate-100 md:p-6
           md:bg-slate-200 md:border-1"
          >
            <Link
              href={`/teacher/courses/${params.courseId}`}
              className="flex items-center text-sm hover:opacity-75 
              transition mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para configuracao do curso
            </Link>
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-y-2">
                <h1 className="text-2xl text-sky-800 font-bold">
                  Criacao do Capitulo
                </h1>
                <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                  Complete todos os campos {completionText}
                  <CompletionInfo
                    missingFields={missingFields}
                    buttonLabel="Ver campos pendentes do capitulo"
                    completeTitle="Capitulo completo"
                    incompleteDescription="Preencha os itens abaixo para publicar este capitulo."
                  />
                </span>
              </div>
              <ChapterActions
                disabled={!isComplete}
                chapterId={params.chapterId}
                courseId={params.courseId}
                isPublished={chapter.isPublished}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-x-2">
                <IconBadge icon={LayoutDashboard} />
                <h2 className="text-xl text-sky-800 font-bold">
                  Personalize seu capitulo
                </h2>
              </div>
              <ChapterTitleForm
                initialData={chapter}
                courseId={params.courseId}
                chapterId={params.chapterId}
              />
              <ChapterDescriptionForm
                initialData={chapter}
                courseId={params.courseId}
                chapterId={params.chapterId}
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-x-2">
                <IconBadge icon={Video} />
                <h2 className="text-xl text-sky-800 font-bold">Adicionar Video</h2>
              </div>
              <ChapterVideoForm
                initialData={chapter}
                chapterId={params.chapterId}
                courseId={params.courseId}
              />
            </div>
            <div>
              <div className="flex items-center gap-x-2">
                <IconBadge icon={HelpCircle} />
                <h2 className="text-xl text-sky-800 font-bold">Configurar Quiz</h2>
              </div>
              <ChapterQuizForm
                chapter={chapter}
                courseId={params.courseId}
                chapterId={params.chapterId}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChapterIdPage;
