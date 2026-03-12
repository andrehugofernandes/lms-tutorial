import { isAdmin } from "@/lib/teacher";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
    const { userId } = auth();

    const isAuthorized = await isAdmin(userId);

    if (!isAuthorized) {
        return redirect("/");
    }

    return <>{children}</>;
};

export default AdminLayout;
