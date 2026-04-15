"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { PlusCircle, Trash2, Star, Settings2, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Option { id?: string; text: string; isCorrect: boolean }
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
  maxQuestions: number;
  timeLimit: number | null;
  passingScore: number;
  questions: Question[];
}

import type { Chapter } from "@/lib/types";
import { TranscriptStatus } from "@/lib/types";

interface ChapterQuizFormProps {
  courseId: string;
  chapterId: string;
  chapter: Chapter & { quiz: Quiz | null };
}

const WEIGHT_OPTIONS = [
  { label: "1× (Normal)", value: 1.0 },
  { label: "1.5× (Médio)", value: 1.5 },
  { label: "2× (Difícil)", value: 2.0 },
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

export const ChapterQuizForm = ({ courseId, chapterId, chapter }: ChapterQuizFormProps) => {
  const router = useRouter();
  const initialQuiz = chapter.quiz;
  const [quiz, setQuiz] = useState<Quiz | null>(initialQuiz);
  const [questions, setQuestions] = useState<Question[]>(initialQuiz?.questions ?? []);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    isRequired: initialQuiz?.isRequired ?? false,
    maxQuestions: initialQuiz?.maxQuestions ?? 5,
    timeLimit: initialQuiz?.timeLimit ?? null,
    passingScore: initialQuiz?.passingScore ?? 70,
    isPublished: initialQuiz?.isPublished ?? false,
  });

  const createQuiz = async () => {
    try {
      setIsSaving(true);
      const res = await axios.post(`/api/courses/${courseId}/chapters/${chapterId}/quiz`);
      setQuiz(res.data);
      toast.success("Quiz criado!");
    } catch {
      toast.error("Erro ao criar quiz");
    } finally {
      setIsSaving(false);
    }
  };

  const generateWithAi = async () => {
    try {
      setIsSaving(true);
      toast.loading("IA gerando questões...", { id: "ai-gen" });
      await axios.post(`/api/courses/${courseId}/chapters/${chapterId}/quiz/generate`);
      toast.success("Quiz gerado com IA!", { id: "ai-gen" });
      router.refresh();
      // Wait a bit for router refresh then reload local state (simple approach)
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(error?.response?.data || "Erro ao gerar com IA", { id: "ai-gen" });
    } finally {
      setIsSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!quiz) return;
    try {
      setIsSaving(true);
      await axios.patch(`/api/quiz/${quiz.id}`, settings);
      toast.success("Configurações salvas!");
      router.refresh();
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    if (questions.length >= settings.maxQuestions) {
      toast.error(`Limite de ${settings.maxQuestions} questões atingido`);
      return;
    }
    setQuestions((prev) => [...prev, emptyQuestion()]);
    setExpanded(questions.length);
  };

  const saveQuestion = async (index: number) => {
    if (!quiz) return;
    const q = questions[index];

    if (!q.prompt.trim()) { toast.error("Enunciado obrigatório"); return; }
    const hasCorrect = q.options.some((o) => o.isCorrect && o.text.trim());
    const hasAllFilled = q.options.every((o) => o.text.trim());
    if (!hasCorrect) { toast.error("Marque ao menos uma alternativa correta"); return; }
    if (!hasAllFilled) { toast.error("Preencha todas as alternativas"); return; }

    try {
      setIsSaving(true);
      if (q.id) {
        const res = await axios.patch(`/api/quiz/${quiz.id}/questions/${q.id}`, {
          prompt: q.prompt, isBonus: q.isBonus, bonusPoints: q.bonusPoints,
          pointWeight: q.pointWeight, options: q.options,
        });
        setQuestions((prev) => prev.map((item, i) => i === index ? res.data : item));
      } else {
        const res = await axios.post(`/api/quiz/${quiz.id}/questions`, {
          prompt: q.prompt, isBonus: q.isBonus, bonusPoints: q.bonusPoints,
          pointWeight: q.pointWeight,
        });
        // Save options via PATCH
        const withOptions = await axios.patch(`/api/quiz/${quiz.id}/questions/${res.data.id}`, {
          options: q.options,
        });
        setQuestions((prev) => prev.map((item, i) => i === index ? withOptions.data : item));
      }
      toast.success("Questão salva!");
      setExpanded(null);
    } catch {
      toast.error("Erro ao salvar questão");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteQuestion = async (index: number) => {
    if (!quiz) return;
    const q = questions[index];
    try {
      if (q.id) await axios.delete(`/api/quiz/${quiz.id}/questions/${q.id}`);
      setQuestions((prev) => prev.filter((_, i) => i !== index));
      toast.success("Questão removida");
    } catch {
      toast.error("Erro ao remover questão");
    }
  };

  const updateOption = (qi: number, oi: number, field: keyof Option, value: any) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qi) return q;
      const opts = q.options.map((opt, j) => {
        if (j !== oi) return field === "isCorrect" ? { ...opt, isCorrect: false } : opt;
        return { ...opt, [field]: value };
      });
      return { ...q, options: opts };
    }));
  };

  if (!quiz) {
    return (
      <div className="mt-6 border border-dashed border-slate-300 rounded-md p-6 text-center bg-slate-50/50">
        <p className="text-sm text-slate-500 mb-4">Este capítulo ainda não tem um quiz.</p>
        <div className="flex flex-col items-center justify-center gap-y-3">
          <div className="flex gap-x-3">
            <Button onClick={createQuiz} disabled={isSaving} size="sm" variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" /> Criar Manualmente
            </Button>
            <Button 
              onClick={generateWithAi} 
              disabled={isSaving || chapter.transcriptStatus === TranscriptStatus.PROCESSING} 
              size="sm" 
              className="bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Gerar com IA ✨
            </Button>
          </div>
          {chapter.transcriptStatus === TranscriptStatus.PROCESSING && (
            <p className="text-xs text-amber-600 mt-2 flex items-center">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Aguarde a transcrição do vídeo para usar a IA...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border bg-slate-50 rounded-xl p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-sky-800">🎮 Quiz do Capítulo</span>
          <Badge className={cn("text-xs", settings.isPublished ? "bg-sky-700" : "bg-slate-400")}>
            {settings.isPublished ? "Publicado" : "Rascunho"}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={saveSettings} disabled={isSaving}>
          <Settings2 className="h-4 w-4 mr-1" /> Salvar Config
        </Button>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border rounded-lg p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Obrigatório</span>
          <input type="checkbox" className="h-4 w-4 accent-sky-700"
            checked={settings.isRequired}
            onChange={(e) => setSettings((s) => ({ ...s, isRequired: e.target.checked }))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Publicado</span>
          <input type="checkbox" className="h-4 w-4 accent-sky-700"
            checked={settings.isPublished}
            onChange={(e) => setSettings((s) => ({ ...s, isPublished: e.target.checked }))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Máx. questões (1–10)</span>
          <Input type="number" min={1} max={10} value={settings.maxQuestions}
            onChange={(e) => setSettings((s) => ({ ...s, maxQuestions: Number(e.target.value) }))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">% Mínimo para passar</span>
          <Input type="number" min={0} max={100} value={settings.passingScore}
            onChange={(e) => setSettings((s) => ({ ...s, passingScore: Number(e.target.value) }))} />
        </label>
        <label className="flex flex-col gap-1 text-sm col-span-2">
          <span className="font-medium text-slate-700">Timer por questão (segundos)</span>
          <div className="flex gap-2 items-center">
            <input type="checkbox" className="h-4 w-4 accent-sky-700"
              checked={settings.timeLimit !== null}
              onChange={(e) => setSettings((s) => ({ ...s, timeLimit: e.target.checked ? 30 : null }))} />
            <span className="text-xs text-slate-500">Ativar timer</span>
            {settings.timeLimit !== null && (
              <Input type="number" min={10} max={120} className="w-24"
                value={settings.timeLimit ?? 30}
                onChange={(e) => setSettings((s) => ({ ...s, timeLimit: Number(e.target.value) }))} />
            )}
          </div>
        </label>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div key={qi} className="border rounded-lg bg-white">
            <div className="flex items-center justify-between p-3 cursor-pointer"
              onClick={() => setExpanded(expanded === qi ? null : qi)}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">#{qi + 1}</span>
                {q.isBonus && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
                <span className="text-sm text-slate-600 truncate max-w-[300px]">
                  {q.prompt || "Nova questão..."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{q.pointWeight}×</Badge>
                {expanded === qi ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>

            {expanded === qi && (
              <div className="border-t p-4 space-y-4">
                {/* Enunciado */}
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Enunciado</label>
                  <Input value={q.prompt} onChange={(e) =>
                    setQuestions((prev) => prev.map((item, i) => i === qi ? { ...item, prompt: e.target.value } : item))
                  } placeholder="Digite a pergunta..." />
                </div>

                {/* Alternativas */}
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">Alternativas (marque a correta)</label>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={cn("flex items-center gap-2 p-2 rounded-md border",
                        opt.isCorrect ? "border-green-400 bg-green-50" : "border-slate-200")}>
                        <input type="radio" name={`correct-${qi}`} className="accent-green-600"
                          checked={opt.isCorrect}
                          onChange={() => updateOption(qi, oi, "isCorrect", true)} />
                        <Input className="flex-1 h-8 text-sm" value={opt.text}
                          onChange={(e) => updateOption(qi, oi, "text", e.target.value)}
                          placeholder={`Alternativa ${String.fromCharCode(65 + oi)}`} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Peso e Bônus */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-600">Peso da questão</span>
                    <select className="border rounded-md px-2 py-1 text-sm"
                      value={q.pointWeight}
                      onChange={(e) => setQuestions((prev) => prev.map((item, i) =>
                        i === qi ? { ...item, pointWeight: Number(e.target.value) } : item))}>
                      {WEIGHT_OPTIONS.map((w) => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-600">Questão Bônus ⭐</span>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 accent-amber-400"
                        checked={q.isBonus}
                        onChange={(e) => setQuestions((prev) => prev.map((item, i) =>
                          i === qi ? { ...item, isBonus: e.target.checked } : item))} />
                      {q.isBonus && (
                        <Input type="number" className="w-24 h-8" min={0} max={200}
                          value={q.bonusPoints ?? ""}
                          onChange={(e) => setQuestions((prev) => prev.map((item, i) =>
                            i === qi ? { ...item, bonusPoints: Number(e.target.value) } : item))}
                          placeholder="+XP extra" />
                      )}
                    </div>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="bg-sky-700 hover:bg-sky-800"
                    onClick={() => saveQuestion(qi)} disabled={isSaving}>
                    Salvar Questão
                  </Button>
                  <Button size="sm" variant="destructive"
                    onClick={() => deleteQuestion(qi)} disabled={isSaving}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Question Button */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={addQuestion}
          disabled={questions.length >= settings.maxQuestions || isSaving}
          className="flex-1 border-dashed border-slate-300 text-slate-700 hover:bg-slate-100">
          <PlusCircle className="mr-2 h-4 w-4" />
          Questão Manual ({questions.length}/{settings.maxQuestions})
        </Button>
        <Button 
          onClick={generateWithAi} 
          disabled={isSaving || chapter.transcriptStatus === TranscriptStatus.PROCESSING} 
          size="sm" 
          className="flex-1 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Gerar com IA
        </Button>
      </div>
      {chapter.transcriptStatus === TranscriptStatus.PROCESSING && (
        <p className="text-xs text-amber-600 text-center mt-2 flex items-center justify-center">
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          Aguarde a transcrição do vídeo para usar a IA...
        </p>
      )}
    </div>
  );
};
