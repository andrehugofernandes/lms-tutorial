"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import { Star, Zap, Trophy, CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────── */
interface Option { id: string; text: string }
interface Question {
  id: string;
  prompt: string;
  isBonus: boolean;
  bonusPoints: number | null;
  pointWeight: number;
  options: Option[];
}
interface QuizPlayerProps {
  quiz: {
    id: string;
    timeLimit: number | null;
    passingScore: number;
    questions: Question[];
  };
  onComplete?: (passed: boolean, xpEarned: number) => void;
}

/* ─── XP Floating Badge ──────────────────────────────────────── */
const XPBadge = ({ xp, visible }: { xp: number; visible: boolean }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: 0, scale: 0.5 }}
        animate={{ opacity: 1, y: -48, scale: 1 }}
        exit={{ opacity: 0, y: -80 }}
        transition={{ duration: 0.8 }}
        className="absolute top-0 right-4 bg-amber-400 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg z-10"
      >
        +{xp} XP
      </motion.div>
    )}
  </AnimatePresence>
);

/* ─── Stars Result ───────────────────────────────────────────── */
const Stars = ({ score }: { score: number }) => {
  const count = score >= 90 ? 3 : score >= 60 ? 2 : 1;
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3].map((i) => (
        <motion.div key={i} initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: i <= count ? 1 : 0.5, rotate: 0 }}
          transition={{ delay: i * 0.2, type: "spring" }}>
          <Star className={cn("h-10 w-10", i <= count ? "text-amber-400 fill-amber-400" : "text-slate-300 fill-slate-200")} />
        </motion.div>
      ))}
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
export const QuizPlayer = ({ quiz, onComplete }: QuizPlayerProps) => {
  const questions = quiz.questions;
  const [step, setStep] = useState<"intro" | "playing" | "feedback" | "result">("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ questionId: string; optionId: string; timeRemaining?: number }[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [xpBadge, setXpBadge] = useState({ visible: false, xp: 0 });
  const [combo, setCombo] = useState(0);
  const [result, setResult] = useState<{ score: number; xpEarned: number; passed: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentIdx];

  // Timer logic
  useEffect(() => {
    if (step !== "playing" || !quiz.timeLimit) return;
    setTimeLeft(quiz.timeLimit);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) {
          clearInterval(timerRef.current!);
          handleSelect(null); // auto-submit with no answer on timeout
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [currentIdx, step]);

  const handleSelect = (optionId: string | null) => {
    if (step === "feedback" || selectedOption) return;
    clearInterval(timerRef.current!);
    setSelectedOption(optionId ?? "__none__");

    // Determine correctness (client-side preview only — server is authoritative)
    const question = currentQuestion;
    // We don't expose isCorrect on the option to avoid cheating via client inspection
    // Just record the answer; result screen comes from server
    setAnswers((prev) => [
      ...prev,
      { questionId: question.id, optionId: optionId ?? "__none__", timeRemaining: timeLeft ?? undefined },
    ]);
    setStep("feedback");
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    setIsCorrect(null);
    setXpBadge({ visible: false, xp: 0 });
    if (currentIdx + 1 >= questions.length) {
      submitQuiz();
    } else {
      setCurrentIdx((i) => i + 1);
      setStep("playing");
    }
  };

  const submitQuiz = async () => {
    setIsSubmitting(true);
    try {
      const res = await axios.post(`/api/quiz/${quiz.id}/submit`, { answers });
      const { score, xpEarned, passed } = res.data;
      setResult({ score, xpEarned, passed });
      setStep("result");
      onComplete?.(passed, xpEarned);
    } catch {
      toast.error("Erro ao enviar quiz. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Intro Screen ── */
  if (step === "intro") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 p-8 bg-gradient-to-b from-sky-50 to-white rounded-2xl border border-sky-200 shadow-sm text-center">
        <div className="text-5xl">🎯</div>
        <div>
          <h3 className="text-xl font-bold text-sky-900">Quiz do Capítulo</h3>
          <p className="text-sm text-slate-500 mt-1">{questions.length} perguntas {quiz.timeLimit ? `• ${quiz.timeLimit}s por questão` : ""}</p>
        </div>
        <div className="flex gap-4 text-sm text-slate-600">
          <span>⚡ XP por acerto</span>
          <span>🔥 Combo bônus</span>
          {quiz.questions.some((q) => q.isBonus) && <span>⭐ Questão bônus</span>}
        </div>
        <Button className="bg-sky-700 hover:bg-sky-800 px-8" onClick={() => setStep("playing")}>
          Começar Quiz!
        </Button>
      </motion.div>
    );
  }

  /* ── Result Screen ── */
  if (step === "result" && result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 p-8 bg-gradient-to-b from-white to-sky-50 rounded-2xl border text-center">
        {result.score >= 100 && (
          <motion.div animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.6 }}>
            🎊🎊🎊
          </motion.div>
        )}
        <Stars score={result.score} />
        <div>
          <h3 className={cn("text-2xl font-bold", result.passed ? "text-green-600" : "text-red-500")}>
            {result.passed ? "Você passou! 🎉" : "Tente novamente 💪"}
          </h3>
          <p className="text-slate-500 text-sm mt-1">Score: {result.score}%</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-6 py-2">
          <Zap className="h-5 w-5 text-amber-500 fill-amber-400" />
          <span className="font-bold text-amber-700">+{result.xpEarned} XP ganhos</span>
        </div>
        {!result.passed && (
          <p className="text-xs text-slate-400">Mínimo necessário: {quiz.passingScore}%</p>
        )}
      </motion.div>
    );
  }

  /* ── Playing / Feedback Screen ── */
  const progress = ((currentIdx + (step === "feedback" ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div className="h-full bg-sky-500 rounded-full"
            initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          {currentIdx + 1}/{questions.length}
        </span>
        {combo >= 3 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="text-xs font-bold text-orange-500 flex items-center gap-1">
            🔥 ×{combo}
          </motion.span>
        )}
      </div>

      {/* Timer */}
      {quiz.timeLimit && step === "playing" && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className={cn("h-4 w-4", timeLeft !== null && timeLeft <= 5 ? "text-red-500 animate-pulse" : "")} />
          <span className={cn(timeLeft !== null && timeLeft <= 5 ? "text-red-500 font-bold" : "")}>{timeLeft}s</span>
        </div>
      )}

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div key={currentIdx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="relative bg-white border rounded-xl p-6 shadow-sm">
          <XPBadge xp={xpBadge.xp} visible={xpBadge.visible} />

          {currentQuestion.isBonus && (
            <div className="flex items-center gap-1 text-amber-500 text-xs font-bold mb-3">
              <Star className="h-4 w-4 fill-amber-400" /> QUESTÃO BÔNUS
              {currentQuestion.bonusPoints && <span>+{currentQuestion.bonusPoints} XP</span>}
            </div>
          )}

          <p className="text-base font-semibold text-slate-800 mb-5">{currentQuestion.prompt}</p>

          <div className="space-y-2">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              return (
                <motion.button key={opt.id} whileHover={step === "playing" ? { scale: 1.01 } : {}}
                  whileTap={step === "playing" ? { scale: 0.98 } : {}}
                  onClick={() => step === "playing" && handleSelect(opt.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-all",
                    step === "playing"
                      ? "border-slate-200 hover:border-sky-400 hover:bg-sky-50 cursor-pointer"
                      : isSelected
                        ? "border-sky-500 bg-sky-50"
                        : "border-slate-200 cursor-default opacity-70"
                  )}>
                  {opt.text}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Feedback + Next */}
      {step === "feedback" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-slate-50 border rounded-xl px-4 py-3">
          <p className="text-sm text-slate-500">
            {currentIdx + 1 < questions.length ? "Próxima questão →" : "Ver resultado"}
          </p>
          <Button size="sm" className="bg-sky-700 hover:bg-sky-800"
            onClick={nextQuestion} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : (
              <>{currentIdx + 1 < questions.length ? "Continuar" : "Ver resultado"} <ChevronRight className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
};
