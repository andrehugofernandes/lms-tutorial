import { auth } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";

const TeacherLayout = async ({ children }: { children: React.ReactNode }) => {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  const role = await serverApi<{
    isTeacher: boolean;
  }>("/api/users/role");

  if (!role.isTeacher) {
    return redirect("/");
  }

  return <>{children}</>;
};

export default TeacherLayout;
