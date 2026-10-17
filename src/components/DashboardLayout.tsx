"use client";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu, Search, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CommandPalette } from "@/components/CommandPalette";
import { isPaletteShortcut } from "@/lib/command-palette-logic";
import { MAIN_CONTENT_ID, SkipToContent } from "@/components/dimax/SkipToContent";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuthSession } from "@/hooks/use-auth-session";
import { logoutSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { pickLocale } from "@/lib/locale";
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
  const pathname = usePathname();
  const session = useAuthSession();
  const { locale } = useI18n();
  const signOutLabel =
    pickLocale(locale, "Sign out", "Выйти", "התנתק");
  const menuLabel = pickLocale(locale, "Menu", "Меню", "תפריט");
  const navigationLabel = pickLocale(locale, "Navigation", "Навигация", "ניווט");
  const closeLabel = pickLocale(locale, "Close", "Закрыть", "סגור");
  // Block 9: below md the sidebar is an icon rail; the drawer offers the labelled copy.
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);
  // Command palette: Ctrl/Cmd+K anywhere in the admin, or the search button in the topbar.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const searchLabel = pickLocale(locale, "Search (Ctrl+K)", "Поиск (Ctrl+K)", "חיפוש (Ctrl+K)");
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPaletteShortcut(event)) return;
      event.preventDefault();
      setPaletteOpen((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return (
    <div className="dmx-app-frame">
      <SkipToContent />
      <div className="dmx-app-shell">
        <header className="dmx-topbar">
          <button
            type="button"
            aria-label={menuLabel}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface hover:text-text md:hidden"
          >
            <Menu className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <div className="dmx-brand-pill">DIMAX</div>
          <div className="hidden min-w-0 flex-1 text-center text-[11px] font-medium uppercase text-text-secondary sm:block">
            DIMAX GROUP
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={searchLabel}
              title={searchLabel}
              onClick={() => setPaletteOpen(true)}
              className="flex h-7 items-center gap-2 rounded-full border border-border bg-surface px-2.5 text-11 text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text"
            >
              <Search className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              <kbd className="hidden font-sans text-11 sm:inline">Ctrl K</kbd>
            </button>
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
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DialogContent className="dmx-drawer-sheet" closeLabel={closeLabel} data-testid="dmx-drawer">
            <DialogTitle className="sr-only">{navigationLabel}</DialogTitle>
            <AppSidebar variant="drawer" onNavigate={() => setDrawerOpen(false)} />
          </DialogContent>
        </Dialog>
        <div className="dmx-shell-grid">
          <AppSidebar />
          <main
            id={MAIN_CONTENT_ID}
            tabIndex={-1}
            className="dmx-main-scroll min-w-0 bg-canvas outline-none"
            data-admin-scroll
          >
            <div className="min-h-full min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
