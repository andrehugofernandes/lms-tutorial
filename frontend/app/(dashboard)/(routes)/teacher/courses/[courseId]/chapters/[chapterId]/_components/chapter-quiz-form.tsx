"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileQuestion,
  Gamepad2,
  GripVertical,
  Info,
  Loader2,
  PlusCircle,
  Save,
  Settings2,
  Shuffle,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/lib/types";
import { TranscriptStatus } from "@/lib/types";

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id?: string;
  prompt: string;
  isBonus: boolean;
  bonusPoints: number | null;
  pointWeight: number;
  options: Option[];
}

interface Quiz {
  id: string;
  isPublished: boolean;
  isRequired: boolean;
  shuffleQuestions: boolean;
  maxQuestions: number;
  timeLimit: number | null;
  passingScore: number;
  questions: Question[];
}

interface ChapterQuizFormProps {
  courseId: string;
  chapterId: string;
  chapter: Chapter & { quiz: Quiz | null };
}

interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

interface AiRewriteItemConfig {
  suggestion: string;
  useDefaultConfig: boolean;
  focusContentOverSuggestion: boolean;
}

interface AiRewriteDialogState {
  mode: "single" | "bulk";
  questionIndexes: number[];
  configs: Record<number, AiRewriteItemConfig>;
  applyDefaultToAll: boolean;
}

const WEIGHT_OPTIONS = [
  { label: "1x (fácil)", value: 1.0 },
  { label: "1.5x (média)", value: 1.5 },
  { label: "2x (difícil)", value: 2.0 },
];

const emptyQuestion = (): Question => ({
  prompt: "",
  isBonus: false,
  bonusPoints: null,
  pointWeight: 1.0,
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
});

const defaultAiRewriteConfig = (): AiRewriteItemConfig => ({
  suggestion: "",
  useDefaultConfig: true,
  focusContentOverSuggestion: true,
});

const TRANSCRIPT_POLL_INTERVAL_MS = 2500;
const TRANSCRIPT_MAX_POLL_ATTEMPTS = 72;

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const ToggleSwitch = ({
  checked,
  onCheckedChange,
  disabled,
}: ToggleSwitchProps) => {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-8 w-14 flex-none rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60",
        checked
          ? "border-[#FF9F00] bg-[#FF9F00]"
          : "border-[#333333] bg-[#242424]"
      )}
    >
      <span
        className={cn(
          "absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-0"
        )}
      />
    </button>
  );
};

export const ChapterQuizForm = ({
  courseId,
  chapterId,
  chapter,
}: ChapterQuizFormProps) => {
  const router = useRouter();
  const initialQuiz = chapter.quiz;
  const [quiz, setQuiz] = useState<Quiz | null>(initialQuiz);
  const [questions, setQuestions] = useState<Question[]>(
    initialQuiz?.questions ?? []
  );
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selectedQuestionIndexes, setSelectedQuestionIndexes] = useState<number[]>(
    []
  );
  const [aiRewriteDialog, setAiRewriteDialog] =
    useState<AiRewriteDialogState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState(
    chapter.transcriptStatus
  );
  const [settings, setSettings] = useState({
    isRequired: initialQuiz?.isRequired ?? false,
    maxQuestions: initialQuiz?.maxQuestions ?? 5,
    timeLimit: initialQuiz?.timeLimit ?? null,
    passingScore: initialQuiz?.passingScore ?? 70,
    isPublished: initialQuiz?.isPublished ?? false,
    shuffleQuestions: initialQuiz?.shuffleQuestions ?? false,
  });

  const minAllowedMaxQuestions = Math.max(1, questions.length);
  const maxQuestionsError =
    settings.maxQuestions < minAllowedMaxQuestions
      ? questions.length > 0
        ? `Apague perguntas antes de reduzir abaixo de ${questions.length}.`
        : "Informe pelo menos 1 questão."
      : settings.maxQuestions > 10
        ? "O limite máximo é 10 questões."
        : null;
  const passingScoreError =
    settings.passingScore < 0 || settings.passingScore > 100
      ? "A nota mínima deve ficar entre 0% e 100%."
      : null;
  const questionLimitReached = questions.length >= settings.maxQuestions;
  const isTranscriptProcessing =
    transcriptStatus === TranscriptStatus.PROCESSING;
  const hasSelectedQuestions = selectedQuestionIndexes.length > 0;
  const allQuestionsSelected =
    questions.length > 0 && selectedQuestionIndexes.length === questions.length;

  useEffect(() => {
    setSettings((current) =>
      current.maxQuestions < minAllowedMaxQuestions
        ? { ...current, maxQuestions: minAllowedMaxQuestions }
        : current
    );
  }, [minAllowedMaxQuestions]);

  const handleMaxQuestionsChange = (value: string) => {
    const nextValue = Number(value);
    if (Number.isNaN(nextValue)) return;

    if (nextValue < minAllowedMaxQuestions) {
      toast.error(
        questions.length > 0
          ? `Apague ${
              minAllowedMaxQuestions - nextValue
            } pergunta(s) antes de reduzir o limite.`
          : "Informe pelo menos 1 questão."
      );
      setSettings((current) => ({
        ...current,
        maxQuestions: Math.max(current.maxQuestions, minAllowedMaxQuestions),
      }));
      return;
    }

    setSettings((current) => ({
      ...current,
      maxQuestions: nextValue,
    }));
  };

  const ensureQuestionsPersistedForAi = async (questionIndexes: number[]) => {
    if (!quiz) return [];

    const updatedQuestions = [...questions];
    const persistedIndexes: number[] = [];
    const hasUnsavedQuestion = questionIndexes.some(
      (questionIndex) => !updatedQuestions[questionIndex]?.id
    );

    if (hasUnsavedQuestion) {
      if (maxQuestionsError || passingScoreError) {
        throw new Error(
          maxQuestionsError || passingScoreError || "Configuração inválida."
        );
      }

      const settingsResponse = await axios.patch(`/api/quiz/${quiz.id}`, settings);
      setQuiz((current) =>
        current
          ? {
              ...current,
              ...settingsResponse.data,
              questions: updatedQuestions,
            }
          : settingsResponse.data
      );
    }

    for (const questionIndex of questionIndexes) {
      const question = updatedQuestions[questionIndex];
      if (!question) continue;

      if (question.id) {
        persistedIndexes.push(questionIndex);
        continue;
      }

      const res = await axios.post(`/api/quiz/${quiz.id}/questions`, {
        prompt: question.prompt,
        isBonus: question.isBonus,
        bonusPoints: question.bonusPoints,
        pointWeight: question.pointWeight,
      });

      const hasOptionDraft = question.options.some(
        (option) => option.text.trim() || option.isCorrect
      );
      let persistedQuestion: Question = {
        ...question,
        id: res.data.id,
      };

      if (hasOptionDraft) {
        const withOptions = await axios.patch(
          `/api/quiz/${quiz.id}/questions/${res.data.id}`,
          {
            options: question.options,
          }
        );
        persistedQuestion = withOptions.data;
      }

      updatedQuestions[questionIndex] = persistedQuestion;
      persistedIndexes.push(questionIndex);
    }

    setQuestions(updatedQuestions);
    return persistedIndexes;
  };

  const openAiRewriteDialog = async (questionIndexes: number[], mode: "single" | "bulk") => {
    if (!quiz) return;

    const requestedIndexes = Array.from(
      new Set(questionIndexes.filter((index) => questions[index]))
    );

    if (!requestedIndexes.length) {
      toast.error("Selecione ao menos uma pergunta para gerar com IA.");
      return;
    }

    try {
      const hasUnsavedQuestion = requestedIndexes.some(
        (index) => !questions[index]?.id
      );

      setIsSaving(true);
      if (hasUnsavedQuestion) {
        toast.loading("Preparando rascunho da pergunta...", {
          id: "ai-question-draft",
        });
      }

      const validIndexes = await ensureQuestionsPersistedForAi(requestedIndexes);

      if (!validIndexes.length) {
        toast.error("Nenhuma pergunta válida foi selecionada.");
        return;
      }

      if (hasUnsavedQuestion) {
        toast.success("Rascunho pronto para a IA.", {
          id: "ai-question-draft",
        });
      }

      setAiRewriteDialog({
        mode,
        questionIndexes: validIndexes,
        configs: Object.fromEntries(
          validIndexes.map((index) => [index, defaultAiRewriteConfig()])
        ),
        applyDefaultToAll: false,
      });
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data || "Erro ao preparar a pergunta para a IA."
        : error instanceof Error
          ? error.message
          : "Erro ao preparar a pergunta para a IA.";

      toast.error(message, {
        id: "ai-question-draft",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateAiRewriteConfig = (
    questionIndex: number,
    values: Partial<AiRewriteItemConfig>,
    shouldDisableGlobalDefault = false
  ) => {
    setAiRewriteDialog((current) => {
      if (!current) return current;

      return {
        ...current,
        applyDefaultToAll: shouldDisableGlobalDefault
          ? false
          : current.applyDefaultToAll,
        configs: {
          ...current.configs,
          [questionIndex]: {
            ...(current.configs[questionIndex] ?? defaultAiRewriteConfig()),
            ...values,
          },
        },
      };
    });
  };

  const toggleQuestionSelection = (questionIndex: number) => {
    setSelectedQuestionIndexes((current) =>
      current.includes(questionIndex)
        ? current.filter((index) => index !== questionIndex)
        : [...current, questionIndex]
    );
  };

  const toggleSelectAllQuestions = () => {
    setSelectedQuestionIndexes(
      allQuestionsSelected ? [] : questions.map((_, index) => index)
    );
  };

  const createQuiz = async () => {
    try {
      setIsSaving(true);
      const res = await axios.post(
        `/api/courses/${courseId}/chapters/${chapterId}/quiz`,
        settings
      );
      setQuiz(res.data);
      setQuestions(res.data.questions ?? []);
      toast.success("Quiz criado.");
    } catch {
      toast.error("Erro ao criar quiz.");
    } finally {
      setIsSaving(false);
    }
  };

  const isTranscriptionResponse = (response: { status: number; data?: any }) =>
    response.status === 202 ||
    response.data?.status === "TRANSCRIPTION_STARTED" ||
    response.data?.status === "TRANSCRIPTION_PROCESSING";

  const waitForTranscriptCompletion = async () => {
    for (let attempt = 0; attempt < TRANSCRIPT_MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(TRANSCRIPT_POLL_INTERVAL_MS);

      const response = await axios.get(
        `/api/courses/${courseId}/chapters/${chapterId}/transcript`
      );
      const nextStatus = response.data?.transcriptStatus ?? null;
      setTranscriptStatus(nextStatus);

      if (
        response.data?.hasTranscript &&
        nextStatus === TranscriptStatus.COMPLETED
      ) {
        return;
      }

      if (nextStatus === TranscriptStatus.FAILED) {
        throw new Error(
          "Nao foi possivel transcrever o video. Verifique se o link possui legenda ou transcricao disponivel."
        );
      }
    }

    setTranscriptStatus(null);
    throw new Error(
      "A transcricao ainda esta em andamento. Tente novamente em alguns instantes."
    );
  };

  const requestQuizGeneration = () =>
    axios.post(
      `/api/courses/${courseId}/chapters/${chapterId}/quiz/generate`,
      settings
    );

  const generateWithAi = async () => {
    try {
      setIsSaving(true);
      toast.loading("IA gerando questões...", { id: "ai-gen" });
      let res = await requestQuizGeneration();

      if (isTranscriptionResponse(res)) {
        setTranscriptStatus(
          res.data?.transcriptStatus ?? TranscriptStatus.PROCESSING
        );
        toast.loading(
          "Transcrevendo o video. A IA vai gerar as perguntas automaticamente em seguida...",
          { id: "ai-gen" }
        );
        await waitForTranscriptCompletion();
        toast.loading("Transcricao concluida. IA gerando questoes...", {
          id: "ai-gen",
        });
        res = await requestQuizGeneration();
      }

      if (isTranscriptionResponse(res)) {
        setTranscriptStatus(null);
        throw new Error(
          "A transcricao ainda esta em andamento. A geracao sera liberada assim que terminar."
        );
      }
      if (res.data?.quiz) {
        setQuiz(res.data.quiz);
        setQuestions(res.data.quiz.questions ?? []);
      }
      setTranscriptStatus(TranscriptStatus.COMPLETED);
      toast.success("Quiz gerado com IA.", { id: "ai-gen" });
      router.refresh();
    } catch (error: any) {
      toast.error(error?.response?.data || error?.message || "Erro ao gerar com IA.", {
        id: "ai-gen",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!quiz) return;
    try {
      setIsSaving(true);
      await axios.patch(`/api/quiz/${quiz.id}`, settings);
      toast.success("Configurações salvas.");
      router.refresh();
    } catch {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    if (questionLimitReached) {
      toast.error(`Limite de ${settings.maxQuestions} questões atingido.`);
      return;
    }
    setQuestions((prev) => [...prev, emptyQuestion()]);
    setExpanded(questions.length);
  };

  const saveQuestion = async (index: number) => {
    if (!quiz) return;
    const question = questions[index];

    if (!question.prompt.trim()) {
      toast.error("Enunciado obrigatório.");
      return;
    }

    const hasCorrect = question.options.some(
      (option) => option.isCorrect && option.text.trim()
    );
    const hasAllFilled = question.options.every((option) => option.text.trim());

    if (!hasCorrect) {
      toast.error("Marque ao menos uma alternativa correta.");
      return;
    }
    if (!hasAllFilled) {
      toast.error("Preencha todas as alternativas.");
      return;
    }

    try {
      setIsSaving(true);
      if (question.id) {
        const res = await axios.patch(
          `/api/quiz/${quiz.id}/questions/${question.id}`,
          {
            prompt: question.prompt,
            isBonus: question.isBonus,
            bonusPoints: question.bonusPoints,
            pointWeight: question.pointWeight,
            options: question.options,
          }
        );
        setQuestions((prev) =>
          prev.map((item, itemIndex) => (itemIndex === index ? res.data : item))
        );
      } else {
        const res = await axios.post(`/api/quiz/${quiz.id}/questions`, {
          prompt: question.prompt,
          isBonus: question.isBonus,
          bonusPoints: question.bonusPoints,
          pointWeight: question.pointWeight,
        });
        const withOptions = await axios.patch(
          `/api/quiz/${quiz.id}/questions/${res.data.id}`,
          {
            options: question.options,
          }
        );
        setQuestions((prev) =>
          prev.map((item, itemIndex) =>
            itemIndex === index ? withOptions.data : item
          )
        );
      }
      toast.success("Questão salva.");
      setExpanded(null);
    } catch {
      toast.error("Erro ao salvar questão.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteQuestionsByIndexes = async (indexes: number[]) => {
    if (!quiz) return;

    const indexesToDelete = Array.from(
      new Set(indexes.filter((index) => questions[index]))
    ).sort((first, second) => first - second);

    if (!indexesToDelete.length) return;

    try {
      setIsSaving(true);
      await Promise.all(
        indexesToDelete.map((index) => {
          const question = questions[index];
          return question.id
            ? axios.delete(`/api/quiz/${quiz.id}/questions/${question.id}`)
            : Promise.resolve();
        })
      );

      const deleteSet = new Set(indexesToDelete);
      const nextQuestions = questions.filter(
        (_, itemIndex) => !deleteSet.has(itemIndex)
      );
      const nextMaxQuestions = Math.max(
        1,
        nextQuestions.length,
        Math.min(10, settings.maxQuestions - indexesToDelete.length)
      );
      const nextSettings = {
        ...settings,
        maxQuestions: nextMaxQuestions,
      };

      await axios.patch(`/api/quiz/${quiz.id}`, nextSettings);

      setQuestions(nextQuestions);
      setSettings(nextSettings);
      setSelectedQuestionIndexes([]);
      setExpanded(null);
      setQuiz((current) =>
        current
          ? {
              ...current,
              ...nextSettings,
              questions: nextQuestions,
            }
          : current
      );
      toast.success(
        indexesToDelete.length === 1
          ? "Questão removida."
          : `${indexesToDelete.length} questões removidas.`
      );
    } catch {
      toast.error("Erro ao remover questão.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteQuestion = async (index: number) => {
    await deleteQuestionsByIndexes([index]);
  };

  const deleteSelectedQuestions = async () => {
    await deleteQuestionsByIndexes(selectedQuestionIndexes);
  };

  const regenerateQuestionsWithAi = async () => {
    if (!quiz || !aiRewriteDialog) return;

    const items = aiRewriteDialog.questionIndexes
      .map((questionIndex) => {
        const question = questions[questionIndex];
        const config =
          aiRewriteDialog.configs[questionIndex] ?? defaultAiRewriteConfig();

        if (!question?.id) return null;

        return {
          questionId: question.id,
          suggestion: config.useDefaultConfig ? "" : config.suggestion,
          useDefaultConfig: config.useDefaultConfig,
          focusContentOverSuggestion: config.focusContentOverSuggestion,
        };
      })
      .filter(Boolean);

    if (!items.length) {
      toast.error("Nenhuma pergunta valida foi selecionada.");
      return;
    }

    try {
      setIsSaving(true);
      toast.loading("IA criando nova versao...", { id: "ai-rewrite" });
      let res = await axios.post(
        `/api/quiz/${quiz.id}/questions/regenerate`,
        { items }
      );

      if (isTranscriptionResponse(res)) {
        setTranscriptStatus(
          res.data?.transcriptStatus ?? TranscriptStatus.PROCESSING
        );
        toast.loading(
          "Transcrevendo o video. A IA vai atualizar a pergunta automaticamente em seguida...",
          { id: "ai-rewrite" }
        );
        await waitForTranscriptCompletion();
        toast.loading("Transcricao concluida. IA criando nova versao...", {
          id: "ai-rewrite",
        });
        res = await axios.post(`/api/quiz/${quiz.id}/questions/regenerate`, {
          items,
        });
      }

      if (isTranscriptionResponse(res)) {
        setTranscriptStatus(null);
        throw new Error(
          "A transcricao ainda esta em andamento. A geracao sera liberada assim que terminar."
        );
      }

      const updatedQuestions: Question[] = res.data?.questions ?? [];
      const updatedById = new Map(
        updatedQuestions
          .filter((question) => question.id)
          .map((question) => [question.id, question])
      );

      setQuestions((current) =>
        current.map((question) =>
          question.id && updatedById.has(question.id)
            ? updatedById.get(question.id)!
            : question
        )
      );
      setAiRewriteDialog(null);
      setSelectedQuestionIndexes([]);
      setTranscriptStatus(TranscriptStatus.COMPLETED);
      toast.success("Pergunta atualizada com IA.", { id: "ai-rewrite" });
      router.refresh();
    } catch (error: any) {
      toast.error(error?.response?.data || error?.message || "Erro ao gerar nova pergunta com IA.", {
        id: "ai-rewrite",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    field: keyof Option,
    value: string | boolean
  ) => {
    setQuestions((prev) =>
      prev.map((question, index) => {
        if (index !== questionIndex) return question;

        const options = question.options.map((option, currentOptionIndex) => {
          if (currentOptionIndex !== optionIndex) {
            return field === "isCorrect"
              ? { ...option, isCorrect: false }
              : option;
          }

          return { ...option, [field]: value };
        });

        return { ...question, options };
      })
    );
  };

  if (!quiz) {
    return (
      <div className="rounded-xl border border-[#242424] bg-[#0B0B0B] p-6 text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#FF9F00]/40 bg-[#FF9F00]/10 text-[#FF9F00]">
          <Gamepad2 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-white">Quiz do capítulo</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[#A1A1AA]">
          Este capítulo ainda não tem um quiz. Crie manualmente ou gere perguntas com IA a partir da transcrição do vídeo.
        </p>
        <section className="mt-8 text-left">
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[#FF9F00]" />
            <h4 className="text-lg font-bold">Configurações gerais</h4>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <div className="flex items-center justify-between gap-4">
                <h5 className="font-semibold">Obrigatório</h5>
                <ToggleSwitch
                  checked={settings.isRequired}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      isRequired: checked,
                    }))
                  }
                />
              </div>
              <p className="mt-5 text-sm leading-6 text-[#B5B5B5]">
                O aluno precisa realizar este quiz para concluir o capítulo.
              </p>
            </div>

            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <div className="flex items-center justify-between gap-4">
                <h5 className="font-semibold">Publicado</h5>
                <ToggleSwitch
                  checked={settings.isPublished}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      isPublished: checked,
                    }))
                  }
                />
              </div>
              <p className="mt-5 text-sm leading-6 text-[#B5B5B5]">
                Quando ativo, o quiz fica disponível para os alunos.
              </p>
            </div>

            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-[#A1A1AA]" />
                  <h5 className="font-semibold">Embaralhar perguntas</h5>
                </div>
                <ToggleSwitch
                  checked={settings.shuffleQuestions}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      shuffleQuestions: checked,
                    }))
                  }
                />
              </div>
              <p className="mt-5 text-sm leading-6 text-[#B5B5B5]">
                Professor vê a ordem original. Alunos recebem as perguntas em ordem aleatória.
              </p>
            </div>

            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <label className="text-sm font-semibold" htmlFor="initial-max-questions">
                Máximo de questões
              </label>
              <Input
                id="initial-max-questions"
                type="number"
                min={minAllowedMaxQuestions}
                max={10}
                value={settings.maxQuestions}
                onChange={(event) => handleMaxQuestionsChange(event.target.value)}
                className="mt-4 border-[#333333] bg-black text-white focus-visible:ring-[#FF9F00]"
              />
              <p className="mt-3 text-sm leading-6 text-[#B5B5B5]">
                Permitido: {minAllowedMaxQuestions} a 10 questões.
              </p>
              {maxQuestionsError && (
                <p className="mt-2 text-xs font-semibold text-[#FF4D4D]">
                  {maxQuestionsError}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <label className="text-sm font-semibold" htmlFor="initial-passing-score">
                Nota mínima para aprovação
              </label>
              <div className="relative mt-4">
                <Input
                  id="initial-passing-score"
                  type="number"
                  min={0}
                  max={100}
                  value={settings.passingScore}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      passingScore: Number(event.target.value),
                    }))
                  }
                  className="border-[#333333] bg-black pr-10 text-white focus-visible:ring-[#FF9F00]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B5B5B5]">
                  %
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#B5B5B5]">
                Percentual mínimo para o aluno ser aprovado.
              </p>
              {passingScoreError && (
                <p className="mt-2 text-xs font-semibold text-[#FF4D4D]">
                  {passingScoreError}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#A1A1AA]" />
                  <h5 className="font-semibold">Tempo por questão</h5>
                </div>
                <ToggleSwitch
                  checked={settings.timeLimit !== null}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      timeLimit: checked ? 30 : null,
                    }))
                  }
                />
              </div>
              {settings.timeLimit !== null ? (
                <Input
                  type="number"
                  min={10}
                  max={120}
                  value={settings.timeLimit}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      timeLimit: Number(event.target.value),
                    }))
                  }
                  className="mt-4 border-[#333333] bg-black text-white focus-visible:ring-[#FF9F00]"
                />
              ) : (
                <p className="mt-5 text-sm font-semibold text-[#B5B5B5]">
                  Desativado
                </p>
              )}
              <p className="mt-3 text-sm leading-6 text-[#B5B5B5]">
                {settings.timeLimit !== null
                  ? "Tempo limite em segundos para cada questão."
                  : "Os alunos não terão limite de tempo por questão."}
              </p>
            </div>
          </div>
        </section>
        <div className="mt-6 grid gap-4 border-t border-[#242424] pt-6 md:grid-cols-2">
          <Button
            onClick={createQuiz}
            disabled={
              isSaving || Boolean(maxQuestionsError) || Boolean(passingScoreError)
            }
            variant="outline"
            className="border-[#333333] bg-[#111111] text-white hover:border-[#FF9F00] hover:bg-[#111111] hover:text-white"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar manualmente
          </Button>
          <Button
            onClick={generateWithAi}
            disabled={
              isSaving ||
              isTranscriptProcessing ||
              Boolean(maxQuestionsError) ||
              Boolean(passingScoreError)
            }
            className="border border-[#0066B3] bg-[#111111] text-white hover:bg-[#0066B3]/20"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4 text-sky-300" />
            )}
            Gerar {settings.maxQuestions} questões com IA
          </Button>
        </div>
        {isTranscriptProcessing && (
          <p className="mt-4 inline-flex items-center justify-center text-xs text-[#FF9F00]">
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Aguarde a transcrição do vídeo para usar a IA.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#242424] bg-[#0B0B0B] text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-5 border-b border-[#242424] p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#333333] bg-[#181818] text-[#FF9F00]">
            <Gamepad2 className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-bold">Quiz do capítulo</h3>
              <Badge
                variant="outline"
                className={cn(
                  "border px-3 py-1",
                  settings.isPublished
                    ? "border-[#00C27A]/40 bg-[#00C27A]/10 text-[#00C27A]"
                    : "border-[#7A7A7A]/40 bg-[#242424] text-[#B5B5B5]"
                )}
              >
                {settings.isPublished ? "Publicado" : "Rascunho"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              Configure as regras e perguntas deste capítulo.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Badge
            variant="outline"
            className="border-[#333333] bg-[#111111] px-4 py-2 text-[#B5B5B5]"
          >
            <FileQuestion className="mr-2 h-4 w-4" />
            {questions.length}/{settings.maxQuestions} questões
          </Badge>
          <Badge
            variant="outline"
            className="border-[#333333] bg-[#111111] px-4 py-2 text-[#B5B5B5]"
          >
            <Star className="mr-2 h-4 w-4 text-[#FF9F00]" />
            Nota mínima {settings.passingScore}%
          </Badge>
          <Button
            onClick={saveSettings}
            disabled={
              isSaving || Boolean(maxQuestionsError) || Boolean(passingScoreError)
            }
            className="bg-[#FF9F00] px-6 text-black hover:bg-[#E68F00]"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar configurações
          </Button>
        </div>
      </div>

      <div className="space-y-8 p-6">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[#FF9F00]" />
            <h4 className="text-lg font-bold">Configurações gerais</h4>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <div className="flex items-center justify-between gap-4">
                <h5 className="font-semibold">Obrigatório</h5>
                <ToggleSwitch
                  checked={settings.isRequired}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      isRequired: checked,
                    }))
                  }
                />
              </div>
              <p className="mt-5 text-sm leading-6 text-[#B5B5B5]">
                O aluno precisa realizar este quiz para concluir o capítulo.
              </p>
            </div>

            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <div className="flex items-center justify-between gap-4">
                <h5 className="font-semibold">Publicado</h5>
                <ToggleSwitch
                  checked={settings.isPublished}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      isPublished: checked,
                    }))
                  }
                />
              </div>
              <p className="mt-5 text-sm leading-6 text-[#B5B5B5]">
                Quando ativo, o quiz fica disponível para os alunos.
              </p>
            </div>

            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-[#A1A1AA]" />
                  <h5 className="font-semibold">Embaralhar perguntas</h5>
                </div>
                <ToggleSwitch
                  checked={settings.shuffleQuestions}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      shuffleQuestions: checked,
                    }))
                  }
                />
              </div>
              <p className="mt-5 text-sm leading-6 text-[#B5B5B5]">
                Professor vê a ordem original. Alunos recebem as perguntas em ordem aleatória.
              </p>
            </div>

            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <label className="text-sm font-semibold" htmlFor="max-questions">
                Máximo de questões
              </label>
              <Input
                id="max-questions"
                type="number"
                min={minAllowedMaxQuestions}
                max={10}
                value={settings.maxQuestions}
                onChange={(event) => handleMaxQuestionsChange(event.target.value)}
                className="mt-4 border-[#333333] bg-black text-white focus-visible:ring-[#FF9F00]"
              />
              <p className="mt-3 text-sm leading-6 text-[#B5B5B5]">
                Permitido: {minAllowedMaxQuestions} a 10 questões.
              </p>
              {maxQuestionsError && (
                <p className="mt-2 text-xs font-semibold text-[#FF4D4D]">
                  {maxQuestionsError}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <label className="text-sm font-semibold" htmlFor="passing-score">
                Nota mínima para aprovação
              </label>
              <div className="relative mt-4">
                <Input
                  id="passing-score"
                  type="number"
                  min={0}
                  max={100}
                  value={settings.passingScore}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      passingScore: Number(event.target.value),
                    }))
                  }
                  className="border-[#333333] bg-black pr-10 text-white focus-visible:ring-[#FF9F00]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B5B5B5]">
                  %
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#B5B5B5]">
                Percentual mínimo para o aluno ser aprovado.
              </p>
              {passingScoreError && (
                <p className="mt-2 text-xs font-semibold text-[#FF4D4D]">
                  {passingScoreError}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-[#242424] bg-[#111111] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#A1A1AA]" />
                  <h5 className="font-semibold">Tempo por questão</h5>
                </div>
                <ToggleSwitch
                  checked={settings.timeLimit !== null}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      timeLimit: checked ? 30 : null,
                    }))
                  }
                />
              </div>
              {settings.timeLimit !== null ? (
                <Input
                  type="number"
                  min={10}
                  max={120}
                  value={settings.timeLimit}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      timeLimit: Number(event.target.value),
                    }))
                  }
                  className="mt-4 border-[#333333] bg-black text-white focus-visible:ring-[#FF9F00]"
                />
              ) : (
                <p className="mt-5 text-sm font-semibold text-[#B5B5B5]">
                  Desativado
                </p>
              )}
              <p className="mt-3 text-sm leading-6 text-[#B5B5B5]">
                {settings.timeLimit !== null
                  ? "Tempo limite em segundos para cada questão."
                  : "Os alunos não terão limite de tempo por questão."}
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-lg font-bold">Questões do quiz</h4>
              <p className="mt-1 text-sm text-[#A1A1AA]">
                Revise enunciados, alternativas e peso de cada pergunta.
              </p>
            </div>
            {hasSelectedQuestions && (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#B5B5B5]">
                  <Checkbox
                    checked={allQuestionsSelected}
                    onCheckedChange={toggleSelectAllQuestions}
                    className="border-[#FF9F00] data-[state=checked]:bg-[#FF9F00] data-[state=checked]:text-black"
                  />
                  Marcar todas
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={deleteSelectedQuestions}
                  disabled={isSaving}
                  className="border-[#FF4D4D]/40 bg-[#FF4D4D]/10 text-[#FF4D4D] hover:border-[#FF4D4D] hover:bg-[#FF4D4D] hover:text-white"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Apagar selecionadas ({selectedQuestionIndexes.length})
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {questions.map((question, questionIndex) => {
              const isExpanded = expanded === questionIndex;
              const isAdvanced =
                question.isBonus || Number(question.pointWeight) >= 2;

              return (
                <div
                  key={question.id ?? questionIndex}
                  className="group overflow-hidden rounded-lg border border-[#333333] bg-black"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-[#111111]"
                    onClick={() => setExpanded(isExpanded ? null : questionIndex)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpanded(isExpanded ? null : questionIndex);
                      }
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center transition-opacity",
                          hasSelectedQuestions
                            ? "opacity-100"
                            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                        )}
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedQuestionIndexes.includes(questionIndex)}
                          onCheckedChange={() =>
                            toggleQuestionSelection(questionIndex)
                          }
                          className="border-[#FF9F00] data-[state=checked]:bg-[#FF9F00] data-[state=checked]:text-black"
                        />
                      </span>
                      <GripVertical className="h-5 w-5 shrink-0 text-[#7A7A7A]" />
                      <span className="w-9 shrink-0 text-base font-bold text-white">
                        #{questionIndex + 1}
                      </span>
                      <span className="truncate text-sm text-[#D4D4D8]">
                        {question.prompt || "Nova questão sem enunciado"}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {isAdvanced && (
                        <Badge
                          variant="outline"
                          className="hidden border-[#0066B3]/50 bg-[#0066B3]/10 text-sky-300 sm:inline-flex"
                        >
                          <Sparkles className="mr-1 h-3 w-3" />
                          Questão desafio
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "hidden border px-3 py-1 sm:inline-flex",
                          settings.isPublished
                            ? "border-[#00C27A]/40 bg-[#00C27A]/10 text-[#00C27A]"
                            : "border-[#7A7A7A]/40 bg-[#242424] text-[#B5B5B5]"
                        )}
                      >
                        {settings.isPublished ? "Publicada" : "Rascunho"}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-[#B5B5B5]" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-[#B5B5B5]" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-5 border-t border-[#242424] bg-[#0B0B0B] p-5">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">
                          Enunciado
                        </label>
                        <Input
                          value={question.prompt}
                          onChange={(event) =>
                            setQuestions((prev) =>
                              prev.map((item, index) =>
                                index === questionIndex
                                  ? { ...item, prompt: event.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder="Digite a pergunta"
                          className="border-[#333333] bg-black text-white placeholder:text-[#7A7A7A] focus-visible:ring-[#FF9F00]"
                        />
                      </div>

                      <div>
                        <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">
                          Alternativas
                        </label>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={option.id ?? optionIndex}
                              className={cn(
                                "flex items-center gap-3 rounded-lg border p-3",
                                option.isCorrect
                                  ? "border-[#00C27A]/50 bg-[#00C27A]/10"
                                  : "border-[#242424] bg-[#111111]"
                              )}
                            >
                              <input
                                type="radio"
                                name={`correct-${questionIndex}`}
                                className="h-4 w-4 accent-[#00C27A]"
                                checked={option.isCorrect}
                                onChange={() =>
                                  updateOption(
                                    questionIndex,
                                    optionIndex,
                                    "isCorrect",
                                    true
                                  )
                                }
                              />
                              <Input
                                className="h-9 flex-1 border-[#333333] bg-black text-sm text-white placeholder:text-[#7A7A7A] focus-visible:ring-[#FF9F00]"
                                value={option.text}
                                onChange={(event) =>
                                  updateOption(
                                    questionIndex,
                                    optionIndex,
                                    "text",
                                    event.target.value
                                  )
                                }
                                placeholder={`Alternativa ${String.fromCharCode(
                                  65 + optionIndex
                                )}`}
                              />
                              {option.isCorrect && (
                                <CheckCircle2 className="h-4 w-4 text-[#00C27A]" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-semibold text-[#B5B5B5]">
                            Peso da questão
                          </span>
                          <select
                            className="h-10 rounded-md border border-[#333333] bg-black px-3 text-sm text-white outline-none focus:border-[#FF9F00]"
                            value={question.pointWeight}
                            onChange={(event) =>
                              setQuestions((prev) =>
                                prev.map((item, index) =>
                                  index === questionIndex
                                    ? {
                                        ...item,
                                        pointWeight: Number(event.target.value),
                                      }
                                    : item
                                )
                              )
                            }
                          >
                            {WEIGHT_OPTIONS.map((weight) => (
                              <option key={weight.value} value={weight.value}>
                                {weight.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="rounded-lg border border-[#242424] bg-[#111111] p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                Questão bônus
                              </p>
                              <p className="mt-1 text-xs text-[#A1A1AA]">
                                Use apenas quando a pergunta tiver pontuação extra.
                              </p>
                            </div>
                            <ToggleSwitch
                              checked={question.isBonus}
                              onCheckedChange={(checked) =>
                                setQuestions((prev) =>
                                  prev.map((item, index) =>
                                    index === questionIndex
                                      ? { ...item, isBonus: checked }
                                      : item
                                  )
                                )
                              }
                            />
                          </div>
                          {question.isBonus && (
                            <Input
                              type="number"
                              className="mt-3 border-[#333333] bg-black text-white focus-visible:ring-[#FF9F00]"
                              min={0}
                              max={200}
                              value={question.bonusPoints ?? ""}
                              onChange={(event) =>
                                setQuestions((prev) =>
                                  prev.map((item, index) =>
                                    index === questionIndex
                                      ? {
                                          ...item,
                                          bonusPoints: Number(event.target.value),
                                        }
                                      : item
                                  )
                                )
                              }
                              placeholder="Pontos extras"
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-1">
                        <Button
                          className="bg-[#FF9F00] text-black hover:bg-[#E68F00]"
                          onClick={() => saveQuestion(questionIndex)}
                          disabled={isSaving}
                        >
                          Salvar questão
                        </Button>
                        <Button
                          variant="outline"
                          className="border-[#0066B3] bg-[#111111] text-white hover:bg-[#0066B3]/20 hover:text-white"
                          onClick={() =>
                            openAiRewriteDialog([questionIndex], "single")
                          }
                          disabled={isSaving || isTranscriptProcessing}
                        >
                          <Sparkles className="mr-2 h-4 w-4 text-sky-300" />
                          Nova com IA
                        </Button>
                        <Button
                          variant="outline"
                          className="border-[#FF4D4D]/40 bg-[#FF4D4D]/10 text-[#FF4D4D] hover:border-[#FF4D4D] hover:bg-[#FF4D4D] hover:text-white"
                          onClick={() => deleteQuestion(questionIndex)}
                          disabled={isSaving}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {questions.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#333333] bg-black p-6 text-center text-sm text-[#A1A1AA]">
                Nenhuma pergunta cadastrada.
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-3 md:flex-row">
          <Button
            variant="outline"
            onClick={addQuestion}
            disabled={
              questionLimitReached ||
              isSaving ||
              Boolean(maxQuestionsError) ||
              Boolean(passingScoreError)
            }
            className={cn(
              "flex-1 border-dashed bg-[#111111] text-white hover:border-[#FF9F00] hover:bg-[#111111] hover:text-white",
              questionLimitReached &&
                "border-[#333333] bg-[#242424] text-[#7A7A7A] hover:border-[#333333] hover:text-[#7A7A7A]"
            )}
            title={
              questionLimitReached
                ? "Você atingiu o limite definido em Máximo de questões."
                : undefined
            }
          >
            {questionLimitReached ? (
              <>
                <Info className="mr-2 h-4 w-4" />
                {`Limite de questões atingido — ${questions.length}/${settings.maxQuestions}`}
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                {`Adicionar questão manual (${questions.length}/${settings.maxQuestions})`}
              </>
            )}
          </Button>
          <Button
            onClick={() =>
              hasSelectedQuestions
                ? openAiRewriteDialog(selectedQuestionIndexes, "bulk")
                : generateWithAi()
            }
            disabled={isSaving || isTranscriptProcessing}
            className="flex-1 border border-[#0066B3] bg-[#111111] text-white hover:bg-[#0066B3]/20"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4 text-sky-300" />
            )}
            {hasSelectedQuestions
              ? `(${selectedQuestionIndexes.length}/${questions.length}) Gerar com IA`
              : "Gerar com IA"}
          </Button>
        </div>

        {isTranscriptProcessing && (
          <p className="flex items-center justify-center text-xs text-[#FF9F00]">
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Aguarde a transcrição do vídeo para usar a IA.
          </p>
        )}
      </div>

      <Dialog
        open={Boolean(aiRewriteDialog)}
        onOpenChange={(open) => {
          if (!open) setAiRewriteDialog(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>
              {aiRewriteDialog?.mode === "bulk"
                ? "Gerar novas perguntas com IA"
                : "Gerar nova versao da pergunta"}
            </DialogTitle>
            <DialogDescription>
              Adicione orientacoes para a IA. Se a sugestao fugir do video, a IA pode priorizar o conteudo transcrito.
            </DialogDescription>
          </DialogHeader>

          {aiRewriteDialog?.mode === "bulk" && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm">
              <Checkbox
                checked={aiRewriteDialog.applyDefaultToAll}
                onCheckedChange={(checked) => {
                  const shouldApply = checked === true;
                  setAiRewriteDialog((current) => {
                    if (!current) return current;

                    return {
                      ...current,
                      applyDefaultToAll: shouldApply,
                      configs: shouldApply
                        ? Object.fromEntries(
                            current.questionIndexes.map((index) => [
                              index,
                              defaultAiRewriteConfig(),
                            ])
                          )
                        : current.configs,
                    };
                  });
                }}
                className="mt-0.5 border-[#FF9F00] data-[state=checked]:bg-[#FF9F00] data-[state=checked]:text-black"
              />
              <span>
                <span className="block font-semibold">
                  Criar todas com a configuracao atual
                </span>
                <span className="mt-1 block text-muted-foreground">
                  Ignora sugestoes individuais e usa a dificuldade, peso e bonus de cada pergunta original.
                </span>
              </span>
            </label>
          )}

          <div className="space-y-4">
            {aiRewriteDialog?.questionIndexes.map((questionIndex) => {
              const question = questions[questionIndex];
              const config =
                aiRewriteDialog.configs[questionIndex] ??
                defaultAiRewriteConfig();

              return (
                <div
                  key={questionIndex}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Pergunta #{questionIndex + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {question?.prompt}
                    </p>
                  </div>

                  <label className="mb-3 flex cursor-pointer items-start gap-3 text-sm">
                    <Checkbox
                      checked={config.useDefaultConfig}
                      onCheckedChange={(checked) =>
                        updateAiRewriteConfig(
                          questionIndex,
                          {
                            useDefaultConfig: checked === true,
                            suggestion:
                              checked === true ? "" : config.suggestion,
                          },
                          true
                        )
                      }
                      className="mt-0.5 border-[#FF9F00] data-[state=checked]:bg-[#FF9F00] data-[state=checked]:text-black"
                    />
                    <span>
                      <span className="block font-semibold">
                        Criar nova pergunta com configuracao atual
                      </span>
                      <span className="mt-1 block text-muted-foreground">
                        Mantem dificuldade, peso e bonus da pergunta original, sem usar sugestao do professor.
                      </span>
                    </span>
                  </label>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">
                      Sugestoes para esta pergunta
                    </label>
                    <Textarea
                      value={config.suggestion}
                      onFocus={() =>
                        updateAiRewriteConfig(
                          questionIndex,
                          { useDefaultConfig: false },
                          true
                        )
                      }
                      onChange={(event) =>
                        updateAiRewriteConfig(
                          questionIndex,
                          {
                            suggestion: event.target.value,
                            useDefaultConfig: false,
                          },
                          true
                        )
                      }
                      placeholder="Ex.: quero uma pergunta mais pratica, usando exemplo do dia a dia."
                      className={cn(
                        "min-h-[100px] resize-none",
                        config.useDefaultConfig && "opacity-70"
                      )}
                    />
                  </div>

                  <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
                    <Checkbox
                      checked={config.focusContentOverSuggestion}
                      onCheckedChange={(checked) =>
                        updateAiRewriteConfig(
                          questionIndex,
                          { focusContentOverSuggestion: checked === true },
                          true
                        )
                      }
                      className="mt-0.5 border-[#0066B3] data-[state=checked]:bg-[#0066B3]"
                    />
                    <span>
                      <span className="block font-semibold">
                        Priorizar o conteudo do video
                      </span>
                      <span className="mt-1 block text-muted-foreground">
                        Se a sugestao estiver fora do tema, a IA deve focar no video e usar a sugestao com menos peso.
                      </span>
                    </span>
                  </label>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAiRewriteDialog(null)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={regenerateQuestionsWithAi}
              disabled={isSaving}
              className="bg-[#FF9F00] text-black hover:bg-[#E68F00]"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Gerar nova versao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
