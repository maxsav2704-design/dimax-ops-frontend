"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, FolderKanban, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Workspace",
    href: "/installer",
    icon: FolderKanban,
    isActive: (path: string) =>
      path === "/installer" || path.startsWith("/installer/projects/"),
  },
  {
    title: "Schedule",
    href: "/installer/calendar",
    icon: CalendarDays,
    isActive: (path: string) => path === "/installer/calendar",
  },
];

function clearSession(): void {
  localStorage.removeItem("dimax_access_token");
  localStorage.removeItem("dimax_refresh_token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("token");
}

export function InstallerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="w-full border-b border-border bg-card lg:min-h-screen lg:w-[280px] lg:border-b-0 lg:border-r">
          <div className="px-6 pb-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
                D
              </div>
              <div>
                <div className="text-sm font-semibold">DIMAX Installer</div>
                <div className="text-xs text-muted-foreground">Web Workspace</div>
              </div>
            </div>
          </div>

          <nav className="space-y-1 px-3 pb-4">
            {navItems.map((item) => {
              const active = item.isActive(pathname || "");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-accent/15 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border px-4 py-4">
            <button
              type="button"
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <header className="border-b border-border px-6 py-4">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Installer-only live workspace
            </div>
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
