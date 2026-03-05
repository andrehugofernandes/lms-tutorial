import { isTeacher } from "@/lib/teacher";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const TeacherLayout = ({ children }: { children: React.ReactNode }) => {
  const { userId } = auth();
  if (!isTeacher(userId)) {
    return redirect("/");
  }
  return <>{children}</>;
};

export default TeacherLayout;
