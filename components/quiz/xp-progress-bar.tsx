"use client";

import { useState, useEffect } from "react";
import { Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEVEL_LABELS, getLevelProgress } from "@/lib/quiz-xp";

interface XPData {
  totalXp: number;
  level: number;
  levelLabel: string;
  progress: { current: number; max: number; level: number };
}

export const XPProgressBar = () => {
  const [xpData, setXpData] = useState<XPData | null>(null);

  useEffect(() => {
    fetch("/api/users/xp")
      .then((r) => r.json())
      .then(setXpData)
      .catch(() => {});
  }, []);

  if (!xpData) return null;

  const pct = Math.min((xpData.progress.current / xpData.progress.max) * 100, 100);
  const isMaxLevel = xpData.level >= 5;

  return (
    <div className="px-3 py-2 border-t border-slate-200 bg-white">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
          <span className="text-xs font-semibold text-slate-700">
            Nível {xpData.level} — {xpData.levelLabel}
          </span>
        </div>
        <span className="text-xs text-slate-400">{xpData.totalXp} XP</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            isMaxLevel ? "bg-amber-400" : "bg-sky-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!isMaxLevel && (
        <p className="text-xs text-slate-400 mt-0.5 text-right">
          {xpData.progress.current}/{xpData.progress.max} XP
        </p>
      )}
      {isMaxLevel && (
        <p className="text-xs text-amber-500 mt-0.5 text-center font-semibold">
          🏆 Nível Máximo!
        </p>
      )}
    </div>
  );
};
