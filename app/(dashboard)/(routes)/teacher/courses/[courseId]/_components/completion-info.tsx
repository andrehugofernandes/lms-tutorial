"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CompletionInfoProps {
  missingFields: string[];
  buttonLabel?: string;
  completeTitle?: string;
  completeDescription?: string;
  incompleteTitle?: string;
  incompleteDescription?: string;
}

export const CompletionInfo = ({
  missingFields,
  buttonLabel = "Ver campos pendentes",
  completeTitle = "Configuracao completa",
  completeDescription = "Tudo o que e obrigatorio ja foi preenchido.",
  incompleteTitle = "Campos pendentes",
  incompleteDescription = "Preencha os itens abaixo para concluir esta configuracao.",
}: CompletionInfoProps) => {
  const [open, setOpen] = useState(false);
  const isComplete = missingFields.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={buttonLabel}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:border-sky-400 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {isComplete ? completeTitle : incompleteTitle}
            </p>
            <p className="text-xs text-slate-600">
              {isComplete ? completeDescription : incompleteDescription}
            </p>
          </div>
          {!isComplete && (
            <ul className="space-y-1 text-sm text-slate-700">
              {missingFields.map((field) => (
                <li key={field} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>{field}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
