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
        `flex items-center gap-x-2 text-muted-foreground text-sm
        font-[500] px-4 mx-4 my-1 h-12 transition-all hover:text-foreground
        hover:bg-card border border-transparent rounded-xl`, 
        isActive && `text-primary bg-card/50
         hover:bg-card/80 hover:text-primary border-primary/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]`
        )}
    >
      <div className="flex items-center gap-x-2 w-full">
        <Icon 
          size={22}
          className={cn(
            `text-muted-foreground transition-colors`,
            isActive && `text-primary`
          )}
        />
        <span>{label}</span>
      </div>
    </button>
  )
}

export default SidebarItem
