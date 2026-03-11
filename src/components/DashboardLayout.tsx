import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 shell-grid opacity-40" />
        <div className="absolute left-[-10%] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute right-[-8%] top-[8rem] h-[18rem] w-[18rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[24%] h-[16rem] w-[16rem] rounded-full bg-accent/6 blur-3xl" />
      </div>
      <AppSidebar />
      <main className="relative flex-1 overflow-auto">
        <div className="motion-page relative min-h-screen">{children}</div>
      </main>
    </div>
  );
}
