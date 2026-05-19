"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { UserButton } from "@/components/auth/user-button";
import { useEffect, useState } from "react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

import { SearchInput } from "./search-input";

export const NavbarRoutes = () => {
  const { userId } = useAuth();
  const pathname = usePathname();
  const [isTeacherUser, setIsTeacherUser] = useState<boolean | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await axios.get("/api/users/role");
        setIsTeacherUser(res.data.isTeacher);
        setIsAdminUser(res.data.isAdmin);
      } catch (error) {
        setIsTeacherUser(false);
        setIsAdminUser(false);
      }
    };
    if (userId) {
      fetchRole();
    }
  }, [userId]);

  const isTeacherPage = pathname?.startsWith("/teacher");
  const isCoursePage = pathname?.includes("/courses");
  const isAdminPage = pathname?.startsWith("/admin");
  const isSearchPage = pathname === "/search";

  return (
    <>
      {isSearchPage && (
        <div className="hidden md:block">
          <SearchInput />
        </div>
      )}
      <div className="flex gap-x-2 ml-auto">
        {isTeacherPage || isCoursePage || isAdminPage ? (
          <Link href="/">
            <Button size="sm" variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sair do Modo
            </Button>
          </Link>
        ) : (
          <div className="flex gap-x-2">
            {isAdminUser && (
              <Link href="/admin">
                <Button size="sm" variant="outline">
                  Modo Admin
                </Button>
              </Link>
            )}
            {isTeacherUser && (
              <Link href="/teacher/courses">
                <Button size="sm" variant="outline">
                  Modo Professor
                </Button>
              </Link>
            )}
            {!isTeacherUser && !isAdminUser && (
               <Link href="/student/become-teacher">
                <Button size="sm" variant="ghost">
                  Seja um Professor
                </Button>
              </Link>
            )}
          </div>
        )}
        <ThemeToggle />
        <UserButton />
      </div>
    </>
  );
};

