"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardNavButtonProps {
  href: string;
  label: string;
  loadingLabel?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "success" | "destructive";
}

export const DashboardNavButton = ({
  href,
  label,
  loadingLabel = "Abrindo...",
  className,
  size = "default",
  variant = "default",
}: DashboardNavButtonProps) => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    router.prefetch(href);
  }, [href, router]);

  const Icon = isNavigating ? Loader2 : PlayCircle;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={isNavigating}
      onClick={() => {
        setIsNavigating(true);
        router.push(href);
      }}
      className={cn("min-w-[178px] gap-2", className)}
    >
      <Icon className={cn("h-5 w-5", isNavigating ? "animate-spin" : "fill-current")} />
      {isNavigating ? loadingLabel : label}
    </Button>
  );
};
