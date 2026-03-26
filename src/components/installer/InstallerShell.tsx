"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, CircleAlert, FolderKanban, LogOut, Wallet, Workflow } from "lucide-react";
import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logoutSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function InstallerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const navItems = [
    {
      title: t("installerShell.workspace"),
      href: "/installer",
      icon: FolderKanban,
      isActive: (path: string) =>
        path === "/installer" || path.startsWith("/installer/projects/"),
    },
    {
      title: t("installerShell.schedule"),
      href: "/installer/calendar",
      icon: CalendarDays,
      isActive: (path: string) => path === "/installer/calendar",
    },
    {
      title: t("installerShell.issues"),
      href: "/installer/issues",
      icon: CircleAlert,
      isActive: (path: string) => path === "/installer/issues",
    },
    {
      title: t("installerShell.earnings"),
      href: "/installer/earnings",
      icon: Wallet,
      isActive: (path: string) => path === "/installer/earnings",
    },
    {
      title: t("installerShell.syncQueue"),
      href: "/installer/sync-queue",
      icon: Workflow,
      isActive: (path: string) => path === "/installer/sync-queue",
    },
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 shell-grid opacity-35" />
        <div className="absolute left-[8%] top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute right-[10%] top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-4 lg:flex-row lg:px-6">
        <aside className="surface-panel w-full overflow-hidden lg:sticky lg:top-4 lg:min-h-[calc(100vh-2rem)] lg:w-[300px]">
          <div className="border-b border-border/70 px-6 pb-5 pt-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-[hsl(var(--accent)/0.72)] text-sm font-semibold text-accent-foreground shadow-[0_18px_36px_-18px_hsl(var(--accent)/0.72)]">
                D
              </div>
              <div>
                <div className="font-display text-base font-semibold">DIMAX Installer</div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {t("installerShell.webWorkspace")}
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-[13px] leading-6 text-muted-foreground">
              {t("installerShell.fieldView")}
            </div>
          </div>

          <nav className="space-y-2 px-4 py-5">
            {navItems.map((item) => {
              const active = item.isActive(pathname || "");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[13px] font-medium leading-6 transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-accent/16 via-accent/10 to-transparent text-foreground shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.18)]"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-border/70 px-4 py-4">
            <div className="mb-3">
              <LanguageSwitcher compact />
            </div>
            <button
              type="button"
              onClick={() => {
                void logoutSession().finally(() => {
                  router.replace("/login");
                });
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-background"
            >
              <LogOut className="h-4 w-4" />
              {t("common.signOut")}
            </button>
          </div>
        </aside>

        <main className="motion-page min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
