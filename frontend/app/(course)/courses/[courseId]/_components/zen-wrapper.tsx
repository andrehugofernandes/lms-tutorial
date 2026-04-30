"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar as GlobalSidebar } from "@/app/(dashboard)/_components/sidebar";

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

  return (
    <div className="h-full bg-[#0a0a0a] text-slate-200">
      <div className={cn(
        "h-[80px] md:pl-56 md:pr-96 fixed inset-y-0 w-full z-40 transition-all duration-300 overflow-hidden bg-[#0a0a0a] border-b border-[#222]",
        isZen && "h-0 md:pl-0 md:pr-0 -translate-y-full opacity-0 pointer-events-none hidden"
      )}>
        {navbar}
      </div>
      
      {/* Global Dashboard Sidebar (Left) */}
      <div className={cn(
        "hidden md:flex h-full w-56 flex-col fixed inset-y-0 left-0 z-50 transition-all duration-300 border-r border-[#222] bg-[#111]",
        isZen && "-translate-x-full opacity-0 hidden"
      )}>
        <GlobalSidebar />
      </div>

      {/* Course Sidebar (Right) */}
      <div className={cn(
        "hidden md:flex h-full w-96 flex-col fixed inset-y-0 right-0 z-50 transition-all duration-300 border-l border-[#222] bg-[#111]",
        isZen && "translate-x-full opacity-0 hidden"
      )}>
        {sidebar}
      </div>

      <main className={cn(
        "md:pl-56 md:pr-96 pt-[80px] h-full transition-all duration-300",
        isZen && "md:pl-0 md:pr-0 pt-0"
      )}>
        {children}
      </main>
    </div>
  );
};
