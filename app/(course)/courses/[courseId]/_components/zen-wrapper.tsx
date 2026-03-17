"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface ZenWrapperProps {
  children: React.ReactNode;
  navbar: React.ReactNode;
  sidebar: React.ReactNode;
}

export const ZenWrapper = ({
  children,
  navbar,
  sidebar
}: ZenWrapperProps) => {
  const searchParams = useSearchParams();
  const isZen = searchParams.get("zen") === "true";

  console.log("ZenWrapper - isZen:", isZen);

  return (
    <div className="h-full">
      <div className={cn(
        "h-[80px] md:pl-80 fixed inset-y-0 w-full z-50 transition-all duration-300 overflow-hidden",
        isZen && "h-0 md:pl-0 -translate-y-full opacity-0 pointer-events-none hidden"
      )}>
        {navbar}
      </div>
      <div className={cn(
        "hidden md:flex h-full w-80 flex-col fixed inset-y-0 z-50 transition-all duration-300",
        isZen && "-translate-x-full opacity-0 hidden"
      )}>
        {sidebar}
      </div>
      <main className={cn(
        "md:pl-80 pt-[80px] h-full transition-all duration-300",
        isZen && "md:pl-0 pt-0"
      )}>
        {children}
      </main>
    </div>
  );
};
