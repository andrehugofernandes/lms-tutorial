import Navbar from "./_components/navbar";
import { Sidebar } from "./_components/sidebar";

const DashboardLayout = ({ children }: 
  { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen">
      <div className="fixed top-0 z-50 h-[80px] w-full md:pl-56">
          <Navbar/ >
      </div>
      <div className="hidden md:flex h-full w-56 flex-col 
        fixed inset-y-0 z-50">
        <Sidebar />
      </div>
      <main className="min-h-screen pt-[80px] md:pl-56">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;

