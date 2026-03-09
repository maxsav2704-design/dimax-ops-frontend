import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  LayoutDashboard,
  FolderKanban,
  Users,
  CalendarDays,
  BookOpen,
  DoorOpen,
  MessageSquare,
  BarChart3,
  ActivitySquare,
  Settings,
  HelpCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useUserRole } from "@/hooks/use-user-role";
import { canAccessAdminPath } from "@/lib/admin-access";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const userRole = useUserRole();
  const { t } = useI18n();
  const navItems = [
    { title: t("nav.dashboard"), path: "/", icon: LayoutDashboard },
    { title: t("nav.projects"), path: "/projects", icon: FolderKanban },
    { title: t("nav.issues"), path: "/issues", icon: AlertTriangle },
    { title: t("nav.installers"), path: "/installers", icon: Users },
    { title: t("nav.calendar"), path: "/calendar", icon: CalendarDays },
    { title: t("nav.journal"), path: "/journal", icon: BookOpen },
    { title: t("nav.doorTypes"), path: "/door-types", icon: DoorOpen },
    { title: t("nav.reasons"), path: "/reasons", icon: MessageSquare },
    { title: t("nav.reports"), path: "/reports", icon: BarChart3 },
    { title: t("nav.operations"), path: "/operations", icon: ActivitySquare },
    { title: t("nav.settings"), path: "/settings", icon: Settings },
  ];
  const visibleNavItems = navItems.filter((item) => canAccessAdminPath(userRole, item.path));
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
  });

  const unreadCount = unreadAlertsQuery.data || 0;

  return (
    <aside className="sticky top-0 flex min-h-screen w-[272px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="relative overflow-hidden border-b border-sidebar-border px-6 pb-8 pt-7">
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
        <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
          <div className="text-[10px] uppercase tracking-[0.24em] text-sidebar-foreground/55">
            {t("sidebar.commandLayer")}
          </div>
          <div className="mt-2 text-[13px] font-medium text-sidebar-accent-foreground">
            {t("sidebar.commandText")}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-5">
        <div className="mb-3 px-3 text-[10px] uppercase tracking-[0.3em] text-sidebar-foreground/45">
          {t("sidebar.controlSurface")}
        </div>
        <ul className="space-y-1">
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
                    "group/nav flex items-center gap-3 rounded-2xl px-3 py-3 text-[13px] font-medium transition-all duration-200 ease-in-out",
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
                  <span>{item.title}</span>
                  {item.path === "/reports" && unreadCount > 0 ? (
                    <span className="ml-auto inline-flex min-w-5 h-5 px-1 rounded-full items-center justify-center text-[10px] font-semibold bg-accent text-accent-foreground">
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

      {/* Footer */}
      <div className="border-t border-sidebar-border px-6 py-5">
        <div className="group/help flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sidebar-foreground/50 transition-colors duration-200 hover:text-sidebar-foreground/80">
          <HelpCircle className="w-4 h-4 transition-all duration-250 ease-in-out group-hover/help:text-accent group-hover/help:scale-110 group-hover/help:drop-shadow-[0_0_5px_hsl(var(--accent)/0.3)]" strokeWidth={1.5} />
          <div>
            <p className="text-[11px] font-medium">{t("sidebar.support")}</p>
            <p className="text-[10px]">help@dimax.co.il</p>
          </div>
        </div>
        <div className="mt-3">
          <LanguageSwitcher />
        </div>
      </div>
    </aside>
  );
}
