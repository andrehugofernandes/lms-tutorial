import Logo from "./logo"
import SidebarRoutes from "./sidebar-routes"

export const Sidebar = () => {
  return (
    <div className="h-full border-r border-border bg-background flex flex-col overflow-y-auto shadow-sm dark:border-[#1F1F1F] dark:bg-[#000000]">
      <div className="p-6">
        <Logo />
      </div>
      <div className="flex flex-col w-full">
        <SidebarRoutes />
      </div>
    </div>
  )
}
