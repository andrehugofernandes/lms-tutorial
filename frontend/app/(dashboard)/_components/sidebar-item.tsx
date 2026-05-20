"use client"
import { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";


interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
};

const SidebarItem = ({
  icon: Icon,
  label,
  href,
}: SidebarItemProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = 
  (pathname === "/" && href === "/") ||
  pathname === href ||
  pathname?.startsWith(`${href}/`);

  const onClick = () => {
    router.push(href);
  }


  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        `mx-4 my-1 flex h-12 items-center gap-x-2 rounded-xl border border-transparent px-4 text-sm
        font-semibold text-muted-foreground transition-all hover:border-border hover:bg-card hover:text-foreground
        dark:text-[#A1A1AA] dark:hover:border-[#333333] dark:hover:bg-[#111111] dark:hover:text-white`,
        isActive &&
          `border-[#FF9F00] bg-[#FF9F00]/10 text-[#FF9F00]
          shadow-[0_0_18px_rgba(255,159,0,0.12)] hover:border-[#FF9F00] hover:bg-[#FF9F00]/10 hover:text-[#FF9F00]
          dark:border-[#FF9F00] dark:bg-[#FF9F00]/10 dark:text-[#FF9F00] dark:hover:border-[#FF9F00] dark:hover:bg-[#FF9F00]/10 dark:hover:text-[#FF9F00]`
      )}
    >
      <div className="flex items-center gap-x-2 w-full">
        <Icon 
          size={22}
          className={cn(
            `text-muted-foreground transition-colors dark:text-[#A1A1AA]`,
            isActive && `text-[#FF9F00]`
          )}
        />
        <span>{label}</span>
      </div>
    </button>
  )
}

export default SidebarItem
