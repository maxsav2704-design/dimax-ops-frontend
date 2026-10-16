"use client";

import { LEDGER_ROW_PAGE } from "@/components/projects/door-workspace/constants";
import { type MatrixRow } from "@/components/projects/door-workspace/types";
import { projectsMetricLabelClass } from "@/components/projects/project-form";
import { LtrText } from "@/components/ui/LtrText";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { useCopy, useI18n } from "@/lib/i18n";

type DoorLedgerProps = {
  filteredMatrixRows: MatrixRow[];
  visibleMatrixRows: MatrixRow[];
  hiddenMatrixRows: number;
  filteredMatrixSummary: { orders: number; houses: number; floors: number; apartments: number; locations: number; markings: number; installedCount: number; openCount: number; assignedCount: number; issuesCount: number };
  filteredDoorIds: string[];
  selectedDoorIds: string[];
  selectedDoorIdSet: ReadonlySet<string>;
  allFilteredDoorsSelected: boolean;
  focusedDoorId: string | null;
  setFocusedDoorId: (id: string | null) => void;
  setLedgerRowLimit: (value: number | ((prev: number) => number)) => void;
  ledgerDesktop: boolean;
  toggleDoorSelection: (doorId: string) => void;
  toggleFilteredDoorSelection: () => void;
  canManageProjects: boolean;
  locationLabel: (value: string | null | undefined) => string;
  tokenLabel: (value: string) => string;
};

// Projects → door ledger: the filtered doors as cards (< md) or a table (≥ md), selection and paging by 100. Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function DoorLedger({
  filteredMatrixRows,
  visibleMatrixRows,
  hiddenMatrixRows,
  filteredMatrixSummary,
  filteredDoorIds,
  selectedDoorIds,
  selectedDoorIdSet,
  allFilteredDoorsSelected,
  focusedDoorId,
  setFocusedDoorId,
  setLedgerRowLimit,
  ledgerDesktop,
  toggleDoorSelection,
  toggleFilteredDoorSelection,
  canManageProjects,
  locationLabel,
  tokenLabel,
}: DoorLedgerProps) {
  const { t } = useI18n();
  const copy = useCopy();

  return (
    <div id="project-door-ledger" tabIndex={-1} className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border bg-surface px-3 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className={projectsMetricLabelClass}>
            {copy("Audit ledger", "Реестр контроля", "יומן בקרה")}
          </div>
          <div className="mt-1 text-[13px] font-semibold text-text">
            {t("projects.doorLedgerTable")}
          </div>
          <div className="text-[11px] text-text-secondary">
            {t("projects.doorLedgerSubtitle")}
          </div>
        </div>
        <div className="inline-flex w-fit rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[11px] font-medium text-text-secondary">
          {t("projects.rowsCount").replace(
            "{count}",
            String(filteredMatrixRows.length),
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-b border-border-subtle bg-surface-subtle px-3 py-3 md:grid-cols-4">
        {[
          {
            label: copy("Visible", "Видимые", "מוצגות"),
            value: filteredMatrixRows.length,
          },
          {
            label: copy("Selected", "Выбрано", "נבחרו"),
            value: selectedDoorIds.length,
          },
          {
            label: t("projects.blockers"),
            value: filteredMatrixSummary.issuesCount,
          },
          {
            label: copy("Unassigned", "Без назначения", "לא שובצו"),
            value: Math.max(
              filteredMatrixRows.length -
                filteredMatrixSummary.assignedCount,
              0,
            ),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-surface px-2.5 py-2"
          >
            <div className={projectsMetricLabelClass}>
              {item.label}
            </div>
            <div className="mt-1 text-[16px] font-semibold leading-none text-text tabular-nums">
              {item.value}
            </div>
          </div>
        ))}
      </div>
      {!ledgerDesktop && (
      <div className="divide-y divide-border-subtle md:hidden">
        {filteredMatrixRows.length === 0 ? (
          <div className="px-3.5 py-4 text-[12px] text-text-secondary">
            {copy(
              "No doors for selected filters.",
              "Нет дверей для выбранных фильтров.",
              "אין דלתות עבור המסננים שנבחרו.",
            )}
          </div>
        ) : (
          visibleMatrixRows.map((row) => (
            <div
              key={row.door_id}
              data-testid={`project-door-row-${row.door_id}`}
              role="button"
              tabIndex={0}
              onClick={() => setFocusedDoorId(row.door_id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setFocusedDoorId(row.door_id);
                }
              }}
              aria-label={copy(
                "Open door ledger row {door}",
                "Открыть строку реестра двери {door}",
                "פתח שורת יומן דלת {door}",
              ).replace("{door}", row.door_marking)}
              className={cn(
                "cursor-pointer px-3.5 py-3.5 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                row.issue_count > 0 &&
                  "bg-status-problem-bg",
                focusedDoorId === row.door_id &&
                  "bg-[var(--dmx-accent-tint)]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-text">
                    <LtrText>{row.door_marking}</LtrText>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                      <LtrText>{row.order_number}</LtrText>
                    </span>
                    <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                      {locationLabel(row.location_code)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <input
                    type="checkbox"
                    aria-label={copy(
                      "Select door {door}",
                      "Выбрать дверь {door}",
                      "בחר דלת {door}",
                    ).replace("{door}", row.unit_label)}
                    checked={selectedDoorIdSet.has(row.door_id)}
                    disabled={!canManageProjects}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() =>
                      toggleDoorSelection(row.door_id)
                    }
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
                  />
                  <StatusBadge
                    status={row.status}
                    label={tokenLabel(row.status)}
                    domain="door"
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className={projectsMetricLabelClass}>
                    {t("projects.unit")}
                  </div>
                  <div className="mt-1 truncate text-[12px] font-medium text-text">
                    <LtrText>{row.unit_label}</LtrText>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className={projectsMetricLabelClass}>
                    {t("projects.doorType")}
                  </div>
                  <div className="mt-1 truncate text-[12px] font-medium text-text">
                    {row.door_type_label}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className={projectsMetricLabelClass}>
                    {t("projects.houseLabel")}
                  </div>
                  <div className="mt-1 text-[12px] font-medium text-text">
                    <LtrText>{row.house_number}</LtrText>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className={projectsMetricLabelClass}>
                    {t("projects.floorLabel")}
                  </div>
                  <div className="mt-1 text-[12px] font-medium text-text">
                    <LtrText>{row.floor_label}</LtrText>
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] text-text-secondary">
                {t("projects.apt")}:{" "}
                <LtrText>{row.apartment_number}</LtrText>
                <span className="mx-2 text-border-strong">|</span>
                {t("projects.blockers")}:{" "}
                <LtrText>{String(row.issue_count)}</LtrText>
              </div>
            </div>
          ))
        )}
      </div>
      )}
      {ledgerDesktop && (
      <div className="hidden overflow-auto md:block">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[12px] leading-5">
          <thead className="bg-surface-subtle text-text-secondary">
            <tr>
              <th className="w-10 px-2 py-2 text-start font-medium">
                <input
                  type="checkbox"
                  aria-label={copy(
                    "Select visible doors",
                    "Выбрать видимые двери",
                    "בחר דלתות מוצגות",
                  )}
                  checked={allFilteredDoorsSelected}
                  disabled={!canManageProjects || filteredDoorIds.length === 0}
                  onChange={toggleFilteredDoorSelection}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
                />
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {copy(
                  "Order Number",
                  "Номер заказа",
                  "מספר הזמנה",
                )}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("projects.houseLabel")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("projects.floorLabel")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("projects.apt")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("projects.location")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("projects.marking")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("projects.doorType")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("projects.unit")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("common.status")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("projects.blockers")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMatrixRows.length === 0 ? (
              <tr>
                <td
                  className="px-2 py-4 text-text-secondary"
                  colSpan={11}
                >
                  {copy(
                    "No doors for selected filters.",
                    "Нет дверей для выбранных фильтров.",
                    "אין דלתות עבור המסננים שנבחרו.",
                  )}
                </td>
              </tr>
            ) : (
              visibleMatrixRows.map((row) => (
                <tr
                  key={row.door_id}
                  data-testid={`project-door-table-row-${row.door_id}`}
                  tabIndex={0}
                  aria-selected={focusedDoorId === row.door_id}
                  onClick={() => setFocusedDoorId(row.door_id)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      setFocusedDoorId(row.door_id);
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-t border-border transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/35",
                    row.issue_count > 0 &&
                      "bg-status-problem-bg",
                    focusedDoorId === row.door_id &&
                      "bg-[var(--dmx-accent-tint)]",
                  )}
                >
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      aria-label={copy(
                        "Select door {door}",
                        "Выбрать дверь {door}",
                        "בחר דלת {door}",
                      ).replace("{door}", row.unit_label)}
                      checked={selectedDoorIdSet.has(row.door_id)}
                      disabled={!canManageProjects}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() =>
                        toggleDoorSelection(row.door_id)
                      }
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <LtrText>{row.order_number}</LtrText>
                  </td>
                  <td className="px-2 py-1.5">
                    <LtrText>{row.house_number}</LtrText>
                  </td>
                  <td className="px-2 py-1.5">
                    <LtrText>{row.floor_label}</LtrText>
                  </td>
                  <td className="px-2 py-1.5">
                    <LtrText>{row.apartment_number}</LtrText>
                  </td>
                  <td className="px-2 py-1.5">
                    {locationLabel(row.location_code)}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      aria-label={copy("Open door {door}", "Открыть дверь {door}", "פתח דלת {door}").replace("{door}", row.door_marking)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setFocusedDoorId(row.door_id);
                      }}
                      className="inline-flex max-w-[140px] items-center rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-text hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                    >
                      <LtrText as="span" className="truncate">
                        {row.door_marking}
                      </LtrText>
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    {row.door_type_label}
                  </td>
                  <td className="px-2 py-1.5">
                    <LtrText>{row.unit_label}</LtrText>
                  </td>
                  <td className="px-2 py-1.5">
                    <StatusBadge
                      status={row.status}
                      label={tokenLabel(row.status)}
                      domain="door"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    {row.issue_count > 0 ? (
                      <span className="text-status-problem-fg">
                        <LtrText>{row.issue_count}</LtrText>
                      </span>
                    ) : (
                      <span className="text-text-secondary">
                        <LtrText>0</LtrText>
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
      {hiddenMatrixRows > 0 && (
        <div
          data-testid="project-door-ledger-more"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-3.5 py-3 text-[12px] text-text-secondary"
        >
          <span>
            {copy("Showing {shown} of {total} doors", "Показано {shown} из {total} дверей", "מוצגות {shown} מתוך {total} דלתות")
              .replace("{shown}", String(visibleMatrixRows.length))
              .replace("{total}", String(filteredMatrixRows.length))}
          </span>
          <button
            type="button"
            className="dmx-secondary-action"
            onClick={() => setLedgerRowLimit((limit) => limit + LEDGER_ROW_PAGE)}
          >
            {copy("Show {n} more", "Показать ещё {n}", "הצג עוד {n}").replace(
              "{n}",
              String(Math.min(LEDGER_ROW_PAGE, hiddenMatrixRows)),
            )}
          </button>
        </div>
      )}
    </div>
  );
}
