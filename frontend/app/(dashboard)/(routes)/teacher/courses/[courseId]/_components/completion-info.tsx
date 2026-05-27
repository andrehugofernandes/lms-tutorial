"use client";

import { useEffect, useState } from "react";
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
  completeTitle = "Configuração completa",
  completeDescription = "Tudo o que é obrigatório já foi preenchido.",
  incompleteTitle = "Campos pendentes",
  incompleteDescription = "Preencha os itens abaixo para concluir esta configuração.",
}: CompletionInfoProps) => {
  const [open, setOpen] = useState(false);
  const isComplete = missingFields.length === 0;

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const options: AddEventListenerOptions = {
      capture: true,
      passive: true,
    };

    window.addEventListener("scroll", close, options);
    window.addEventListener("wheel", close, options);
    window.addEventListener("touchmove", close, options);

    return () => {
      window.removeEventListener("scroll", close, options);
      window.removeEventListener("wheel", close, options);
      window.removeEventListener("touchmove", close, options);
    };
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={buttonLabel}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onPointerEnter={() => setOpen(true)}
          onPointerLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="pointer-events-none w-80 border-border bg-popover text-popover-foreground"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold text-popover-foreground">
              {isComplete ? completeTitle : incompleteTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {isComplete ? completeDescription : incompleteDescription}
            </p>
          </div>
          {!isComplete && (
            <ul className="space-y-1 text-sm text-popover-foreground">
              {missingFields.map((field) => (
                <li key={field} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
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
