import { auth } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  const role = await serverApi<{
    isAdmin: boolean;
  }>("/api/users/role");

  if (!role.isAdmin) {
    return redirect("/");
  }

  return <>{children}</>;
};

export default AdminLayout;
