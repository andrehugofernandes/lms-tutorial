import {
  File,
  LayoutDashboard,
  ListChecks,
} from "lucide-react";

import { redirect } from "next/navigation";
import { Banner } from "@/components/banner";

import { IconBadge } from "@/components/icon-badge";

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
      label: "Titulo do curso",
      complete: Boolean(course.title?.trim()),
    },
    {
      label: "Descricao do curso",
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
      label: "Pelo menos 1 capitulo publicado",
      complete: course.chapters.some((chapter: any) => chapter.isPublished),
    },
  ];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter((field) => field.complete).length;
  const missingFields = requiredFields
    .filter((field) => !field.complete)
    .map((field) => field.label);

  const compleitionText = `(${completedFields}/${totalFields})`;

  const isComplete = requiredFields.every((field) => field.complete);

  return (
    <>
      {!course.isPublished && (
        <Banner label="Este curso nao esta publicado. Ele nao sera visivel para os alunos." />
      )}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-y-2">
            <h1 className="text-2xl text-sky-800 font-bold">{course.title}</h1>
            <span className="inline-flex items-center gap-2 text-sm text-slate-700">
              Complete todos os campos {compleitionText}
              <CompletionInfo missingFields={missingFields} />
            </span>
          </div>
          <Actions
            disabled={!isComplete}
            courseId={params.courseId}
            isPublished={course.isPublished}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          <div>
            <div className="flex items-center gap-x-2">
              <IconBadge icon={LayoutDashboard} />
              <h2 className="text-xl text-sky-800 font-bold">
                Personalize seu curso
              </h2>
            </div>
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
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-x-2">
                <IconBadge icon={ListChecks} />
                <h2 className="text-xl text-sky-800 font-bold">
                  Capitulos do curso
                </h2>
              </div>
              <ChaptersForm initialData={course} courseId={course.id} />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-x-2">
                  <IconBadge icon={File} />
                  <h2 className="text-xl  text-sky-800 font-bold">
                    Recursos &amp; Anexos
                  </h2>
                </div>
                <AttachmentForm initialData={course} courseId={course.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CourseIdPage;
