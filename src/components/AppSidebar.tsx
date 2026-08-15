"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ActivitySquare,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  DoorOpen,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Package2,
  Plus,
  ReceiptText,
  Settings,
  Users,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { canAccessAdminModule } from "@/lib/admin-access";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const session = useAuthSession();
  const { locale, t } = useI18n();
  const documentsTitle =
    locale === "ru"
      ? "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b"
      : locale === "he"
        ? "\u05de\u05e1\u05de\u05db\u05d9\u05dd"
        : "Documents";
  const navItems = [
    {
      title: t("nav.dashboard"),
      path: "/",
      icon: LayoutDashboard,
      module: "dashboard" as const,
    },
    {
      title: t("nav.projects"),
      path: "/projects",
      icon: FolderKanban,
      module: "projects" as const,
    },
    {
      title: t("nav.issues"),
      path: "/issues",
      icon: AlertTriangle,
      module: "issues" as const,
    },
    {
      title: t("nav.installers"),
      path: "/installers",
      icon: Users,
      module: "installers" as const,
    },
    {
      title: t("nav.calendar"),
      path: "/calendar",
      icon: CalendarDays,
      module: "calendar" as const,
    },
    {
      title: t("nav.journal"),
      path: "/journal",
      icon: BookOpen,
      module: "journal" as const,
    },
    {
      title: documentsTitle,
      path: "/documents",
      icon: FileText,
      module: "projects" as const,
    },
    {
      title: t("nav.library"),
      path: "/library",
      icon: Package2,
      module: "library" as const,
    },
    {
      title: t("nav.doorTypes"),
      path: "/door-types",
      icon: DoorOpen,
      module: "door-types" as const,
    },
    {
      title: t("nav.reasons"),
      path: "/reasons",
      icon: MessageSquare,
      module: "reasons" as const,
    },
    {
      title: t("nav.reports"),
      path: "/reports",
      icon: BarChart3,
      module: "reports" as const,
    },
    {
      title: t("nav.earningsLedger"),
      path: "/earnings-ledger",
      icon: ReceiptText,
      module: "reports" as const,
    },
    {
      title: t("nav.operations"),
      path: "/operations",
      icon: ActivitySquare,
      module: "operations" as const,
    },
    {
      title: t("nav.settings"),
      path: "/settings",
      icon: Settings,
      module: "settings" as const,
    },
  ];
  const visibleNavItems = navItems.filter((item) =>
    canAccessAdminModule(session, item.module),
  );
  const unreadAlertsQuery = useQuery({
    queryKey: ["limit-alerts-unread"],
    queryFn: async () => {
      try {
        const data = await apiFetch<{ unread_count: number }>(
          "/api/v1/admin/reports/limit-alerts?limit=1&offset=0",
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
    <aside className="dmx-icon-rail" aria-label="Admin navigation">
      {canAccessAdminModule(session, "projects") ? (
        <Link
          href="/projects"
          aria-label="Create project"
          title="Create project"
          className="dmx-fab"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} />
        </Link>
      ) : null}

      <nav className="flex flex-1 flex-col items-center gap-[3px]">
        {visibleNavItems.map((item) => {
          const isActive =
            item.path === "/"
              ? pathname === "/"
              : pathname === item.path || pathname?.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.title}
              href={item.path}
              aria-label={item.title}
              title={item.title}
              data-active={isActive ? "true" : "false"}
              className={cn("dmx-rail-link", isActive && "font-medium")}
            >
              <item.icon className="h-[15px] w-[15px]" strokeWidth={1.9} />
              <span className="sr-only">{item.title}</span>
              {item.path === "/reports" && unreadCount > 0 ? (
                <span className="dmx-rail-badge">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
