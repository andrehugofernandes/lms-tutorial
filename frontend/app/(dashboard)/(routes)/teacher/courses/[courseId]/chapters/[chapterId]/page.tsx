import { redirect } from "next/navigation";
import Link from "next/link";
import { Banner } from "@/components/banner";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Eye,
  FileText,
  HelpCircle,
  LayoutDashboard,
  ListOrdered,
  Settings,
  Video,
} from "lucide-react";
import { ChapterActions } from "./_components/chapter.actions";

import { ChapterTitleForm } from "./_components/chapter-title-form";
import { ChapterDescriptionForm } from "./_components/chapter-description-form";
import { ChapterVideoForm } from "./_components/chapter-video-form";
import { ChapterQuizForm } from "./_components/chapter-quiz-form";
import { CompletionInfo } from "../../_components/completion-info";
import { serverApi } from "@/lib/server-api";

const formatDate = (value?: string | Date | null) => {
  if (!value) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

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
      label: "Título do capítulo",
      complete: Boolean(chapter.title?.trim()),
    },
    {
      label: "Descrição do capítulo",
      complete: Boolean(chapter.description?.trim()),
    },
    {
      label: "Vídeo do capítulo",
      complete: Boolean(chapter.videoUrl || chapter.externalUrl),
    },
    {
      label: "Quiz do capítulo",
      complete: Boolean(chapter.quiz?.questions?.length),
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
      {!chapter.isPublished && (
        <Banner
          variant="warning"
          label="Este capítulo não está publicado. Ele não será visível no curso."
        />
      )}
      <div className="teacher-chapter-page min-h-screen bg-[#000000] px-6 py-8 text-white">
        <div className="rounded-xl border border-[#242424] bg-[#0B0B0B] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-5">
              <Link
                href={`/teacher/courses/${params.courseId}`}
                className="inline-flex items-center text-sm font-semibold text-[#FF9F00] transition hover:text-[#FFB833]"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para configuração do curso
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Criação do capítulo
                </h1>
                <p className="mt-2 text-sm text-[#B5B5B5]">
                  Complete todos os campos obrigatórios para publicar este capítulo.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5 lg:min-w-[520px] lg:flex-row lg:items-center lg:justify-between">
              <div className="border-l border-[#242424] pl-6">
                <p className="text-xs font-medium text-[#B5B5B5]">
                  Progresso de preenchimento
                </p>
                <div className="mt-3 inline-flex items-center gap-3 rounded-full bg-[#00C27A]/10 px-4 py-2 text-sm font-bold text-[#00C27A]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#00C27A]/40 bg-[#00C27A]/10">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  {completedFields}/{totalFields} campos completos
                  <CompletionInfo
                    missingFields={missingFields}
                    buttonLabel="Ver campos pendentes do capítulo"
                    completeTitle="Capítulo completo"
                    incompleteDescription="Preencha os itens abaixo para publicar este capítulo."
                  />
                </div>
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

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-5">
            <section>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FF9F00]/40 bg-[#FF9F00]/10 text-[#FF9F00]">
                  <LayoutDashboard className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-bold text-white">
                  Personalize seu capítulo
                </h2>
              </div>
              <div className="rounded-xl border border-[#242424] bg-[#0B0B0B] p-5">
                <div className="mb-5">
                  <h3 className="text-base font-bold text-white">
                    Informações do capítulo
                  </h3>
                  <p className="mt-1 text-sm text-[#A1A1AA]">
                    Edite o título e a descrição que o aluno verá no curso.
                  </p>
                </div>
                <div className="space-y-4">
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
            </section>

            <section>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FF9F00]/40 bg-[#FF9F00]/10 text-[#FF9F00]">
                  <Settings className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-bold text-white">
                  Configurações do capítulo
                </h2>
              </div>
              <div className="rounded-xl border border-[#242424] bg-[#0B0B0B]">
                <div className="grid grid-cols-1 divide-y divide-[#242424] md:grid-cols-2 md:divide-x md:divide-y-0">
                  <div className="space-y-2 p-5">
                    <div className="flex items-center gap-3 text-[#A1A1AA]">
                      <Eye className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        Status de publicação
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {chapter.isPublished ? "Publicado" : "Rascunho"}
                    </p>
                    <p className="text-xs text-[#7A7A7A]">
                      {chapter.isPublished
                        ? "Este capítulo está visível para os alunos."
                        : "Publique quando todos os campos estiverem completos."}
                    </p>
                  </div>
                  <div className="space-y-2 p-5">
                    <div className="flex items-center gap-3 text-[#A1A1AA]">
                      <ListOrdered className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        Ordem no curso
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {String((chapter.position ?? 0) + 1).padStart(2, "0")}
                    </p>
                    <p className="text-xs text-[#7A7A7A]">
                      Posição deste capítulo na sequência.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 divide-y divide-[#242424] border-t border-[#242424] md:grid-cols-2 md:divide-x md:divide-y-0">
                  <div className="space-y-2 p-5">
                    <div className="flex items-center gap-3 text-[#A1A1AA]">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        Visibilidade
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {chapter.isFree ? "Público" : "Restrito"}
                    </p>
                    <p className="text-xs text-[#7A7A7A]">
                      {chapter.isFree
                        ? "Disponível para todos os alunos do curso."
                        : "Disponível conforme inscrição no curso."}
                    </p>
                  </div>
                  <div className="space-y-2 p-5">
                    <div className="flex items-center gap-3 text-[#A1A1AA]">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        Última atualização
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {formatDate(chapter.updatedAt)}
                    </p>
                    <p className="text-xs text-[#7A7A7A]">
                      Registro salvo pelo professor.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6 xl:col-span-7">
            <section>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FF9F00]/40 bg-[#FF9F00]/10 text-[#FF9F00]">
                  <Video className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-bold text-white">Vídeo do capítulo</h2>
              </div>
              <ChapterVideoForm
                initialData={chapter}
                chapterId={params.chapterId}
                courseId={params.courseId}
              />
            </section>
          </div>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FF9F00]/40 bg-[#FF9F00]/10 text-[#FF9F00]">
              <HelpCircle className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold text-white">Configurar quiz</h2>
          </div>
          <ChapterQuizForm
            chapter={chapter}
            courseId={params.courseId}
            chapterId={params.chapterId}
          />
        </section>
      </div>
    </>
  );
};

export default ChapterIdPage;
