"use client";
import { ReactNode } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuthSession } from "@/hooks/use-auth-session";
import { logoutSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
interface DashboardLayoutProps {
  children: ReactNode;
}
function scopeLabel(
  scope: string | null | undefined,
  locale: "en" | "ru" | "he",
): string {
  const labels = {
    en: {
      OWNER: "Owner",
      OPERATIONS: "Operations",
      FINANCE: "Finance",
      VIEWER: "View only",
      ADMIN: "Administrator",
    },
    ru: {
      OWNER: "Владелец",
      OPERATIONS: "Операции",
      FINANCE: "Финансы",
      VIEWER: "Только просмотр",
      ADMIN: "Администратор",
    },
    he: {
      OWNER: "בעלים",
      OPERATIONS: "תפעול",
      FINANCE: "כספים",
      VIEWER: "צפייה בלבד",
      ADMIN: "מנהל",
    },
  };
  const normalizedScope = scope || "ADMIN";
  if (normalizedScope in labels[locale]) {
    return labels[locale][normalizedScope as keyof (typeof labels)[typeof locale]];
  }
  return normalizedScope.replace("_", " ");
}
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const session = useAuthSession();
  const { locale } = useI18n();
  const signOutLabel =
    locale === "ru" ? "Выйти" : locale === "he" ? "התנתק" : "Sign out";
  return (
    <div className="dmx-app-frame">
      <div className="dmx-app-shell">
        <header className="dmx-topbar">
          <div className="dmx-brand-pill">DIMAX</div>
          <div className="hidden min-w-0 flex-1 text-center text-[11px] font-medium uppercase text-text-secondary sm:block">
            DIMAX GROUP
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <LanguageSwitcher compact />
            <div className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium uppercase text-text-secondary md:inline-flex">
              <ShieldCheck
                className="h-3.5 w-3.5 text-kpi-green"
                strokeWidth={1.8}
              />
              {scopeLabel(session?.admin_scope, locale)}
            </div>
            <button
              type="button"
              aria-label={signOutLabel}
              title={signOutLabel}
              onClick={() => {
                void logoutSession().finally(() => {
                  router.replace("/login");
                });
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface hover:text-text"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </header>
        <div className="dmx-shell-grid">
          <AppSidebar />
          <main
            className="dmx-main-scroll min-w-0 bg-canvas"
            data-admin-scroll
          >
            <div className="min-h-full min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
