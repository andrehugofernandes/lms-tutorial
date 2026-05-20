"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ZenModeToggle = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isZen = searchParams.get("zen") === "true";

  const toggleZen = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isZen) {
      params.delete("zen");
    } else {
      params.set("zen", "true");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Button
      onClick={toggleZen}
      variant="ghost"
      size="sm"
      className={cn(
        "flex items-center gap-x-2 text-slate-700 transition-all hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800",
        isZen && "text-sky-700 bg-sky-100"
      )}
    >
      {isZen ? (
        <>
          <Minimize2 className="h-4 w-4" />
          <span className="hidden md:inline">Sair do Foco</span>
        </>
      ) : (
        <>
          <Maximize2 className="h-4 w-4" />
          <span className="hidden md:inline">Modo Foco</span>
        </>
      )}
    </Button>
  );
};
