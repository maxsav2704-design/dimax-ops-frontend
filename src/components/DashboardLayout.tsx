"use client";
import { ReactNode } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuthSession } from "@/hooks/use-auth-session";
import { logoutSession } from "@/lib/api";
interface DashboardLayoutProps {
  children: ReactNode;
}
function scopeLabel(scope: string | null | undefined): string {
  if (!scope) {
    return "ADMIN";
  }
  return scope.replace("_", " ");
}
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const session = useAuthSession();
  return (
    <div className="dmx-app-frame">
      {" "}
      <div className="dmx-app-shell">
        {" "}
        <header className="dmx-topbar">
          {" "}
          <div className="dmx-brand-pill">DIMAX</div>{" "}
          <div className="hidden min-w-0 flex-1 text-center text-[11px] font-medium uppercase text-text-secondary sm:block">
            {" "}
            DIMAX GROUP{" "}
          </div>{" "}
          <div className="ms-auto flex shrink-0 items-center gap-2">
            {" "}
            <LanguageSwitcher compact />{" "}
            <div className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium uppercase text-text-secondary md:inline-flex">
              {" "}
              <ShieldCheck
                className="h-3.5 w-3.5 text-kpi-green"
                strokeWidth={1.8}
              />{" "}
              {scopeLabel(session?.admin_scope)}{" "}
            </div>{" "}
            <button
              type="button"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => {
                void logoutSession().finally(() => {
                  router.replace("/login");
                });
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface hover:text-text"
            >
              {" "}
              <LogOut className="h-4 w-4" strokeWidth={1.8} />{" "}
            </button>{" "}
          </div>{" "}
        </header>{" "}
        <div className="dmx-shell-grid">
          {" "}
          <AppSidebar />{" "}
          <main className="min-w-0 overflow-x-hidden overflow-y-auto bg-canvas">
            {" "}
            <div className="min-h-full min-w-0">{children}</div>{" "}
          </main>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
