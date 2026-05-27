import {
  CheckCircle2,
  Eye,
  File,
  LayoutDashboard,
  ListChecks,
} from "lucide-react";

import { redirect } from "next/navigation";
import Link from "next/link";
import { Banner } from "@/components/banner";

import { TitleForm } from "./_components/title-form";
import { DescriptionForm } from "./_components/description-form";
import { ImageForm } from "./_components/image-form";
import { CategoryForm } from "./_components/category-form";
import { AttachmentForm } from "./_components/attachment-form";
import { ChaptersForm } from "./_components/chapters-form";
import { Actions } from "./_components/actions";
import { CompletionInfo } from "./_components/completion-info";
import { serverApi } from "@/lib/server-api";

const CourseIdPage = async (props: {
  params: Promise<{
    courseId: string;
  }>;
}) => {
  const params = await props.params;

  let course: any;
  try {
    course = await serverApi(`/api/meta/teacher/courses/${params.courseId}`);
  } catch {
    return redirect("/");
  }

  const requiredFields = [
    {
      label: "Título do curso",
      complete: Boolean(course.title?.trim()),
    },
    {
      label: "Descrição do curso",
      complete: Boolean(course.description?.trim()),
    },
    {
      label: "Imagem de capa",
      complete: Boolean(course.imageUrl),
    },
    {
      label: "Categoria do curso",
      complete: Boolean(course.categoryId),
    },
    {
      label: "Pelo menos 1 capítulo publicado",
      complete: course.chapters.some((chapter: any) => chapter.isPublished),
    },
  ];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter((field) => field.complete).length;
  const missingFields = requiredFields
    .filter((field) => !field.complete)
    .map((field) => field.label);

  const isComplete = requiredFields.every((field) => field.complete);

  return (
    <>
      {!course.isPublished && (
        <Banner label="Este curso não está publicado. Ele não será visível para os alunos." />
      )}
      <div className="teacher-course-page min-h-screen bg-background px-6 py-8 text-foreground">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {course.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete todos os campos obrigatórios para publicar este curso.
              </p>
            </div>

            <div className="flex flex-col gap-5 lg:min-w-[520px] lg:flex-row lg:items-center lg:justify-between">
              <div className="lg:border-l lg:border-border lg:pl-6">
                <p className="text-xs font-medium text-muted-foreground">
                  Progresso de preenchimento
                </p>
                <div className="mt-3 inline-flex items-center gap-3 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  {completedFields}/{totalFields} campos completos
                  <CompletionInfo
                    missingFields={missingFields}
                    buttonLabel="Ver campos pendentes do curso"
                    completeTitle="Curso completo"
                    incompleteDescription="Preencha os itens abaixo para publicar este curso."
                  />
                </div>
              </div>
              <Actions
                disabled={!isComplete}
                courseId={params.courseId}
                isPublished={course.isPublished}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-5">
            <section>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                  <LayoutDashboard className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-bold text-foreground">
                  Personalize seu curso
                </h2>
              </div>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <TitleForm initialData={course} courseId={course.id} />
                <DescriptionForm initialData={course} courseId={course.id} />
                <ImageForm initialData={course} courseId={course.id} />
                <CategoryForm
                  initialData={course}
                  courseId={course.id}
                  options={course.categories.map((category: any) => ({
                    label: category.name,
                    value: category.id,
                  }))}
                />
              </div>
            </section>
          </div>

          <div className="space-y-8 xl:col-span-7">
            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                    <ListChecks className="h-5 w-5" />
                  </span>
                  <h2 className="text-xl font-bold text-foreground">
                    Capítulos do curso
                  </h2>
                </div>
              </div>
              <ChaptersForm initialData={course} courseId={course.id} />
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                    <File className="h-5 w-5" />
                  </span>
                  <h2 className="text-xl font-bold text-foreground">
                    Recursos &amp; Anexos
                  </h2>
                </div>
              </div>
              <AttachmentForm initialData={course} courseId={course.id} />
            </section>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-end gap-3 border-t border-border pt-6 sm:flex-row">
          <ButtonLikeLink
            href={`/courses/${params.courseId}`}
            label="Visualizar como aluno"
          />
        </div>
      </div>
    </>
  );
};

const ButtonLikeLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
  >
    <Eye className="mr-2 h-4 w-4" />
    {label}
  </Link>
);

export default CourseIdPage;
