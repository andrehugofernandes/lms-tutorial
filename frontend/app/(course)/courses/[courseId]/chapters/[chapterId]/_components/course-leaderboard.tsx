"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { AlertTriangle, Loader2, Medal, Trophy } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalXp: number;
  averageScore: number;
  quizzesCompleted: number;
  passedCount: number;
  isCurrentUser: boolean;
}

interface LeaderboardPayload {
  top: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  totalParticipants: number;
}

interface CourseLeaderboardProps {
  courseId: string;
}

export const CourseLeaderboard = ({ courseId }: CourseLeaderboardProps) => {
  const [data, setData] = useState<LeaderboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get(`/api/courses/${courseId}/leaderboard`);
        setData(response.data);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [courseId]);

  const topStudent = data?.top?.[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#222] dark:bg-[#111]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ranking da turma
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Melhores alunos por XP nos quizzes deste curso.
          </p>
        </div>
        {data?.currentUser && (
          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-500">
            Voce: #{data.currentUser.rank}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
        </div>
      ) : error ? (
        <div className="mt-5 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Ranking indisponivel no momento.
        </div>
      ) : data?.top?.length ? (
        <div className="mt-5 space-y-3">
          {topStudent && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">
                Melhor aluno
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950 dark:text-white">
                    {topStudent.name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {topStudent.quizzesCompleted} quiz(es) respondido(s)
                  </p>
                </div>
                <span className="text-lg font-black text-yellow-500">
                  {topStudent.totalXp} XP
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {data.top.map((student) => (
              <div
                key={student.userId}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                  student.isCurrentUser
                    ? "border-yellow-500/40 bg-yellow-500/10"
                    : "border-slate-200 bg-slate-50 dark:border-[#222] dark:bg-[#0a0a0a]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 dark:bg-[#222] dark:text-slate-300">
                    {student.rank <= 3 ? (
                      <Medal className="h-4 w-4 text-yellow-500" />
                    ) : (
                      student.rank
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {student.name}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Media {student.averageScore}% | {student.passedCount} aprovado(s)
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold text-yellow-500">
                  {student.totalXp} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm text-slate-600 dark:border-[#333] dark:text-slate-400">
          O ranking aparece quando os alunos concluirem quizzes.
        </div>
      )}
    </div>
  );
};
