import { isTeacher } from "@/lib/teacher";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const TeacherLayout = async ({ children }: { children: React.ReactNode }) => {
  const { userId } = await auth();

  const isAuthorized = await isTeacher(userId);

  if (!isAuthorized) {
    return redirect("/");
  }

  return <>{children}</>;
};

export default TeacherLayout;
