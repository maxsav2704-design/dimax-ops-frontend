"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  CircleAlert,
  FolderKanban,
  LogOut,
  Wallet,
  Workflow,
} from "lucide-react";
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
    <div className="min-h-screen overflow-x-hidden bg-canvas text-text">
      {" "}
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-3 py-3 lg:flex-row lg:px-4">
        {" "}
        <aside className="w-full overflow-hidden rounded-lg border border-border bg-surface lg:sticky lg:top-4 lg:min-h-[calc(100vh-2rem)] lg:w-[300px]">
          {" "}
          <div className="border-b border-border px-4 py-4 lg:px-5 lg:pb-5 lg:pt-5">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-strong bg-text text-sm font-semibold text-text-inverse">
                {" "}
                D{" "}
              </div>{" "}
              <div>
                {" "}
                <div className="text-base font-semibold text-text">
                  DIMAX Installer
                </div>{" "}
                <div className="text-[10.5px] uppercase text-text-secondary">
                  {" "}
                  {t("installerShell.webWorkspace")}{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <div className="mt-5 hidden rounded-lg border border-border bg-surface-subtle px-4 py-3 text-[13px] leading-6 text-text-secondary lg:block">
              {" "}
              {t("installerShell.fieldView")}{" "}
            </div>{" "}
          </div>{" "}
          <nav className="grid grid-cols-3 gap-2 px-3 py-3 lg:block lg:space-y-1.5 lg:px-3 lg:py-4">
            {" "}
            {navItems.map((item) => {
              const active = item.isActive(pathname || "");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-w-0 items-center justify-center gap-2 rounded-lg border px-2 py-2.5 text-[12px] font-medium leading-5 transition-colors duration-150 lg:justify-start lg:gap-3 lg:px-3.5 lg:py-3 lg:text-[13px] lg:leading-6",
                    active
                      ? "border-border-strong bg-surface-sunken text-text"
                      : "border-transparent text-text-secondary hover:border-border hover:bg-surface-subtle hover:text-text",
                  )}
                >
                  {" "}
                  <item.icon className="h-4 w-4" /> {item.title}{" "}
                </Link>
              );
            })}{" "}
          </nav>{" "}
          <div className="mt-auto flex items-center gap-2 border-t border-border px-3 py-3 lg:block lg:px-4 lg:py-4">
            {" "}
            <div className="shrink-0 lg:mb-3">
              {" "}
              <LanguageSwitcher compact />{" "}
            </div>{" "}
            <button
              type="button"
              onClick={() => {
                void logoutSession().finally(() => {
                  router.replace("/login");
                });
              }}
              className="dmx-secondary-action h-9 flex-1 lg:h-10 lg:w-full"
            >
              {" "}
              <LogOut className="h-4 w-4" /> {t("common.signOut")}{" "}
            </button>{" "}
          </div>{" "}
        </aside>{" "}
        <main className="motion-page w-full min-w-0 max-w-full flex-1">
          {" "}
          {children}{" "}
        </main>{" "}
      </div>{" "}
    </div>
  );
}
