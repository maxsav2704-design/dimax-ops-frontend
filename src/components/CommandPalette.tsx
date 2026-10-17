"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CornerDownLeft, FolderKanban, LayoutGrid, Plus, Search, Users } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuthSession } from "@/hooks/use-auth-session";
import { canAccessAdminModule, canRunPrivilegedAdminActions } from "@/lib/admin-access";
import { ADMIN_SECTIONS, sectionTitle } from "@/lib/admin-navigation";
import { apiFetch } from "@/lib/api";
import {
  moveSelection,
  pushRecent,
  rankEntries,
  RECENT_STORAGE_KEY,
  type PaletteEntry,
  type PaletteKind,
} from "@/lib/command-palette-logic";
import { useI18n } from "@/lib/i18n";
import { pickLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

// Command palette (premium visual, 2026-10-17): Ctrl/⌘+K anywhere in the admin.
// Sections, quick actions, projects and installers in one ranked list, keyboard
// first, with the five most recent choices shown before typing.

type ProjectsResponse = { items: Array<{ id: string; name: string; code?: string | null; address?: string | null }> };
type InstallersResponse = { items: Array<{ id: string; full_name: string; email?: string | null }> };

const KIND_ICON: Record<PaletteKind, typeof Search> = {
  section: LayoutGrid,
  action: Plus,
  project: FolderKanban,
  installer: Users,
};

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(recent: string[]) {
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent));
  } catch {
    /* storage unavailable: recents live for this page only */
  }
}

type CommandPaletteProps = {
  /** Controlled open state (the topbar button and the shortcut both drive it). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const session = useAuthSession();
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const copy = {
    placeholder: pickLocale(locale, "Search sections, projects, installers…", "Поиск по разделам, проектам, монтажникам…", "חיפוש מדורים, פרויקטים, מתקינים…"),
    title: pickLocale(locale, "Command palette", "Командная палитра", "לוח פקודות"),
    recent: pickLocale(locale, "Recent", "Недавнее", "אחרונים"),
    results: pickLocale(locale, "Results", "Результаты", "תוצאות"),
    empty: pickLocale(locale, "Nothing matches. Try a section name, a project or an installer.", "Ничего не найдено. Попробуйте название раздела, проекта или монтажника.", "אין התאמות. נסו שם מדור, פרויקט או מתקין."),
    open: pickLocale(locale, "Open", "Открыть", "פתיחה"),
    createProject: pickLocale(locale, "Create project", "Создать проект", "יצירת פרויקט"),
    kinds: {
      section: pickLocale(locale, "Section", "Раздел", "מדור"),
      action: pickLocale(locale, "Action", "Действие", "פעולה"),
      project: pickLocale(locale, "Project", "Проект", "פרויקט"),
      installer: pickLocale(locale, "Installer", "Монтажник", "מתקין"),
    } satisfies Record<PaletteKind, string>,
  };

  const canProjects = canAccessAdminModule(session, "projects");
  const canInstallers = canAccessAdminModule(session, "installers");

  const projectsQuery = useQuery({
    queryKey: ["palette-projects"],
    queryFn: () => apiFetch<ProjectsResponse>("/api/v1/admin/projects"),
    enabled: open && canProjects,
    staleTime: 60_000,
  });
  const installersQuery = useQuery({
    queryKey: ["palette-installers"],
    queryFn: () => apiFetch<InstallersResponse>("/api/v1/admin/installers?limit=200"),
    enabled: open && canInstallers,
    staleTime: 60_000,
  });

  const entries = useMemo<PaletteEntry[]>(() => {
    const list: PaletteEntry[] = [];
    if (canRunPrivilegedAdminActions(session)) {
      list.push({ id: "action:create-project", kind: "action", title: copy.createProject, href: "/projects?create=1", keywords: ["new project", "новый проект"] });
    }
    for (const section of ADMIN_SECTIONS) {
      if (!canAccessAdminModule(session, section.module)) continue;
      list.push({ id: `section:${section.path}`, kind: "section", title: sectionTitle(section, locale, t), href: section.path, keywords: section.keywords });
    }
    for (const project of projectsQuery.data?.items ?? []) {
      list.push({
        id: `project:${project.id}`,
        kind: "project",
        title: project.name,
        subtitle: [project.code, project.address].filter(Boolean).join(" · ") || undefined,
        href: `/projects?project_id=${encodeURIComponent(project.id)}`,
      });
    }
    for (const installer of installersQuery.data?.items ?? []) {
      list.push({
        id: `installer:${installer.id}`,
        kind: "installer",
        title: installer.full_name,
        subtitle: installer.email ?? undefined,
        href: `/installers?installer_id=${encodeURIComponent(installer.id)}`,
      });
    }
    return list;
  }, [session, copy.createProject, locale, t, projectsQuery.data, installersQuery.data]);

  const trimmed = query.trim();
  const results = useMemo(() => {
    if (trimmed) return rankEntries(trimmed, entries);
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const recentEntries = recent.map((id) => byId.get(id)).filter((entry): entry is PaletteEntry => !!entry).map((entry) => ({ ...entry, score: 0 }));
    const rest = rankEntries("", entries.filter((entry) => !recent.includes(entry.id)), 8);
    return [...recentEntries, ...rest];
  }, [trimmed, entries, recent]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(-1);
    setRecent(readRecent());
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    setSelected(results.length ? 0 : -1);
  }, [results]);

  useEffect(() => {
    if (selected < 0) return;
    const option = listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`);
    if (option && typeof option.scrollIntoView === "function") option.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const choose = useCallback(
    (entry: PaletteEntry) => {
      const next = pushRecent(readRecent(), entry.id);
      writeRecent(next);
      onOpenChange(false);
      router.push(entry.href);
    },
    [onOpenChange, router],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((current) => moveSelection(current, event.key === "ArrowDown" ? 1 : -1, results.length));
      return;
    }
    if (event.key === "Enter") {
      const entry = results[selected] ?? results[0];
      if (entry) {
        event.preventDefault();
        choose(entry);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dmx-palette" closeLabel={pickLocale(locale, "Close", "Закрыть", "סגור")} data-testid="command-palette">
        <DialogTitle className="sr-only">{copy.title}</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-text-tertiary" strokeWidth={1.8} aria-hidden="true" />
          <input
            ref={inputRef}
            id="command-palette-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={selected >= 0 ? `command-palette-option-${selected}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={copy.placeholder}
            aria-label={copy.title}
            className="h-12 w-full bg-transparent text-14 text-text outline-none placeholder:text-text-tertiary"
          />
          <kbd className="hidden rounded border border-border bg-surface-sunken px-1.5 text-11 text-text-secondary sm:inline">Esc</kbd>
        </div>
        <div className="px-3 pb-1 pt-2 text-11 font-medium uppercase text-text-tertiary">
          {trimmed ? copy.results : recent.length ? copy.recent : copy.results}
        </div>
        <ul ref={listRef} id="command-palette-list" role="listbox" aria-label={copy.results} className="max-h-[50vh] overflow-y-auto px-2 pb-2">
          {results.length === 0 ? (
            <li className="px-2 py-6 text-center text-13 text-text-secondary">{copy.empty}</li>
          ) : (
            results.map((entry, index) => {
              const Icon = KIND_ICON[entry.kind];
              const active = index === selected;
              return (
                <li
                  key={entry.id}
                  id={`command-palette-option-${index}`}
                  role="option"
                  aria-selected={active}
                  data-index={index}
                  data-kind={entry.kind}
                  onMouseEnter={() => setSelected(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(entry)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") choose(entry);
                  }}
                  tabIndex={-1}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-13 text-text",
                    active && "bg-[var(--dmx-accent-tint)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={1.8} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{entry.title}</span>
                    {entry.subtitle ? <span className="block truncate text-12 text-text-secondary">{entry.subtitle}</span> : null}
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-11 text-text-secondary">{copy.kinds[entry.kind]}</span>
                  {active ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-text-tertiary" strokeWidth={1.8} aria-label={copy.open} /> : null}
                </li>
              );
            })
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
