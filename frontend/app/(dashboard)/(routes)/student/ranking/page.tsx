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

export default function StudentRankingPage() {
  const [data, setData] = useState<LeaderboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await axios.get("/api/student/leaderboard");
        setData(response.data);
        setError(null);
      } catch {
        setError("Nao foi possivel carregar o ranking agora. Verifique se o backend esta iniciado e tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRanking();
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-5xl p-6">
      <div className="mb-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FF9F00]/30 bg-[#FF9F00]/10">
            <Trophy className="h-7 w-7 text-[#FF9F00]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground">Ranking dos alunos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Classificacao geral baseada no XP conquistado nos quizzes.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF9F00]" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-600 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : data?.top?.length ? (
        <div className="space-y-3">
          {data.top.map((student) => (
            <div
              key={student.userId}
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                student.isCurrentUser
                  ? "border-[#FF9F00]/50 bg-[#FF9F00]/10"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-black text-muted-foreground">
                  {student.rank <= 3 ? (
                    <Medal className="h-5 w-5 text-[#FF9F00]" />
                  ) : (
                    student.rank
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">
                    {student.name}
                    {student.isCurrentUser ? " (voce)" : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Media {student.averageScore}% | {student.quizzesCompleted} quiz(es) | {student.passedCount} aprovado(s)
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-lg font-black text-[#FF9F00]">
                {student.totalXp} XP
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          O ranking aparece quando os alunos concluem quizzes.
        </div>
      )}
    </div>
  );
}
