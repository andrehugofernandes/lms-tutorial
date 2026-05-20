"use client";
import { BarChart, Compass, Layout, List, MessageSquare, Shield, Trophy } from "lucide-react";
import { usePathname } from "next/navigation";
import SidebarItem from "./sidebar-item";
import { useEffect, useState } from "react";
import axios from "axios";

const studentRoutes = [
  {
    icon: Layout,
    label: "Meus Cursos",
    href: "/dashboard",
  },
  {
    icon: Compass,
    label: "Catálogo",
    href: "/search",
  },
  {
    icon: Trophy,
    label: "Ranking",
    href: "/student/ranking",
  },
  {
    icon: MessageSquare,
    label: "Fórum",
    href: "/student/forum",
  },
];

const guestRoutes = [
  {
    icon: Layout,
    label: "Dashboard",
    href: "/",
  },
  {
    icon: Compass,
    label: "Browse",
    href: "/search",
  },
];

const adminRoutes = [
  {
    icon: Shield,
    label: "Overview",
    href: "/admin",
  },
  {
    icon: List,
    label: "Usuários",
    href: "/admin/users",
  },
];

const teacherRoutes = [
  {
    icon: Layout,
    label: "Painel do Professor",
    href: "/dashboard",
  },
  {
    icon: List,
    label: "Cursos Criados",
    href: "/teacher/courses",
  },
  {
    icon: BarChart,
    label: "Analytics",
    href: "/teacher/analytics",
  },
];

const SidebarRoutes = () => {
  const pathname = usePathname();
  const [isTeacherUser, setIsTeacherUser] = useState<boolean | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);
  const [isStudentUser, setIsStudentUser] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await axios.get("/api/users/role");
        setIsTeacherUser(res.data.isTeacher);
        setIsAdminUser(res.data.isAdmin);
        setIsStudentUser(res.data.isStudent);
      } catch {
        setIsTeacherUser(false);
        setIsAdminUser(false);
        setIsStudentUser(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRole();
  }, []);

  const isTeacherPage = pathname?.includes("/teacher");
  const isAdminPage = pathname?.includes("/admin");

  const routes =
    isAdminPage && isAdminUser
      ? adminRoutes
      : isTeacherPage && isTeacherUser
        ? teacherRoutes
        : isAdminUser
          ? adminRoutes
          : isTeacherUser
            ? teacherRoutes
            : studentRoutes;

  if (isLoading) {
    return (
      <div className="flex flex-col w-full gap-y-1 p-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 bg-slate-200/60 rounded-md animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      {routes.map((route) => (
        <SidebarItem
          key={route.label}
          icon={route.icon}
          label={route.label}
          href={route.href}
        />
      ))}
    </div>
  );
};

export default SidebarRoutes;
