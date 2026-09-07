"use client";

import { useEffect, useState, type WheelEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ActivitySquare,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  DoorOpen,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Package2,
  Plus,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  type AdminModule,
  canAccessAdminModule,
} from "@/lib/admin-access";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SidebarItem = {
  title: string;
  path: string;
  icon: typeof LayoutDashboard;
  module: AdminModule;
};

type SidebarGroup = {
  id: "work" | "finance" | "reference" | "system";
  title: string;
  icon: typeof LayoutDashboard;
  collapsible: boolean;
  items: SidebarItem[];
};

function sidebarCopy(locale: "en" | "ru" | "he") {
  if (locale === "ru") {
    return {
      createProject: "Создать проект",
      work: "Работа",
      finance: "Деньги и отчёты",
      reference: "Справочники",
      system: "Система",
      documents: "Документы",
    };
  }
  if (locale === "he") {
    return {
      createProject: "יצירת פרויקט",
      work: "עבודה",
      finance: "כספים ודוחות",
      reference: "ספריות",
      system: "מערכת",
      documents: "מסמכים",
    };
  }
  return {
    createProject: "Create project",
    work: "Work",
    finance: "Money and reports",
    reference: "Reference data",
    system: "System",
    documents: "Documents",
  };
}

export function AppSidebar() {
  const pathname = usePathname();
  const session = useAuthSession();
  const { locale, t } = useI18n();
  const copy = sidebarCopy(locale);
  const [expandedGroups, setExpandedGroups] = useState({
    reference: false,
    system: false,
  });

  const groups: SidebarGroup[] = [
    {
      id: "work",
      title: copy.work,
      icon: LayoutDashboard,
      collapsible: false,
      items: [
        {
          title: t("nav.dashboard"),
          path: "/",
          icon: LayoutDashboard,
          module: "dashboard",
        },
        {
          title: t("nav.projects"),
          path: "/projects",
          icon: FolderKanban,
          module: "projects",
        },
        {
          title: t("nav.calendar"),
          path: "/calendar",
          icon: CalendarDays,
          module: "calendar",
        },
        {
          title: t("nav.issues"),
          path: "/issues",
          icon: AlertTriangle,
          module: "issues",
        },
        {
          title: t("nav.installers"),
          path: "/installers",
          icon: Users,
          module: "installers",
        },
        {
          title: t("nav.journal"),
          path: "/journal",
          icon: BookOpen,
          module: "journal",
        },
      ],
    },
    {
      id: "finance",
      title: copy.finance,
      icon: BarChart3,
      collapsible: false,
      items: [
        {
          title: t("nav.reports"),
          path: "/reports",
          icon: BarChart3,
          module: "reports",
        },
        {
          title: t("nav.earningsLedger"),
          path: "/earnings-ledger",
          icon: ReceiptText,
          module: "reports",
        },
        {
          title: copy.documents,
          path: "/documents",
          icon: FileText,
          module: "projects",
        },
      ],
    },
    {
      id: "reference",
      title: copy.reference,
      icon: SlidersHorizontal,
      collapsible: true,
      items: [
        {
          title: t("nav.library"),
          path: "/library",
          icon: Package2,
          module: "library",
        },
        {
          title: t("nav.doorTypes"),
          path: "/door-types",
          icon: DoorOpen,
          module: "door-types",
        },
        {
          title: t("nav.reasons"),
          path: "/reasons",
          icon: MessageSquare,
          module: "reasons",
        },
      ],
    },
    {
      id: "system",
      title: copy.system,
      icon: Settings,
      collapsible: true,
      items: [
        {
          title: t("nav.operations"),
          path: "/operations",
          icon: ActivitySquare,
          module: "operations",
        },
        {
          title: t("nav.settings"),
          path: "/settings",
          icon: Settings,
          module: "settings",
        },
      ],
    },
  ];

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canAccessAdminModule(session, item.module),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const isItemActive = (path: string) =>
    path === "/"
      ? pathname === "/"
      : pathname === path || pathname?.startsWith(`${path}/`);

  useEffect(() => {
    const activeGroup = ["/library", "/door-types", "/reasons"].some(
      (path) => pathname === path || pathname?.startsWith(`${path}/`),
    )
      ? "reference"
      : ["/operations", "/settings"].some(
            (path) => pathname === path || pathname?.startsWith(`${path}/`),
          )
        ? "system"
        : null;
    if (activeGroup) {
      setExpandedGroups((current) => ({
        ...current,
        [activeGroup]: true,
      }));
    }
  }, [pathname]);

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

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (
      event.deltaY === 0 ||
      Math.abs(event.deltaY) <= Math.abs(event.deltaX)
    ) {
      return;
    }

    const navigation = event.currentTarget.querySelector<HTMLElement>(
      "[data-sidebar-scroll]",
    );
    const eventTarget = event.target;
    if (
      navigation &&
      eventTarget instanceof Node &&
      navigation.contains(eventTarget)
    ) {
      const maxScrollTop = navigation.scrollHeight - navigation.clientHeight;
      const canScrollNavigation =
        event.deltaY < 0
          ? navigation.scrollTop > 0
          : navigation.scrollTop < maxScrollTop;
      if (canScrollNavigation) {
        return;
      }
    }

    const content = document.querySelector<HTMLElement>("[data-admin-scroll]");
    if (!content) {
      return;
    }

    event.preventDefault();
    content.scrollBy({ top: event.deltaY, behavior: "auto" });
  };

  const renderItem = (item: SidebarItem) => {
    const isActive = isItemActive(item.path);
    return (
      <Link
        key={item.path}
        href={item.path}
        aria-label={item.title}
        title={item.title}
        aria-current={isActive ? "page" : undefined}
        data-active={isActive ? "true" : "false"}
        className="dmx-sidebar-link"
      >
        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
        <span className="dmx-sidebar-label">{item.title}</span>
        {item.path === "/reports" && unreadCount > 0 ? (
          <span className="dmx-sidebar-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside
      className="dmx-sidebar"
      aria-label="Admin navigation"
      onWheel={handleWheel}
    >
      {canAccessAdminModule(session, "projects") ? (
        <Link
          href="/projects?create=1"
          aria-label={copy.createProject}
          title={copy.createProject}
          className="dmx-sidebar-create"
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={2.2} />
          <span className="dmx-sidebar-label">{copy.createProject}</span>
        </Link>
      ) : null}

      <nav
        className="min-h-0 flex-1 overflow-y-auto py-1"
        data-sidebar-scroll
      >
        {visibleGroups.map((group) => {
          const isExpandable = group.id === "reference" || group.id === "system";
          const isExpanded = isExpandable ? expandedGroups[group.id] : true;
          const hasActiveItem = group.items.some((item) =>
            isItemActive(item.path),
          );

          return (
            <section className="dmx-sidebar-group" key={group.id}>
              {group.collapsible ? (
                <button
                  type="button"
                  className="dmx-sidebar-group-toggle"
                  aria-expanded={isExpanded}
                  aria-label={group.title}
                  title={group.title}
                  onClick={() =>
                    setExpandedGroups((current) => ({
                      ...current,
                      [group.id]: !isExpanded,
                    }))
                  }
                >
                  <group.icon
                    className="h-4 w-4 shrink-0 md:hidden"
                    strokeWidth={1.8}
                  />
                  <span className="dmx-sidebar-group-title">{group.title}</span>
                  <ChevronDown
                    className={cn(
                      "hidden h-3.5 w-3.5 shrink-0 transition-transform md:block",
                      isExpanded && "rotate-180",
                    )}
                    strokeWidth={1.8}
                  />
                  {hasActiveItem && !isExpanded ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent md:hidden" />
                  ) : null}
                </button>
              ) : (
                <div className="dmx-sidebar-group-title">{group.title}</div>
              )}

              <div className={cn("space-y-0.5", !isExpanded && "hidden")}>
                {group.items.map(renderItem)}
              </div>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
