"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  HelpCircle,
  Lock,
  RotateCcw,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  prompt: string;
  isBonus: boolean;
  bonusPoints: number | null;
  pointWeight: number;
  options: Option[];
}

interface QuizResult {
  id?: string;
  score: number;
  xpEarned: number;
  passed: boolean;
  completedAt?: string | null;
}

interface QuizPlayerProps {
  quiz: {
    id: string;
    timeLimit: number | null;
    passingScore: number;
    isRequired?: boolean;
    maxQuestions?: number;
    questions: Question[];
  };
  isLocked?: boolean;
  initialResult?: QuizResult | null;
  nextChapterHref?: string | null;
  onComplete?: (passed: boolean, xpEarned: number, result: QuizResult) => void;
}

const letters = ["A", "B", "C", "D", "E", "F"];

const StatBadge = ({
  icon: Icon,
  label,
  muted = false,
}: {
  icon: LucideIcon;
  label: string;
  muted?: boolean;
}) => (
  <div
    className={cn(
      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
      muted
        ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500"
        : "border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-200"
    )}
  >
    <Icon className={cn("h-4 w-4", muted ? "text-zinc-500" : "text-[#FF9F00]")} />
    {label}
  </div>
);

const RewardItem = ({
  icon: Icon,
  label,
  muted = false,
}: {
  icon: LucideIcon;
  label: string;
  muted?: boolean;
}) => (
  <div
    className={cn(
      "flex min-h-16 flex-1 items-center justify-center gap-3 border border-slate-200 bg-white px-4 py-3 text-sm font-bold md:text-base dark:border-white/10 dark:bg-white/[0.03]",
      muted ? "text-slate-400 dark:text-zinc-600" : "text-slate-800 dark:text-zinc-100"
    )}
  >
    <Icon className={cn("h-5 w-5", muted ? "text-zinc-600" : "text-[#FF9F00]")} />
    {label}
  </div>
);

export const QuizPlayer = ({
  quiz,
  isLocked = false,
  initialResult = null,
  nextChapterHref,
  onComplete,
}: QuizPlayerProps) => {
  const questions = quiz.questions ?? [];
  const [step, setStep] = useState<"intro" | "playing" | "feedback" | "result">(
    initialResult && !isLocked ? "result" : "intro"
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<
    { questionId: string; optionId: string; timeRemaining?: number }[]
  >([]);
  const [result, setResult] = useState<QuizResult | null>(initialResult);
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentIdx];
  const hasBonusQuestion = questions.some((question) => question.isBonus);
  const estimatedMinutes = quiz.timeLimit
    ? Math.max(1, Math.ceil((quiz.timeLimit * Math.max(questions.length, 1)) / 60))
    : Math.max(3, questions.length * 3);
  const progress = questions.length
    ? ((currentIdx + (step === "feedback" ? 1 : 0)) / questions.length) * 100
    : 0;

  useEffect(() => {
    if (initialResult && !isLocked) {
      setResult(initialResult);
      setStep("result");
    }
  }, [initialResult, isLocked]);

  useEffect(() => {
    if (step !== "playing" || !quiz.timeLimit) return;

    setTimeLeft(quiz.timeLimit);
    timerRef.current = setInterval(() => {
      setTimeLeft((current) => {
        if (current === null || current <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSelect(null);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, step, quiz.timeLimit]);

  const resetAttempt = (startPlaying = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentIdx(0);
    setSelectedOption(null);
    setAnswers([]);
    setResult(null);
    setTimeLeft(quiz.timeLimit ?? null);
    setStep(startPlaying ? "playing" : "intro");
  };

  const handleSelect = (optionId: string | null) => {
    if (step !== "playing" || selectedOption || !currentQuestion) return;

    if (timerRef.current) clearInterval(timerRef.current);
    const selected = optionId ?? "__none__";
    setSelectedOption(selected);
    setAnswers((current) => [
      ...current.filter((answer) => answer.questionId !== currentQuestion.id),
      {
        questionId: currentQuestion.id,
        optionId: selected,
        timeRemaining: timeLeft ?? undefined,
      },
    ]);
    setStep("feedback");
  };

  const submitQuiz = async () => {
    setIsSubmitting(true);
    try {
      const response = await axios.post(`/api/quiz/${quiz.id}/submit`, { answers });
      const payload = (response.data?.result ?? response.data) as QuizResult;
      const normalizedResult = {
        score: payload.score,
        xpEarned: payload.xpEarned,
        passed: payload.passed,
        id: payload.id,
        completedAt: payload.completedAt,
      };

      setResult(normalizedResult);
      setStep("result");
      onComplete?.(
        normalizedResult.passed,
        response.data?.xpEarned ?? normalizedResult.xpEarned,
        normalizedResult
      );
    } catch {
      toast.error("Erro ao enviar o quiz. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    if (currentIdx + 1 >= questions.length) {
      submitQuiz();
      return;
    }

    setCurrentIdx((current) => current + 1);
    setStep("playing");
  };

  if (!questions.length) {
    return (
      <section className="rounded-[28px] border border-[#FF9F00]/30 bg-white p-8 text-center text-slate-950 shadow-sm dark:bg-[radial-gradient(circle_at_top,rgba(255,159,0,0.12),transparent_34%),#0B0B0B] dark:text-white">
        <Target className="mx-auto h-12 w-12 text-[#FF9F00]" />
        <h3 className="mt-5 text-2xl font-bold">Quiz indisponível</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-zinc-400">
          Este capítulo ainda não possui perguntas publicadas pelo professor.
        </p>
      </section>
    );
  }

  if (isLocked) {
    return (
      <section className="rounded-[28px] border border-[#FF9F00]/30 bg-white p-6 text-slate-950 shadow-sm dark:bg-[radial-gradient(circle_at_top,rgba(255,159,0,0.14),transparent_32%),linear-gradient(135deg,rgba(255,159,0,0.08),rgba(0,0,0,0.96)_48%)] dark:text-white md:p-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="relative mb-7 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#FF9F00]/20 blur-2xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#FF9F00]/50 bg-[#FF9F00]/10">
              <Lock className="h-12 w-12 text-[#FF9F00]" />
            </div>
          </div>

          <h3 className="text-3xl font-extrabold md:text-4xl">Quiz bloqueado</h3>
          <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-zinc-300 md:text-lg">
            Finalize o capítulo atual para liberar este desafio.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <StatBadge icon={HelpCircle} label={`${questions.length} perguntas`} />
            <StatBadge icon={Lock} label="Liberado após conclusão" />
            {quiz.isRequired && <StatBadge icon={ShieldCheck} label="Obrigatório" />}
            <StatBadge icon={Star} label={`Nota mínima ${quiz.passingScore}%`} />
          </div>

          <p className="mt-7 flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300 md:text-base">
            <Lock className="h-5 w-5 text-[#FF9F00]" />
            Este quiz será liberado automaticamente quando você concluir o capítulo.
          </p>

          <div className="mt-8 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 md:flex-row">
            <RewardItem icon={Zap} label="XP por acerto" muted />
            <RewardItem icon={Flame} label="Combo bônus" muted />
            <RewardItem icon={Star} label="Questão bônus" muted={!hasBonusQuestion} />
          </div>

          <Button
            disabled
            className="mt-8 h-14 w-full max-w-3xl rounded-2xl bg-slate-100 text-base font-bold text-slate-400 hover:bg-slate-100 dark:bg-white/10 dark:text-zinc-500 dark:hover:bg-white/10"
          >
            <Lock className="mr-2 h-5 w-5" />
            Bloqueado até concluir o capítulo
          </Button>
        </div>
      </section>
    );
  }

  if (step === "intro") {
    return (
      <section className="rounded-[28px] border border-[#FF9F00]/30 bg-white p-6 text-slate-950 shadow-sm dark:bg-[radial-gradient(circle_at_top,rgba(255,159,0,0.16),transparent_34%),linear-gradient(135deg,rgba(255,159,0,0.08),rgba(0,0,0,0.96)_50%)] dark:text-white md:p-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="relative mb-7 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#FF9F00]/25 blur-2xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#FF9F00] text-black shadow-[0_0_40px_rgba(255,159,0,0.35)]">
              <Target className="h-12 w-12" />
            </div>
          </div>

          <p className="flex items-center gap-2 text-base text-slate-600 dark:text-zinc-300">
            <Brain className="h-5 w-5 text-[#FF9F00]" />
            Quiz do capítulo
          </p>
          <h3 className="mt-3 text-3xl font-extrabold md:text-4xl">Teste seus conhecimentos</h3>
          <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-zinc-300 md:text-lg">
            Você precisa atingir a nota mínima para liberar a próxima aula da trilha.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <StatBadge icon={HelpCircle} label={`${questions.length} perguntas`} />
            <StatBadge icon={Star} label={`Nota mínima ${quiz.passingScore}%`} />
            {quiz.isRequired && <StatBadge icon={ShieldCheck} label="Obrigatório" />}
            <StatBadge icon={Clock} label={`${estimatedMinutes} min estimados`} />
          </div>

          <p className="mt-7 flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300 md:text-base">
            <Lock className="h-5 w-5 text-[#FF9F00]" />A próxima aula será
            liberada após a aprovação.
          </p>

          <div className="mt-8 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 md:flex-row">
            <RewardItem icon={Zap} label="XP por acerto" />
            <RewardItem icon={Flame} label="Combo bônus" />
            <RewardItem icon={Star} label="Questão bônus" muted={!hasBonusQuestion} />
          </div>

          <Button
            className="mt-8 h-14 w-full max-w-3xl rounded-2xl bg-[#FF9F00] text-base font-extrabold text-black shadow-[0_18px_45px_rgba(255,159,0,0.25)] hover:bg-[#E68F00]"
            onClick={() => resetAttempt(true)}
          >
            Começar desafio
          </Button>
        </div>
      </section>
    );
  }

  if (step === "result" && result) {
    const passed = result.passed;
    return (
      <section className="rounded-[28px] border border-[#FF9F00]/30 bg-white p-6 text-slate-950 shadow-sm dark:bg-[radial-gradient(circle_at_top,rgba(255,159,0,0.16),transparent_34%),linear-gradient(135deg,rgba(255,159,0,0.08),rgba(0,0,0,0.96)_50%)] dark:text-white md:p-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div
            className={cn(
              "mb-7 flex h-24 w-24 items-center justify-center rounded-full border",
              passed
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                : "border-[#FF9F00]/40 bg-[#FF9F00]/10 text-[#FF9F00]"
            )}
          >
            {passed ? <Trophy className="h-12 w-12" /> : <RotateCcw className="h-12 w-12" />}
          </div>

          <h3 className="text-3xl font-extrabold md:text-4xl">
            {passed ? "Desafio concluído!" : "Você ainda não atingiu a nota mínima."}
          </h3>
          <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-zinc-300 md:text-lg">
            {passed
              ? "A próxima aula foi desbloqueada para você continuar a trilha."
              : "Revise o conteúdo e tente novamente para desbloquear a próxima aula."}
          </p>

          <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">Pontuação</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-white">{result.score}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">Nota mínima</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-white">{quiz.passingScore}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">XP ganho</p>
              <p className="mt-1 text-2xl font-extrabold text-[#FF9F00]">+{result.xpEarned}</p>
            </div>
          </div>

          {passed ? (
            nextChapterHref ? (
              <Button
                asChild
                className="mt-8 h-14 w-full max-w-2xl rounded-2xl bg-[#FF9F00] text-base font-extrabold text-black hover:bg-[#E68F00]"
              >
                <Link href={nextChapterHref}>
                  Ir para próxima aula
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-6 py-4 text-sm font-semibold text-emerald-200">
                Você concluiu o último desafio desta trilha.
              </div>
            )
          ) : (
            <Button
              className="mt-8 h-14 w-full max-w-2xl rounded-2xl bg-[#FF9F00] text-base font-extrabold text-black hover:bg-[#E68F00]"
              onClick={() => resetAttempt(true)}
            >
              Refazer quiz
              <RotateCcw className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[#FF9F00]/30 bg-white p-4 text-slate-950 shadow-sm dark:bg-[radial-gradient(circle_at_top,rgba(255,159,0,0.14),transparent_34%),linear-gradient(135deg,rgba(255,159,0,0.08),rgba(0,0,0,0.96)_50%)] dark:text-white md:p-8">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FF9F00]/35 bg-[#FF9F00]/10">
            <Brain className="h-8 w-8 text-[#FF9F00]" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold md:text-4xl">Desafio final</h2>
            <p className="mt-1 text-slate-600 dark:text-zinc-300">Responda às perguntas para concluir o desafio.</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200">
          <Clock className="h-5 w-5 text-[#FF9F00]" />
          {quiz.timeLimit ? `${quiz.timeLimit}s por pergunta` : `${estimatedMinutes} min estimados`}
        </div>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111111]/90 dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <StatBadge icon={Target} label={`Pergunta ${currentIdx + 1}`} />
          <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-zinc-300">
            <Target className="h-7 w-7 text-[#FF9F00]" />
            <span className="text-base">Quiz do capítulo</span>
          </div>
          <div className="rounded-xl border border-[#FF9F00]/30 bg-[#FF9F00]/10 px-4 py-2 text-lg font-extrabold text-[#FF9F00]">
            {currentIdx + 1} de {questions.length}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion?.id ?? currentIdx}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="p-5 md:p-8"
          >
            {currentQuestion?.isBonus && (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#FF9F00]/35 bg-[#FF9F00]/10 px-4 py-2 text-sm font-bold text-[#FF9F00]">
                <Star className="h-4 w-4" />
                Questão bônus
                {currentQuestion.bonusPoints ? ` +${currentQuestion.bonusPoints} XP` : ""}
              </div>
            )}

            <h3 className="mx-auto max-w-4xl text-center text-2xl font-extrabold leading-tight md:text-3xl">
              {currentQuestion?.prompt}
            </h3>

            <div className="mt-8 space-y-3">
              {currentQuestion?.options.map((option, index) => {
                const isSelected = selectedOption === option.id;
                return (
                  <motion.button
                    key={option.id}
                    whileHover={step === "playing" ? { scale: 1.005 } : undefined}
                    whileTap={step === "playing" ? { scale: 0.995 } : undefined}
                    onClick={() => handleSelect(option.id)}
                    disabled={step !== "playing"}
                    className={cn(
                      "group flex w-full items-center gap-5 rounded-2xl border px-5 py-4 text-left transition",
                      isSelected
                        ? "border-[#FF9F00] bg-[#FF9F00]/10 shadow-[0_0_28px_rgba(255,159,0,0.12)]"
                        : "border-slate-200 bg-slate-50 hover:border-[#FF9F00]/60 hover:bg-[#FF9F00]/5 dark:border-white/10 dark:bg-black/20",
                      step !== "playing" && !isSelected && "opacity-70"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg font-extrabold",
                        isSelected
                          ? "border-[#FF9F00] bg-[#FF9F00]/20 text-[#FF9F00]"
                          : "border-slate-300 text-slate-700 group-hover:border-[#FF9F00]/60 group-hover:text-[#FF9F00] dark:border-white/15 dark:text-zinc-200"
                      )}
                    >
                      {letters[index] ?? index + 1}
                    </span>
                    <span className="flex-1 text-base text-slate-800 dark:text-zinc-100 md:text-lg">{option.text}</span>
                    {isSelected && (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF9F00] text-black">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {step === "playing" && (
              <p className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
                <HelpCircle className="h-4 w-4 text-[#FF9F00]" />
                Selecione uma alternativa para continuar.
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="border-t border-slate-200 p-5 dark:border-white/10">
          <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <motion.div
              className="h-full rounded-full bg-[#FF9F00]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[180px_1fr_280px] md:items-center">
            <Button
              type="button"
              variant="outline"
              className="h-14 rounded-2xl border-slate-200 bg-transparent text-slate-800 hover:border-[#FF9F00]/70 hover:bg-[#FF9F00]/10 dark:border-white/15 dark:text-white"
              onClick={() => {
                if (currentIdx === 0) {
                  resetAttempt();
                  return;
                }
                setCurrentIdx((current) => current - 1);
                setSelectedOption(null);
                setStep("playing");
              }}
              disabled={isSubmitting}
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Voltar
            </Button>

            <div className="flex items-center justify-center gap-3">
              {questions.map((question, index) => (
                <span
                  key={question.id}
                  className={cn(
                    "h-3 w-3 rounded-full border transition",
                    index < currentIdx || (index === currentIdx && step === "feedback")
                      ? "border-[#FF9F00] bg-[#FF9F00]"
                      : index === currentIdx
                        ? "border-[#FF9F00] bg-[#FF9F00]/25"
                        : "border-slate-300 bg-slate-200 dark:border-white/15 dark:bg-white/10"
                  )}
                />
              ))}
              <span className="ml-3 text-sm font-semibold text-slate-600 dark:text-zinc-300">
                {currentIdx + 1} / {questions.length}
              </span>
            </div>

            <Button
              type="button"
              className="h-14 rounded-2xl bg-[#FF9F00] text-base font-extrabold text-black hover:bg-[#E68F00]"
              onClick={nextQuestion}
              disabled={step !== "feedback" || isSubmitting}
            >
              {isSubmitting
                ? "Enviando..."
                : currentIdx + 1 < questions.length
                  ? "Próxima questão"
                  : "Finalizar desafio"}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
