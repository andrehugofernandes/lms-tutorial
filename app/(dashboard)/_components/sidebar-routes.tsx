"use client";
import { BarChart, BookOpen, Compass, Layout, List, Shield } from "lucide-react";
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
    icon: List,
    label: "Cursos",
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
        : isStudentUser
          ? studentRoutes
          : guestRoutes;

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