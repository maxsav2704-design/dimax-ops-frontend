"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MetricRow, PillButton } from "@/components/dimax";
import { DoorMatrixTile } from "@/components/projects/DoorMatrixTile";
import { type InstallerListItem } from "@/components/projects/catalog-types";
import { useDoorWorkspace } from "@/components/projects/door-workspace/useDoorWorkspace";
import { projectsMetricLabelClass } from "@/components/projects/project-form";
import { issueLabel } from "@/components/projects/shared";
import { LtrText } from "@/components/ui/LtrText";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, FilterX, UserPlus } from "lucide-react";
import { useCopy, useI18n } from "@/lib/i18n";

import type { ReasonItem } from "@/components/projects/catalog-types";
import { matrixCompletionPct, matrixDoorTileLabel, matrixDoorTileTone, matrixProgressTone } from "@/components/projects/door-workspace/matrix-shared";
import { projectsPanelClass } from "@/components/projects/shared";

type DoorMatrixProps = {
  workspace: ReturnType<typeof useDoorWorkspace>;
  canManageProjects: boolean;
  canViewProjectRates: boolean;
  activeInstallerById: Map<string, InstallerListItem>;
  activeInstallers: InstallerListItem[];
  installersReady: boolean;
  reasons: ReasonItem[];
  activeReasons: ReasonItem[];
  loadingReasons: boolean;
  reasonsReady: boolean;
  reasonsError: boolean;
  importHistoryCount: number;
  documentsCount: number;
  addonPlanCount: number;
  referenceUnavailable: string;
  locationLabel: (value: string | null | undefined) => string;
  tokenLabel: (value: string) => string;
  scrollToProjectSection: (sectionId: string) => void;
  matrixInstallerFilterControl: ReactNode;
  onBulkAssign: () => Promise<void>;
  onMarkInstalled: () => Promise<void>;
  onMarkNotInstalled: () => Promise<void>;
  children: ReactNode;
};

// Projects → door matrix card: filter row, floor/apartment tiles, bulk assign and the focused-door panel; the ledger renders as children. Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function DoorMatrix({
  workspace,
  canManageProjects,
  canViewProjectRates,
  activeInstallerById,
  activeInstallers,
  installersReady,
  reasons,
  activeReasons,
  loadingReasons,
  reasonsReady,
  reasonsError,
  importHistoryCount,
  documentsCount,
  addonPlanCount,
  referenceUnavailable,
  locationLabel,
  tokenLabel,
  scrollToProjectSection,
  matrixInstallerFilterControl,
  onBulkAssign,
  onMarkInstalled,
  onMarkNotInstalled,
  children,
}: DoorMatrixProps) {
  const router = useRouter();
  const { t } = useI18n();
  const copy = useCopy();
  const {
    allFilteredDoorsSelected,
    bulkAssignInstallerId,
    bulkAssignLoading,
    doorStatusAction,
    filteredDoorIds,
    filteredMatrixRows,
    filteredMatrixSummary,
    focusedDoorComment,
    focusedDoorId,
    focusedDoorInstaller,
    focusedDoorIssues,
    focusedDoorOverrideReason,
    focusedDoorReasonId,
    focusedDoorRow,
    hiddenSelectedDoorCount,
    matrixApartmentSearch,
    matrixDoorType,
    matrixDoorTypeOptions,
    matrixFloor,
    matrixFloorOptions,
    matrixHouse,
    matrixHouseOptions,
    matrixIssueFilter,
    matrixLegendCounts,
    matrixLocation,
    matrixLocationOptions,
    matrixMarkingSearch,
    matrixOrderNumber,
    matrixOrderNumberOptions,
    matrixRows,
    matrixStatus,
    matrixStatusOptions,
    projectDetailMatrix,
    projectDoorTotals,
    resetMatrixFilters,
    selectedDoorIdSet,
    selectedDoorIds,
    setBulkAssignInstallerId,
    setFocusedDoorComment,
    setFocusedDoorId,
    setFocusedDoorOverrideReason,
    setFocusedDoorReasonId,
    setMatrixApartmentSearch,
    setMatrixDoorType,
    setMatrixFloor,
    setMatrixHouse,
    setMatrixIssueFilter,
    setMatrixLocation,
    setMatrixMarkingSearch,
    setMatrixOrderNumber,
    setMatrixStatus,
    setSelectedDoorIds,
    toggleDoorSelection,
    toggleFilteredDoorSelection,
  } = workspace;

  return (
    <div
      id="project-door-matrix"
      tabIndex={-1}
      className={projectsPanelClass("overflow-hidden p-4")}
    >
      <div className="-mx-4 -mt-4 mb-4 flex gap-0.5 overflow-x-auto border-b border-border bg-surface px-2 pt-1">
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
            label: t("projects.doors"),
            count: projectDoorTotals.totalDoors,
            active: matrixIssueFilter === "all",
            danger: false,
            onClick: () => {
              setMatrixIssueFilter("all");
              scrollToProjectSection("project-door-matrix");
            },
          },
          {
            key: "issues",
            label: t("projects.issues"),
            count: projectDoorTotals.issueCount,
            active: matrixIssueFilter === "issues",
            danger: projectDoorTotals.issueCount > 0,
            onClick: () => {
              setMatrixIssueFilter("issues");
              scrollToProjectSection("project-door-matrix");
            },
          },
          {
            key: "addons",
            label: t("projects.addons"),
            count: addonPlanCount,
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
            count: documentsCount,
            active: false,
            danger: false,
            onClick: () => scrollToProjectSection("project-documents"),
          },
          {
            key: "activity",
            label: copy("Import history", "История импорта", "היסטוריית ייבוא"),
            count: importHistoryCount,
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
            data-testid={`project-detail-tab-${item.key}`}
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
                  item.active &&
                    "bg-text text-text-inverse",
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
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className={projectsMetricLabelClass}>
            {t("projects.doorAllocationMatrix")}
          </div>
          <h3 className="mt-1 text-[15px] font-semibold text-text">
            {t("projects.projectDetailMatrix")}
          </h3>
          <p className="text-[12px] text-text-secondary mt-1">
            {t("projects.visualCut")}
          </p>
        </div>
        <div className="text-[12px] text-text-secondary">
          {t("projects.visibleCount")
            .replace(
              "{filtered}",
              String(filteredMatrixRows.length),
            )
            .replace("{total}", String(matrixRows.length))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {[
          {
            label: t("projects.orders"),
            value: filteredMatrixSummary.orders,
          },
          {
            label: t("projects.houses"),
            value: filteredMatrixSummary.houses,
          },
          {
            label: t("projects.floors"),
            value: filteredMatrixSummary.floors,
          },
          {
            label: t("projects.apartments"),
            value: filteredMatrixSummary.apartments,
          },
          {
            label: t("projects.locations"),
            value: filteredMatrixSummary.locations,
          },
          {
            label: t("projects.markings"),
            value: filteredMatrixSummary.markings,
          },
          {
            label: t("projects.assigned"),
            value: filteredMatrixSummary.assignedCount,
          },
          {
            label: t("common.open"),
            value: filteredMatrixSummary.openCount,
          },
          {
            label: t("projects.blockers"),
            value: filteredMatrixSummary.issuesCount,
          },
        ].map((item) => (
          <span
            key={item.label}
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text"
          >
            {item.label}: {item.value}
          </span>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 border-y border-border-subtle bg-surface-subtle px-3 py-2 text-[10.5px] text-text-secondary">
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
            label: t("projects.issues"),
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
            <LtrText
              as="span"
              className="font-normal text-text-tertiary"
            >
              {item.value}
            </LtrText>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
        <select
          value={matrixOrderNumber}
          onChange={(e) => setMatrixOrderNumber(e.target.value)}
          aria-label={t("projects.allOrders")}
          className="control-input h-9 text-[12px]"
        >
          <option value="all">{t("projects.allOrders")}</option>
          {matrixOrderNumberOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={matrixHouse}
          onChange={(e) => setMatrixHouse(e.target.value)}
          aria-label={t("projects.allHouses")}
          className="control-input h-9 text-[12px]"
        >
          <option value="all">{t("projects.allHouses")}</option>
          {matrixHouseOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={matrixFloor}
          onChange={(e) => setMatrixFloor(e.target.value)}
          aria-label={t("projects.allFloors")}
          className="control-input h-9 text-[12px]"
        >
          <option value="all">{t("projects.allFloors")}</option>
          {matrixFloorOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={matrixLocation}
          onChange={(e) => setMatrixLocation(e.target.value)}
          aria-label={t("projects.allLocations")}
          className="control-input h-9 text-[12px]"
        >
          <option value="all">{t("projects.allLocations")}</option>
          {matrixLocationOptions.map((value) => (
            <option key={value} value={value}>
              {locationLabel(value)}
            </option>
          ))}
        </select>
        <select
          value={matrixDoorType}
          onChange={(e) => setMatrixDoorType(e.target.value)}
          aria-label={t("projects.allDoorTypes")}
          className="control-input h-9 text-[12px]"
        >
          <option value="all">{t("projects.allDoorTypes")}</option>
          {matrixDoorTypeOptions.map((value) => (
            <option key={value.id} value={value.id}>
              {value.label}
            </option>
          ))}
        </select>
        <select
          value={matrixStatus}
          onChange={(e) => setMatrixStatus(e.target.value)}
          aria-label={t("projects.allStatuses")}
          className="control-input h-9 text-[12px]"
        >
          <option value="all">{t("projects.allStatuses")}</option>
          {matrixStatusOptions.map((value) => (
            <option key={value} value={value}>
              {tokenLabel(value)}
            </option>
          ))}
        </select>
        <input
          value={matrixApartmentSearch}
          onChange={(e) => setMatrixApartmentSearch(e.target.value)}
          placeholder={t("projects.apartmentPlaceholder")}
          aria-label={t("projects.apartmentPlaceholder")}
          autoComplete="off"
          className="control-input h-9 text-[12px]"
        />
        {matrixInstallerFilterControl}
        <input
          value={matrixMarkingSearch}
          onChange={(e) => setMatrixMarkingSearch(e.target.value)}
          placeholder={t("projects.markingPlaceholder")}
          aria-label={t("projects.markingPlaceholder")}
          autoComplete="off"
          className="control-input h-9 text-[12px]"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetMatrixFilters}
          className="h-9 text-[12px]"
        >
          <FilterX className="w-3.5 h-3.5" aria-hidden="true" />
          {t("projects.reset")}
        </Button>
      </div>

      {focusedDoorRow ? (
        <div
          data-testid="project-door-info-frame"
          aria-live="polite"
          className="sticky top-3 z-20 mb-3 overflow-hidden rounded-lg border border-border-strong bg-surface shadow-[var(--dmx-shadow-overlay)] ring-1 ring-black/5"
        >
          <span
            className={cn(
              "block h-1 w-full",
              focusedDoorRow.issue_count > 0
                ? "bg-kpi-red"
                : "bg-[var(--dmx-accent)]",
            )}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-3 border-b border-border-subtle bg-surface px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className={projectsMetricLabelClass}>
                {copy("Door details", "Карточка двери", "פרטי דלת")}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h4 className="text-[16px] font-semibold leading-tight text-text">
                  <LtrText as="span">
                    {focusedDoorRow.door_marking}
                  </LtrText>
                </h4>
                <StatusBadge
                  status={focusedDoorRow.status}
                  label={tokenLabel(focusedDoorRow.status)}
                  domain="door"
                />
                {focusedDoorRow.issue_count > 0 ? (
                  <span className="rounded-full border border-status-problem-border bg-status-problem-bg px-2.5 py-1 text-[11px] font-medium text-status-problem-fg">
                    {copy("Problem", "Проблема", "בעיה")} ·{" "}
                    {focusedDoorRow.issue_count}
                  </span>
                ) : (
                  <span className="rounded-full border border-status-ok-border bg-status-ok-bg px-2.5 py-1 text-[11px] font-medium text-status-ok-fg">
                    {copy("No open issues", "Нет открытых проблем", "אין בעיות פתוחות")}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[12px] text-text-secondary">
                <LtrText as="span">
                  {focusedDoorRow.order_number}
                </LtrText>{" "}
                · {copy("house", "корпус", "בניין")}{" "}
                <LtrText as="span">
                  {focusedDoorRow.house_number}
                </LtrText>{" "}
                · {copy("floor", "этаж", "קומה")}{" "}
                <LtrText as="span">
                  {focusedDoorRow.floor_label}
                </LtrText>{" "}
                · {copy("apt", "кв.", "דירה")}{" "}
                <LtrText as="span">
                  {focusedDoorRow.apartment_number}
                </LtrText>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <PillButton
                variant={
                  selectedDoorIdSet.has(focusedDoorRow.door_id)
                    ? "secondary"
                    : "accent"
                }
                size="sm"
                data-testid="project-door-info-select"
                disabled={!canManageProjects}
                onClick={() =>
                  toggleDoorSelection(focusedDoorRow.door_id)
                }
              >
                {selectedDoorIdSet.has(focusedDoorRow.door_id)
                  ? copy("Unselect", "Убрать выбор", "בטל בחירה")
                  : copy("Select for assignment", "Выбрать для назначения", "בחר לשיבוץ")}
              </PillButton>
              <PillButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMatrixOrderNumber(focusedDoorRow.order_number);
                  scrollToProjectSection("project-door-matrix");
                }}
              >
                {copy("Show order", "Показать заказ", "הצג הזמנה")}
              </PillButton>
              <PillButton
                variant="ghost"
                size="sm"
                onClick={() => setFocusedDoorId(null)}
              >
                {copy("Close", "Закрыть", "סגור")}
              </PillButton>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <MetricRow
                label={copy("Unit", "Позиция", "מיקום")}
                value={<LtrText>{focusedDoorRow.unit_label}</LtrText>}
                barColor="blue"
              />
              <MetricRow
                label={copy("Door type", "Тип двери", "סוג דלת")}
                value={focusedDoorRow.door_type_label}
                barColor="yellow"
              />
              <MetricRow
                label={copy("Location", "Локация", "מיקום")}
                value={locationLabel(focusedDoorRow.location_code)}
                barColor="green"
              />
              <MetricRow
                label={copy("Installer", "Монтажник", "מתקין")}
                value={
                  focusedDoorInstaller?.full_name ||
                  copy("Unassigned", "Не назначен", "לא שובץ")
                }
                barColor={focusedDoorInstaller ? "green" : "orange"}
              />
            </div>

            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className={projectsMetricLabelClass}>
                  {copy("Open issues", "Открытые проблемы", "בעיות פתוחות")}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMatrixIssueFilter("issues");
                    scrollToProjectSection("project-door-matrix");
                  }}
                  className="text-[11.5px] font-medium text-link hover:underline"
                >
                  {copy("Filter issues", "Фильтр проблем", "סנן בעיות")}
                </button>
              </div>
              {focusedDoorIssues.length === 0 ? (
                <div className="mt-2 text-[12px] leading-5 text-text-secondary">
                  {copy(
                    "This door has no open issue in the project log.",
                    "По этой двери нет открытой проблемы в журнале объекта.",
                    "לדלת הזו אין בעיה פתוחה ביומן הפרויקט.",
                  )}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {focusedDoorIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-lg border border-status-problem-border bg-status-problem-bg px-3 py-2"
                    >
                      <div className="line-clamp-2 text-[12px] font-medium text-status-problem-fg">
                        {issueLabel(issue)}
                      </div>
                      <div className="mt-1 text-[10.5px] text-text-secondary">
                        {copy("Status", "Статус", "סטטוס")}:{" "}
                        {tokenLabel(issue.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3 lg:col-span-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className={projectsMetricLabelClass}>
                    {copy(
                      "Status action",
                      "Действие по статусу",
                      "פעולת סטטוס",
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,0.75fr)_minmax(260px,1fr)]">
                    <select
                      aria-label={copy(
                        "Not installed reason",
                        "Причина неустановки",
                        "סיבת אי התקנה",
                      )}
                      data-testid="project-door-reason-select"
                      value={focusedDoorReasonId}
                      onChange={(event) =>
                        setFocusedDoorReasonId(event.target.value)
                      }
                      disabled={
                        !reasonsReady || doorStatusAction !== null
                      }
                      className="control-input h-9 text-[12px]"
                    >
                      <option value="">
                        {loadingReasons
                          ? copy(
                              "Loading reasons...",
                              "Загружаем причины...",
                              "טוען סיבות...",
                            )
                          : copy(
                              "Choose reason for not installed",
                              "Выберите причину неустановки",
                              "בחר סיבת אי התקנה",
                            )}
                      </option>
                      {activeReasons.map((reason) => (
                        <option key={reason.id} value={reason.id}>
                          {reason.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={focusedDoorComment}
                      onChange={(event) =>
                        setFocusedDoorComment(event.target.value)
                      }
                      disabled={doorStatusAction !== null}
                      placeholder={copy(
                        "Optional field note",
                        "Комментарий с объекта, если нужен",
                        "הערת שטח אופציונלית",
                      )}
                      aria-label={copy(
                        "Door status comment",
                        "Комментарий к статусу двери",
                        "הערת סטטוס לדלת",
                      )}
                      data-testid="project-door-status-comment"
                      className="control-input h-9 text-[12px]"
                    />
                  </div>
                  {focusedDoorRow.status === "INSTALLED" ? (
                    <input
                      value={focusedDoorOverrideReason}
                      onChange={(event) =>
                        setFocusedDoorOverrideReason(
                          event.target.value,
                        )
                      }
                      disabled={doorStatusAction !== null}
                      maxLength={500}
                      placeholder={copy(
                        "Required admin override reason",
                        "Требуемая причина переопределения администратором",
                        "נדרשת סיבה לעקוף מנהל מערכת",
                      )}
                      aria-label={copy(
                        "Admin override reason",
                        "Причина отмены администратором",
                        "סיבה לעקוף מנהל המערכת",
                      )}
                      data-testid="project-door-override-reason"
                      className="control-input mt-2 h-9 text-[12px]"
                    />
                  ) : null}
                  {reasonsError ? (
                    <p className="mt-2 text-[11.5px] text-status-problem-fg">{referenceUnavailable}</p>
                  ) : activeReasons.length === 0 && !loadingReasons ? (
                    <button
                      type="button"
                      onClick={() => router.push("/reasons")}
                      className="mt-2 text-[11.5px] font-medium text-link hover:underline"
                    >
                      {copy(
                        "No active reasons. Open reason catalog.",
                        "Нет активных причин. Открыть справочник причин.",
                        "אין סיבות פעילות. פתח קטלוג סיבות.",
                      )}
                    </button>
                  ) : (
                    <div className="mt-2 text-[11.5px] leading-5 text-text-secondary">
                      {focusedDoorRow.status === "INSTALLED"
                        ? copy(
                            "Installed doors are locked. Admin override reverses completed work, reopens an issue and writes audit history.",
                            "Установленные двери запираются. Администраторское переопределение отменяет завершенную работу, повторно открывает проблему и записывает историю аудита.",
                            "דלתות מותקנות ננעלות. עקיפה של מנהל מערכת הופכת עבודה שהושלמה, פותחת בעיה מחדש וכותבת היסטוריית ביקורת.",
                          )
                        : copy(
                            "Not installed always requires a reason and writes an issue to the project log.",
                            "Неустановка всегда требует причину и записывает проблему в журнал объекта.",
                            "אי התקנה תמיד דורשת סיבה ונרשמת כיומן בעיות בפרויקט.",
                          )}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <PillButton
                    variant="accent"
                    size="sm"
                    iconStart={
                      <CheckCircle2
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    }
                    loading={doorStatusAction === "install"}
                    disabled={
                      !canManageProjects ||
                      doorStatusAction !== null ||
                      focusedDoorRow.status === "INSTALLED"
                    }
                    data-testid="project-door-mark-installed"
                    onClick={() =>
                      void onMarkInstalled()
                    }
                  >
                    {focusedDoorRow.status === "INSTALLED"
                      ? copy(
                          "Installed",
                          "Установлена",
                          "הותקנה",
                        )
                      : copy(
                          "Mark installed",
                          "Отметить установленной",
                          "סמן כהותקנה",
                        )}
                  </PillButton>
                  <PillButton
                    variant="destructive"
                    size="sm"
                    iconStart={
                      <AlertCircle
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    }
                    loading={
                      doorStatusAction === "not-installed" ||
                      doorStatusAction ===
                        "override-not-installed"
                    }
                    disabled={
                      !canManageProjects ||
                      doorStatusAction !== null ||
                      !focusedDoorReasonId ||
                      !reasonsReady ||
                      (focusedDoorRow.status === "INSTALLED" &&
                        !focusedDoorOverrideReason.trim())
                    }
                    data-testid="project-door-mark-not-installed"
                    onClick={() =>
                      void onMarkNotInstalled()
                    }
                  >
                    {focusedDoorRow.status === "INSTALLED"
                      ? copy(
                          "Override to not installed",
                          "Откатить в неустановленную",
                          "החזר ללא הותקנה",
                        )
                      : copy(
                          "Save not installed",
                          "Сохранить неустановку",
                          "שמור אי התקנה",
                        )}
                  </PillButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          data-testid="project-door-info-empty"
          className="mb-3 rounded-lg border border-dashed border-border bg-surface-subtle px-4 py-3 text-[12px] text-text-secondary"
        >
          {copy(
            "Click any door tile or table row to inspect status, assignment and open issues.",
            "Нажмите на плитку или строку двери, чтобы посмотреть статус, назначение и открытые проблемы.",
            "לחץ על אריח או שורה של דלת כדי לראות סטטוס, שיבוץ ובעיות פתוחות.",
          )}
        </div>
      )}

      <div className="mb-3 rounded-lg border border-border bg-surface-subtle p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="checkbox-row h-9 rounded-lg border border-border bg-surface px-3 text-[12px]">
              <input
                type="checkbox"
                checked={allFilteredDoorsSelected}
                disabled={!canManageProjects || filteredDoorIds.length === 0}
                onChange={toggleFilteredDoorSelection}
              />
              <span>
                {copy(
                  "Select visible doors",
                  "Выбрать видимые двери",
                  "בחר דלתות מוצגות",
                )}
              </span>
            </label>
            <div className="text-[12px] text-text-secondary">
              {copy("Selected", "Выбрано", "נבחרו")}:{" "}
              {selectedDoorIds.length}
              {hiddenSelectedDoorCount > 0 && (
                <span role="status" className="ms-2 text-status-warning-fg">
                  {copy("Hidden by filters", "Скрыто фильтрами", "מוסתרות על ידי מסננים")}: {hiddenSelectedDoorCount}
                </span>
              )}
            </div>
            {canManageProjects && hiddenSelectedDoorCount > 0 && (
              <Button
                type="button" variant="outline" size="sm" disabled={bulkAssignLoading}
                onClick={() => setSelectedDoorIds((current) => current.filter((id) => filteredDoorIds.includes(id)))}
              >
                <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                {copy("Deselect hidden", "Снять скрытое выделение", "ביטול בחירה מוסתרת")}
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label={copy(
                "Bulk assign installer",
                "Массовое назначение монтажника",
                "שיוך מתקין קבוצתי",
              )}
              value={bulkAssignInstallerId}
              onChange={(event) =>
                setBulkAssignInstallerId(event.target.value)
              }
              disabled={
                !canManageProjects ||
                !installersReady || bulkAssignLoading || selectedDoorIds.length === 0
              }
              className="control-input h-9 min-w-[220px] text-[12px]"
            >
              <option value="">
                {copy(
                  "Choose installer",
                  "Выберите монтажника",
                  "בחר מתקין",
                )}
              </option>
              {activeInstallers.map((installer) => (
                <option key={installer.id} value={installer.id}>
                  {installer.full_name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              onClick={() => void onBulkAssign()}
              disabled={
                !canManageProjects ||
                bulkAssignLoading ||
                selectedDoorIds.length === 0 ||
                !installersReady || !activeInstallerById.has(bulkAssignInstallerId)
              }
              className="h-9 text-[12px]"
            >
              <UserPlus
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
              {bulkAssignLoading
                ? copy("Assigning...", "Назначаем...", "משייך...")
                : copy(
                    "Assign selected",
                    "Назначить выбранные",
                    "שייך נבחרות",
                  )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedDoorIds([])}
              disabled={
                !canManageProjects ||
                bulkAssignLoading || selectedDoorIds.length === 0
              }
              className="h-9 text-[12px]"
            >
              <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
              {copy("Clear", "Очистить", "נקה")}
            </Button>
          </div>
        </div>
      </div>

      {filteredMatrixRows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-subtle px-4 py-8 text-[13px] text-text-secondary">
          {t("projects.noDoorsForFilters")}
        </div>
      ) : (
        <div className="space-y-4">
          {projectDetailMatrix.map((house) => (
            <section
              key={house.house_number}
              className="rounded-lg border border-border bg-surface"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <div className={projectsMetricLabelClass}>
                    {copy("Building", "Дом", "בניין")}
                  </div>
                  <div className="text-[15px] font-semibold text-text mt-1">
                    {house.house_number}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      label: t("projects.doors"),
                      value: house.total_doors,
                    },
                    {
                      label: t("projects.apartments"),
                      value: house.apartments_count,
                    },
                    {
                      label: t("installerProject.installed"),
                      value: house.installed_count,
                    },
                    {
                      label: t("common.open"),
                      value: house.open_count,
                    },
                    {
                      label: t("projects.blockers"),
                      value: house.issue_count,
                    },
                  ].map((item) => (
                    <span
                      key={`${house.house_number}-${item.label}`}
                      className="rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[11px] text-text"
                    >
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3 bg-surface-subtle p-4">
                {house.floors.map((floor) => {
                  const floorProgressPct = matrixCompletionPct(
                    floor.installed_count,
                    floor.total_doors,
                  );
                  const floorDoors = floor.apartments.flatMap(
                    (apartment) =>
                      apartment.cells.flatMap((cell) =>
                        cell.doors.map((door) => ({
                          apartment,
                          cell,
                          door,
                        })),
                      ),
                  );
                  return (
                  <article
                    key={`${house.house_number}-${floor.floor_label}`}
                    data-testid={`project-detail-v28-full-floor-row-${house.house_number}-${floor.floor_label}`}
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
                          floorProgressPct,
                        ),
                      )}
                      aria-hidden="true"
                    />
                    <div className="grid gap-3 border-b border-border-subtle bg-surface pe-4 ps-5 py-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
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
                          <h4 className="min-w-0 truncate text-[14px] font-semibold text-text">
                            {copy("Floor", "Этаж", "קומה")}{" "}
                            <LtrText as="span">
                              {floor.floor_label}
                            </LtrText>
                          </h4>
                          <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-surface-subtle px-2.5 text-[10.5px] font-medium text-text-secondary">
                            {copy("House", "Корпус", "בניין")}{" "}
                            <LtrText as="span">
                              {house.house_number}
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
                            {floorProgressPct}%
                          </LtrText>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              matrixProgressTone(
                                floor.issue_count,
                                floorProgressPct,
                              ),
                            )}
                            style={{ width: `${floorProgressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-border-subtle bg-surface px-4 py-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-secondary">
                        <span className="font-medium text-text-secondary">
                          {copy("Door matrix", "Матрица дверей", "מטריצת דלתות")}
                        </span>
                        <span className="tabular-nums">
                          {floorDoors.length}{" "}
                          {copy("doors", "дверей", "דלתות")} ·{" "}
                          {floor.apartments.length}{" "}
                          {copy("apartments", "квартир", "דירות")} ·{" "}
                          {floor.location_codes.length}{" "}
                          {copy("locations", "локаций", "מיקומים")}
                        </span>
                      </div>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(144px,1fr))] gap-2">
                        {floorDoors.map(({ apartment, cell, door }) => (
                          <DoorMatrixTile
                                key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-${cell.location_code}-${door.door_id}-tile`}
                                marking={matrixDoorTileLabel(door)}
                                status={tokenLabel(door.status)}
                                tone={matrixDoorTileTone(door)}
                                focused={focusedDoorId === door.door_id}
                                selected={selectedDoorIdSet.has(door.door_id)}
                                hasIssues={door.issue_count > 0}
                                inspectLabel={copy(
                                  "Inspect door {door}",
                                  "Открыть дверь {door}",
                                  "פתח דלת {door}",
                                ).replace(
                                  "{door}",
                                  door.door_marking,
                                )}
                                context={`${apartment.apartment_number} · ${locationLabel(
                                  cell.location_code,
                                )}`}
                                onInspect={() =>
                                  setFocusedDoorId(door.door_id)
                                }
                                onToggleSelection={() =>
                                  toggleDoorSelection(door.door_id)
                                }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 p-3 md:hidden">
                      {floor.apartments.map((apartment) => (
                        <article
                          key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-mobile`}
                          className="rounded-lg border border-border bg-surface px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className={projectsMetricLabelClass}>
                                {copy("Apartment", "Квартира", "דירה")}
                              </div>
                              <div className="mt-1 text-[14px] font-semibold text-text">
                                <LtrText>
                                  {apartment.apartment_number}
                                </LtrText>
                              </div>
                            </div>
                            <div className="shrink-0 text-end">
                              <div className={projectsMetricLabelClass}>
                                {t("projects.doors")}
                              </div>
                              <div className="mt-1 text-[17px] font-medium leading-tight text-text tabular-nums">
                                {apartment.total_doors}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {apartment.order_numbers.map(
                              (orderNumber) => (
                                <span
                                  key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-mobile-${orderNumber}`}
                                  className="rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[11px] text-text"
                                >
                                  <LtrText>{orderNumber}</LtrText>
                                </span>
                              ),
                            )}
                          </div>

                          <div className="mt-3 space-y-2">
                            {apartment.cells.map((cell) =>
                              cell.doors.map((door) => (
                                <button
                                  key={`${apartment.apartment_number}-${door.door_id}-mobile`}
                                  type="button"
                                  data-testid={`project-matrix-mobile-door-card-${door.door_id}`}
                                  aria-label={copy(
                                    "Open door detail {door}",
                                    "Открыть карточку двери {door}",
                                    "פתח כרטיס דלת {door}",
                                  ).replace(
                                    "{door}",
                                    door.door_marking,
                                  )}
                                  onClick={() =>
                                    setFocusedDoorId(door.door_id)
                                  }
                                  className={cn(
                                    "w-full rounded-lg border px-2.5 py-2 text-start transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                                    door.issue_count > 0
                                      ? "border-status-problem-border bg-status-problem-bg"
                                      : "border-border bg-surface-subtle",
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate text-[12px] font-semibold text-text">
                                        <LtrText>
                                          {door.door_marking}
                                        </LtrText>
                                      </div>
                                      <div className="mt-0.5 truncate text-[11px] text-text-secondary">
                                        <LtrText>
                                          {door.unit_label}
                                        </LtrText>
                                      </div>
                                    </div>
                                    <StatusBadge
                                      status={door.status}
                                      label={tokenLabel(
                                        door.status,
                                      )}
                                      domain="door"
                                    />
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-text-secondary">
                                    <span>
                                      {locationLabel(
                                        cell.location_code,
                                      )}
                                    </span>
                                    <span>
                                      {door.door_type_label}
                                    </span>
                                    <span>
                                      {door.installer_id
                                        ? t("projects.assigned")
                                        : t("projects.unassigned")}
                                    </span>
                                  </div>
                                  {door.issue_count > 0 ? (
                                    <div className="mt-2 line-clamp-2 break-words text-[11px] text-status-problem-fg">
                                      {door.issue_titles[0] ||
                                        t("projects.openBlocker")}
                                      {door.issue_count > 1
                                        ? ` (+${door.issue_count - 1})`
                                        : ""}
                                    </div>
                                  ) : null}
                                </button>
                              )),
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className={projectsMetricLabelClass}>
                                {t("installerProject.installed")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {apartment.installed_count}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className={projectsMetricLabelClass}>
                                {t("common.open")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {apartment.open_count}
                              </div>
                            </div>
                            <div
                              className={cn(
                                "rounded-lg border px-2.5 py-2",
                                apartment.issue_count > 0
                                  ? "border-status-problem-border bg-status-problem-bg"
                                  : "border-border bg-surface-subtle",
                              )}
                            >
                              <div className={projectsMetricLabelClass}>
                                {t("projects.blockers")}
                              </div>
                              <div
                                className={cn(
                                  "mt-1 text-[13px] font-medium tabular-nums",
                                  apartment.issue_count > 0
                                    ? "text-status-problem-fg"
                                    : "text-text",
                                )}
                              >
                                {apartment.issue_count}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="hidden overflow-auto md:block">
                      <table className="w-full min-w-[920px] border-separate border-spacing-0 text-[12px]">
                        <thead className="bg-surface-subtle text-text-secondary">
                          <tr>
                            <th className="px-3 py-2 text-start font-medium">
                              {copy("Apartment", "Квартира", "דירה")}
                            </th>
                            <th className="px-3 py-2 text-start font-medium">
                              {copy("Order", "Заказ", "הזמנה")}
                            </th>
                            {floor.location_codes.map(
                              (locationCode) => (
                                <th
                                  key={`${house.house_number}-${floor.floor_label}-${locationCode}`}
                                  className="px-3 py-2 text-start font-medium"
                                >
                                  {locationLabel(locationCode)}
                                </th>
                              ),
                            )}
                            <th className="px-3 py-2 text-start font-medium">
                              {t("projects.statusMix")}
                            </th>
                            <th className="px-3 py-2 text-start font-medium">
                              {t("projects.blockers")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {floor.apartments.map((apartment) => (
                            <tr
                              key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}`}
                              className={cn(
                                "align-top transition-colors hover:bg-surface-subtle",
                                apartment.issue_count > 0 &&
                                  "bg-status-problem-bg",
                              )}
                            >
                              <td className="px-3 py-3">
                                <div className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full bg-surface-sunken px-2 text-[12px] font-semibold text-text tabular-nums">
                                  <LtrText as="span">
                                    {apartment.apartment_number}
                                  </LtrText>
                                </div>
                                <div className="text-[11px] text-text-secondary mt-1">
                                  {t("projects.doorsCount").replace(
                                    "{count}",
                                    String(apartment.total_doors),
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {apartment.order_numbers.map(
                                    (orderNumber) => (
                                      <span
                                        key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-${orderNumber}`}
                                        className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text"
                                      >
                                        <LtrText>
                                          {orderNumber}
                                        </LtrText>
                                      </span>
                                    ),
                                  )}
                                </div>
                              </td>
                              {floor.location_codes.map(
                                (locationCode) => {
                                  const cell =
                                    apartment.cells.find(
                                      (item) =>
                                        item.location_code ===
                                        locationCode,
                                    ) || null;
                                  return (
                                    <td
                                      key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-${locationCode}`}
                                      className="px-3 py-3 min-w-[220px]"
                                    >
                                      {!cell ? (
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-sunken text-[12px] text-text-tertiary">
                                          -
                                        </span>
                                      ) : (
                                        <div className="space-y-2">
                                          {cell.doors.map(
                                            (door) => (
                                              <button
                                                key={door.door_id}
                                                type="button"
                                                data-testid={`project-matrix-door-card-${door.door_id}`}
                                                aria-label={copy(
                                                  "Open door detail {door}",
                                                  "Открыть карточку двери {door}",
                                                  "פתח כרטיס דלת {door}",
                                                ).replace(
                                                  "{door}",
                                                  door.door_marking,
                                                )}
                                                onClick={() =>
                                                  setFocusedDoorId(
                                                    door.door_id,
                                                  )
                                                }
                                                className={cn(
                                                  "w-full min-w-0 rounded-lg border px-2.5 py-2 text-start transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                                                  door.issue_count >
                                                    0
                                                    ? "border-status-problem-border bg-status-problem-bg"
                                                    : "border-border bg-surface",
                                                )}
                                              >
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="min-w-0">
                                                    <div className="truncate font-medium text-text">
                                                      <LtrText>
                                                        {
                                                          door.door_marking
                                                        }
                                                      </LtrText>
                                                    </div>
                                                    <div className="truncate text-[11px] text-text-secondary">
                                                      <LtrText>
                                                        {
                                                          door.unit_label
                                                        }
                                                      </LtrText>
                                                    </div>
                                                  </div>
                                                  <StatusBadge
                                                    status={
                                                      door.status
                                                    }
                                                    label={tokenLabel(
                                                      door.status,
                                                    )}
                                                    domain="door"
                                                    className="shrink-0"
                                                  />
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-text-secondary">
                                                  <span>
                                                    {
                                                      door.door_type_label
                                                    }
                                                  </span>
                                                  <span>
                                                    {door.installer_id
                                                      ? t(
                                                          "projects.assigned",
                                                        )
                                                      : t(
                                                          "projects.unassigned",
                                                        )}
                                                  </span>
                                                </div>
                                                {door.issue_count >
                                                0 ? (
                                                  <div className="mt-1 line-clamp-2 break-words text-[10px] text-status-problem-fg">
                                                    {door
                                                      .issue_titles[0] ||
                                                      t(
                                                        "projects.openBlocker",
                                                      )}
                                                    {door.issue_count >
                                                    1
                                                      ? ` (+${door.issue_count - 1})`
                                                    : ""}
                                                  </div>
                                                ) : null}
                                              </button>
                                            ),
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  );
                                },
                              )}
                              <td className="px-3 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text">
                                    {t(
                                      "projects.installedShort",
                                    ).replace(
                                      "{count}",
                                      String(
                                        apartment.installed_count,
                                      ),
                                    )}
                                  </span>
                                  <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text">
                                    {t(
                                      "projects.openShort",
                                    ).replace(
                                      "{count}",
                                      String(apartment.open_count),
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                {apartment.issue_count > 0 ? (
                                  <span className="rounded-full border border-status-problem-border bg-status-problem-bg px-2.5 py-1 text-[11px] text-status-problem-fg">
                                    {t("projects.blockerCount")
                                      .replace(
                                        "{count}",
                                        String(
                                          apartment.issue_count,
                                        ),
                                      )
                                      .replace(
                                        "{suffix}",
                                        apartment.issue_count > 1
                                          ? "s"
                                          : "",
                                      )}
                                  </span>
                                ) : (
                                  <span className="text-text-secondary">
                                    {t("projects.noBlockers")}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
