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
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Projects", path: "/projects", icon: FolderKanban },
  { title: "Issues", path: "/issues", icon: AlertTriangle },
  { title: "Installers", path: "/installers", icon: Users },
  { title: "Calendar", path: "/calendar", icon: CalendarDays },
  { title: "Journal", path: "/journal", icon: BookOpen },
  { title: "Door Types", path: "/door-types", icon: DoorOpen },
  { title: "Reasons", path: "/reasons", icon: MessageSquare },
  { title: "Reports", path: "/reports", icon: BarChart3 },
  { title: "Operations", path: "/operations", icon: ActivitySquare },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const userRole = useUserRole();
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
    <aside className="flex flex-col w-[240px] min-h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
      {/* Brand */}
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-semibold text-sm transition-shadow duration-300 hover:shadow-[0_0_12px_hsl(var(--accent)/0.4)]">
            D
          </div>
          <div>
            <h1 className="text-sm font-semibold text-sidebar-accent-foreground tracking-tight">
              DIMAX Admin
            </h1>
            <p className="text-[11px] text-sidebar-foreground/60">Operations Suite</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-0.5">
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ease-in-out group/nav",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--sidebar-ring)/0.15)]"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-[18px] h-[18px] shrink-0 transition-all duration-250 ease-in-out",
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
              No admin modules available for your role.
            </li>
          ) : null}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-5 py-5 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-sidebar-foreground/50 group/help cursor-pointer transition-colors duration-200 hover:text-sidebar-foreground/80">
          <HelpCircle className="w-4 h-4 transition-all duration-250 ease-in-out group-hover/help:text-accent group-hover/help:scale-110 group-hover/help:drop-shadow-[0_0_5px_hsl(var(--accent)/0.3)]" strokeWidth={1.5} />
          <div>
            <p className="text-[11px] font-medium">Support</p>
            <p className="text-[10px]">help@dimax.co.il</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
