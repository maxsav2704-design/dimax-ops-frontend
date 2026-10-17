"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PillButton } from "@/components/dimax";
import { DoorMatrixTile, DoorRowsHeader } from "@/components/projects/DoorMatrixTile";
import { ProjectSideWidgets } from "@/components/projects/ProjectSideWidgets";
import { type ProjectAddonPlanItem } from "@/components/projects/catalog-types";
import { type DocumentGenerationDTO } from "@/components/projects/document-shared";
import { matrixCompletionPct, matrixDoorState, matrixDoorTileLabel, matrixDoorTileTone, matrixProgressTone, moveMatrixFocus } from "@/components/projects/door-workspace/matrix-shared";
import { useMatrixDensity } from "@/components/projects/door-workspace/useMatrixDensity";
import { useDoorWorkspace } from "@/components/projects/door-workspace/useDoorWorkspace";
import { type ProjectPlanFactResponse, type ProjectRiskDrilldownResponse } from "@/components/projects/financial-types";
import { projectsMetricLabelClass } from "@/components/projects/project-form";
import { type ProjectDetailsResponse, type ProjectImportRunItem } from "@/components/projects/project-types";
import { formatPct, projectsPanelClass } from "@/components/projects/shared";
import { LtrText } from "@/components/ui/LtrText";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { FilterX, Search } from "lucide-react";
import { useCopy, useI18n } from "@/lib/i18n";

type DoorCommandBarProps = {
  workspace: ReturnType<typeof useDoorWorkspace>;
  selectedProjectId: string | null;
  canManageProjects: boolean;
  canViewProjectRates: boolean;
  commercialAccessRestrictedTitle: string;
  formatMoney: (value: string | number | null | undefined) => string;
  projectDetails: ProjectDetailsResponse | null;
  projectPlanFact: ProjectPlanFactResponse | null;
  projectRisk: ProjectRiskDrilldownResponse | null;
  projectFinancialReady: boolean;
  projectCompletionPct: number;
  projectInstalledDoors: number;
  projectTotalDoors: number;
  projectOpenIssues: number;
  projectUnassignedDoors: number;
  projectAssignedInstallerSummary: { id: string; name: string; email: string | null; status: string | null; doorCount: number }[];
  importHistory: ProjectImportRunItem[];
  loadingImportHistory: boolean;
  projectDocuments: DocumentGenerationDTO[];
  loadingProjectDocuments: boolean;
  projectAddonPlan: ProjectAddonPlanItem[];
  locationLabel: (value: string | null | undefined) => string;
  tokenLabel: (value: string) => string;
  scrollToProjectSection: (sectionId: string) => void;
  matrixInstallerFilterControl: ReactNode;
  onMarkInstalled: () => Promise<void>;
};

// Projects → door workspace command bar: project KPIs, quick filters, legend counts, floor preview and shortcuts to the other cards. Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function DoorCommandBar({
  workspace,
  selectedProjectId,
  canManageProjects,
  canViewProjectRates,
  commercialAccessRestrictedTitle,
  formatMoney,
  projectDetails,
  projectPlanFact,
  projectRisk,
  projectFinancialReady,
  projectCompletionPct,
  projectInstalledDoors,
  projectTotalDoors,
  projectOpenIssues,
  projectUnassignedDoors,
  projectAssignedInstallerSummary,
  importHistory,
  loadingImportHistory,
  projectDocuments,
  loadingProjectDocuments,
  projectAddonPlan,
  locationLabel,
  tokenLabel,
  scrollToProjectSection,
  matrixInstallerFilterControl,
  onMarkInstalled,
}: DoorCommandBarProps) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const copy = useCopy();
  // E7: arrow keys move between the preview tiles (see matrix-shared).
  const handleTileKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    moveMatrixFocus(event, locale === "he");
  };
  const {
    doorStatusAction,
    filteredMatrixRows,
    focusedDoorId,
    focusedDoorRow,
    matrixFloor,
    matrixFloorOptions,
    matrixIssueFilter,
    matrixLegendCounts,
    matrixMarkingSearch,
    matrixStatus,
    matrixStatusOptions,
    projectDetailFloorPreview,
    projectDetailFloorPreviewOverflow,
    projectDoorTotals,
    resetMatrixFilters,
    selectedDoorIdSet,
    selectedDoorIds,
    setFocusedDoorId,
    setMatrixFloor,
    setMatrixIssueFilter,
    setMatrixMarkingSearch,
    setMatrixStatus,
    setSelectedDoorIds,
    toggleDoorSelection,
  } = workspace;
  const [matrixDensity, setMatrixDensity] = useMatrixDensity(projectDoorTotals.totalDoors);

  return (
    <div
      className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]"
      data-testid="project-detail-v28-command"
    >
      <section className={projectsPanelClass("overflow-hidden")}>
        <div data-testid="project-detail-v28-door-workspace" data-matrix-root="">
          <div className="flex gap-0.5 overflow-x-auto border-b border-border bg-surface px-3 pt-1">
            {[
              {
                key: "overview",
                label: copy("Overview", "Обзор", "סקירה"),
                count: null,
                active: false,
                danger: false,
                onClick: () =>
                  scrollToProjectSection("project-detail-v2-header"),
              },
              {
                key: "doors",
                label: copy("Doors", "Двери", "דלתות"),
                count: projectDoorTotals.totalDoors,
                active: matrixIssueFilter === "all",
                danger: false,
                onClick: () => setMatrixIssueFilter("all"),
              },
              {
                key: "issues",
                label: copy("Issues", "Проблемы", "בעיות"),
                count: projectDoorTotals.issueCount,
                active: matrixIssueFilter === "issues",
                danger: projectDoorTotals.issueCount > 0,
                onClick: () => setMatrixIssueFilter("issues"),
              },
              {
                key: "addons",
                label: copy("Add-ons", "Доп. работы", "תוספות"),
                count: projectAddonPlan.length,
                active: false,
                danger: false,
                onClick: () =>
                  scrollToProjectSection(
                    canViewProjectRates
                      ? "project-additional-works"
                      : "project-commercial-restricted",
                  ),
              },
              {
                key: "documents",
                label: copy("Documents", "Документы", "מסמכים"),
                count: projectDocuments.length,
                active: false,
                danger: false,
                onClick: () =>
                  scrollToProjectSection("project-documents"),
              },
              {
                key: "activity",
                label: copy("Import history", "История импорта", "היסטוריית ייבוא"),
                count: importHistory.length,
                active: false,
                danger: false,
                onClick: () =>
                  scrollToProjectSection("project-import-history"),
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={item.active}
                data-testid={`project-detail-top-tab-${item.key}`}
                onClick={item.onClick}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3.5 py-2.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:text-text",
                  item.active && "border-text text-text",
                )}
              >
                <span>{item.label}</span>
                {typeof item.count === "number" ? (
                  <span
                    className={cn(
                      "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-surface-sunken px-1.5 text-[10.5px] font-medium leading-none text-text-secondary tabular-nums",
                      item.danger &&
                        "bg-status-problem-bg text-status-problem-fg",
                      item.active && "bg-text text-text-inverse",
                      item.active &&
                        item.danger &&
                        "bg-status-problem-fg text-white",
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface-subtle px-4 py-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                value={matrixMarkingSearch}
                aria-label={copy("Search doors", "Поиск дверей", "חיפוש דלתות")}
                onChange={(event) =>
                  setMatrixMarkingSearch(event.target.value)
                }
                placeholder={copy(
                  "Search door, unit, marking...",
                  "Поиск двери, квартиры, маркировки...",
                  "חיפוש דלת, דירה או סימון...",
                )}
                className="h-9 w-full rounded-full border border-border bg-surface ps-9 pe-3 text-[12.5px] text-text placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
              />
            </div>
            <select
              value={matrixFloor}
              onChange={(event) =>
                setMatrixFloor(event.target.value)
              }
              aria-label={t("projects.allFloors")}
              className="h-9 rounded-full border border-status-progress-border bg-status-progress-bg px-3 text-[11.5px] font-medium text-status-progress-fg focus:outline-none"
            >
              <option value="all">
                {copy("floor: all", "этаж: все", "קומה: הכל")}
              </option>
              {matrixFloorOptions.map((value) => (
                <option key={value} value={value}>
                  {copy("floor", "этаж", "קומה")}: {value}
                </option>
              ))}
            </select>
            <select
              value={matrixStatus}
              onChange={(event) =>
                setMatrixStatus(event.target.value)
              }
              aria-label={t("projects.allStatuses")}
              className="h-9 rounded-full border border-status-progress-border bg-status-progress-bg px-3 text-[11.5px] font-medium text-status-progress-fg focus:outline-none"
            >
              <option value="all">
                {copy("status: all", "статус: все", "סטטוס: הכל")}
              </option>
              {matrixStatusOptions.map((value) => (
                <option key={value} value={value}>
                  {tokenLabel(value)}
                </option>
              ))}
            </select>
            <div className="min-w-0 max-w-full">{matrixInstallerFilterControl}</div>
            <Button type="button" variant="outline" size="sm" onClick={resetMatrixFilters}>
              <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
              {copy("Reset filters", "Сбросить фильтры", "איפוס מסננים")}
            </Button>
            <div className="inline-flex h-9 items-center rounded-full border border-border bg-surface p-0.5">
              <button
                type="button"
                onClick={() => scrollToProjectSection("project-door-matrix")}
                className="h-7 rounded-full bg-text px-3 text-[11.5px] font-medium text-text-inverse"
              >
                {copy("Matrix", "Матрица", "מטריצה")}
              </button>
              <button
                type="button"
                onClick={() =>
                  scrollToProjectSection("project-door-ledger")
                }
                className="h-7 rounded-full px-3 text-[11.5px] font-medium text-text-secondary hover:text-text"
              >
                {copy("Table", "Таблица", "טבלה")}
              </button>
            </div>
            <div
              className="inline-flex h-9 items-center rounded-full border border-border bg-surface p-0.5"
              role="group"
              aria-label={copy("Matrix density", "Плотность матрицы", "צפיפות המטריצה")}
            >
              {(["rows", "cards"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={matrixDensity === option}
                  onClick={() => setMatrixDensity(option)}
                  className={cn(
                    "h-7 rounded-full px-3 text-12 font-medium transition-colors",
                    matrixDensity === option ? "bg-text text-text-inverse" : "text-text-secondary hover:text-text",
                  )}
                >
                  {option === "rows" ? copy("Rows", "Строки", "שורות") : copy("Cards", "Карточки", "כרטיסים")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border-subtle bg-surface-subtle px-4 py-2 text-[10.5px] text-text-secondary">
            {[
              {
                label: t("installerProject.installed"),
                value: matrixLegendCounts.installed,
                swatch: "border-status-ok-border bg-status-ok-bg",
              },
              {
                label: copy("In progress", "В работе", "בתהליך"),
                value: matrixLegendCounts.inProgress,
                swatch:
                  "border-status-progress-border bg-status-progress-bg",
              },
              {
                label: copy("Issues", "Проблемы", "בעיות"),
                value: matrixLegendCounts.issues,
                swatch:
                  "border-status-problem-border bg-status-problem-bg",
              },
              {
                label: copy(
                  "Not installed",
                  "Не установлено",
                  "לא הותקן",
                ),
                value: matrixLegendCounts.notInstalled,
                swatch:
                  "border-status-warning-border bg-status-warning-bg",
              },
              {
                label: copy("Locked", "Заблокировано", "נעול"),
                value: matrixLegendCounts.locked,
                swatch:
                  "border-status-blocked-border bg-status-blocked-bg",
              },
              {
                label: copy("Cancelled", "Отменено", "בוטל"),
                value: matrixLegendCounts.cancelled,
                swatch:
                  "border-status-archived-border bg-status-archived-bg",
              },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 font-medium"
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-[3px] border",
                    item.swatch,
                  )}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                <LtrText as="span" className="font-normal">
                  {item.value}
                </LtrText>
              </span>
            ))}
          </div>

          {focusedDoorRow ? (
            <div
              className="flex flex-col gap-3 border-b border-border-subtle bg-surface px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
              data-testid="project-detail-v28-focused-door"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <LtrText
                    as="span"
                    className="text-[14px] font-semibold text-text"
                  >
                    {focusedDoorRow.door_marking}
                  </LtrText>
                  <StatusBadge
                    status={focusedDoorRow.status}
                    label={tokenLabel(focusedDoorRow.status)}
                    domain="door"
                  />
                  {focusedDoorRow.issue_count > 0 ? (
                    <span className="rounded-full border border-status-problem-border bg-status-problem-bg px-2 py-0.5 text-[10.5px] font-medium text-status-problem-fg">
                      {focusedDoorRow.issue_count}{" "}
                      {copy("issues", "проблем", "בעיות")}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 truncate text-[11.5px] text-text-secondary">
                  <LtrText as="span">
                    {focusedDoorRow.unit_label}
                  </LtrText>{" "}
                  - {focusedDoorRow.door_type_label} -{" "}
                  {locationLabel(focusedDoorRow.location_code)}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    toggleDoorSelection(focusedDoorRow.door_id)
                  }
                  disabled={!canManageProjects}
                  className="dmx-secondary-action"
                >
                  {selectedDoorIdSet.has(focusedDoorRow.door_id)
                    ? copy("Unselect", "Убрать выбор", "בטל בחירה")
                    : copy("Select", "Выбрать", "בחר")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    scrollToProjectSection("project-door-matrix")
                  }
                  className="dmx-secondary-action"
                >
                  {copy("Open card", "Открыть карточку", "פתח כרטיס")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void onMarkInstalled()
                  }
                  disabled={
                    !canManageProjects ||
                    doorStatusAction !== null ||
                    focusedDoorRow.status === "INSTALLED"
                  }
                  className="dmx-primary-action disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy(
                    "Mark installed",
                    "Отметить установлено",
                    "סמן כהותקן",
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {filteredMatrixRows.length === 0 ? (
            <div className="px-4 py-8 text-[13px] text-text-secondary">
              {t("projects.noDoorsForFilters")}
            </div>
          ) : (
            <div className="space-y-2 bg-surface-subtle px-3 py-3">
              {projectDetailFloorPreview.map((floor, floorIndex) => {
                const safeProgressPct = matrixCompletionPct(
                  floor.installed_count,
                  floor.total_doors,
                );
                const floorDoors = floor.apartments.flatMap(
                  (apartment) =>
                    apartment.cells.flatMap((cell) => cell.doors),
                );
                return (
                  <section
                    key={`${floor.house_number}-${floor.floor_label}-top`}
                    data-testid={`project-detail-v28-floor-row-${floor.house_number}-${floor.floor_label}`}
                    className={cn(
                      "relative overflow-hidden rounded-lg border bg-surface",
                      floor.issue_count > 0
                        ? "border-status-problem-border"
                        : "border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute inset-y-0 start-0 w-1",
                        matrixProgressTone(
                          floor.issue_count,
                          safeProgressPct,
                        ),
                      )}
                      aria-hidden="true"
                    />
                    <div className="grid gap-3 border-b border-border-subtle bg-surface pe-4 ps-5 py-3 md:grid-cols-[minmax(0,1fr)_178px] md:items-center">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[12px] font-semibold tabular-nums",
                              floor.issue_count > 0
                                ? "bg-status-problem-bg text-status-problem-fg"
                                : "bg-[var(--dmx-accent-tint)] text-text",
                            )}
                          >
                            <LtrText as="span">
                              {floor.floor_label}
                            </LtrText>
                          </span>
                          <h3 className="min-w-0 truncate text-[13px] font-semibold text-text">
                            {copy("Floor", "Этаж", "קומה")}{" "}
                            <LtrText as="span">
                              {floor.floor_label}
                            </LtrText>
                          </h3>
                          <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-surface-subtle px-2.5 text-[10.5px] font-medium text-text-secondary">
                            {copy("House", "Корпус", "בניין")}{" "}
                            <LtrText as="span">
                              {floor.house_number}
                            </LtrText>
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex min-h-6 items-center rounded-full bg-surface-sunken px-2.5 text-[10.5px] font-medium text-text-secondary">
                            {floor.total_doors}{" "}
                            {copy("doors", "дверей", "דלתות")}
                          </span>
                          <span className="inline-flex min-h-6 items-center rounded-full bg-status-ok-bg px-2.5 text-[10.5px] font-medium text-status-ok-fg">
                            {copy(
                              "installed",
                              "установлено",
                              "הותקנו",
                            )}{" "}
                            {floor.installed_count}
                          </span>
                          <span className="inline-flex min-h-6 items-center rounded-full bg-status-warning-bg px-2.5 text-[10.5px] font-medium text-status-warning-fg">
                            {copy("open", "открыто", "פתוח")}{" "}
                            {floor.open_count}
                          </span>
                          {floor.issue_count > 0 ? (
                            <span className="inline-flex min-h-6 items-center rounded-full bg-status-problem-bg px-2.5 text-[10.5px] font-medium text-status-problem-fg">
                              {floor.issue_count}{" "}
                              {copy("issues", "проблем", "בעיות")}
                            </span>
                          ) : (
                            <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-surface px-2.5 text-[10.5px] font-medium text-text-secondary">
                              {copy(
                                "all clear",
                                "без проблем",
                                "תקין",
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="min-w-[150px]">
                        <div className="mb-1 flex items-center justify-between gap-2 text-[10.5px] font-medium text-text-secondary">
                          <span>
                            {copy("Progress", "Прогресс", "התקדמות")}
                          </span>
                          <LtrText as="span">
                            {floor.installed_count}/{floor.total_doors} ·{" "}
                            {safeProgressPct}%
                          </LtrText>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              matrixProgressTone(
                                floor.issue_count,
                                safeProgressPct,
                              ),
                            )}
                            style={{ width: `${safeProgressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="pe-4 ps-5 py-3">
                      {matrixDensity === "rows" ? <DoorRowsHeader /> : null}
                      <div className={matrixDensity === "rows" ? "dmx-door-rows" : "grid grid-cols-[repeat(auto-fill,minmax(144px,1fr))] gap-2"}>
                        {floorDoors.map((door) => (
                          <DoorMatrixTile
                            key={`${floor.house_number}-${floor.floor_label}-${door.door_id}-top`}
                            marking={matrixDoorTileLabel(door)}
                            context={door.unit_label}
                            status={tokenLabel(door.status)}
                            tone={matrixDoorTileTone(door)}
                            focused={focusedDoorId === door.door_id}
                            selected={selectedDoorIdSet.has(door.door_id)}
                            hasIssues={door.issue_count > 0}
                            inspectLabel={`${door.door_marking} - ${tokenLabel(door.status)}`}
                            testId={`project-detail-v28-door-tile-${door.door_id}`}
                            onInspect={() => setFocusedDoorId(door.door_id)}
                            onToggleSelection={() => toggleDoorSelection(door.door_id)}
                            floorKey={`${floor.house_number}-${floor.floor_label}`}
                            fillStep={floorIndex}
                            onKeyDown={handleTileKeyDown}
                            density={matrixDensity}
                            model={door.door_type_label}
                            state={matrixDoorState(door)}
                          />
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })}
              {projectDetailFloorPreviewOverflow > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    scrollToProjectSection("project-door-matrix")
                  }
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-start text-[12px] font-medium text-text hover:bg-surface-subtle"
                >
                  <span>
                    +{projectDetailFloorPreviewOverflow}{" "}
                    {copy(
                      "more floors in full matrix",
                      "этажей в полной матрице",
                      "קומות נוספות במטריצה המלאה",
                    )}
                  </span>
                  <span className="rounded-full bg-[var(--dmx-accent-tint)] px-2.5 py-1 text-[10.5px] text-text">
                    {copy("Open", "Открыть", "פתח")}
                  </span>
                </button>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle bg-[var(--dmx-accent-tint)] px-4 py-3">
            {selectedDoorIds.length > 0 ? (
              <>
                <span className="inline-flex min-h-7 items-center rounded-full bg-accent px-3 text-[11px] font-semibold text-text">
                  {selectedDoorIds.length}{" "}
                  {copy(
                    "doors selected",
                    "дверей выбрано",
                    "דלתות נבחרו",
                  )}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    scrollToProjectSection("project-door-matrix")
                  }
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface-subtle"
                >
                  {copy(
                    "Assign / edit",
                    "Назначить / изменить",
                    "שייך / ערוך",
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDoorIds([])}
                  className="ms-auto flex h-7 w-7 items-center justify-center rounded-full text-[18px] text-text-secondary hover:bg-surface hover:text-text"
                  aria-label={copy(
                    "Clear selected doors",
                    "Очистить выбранные двери",
                    "נקה דלתות שנבחרו",
                  )}
                >
                  ×
                </button>
              </>
            ) : (
              <>
                <span className="text-[12px] font-medium text-text">
                  {copy(
                    "Live door matrix",
                    "Живая матрица дверей",
                    "מטריצת דלתות חיה",
                  )}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    scrollToProjectSection("project-door-matrix")
                  }
                  className="ms-auto rounded-full border border-border bg-surface px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface-subtle"
                >
                  {copy(
                    "Open full matrix",
                    "Открыть полную матрицу",
                    "פתח מטריצה מלאה",
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        <details className="border-t border-border-subtle bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[12px] font-semibold text-text hover:bg-surface-subtle">
            <span>
              {copy(
                "Operational summary",
                "Операционная сводка",
                "סיכום תפעולי",
              )}
            </span>
            <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[10.5px] font-medium text-text-secondary">
              {projectInstalledDoors}/{projectTotalDoors || 0}{" "}
              {copy("doors", "дверей", "דלתות")}
            </span>
          </summary>
        <div className="border-b border-border-subtle bg-surface px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className={projectsMetricLabelClass}>
                {copy(
                  "Object execution",
                  "Ход работ по объекту",
                  "ביצוע באתר",
                )}
              </div>
              <h3 className="mt-1 text-[15px] font-semibold text-text">
                {copy(
                  "Door installation control",
                  "Контроль монтажа дверей",
                  "בקרת התקנת דלתות",
                )}
              </h3>
              <p className="mt-1 max-w-3xl text-[12px] leading-5 text-text-secondary">
                {copy(
                  "A short dispatcher view: installed, assigned, open issues and the next working sections for this project.",
                  "Короткий диспетчерский срез: что установлено, что назначено, где проблемы и куда переходить дальше по объекту.",
                  "תמונת מצב קצרה: מה הותקן, מה שובץ, איפה יש בעיות ולאן ממשיכים בפרויקט.",
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <PillButton
                variant="accent"
                size="sm"
                data-testid="project-detail-v28-open-doors"
                onClick={() => {
                  setMatrixIssueFilter("all");
                  scrollToProjectSection("project-door-matrix");
                }}
              >
                {copy("Open doors", "Открыть двери", "פתח דלתות")}
              </PillButton>
              <PillButton
                variant={
                  projectOpenIssues > 0 ? "destructive" : "secondary"
                }
                size="sm"
                data-testid="project-detail-v28-open-issues"
                onClick={() => {
                  setMatrixIssueFilter("issues");
                  scrollToProjectSection("project-door-matrix");
                }}
              >
                {copy("Problems", "Проблемы", "בעיות")}
              </PillButton>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-lg border border-border bg-surface-subtle px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className={projectsMetricLabelClass}>
                  {copy("Progress", "Прогресс", "התקדמות")}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <LtrText
                    as="span"
                    className="text-[22px] font-medium leading-none text-text"
                  >
                    {projectInstalledDoors}/{projectTotalDoors || 0}
                  </LtrText>
                  <span className="text-[12px] font-medium text-text-secondary">
                    {formatPct(projectCompletionPct)}
                  </span>
                </div>
              </div>
              <div className="min-w-[220px] flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      projectOpenIssues > 0
                        ? "bg-kpi-orange"
                        : "bg-kpi-green",
                    )}
                    style={{
                      width: `${Math.min(
                        Math.max(projectCompletionPct, 0),
                        100,
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-text-secondary">
                  <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                    {copy("Assigned", "Назначено", "שובץ")}:{" "}
                    {projectDoorTotals.assignedCount}
                  </span>
                  <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                    {copy("Unassigned", "Без назначения", "לא שובץ")}:{" "}
                    {projectUnassignedDoors}
                  </span>
                  <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                    {copy("Open", "Осталось", "פתוח")}:{" "}
                    {projectDoorTotals.openCount}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1",
                      projectOpenIssues > 0
                        ? "border-status-problem-border bg-status-problem-bg text-status-problem-fg"
                        : "border-status-ok-border bg-status-ok-bg text-status-ok-fg",
                    )}
                  >
                    {copy("Issues", "Проблемы", "בעיות")}:{" "}
                    {projectOpenIssues}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface px-3 py-3">
              <div className={projectsMetricLabelClass}>
                {copy("Status mix", "Статусы дверей", "סטטוס דלתות")}
              </div>
              <div className="mt-2 space-y-2 text-[12px] text-text-secondary">
                {[
                  {
                    label: copy(
                      "Installed",
                      "Установлено",
                      "הותקן",
                    ),
                    value: matrixLegendCounts.installed,
                    tone: "bg-kpi-green",
                  },
                  {
                    label: copy("In work", "В работе", "בעבודה"),
                    value: matrixLegendCounts.inProgress,
                    tone: "bg-kpi-blue",
                  },
                  {
                    label: copy(
                      "Not installed",
                      "Не установлено",
                      "לא הותקן",
                    ),
                    value: matrixLegendCounts.notInstalled,
                    tone: "bg-kpi-yellow",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-[3px]",
                          item.tone,
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <LtrText className="font-medium text-text">
                      {item.value}
                    </LtrText>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface px-3 py-3">
              <div className={projectsMetricLabelClass}>
                {copy("Critical view", "Критический срез", "מבט קריטי")}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className="text-[10.5px] text-text-secondary">
                    {copy("Locked", "Заблокировано", "נעול")}
                  </div>
                  <div className="mt-1 text-[16px] font-medium text-text tabular-nums">
                    {matrixLegendCounts.locked}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className="text-[10.5px] text-text-secondary">
                    {copy("Cancelled", "Отменено", "בוטל")}
                  </div>
                  <div className="mt-1 text-[16px] font-medium text-text tabular-nums">
                    {matrixLegendCounts.cancelled}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className="text-[10.5px] text-text-secondary">
                    {copy("Documents", "Документы", "מסמכים")}
                  </div>
                  <div className="mt-1 text-[16px] font-medium text-text tabular-nums">
                    {loadingProjectDocuments
                      ? "-"
                      : projectDocuments.length}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className="text-[10.5px] text-text-secondary">
                    {copy("Imports", "Импорты", "יבוא")}
                  </div>
                  <div className="mt-1 text-[16px] font-medium text-text tabular-nums">
                    {loadingImportHistory ? "-" : importHistory.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface px-3 py-3">
              <div className={projectsMetricLabelClass}>
                {copy("Next sections", "Следующие разделы", "המשך")}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => scrollToProjectSection("project-documents")}
                  className="rounded-full border border-border bg-surface-subtle px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface"
                >
                  {copy("Documents", "Документы", "מסמכים")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    scrollToProjectSection(
                      projectFinancialReady
                        ? "project-financial-screen"
                        : "project-commercial-restricted",
                    )
                  }
                  className="rounded-full border border-border bg-surface-subtle px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface"
                >
                  {copy("Finance", "Финансы", "כספים")}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToProjectSection("project-import-history")}
                  className="rounded-full border border-border bg-surface-subtle px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface"
                >
                  {copy("Activity", "Активность", "פעילות")}
                </button>
                {selectedProjectId ? (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/reports?project_id=${encodeURIComponent(
                          selectedProjectId,
                        )}`,
                      )
                    }
                    className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface-subtle"
                  >
                    {copy("Report", "Отчёт", "דוח")}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        </details>
      </section>

      <ProjectSideWidgets
        canViewRates={canViewProjectRates}
        restrictedTitle={commercialAccessRestrictedTitle}
        formatMoney={formatMoney}
        details={projectDetails}
        financialReady={projectFinancialReady}
        openIssues={projectOpenIssues}
        planFact={projectPlanFact}
        risk={projectRisk}
        importHistory={importHistory}
        assignedInstallers={projectAssignedInstallerSummary}
        scrollToSection={scrollToProjectSection}
        tokenLabel={tokenLabel}
        onMatrixIssueFilterChange={setMatrixIssueFilter}
      />
    </div>
  );
}
