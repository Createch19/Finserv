import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger className="md:hidden"/>
      <div className="flex-1">
        {/* Can add page title or breadcrumbs here */}
      </div>
      <div className="md:hidden">
        <UserNav />
      </div>
    </header>
  );
}
