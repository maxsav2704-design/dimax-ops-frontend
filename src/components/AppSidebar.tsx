import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  LayoutDashboard,
  FolderKanban,
  Package2,
  Users,
  CalendarDays,
  BookOpen,
  DoorOpen,
  MessageSquare,
  BarChart3,
  ActivitySquare,
  Settings,
  LogOut,
} from "lucide-react";
import { apiFetch, logoutSession } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { canAccessAdminModule } from "@/lib/admin-access";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthSession();
  const { t } = useI18n();
  const navItems = [
    { title: t("nav.dashboard"), path: "/", icon: LayoutDashboard, module: "dashboard" as const },
    { title: t("nav.projects"), path: "/projects", icon: FolderKanban, module: "projects" as const },
    { title: t("nav.issues"), path: "/issues", icon: AlertTriangle, module: "issues" as const },
    { title: t("nav.installers"), path: "/installers", icon: Users, module: "installers" as const },
    { title: t("nav.calendar"), path: "/calendar", icon: CalendarDays, module: "calendar" as const },
    { title: t("nav.journal"), path: "/journal", icon: BookOpen, module: "journal" as const },
    { title: t("nav.library"), path: "/library", icon: Package2, module: "library" as const },
    { title: t("nav.doorTypes"), path: "/door-types", icon: DoorOpen, module: "door-types" as const },
    { title: t("nav.reasons"), path: "/reasons", icon: MessageSquare, module: "reasons" as const },
    { title: t("nav.reports"), path: "/reports", icon: BarChart3, module: "reports" as const },
    { title: t("nav.operations"), path: "/operations", icon: ActivitySquare, module: "operations" as const },
    { title: t("nav.settings"), path: "/settings", icon: Settings, module: "settings" as const },
  ];
  const visibleNavItems = navItems.filter((item) => canAccessAdminModule(session, item.module));
  const unreadAlertsQuery = useQuery({
    queryKey: ["limit-alerts-unread"],
    queryFn: async () => {
      try {
        const data = await apiFetch<{ unread_count: number }>(
          "/api/v1/admin/reports/limit-alerts?limit=1&offset=0"
        );
        return data.unread_count || 0;
      } catch {
        return 0;
      }
    },
    refetchInterval: 30_000,
    enabled: canAccessAdminModule(session, "reports"),
  });

  const unreadCount = unreadAlertsQuery.data || 0;

  return (
    <aside className="sticky top-0 flex min-h-screen w-[272px] shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="relative overflow-hidden border-b border-sidebar-border px-6 pb-5 pt-6">
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.32),transparent_58%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-accent to-[hsl(var(--accent)/0.72)] text-sm font-semibold text-accent-foreground shadow-[0_16px_34px_-18px_hsl(var(--accent)/0.8)] transition-shadow duration-300 hover:shadow-[0_20px_42px_-16px_hsl(var(--accent)/0.9)]">
            D
          </div>
          <div>
            <h1 className="font-display text-base font-semibold text-sidebar-accent-foreground tracking-tight">
              DIMAX Admin
            </h1>
            <p className="text-[11px] uppercase tracking-[0.24em] text-sidebar-foreground/60">Operations Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-5">
        <ul className="space-y-1.5">
          {visibleNavItems.map((item) => {
            const isActive =
              item.path === "/"
                ? pathname === "/"
                : pathname === item.path || pathname?.startsWith(`${item.path}/`);
            return (
              <li key={item.title}>
                <Link
                  href={item.path}
                  className={cn(
                    "group/nav flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-[13px] font-medium leading-6 transition-all duration-200 ease-in-out",
                    isActive
                      ? "bg-gradient-to-r from-sidebar-accent via-sidebar-accent to-sidebar-accent/80 text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--sidebar-ring)/0.24),0_16px_32px_-22px_hsl(var(--accent)/0.85)]"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/75 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-all duration-250 ease-in-out",
                      isActive
                        ? "text-accent drop-shadow-[0_0_6px_hsl(var(--accent)/0.4)]"
                        : "group-hover/nav:text-accent group-hover/nav:scale-110 group-hover/nav:drop-shadow-[0_0_5px_hsl(var(--accent)/0.3)]"
                    )}
                    strokeWidth={1.8}
                  />
                  <span className="truncate">{item.title}</span>
                  {item.path === "/reports" && unreadCount > 0 ? (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
          {visibleNavItems.length === 0 ? (
            <li className="px-3 py-2 text-[12px] text-sidebar-foreground/60">
              {t("sidebar.noAdminModules")}
            </li>
          ) : null}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-6 py-5">
        <div className="mb-3 [&>div]:w-full">
          <LanguageSwitcher />
        </div>
        <button
          type="button"
          onClick={() => {
            void logoutSession().finally(() => {
              router.replace("/login");
            });
          }}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5 text-sm text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t("common.signOut")}
        </button>
      </div>
    </aside>
  );
}
