"use client";

import { WidgetCard } from "@/components/dimax";
import { projectsMetricLabelClass } from "@/components/projects/project-form";
import { LtrText } from "@/components/ui/LtrText";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChevronDown } from "lucide-react";
import { useCopy, useI18n } from "@/lib/i18n";

import type { LayoutBucket, ProjectDoorsLayoutResponse } from "./layout-types";

type ImportLayoutCheckProps = {
  layout: ProjectDoorsLayoutResponse | null;
  floorGroups: { floor: string; total: number; buckets: LayoutBucket[] }[];
  tokenLabel: (value: string) => string;
};

// Projects → "Import layout check": per-floor bucket breakdown of the imported door layout (read-only, collapsible). Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function ImportLayoutCheck({
  layout,
  floorGroups,
  tokenLabel,
}: ImportLayoutCheckProps) {
  const { t } = useI18n();
  const copy = useCopy();

  return (
    <details
      data-testid="project-import-layout-check"
      className="overflow-hidden border-t border-border-subtle"
    >
      <summary className="flex cursor-pointer list-none flex-col gap-3 border-b border-border bg-surface px-4 py-3 marker:hidden md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className={projectsMetricLabelClass}>
            {copy(
              "Import layout check",
              "Проверка раскладки импорта",
              "בדיקת פריסת יבוא",
            )}
          </div>
          <div className="mt-1 text-[13px] font-semibold text-text">
            {copy(
              "Grouped source layout",
              "Группировка исходной раскладки",
              "פריסת מקור מקובצת",
            )}
          </div>
          <div className="mt-1 max-w-3xl text-[11.5px] leading-5 text-text-secondary">
            {copy(
              "Use this only to verify Excel/import grouping. Daily control lives in the door matrix and audit ledger above.",
              "Используйте этот блок только для сверки группировки Excel/импорта. Ежедневное управление находится выше: матрица дверей и реестр контроля.",
              "השתמש בבלוק הזה רק לבדיקת קיבוץ Excel/יבוא. השליטה היומית נמצאת למעלה: מטריצת הדלתות ויומן הבקרה.",
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              {
                label: copy("Floors", "Этажи", "קומות"),
                value: floorGroups.length,
              },
              {
                label: copy("Groups", "Группы", "קבוצות"),
                value: layout?.buckets.length || 0,
              },
              {
                label: copy("Doors", "Двери", "דלתות"),
                value: layout?.total_doors || 0,
              },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[11px] text-text"
              >
                <span>{item.label}</span>
                <LtrText as="span">{item.value}</LtrText>
              </span>
            ))}
          </div>
          <ChevronDown
            className="h-4 w-4 text-text-secondary"
            aria-hidden="true"
          />
        </div>
      </summary>
      <div className="space-y-4 bg-surface-subtle p-4">
        {floorGroups.map((group) => (
      <WidgetCard
        key={group.floor}
        title={String(group.floor)}
        headerMeta={
          <>
            {t("projects.doorsCount").replace(
              "{count}",
              String(group.total),
            )}
          </>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {group.buckets.map((bucket, idx) => (
            <article
              key={`${group.floor}-${idx}`}
              className="rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] text-text-secondary">
                    {copy(
                      "Order Number",
                      "Номер заказа",
                      "מספר הזמנה",
                    )}{" "}
                    {bucket.order_number || "-"} |{" "}
                    {t("projects.houseLabel")}{" "}
                    {bucket.house_number || "-"}
                  </div>
                  <div className="text-[13px] font-semibold mt-0.5 text-text">
                    {(
                      bucket.location_code || "unknown"
                    ).toUpperCase()}
                    {bucket.door_marking
                      ? ` / ${bucket.door_marking}`
                      : ""}
                  </div>
                </div>
                <div className="rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[12px] text-text">
                  {bucket.total}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(bucket.status_breakdown).map(
                  ([status, count]) => (
                    <StatusBadge
                      key={status}
                      status={status}
                      label={`${tokenLabel(status)}: ${count}`}
                      domain="door"
                    />
                  ),
                )}
              </div>

              <div className="mt-3 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                {bucket.doors.map((door) => (
                  <div
                    key={`${door.id}-mobile`}
                    className="px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={projectsMetricLabelClass}>
                          {t("projects.apt")}
                        </div>
                        <div className="mt-1 truncate text-[12px] font-semibold text-text">
                          {door.apartment_number || "-"}
                        </div>
                      </div>
                      <StatusBadge
                        status={door.status}
                        label={tokenLabel(door.status)}
                        domain="door"
                      />
                    </div>
                    <div className="mt-2 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className={projectsMetricLabelClass}>
                        {t("projects.unit")}
                      </div>
                      <div className="mt-1 truncate text-[12px] font-medium text-text">
                        {door.unit_label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
                <table className="min-w-[760px] w-full text-[12px] leading-5">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="text-start px-2 py-1.5 font-medium">
                        {t("projects.apt")}
                      </th>
                      <th className="text-start px-2 py-1.5 font-medium">
                        {t("projects.unit")}
                      </th>
                      <th className="text-start px-2 py-1.5 font-medium">
                        {t("common.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bucket.doors.map((door) => (
                      <tr
                        key={door.id}
                        className="row-hover border-t border-border"
                      >
                        <td className="px-2 py-1.5">
                          {door.apartment_number || "-"}
                        </td>
                        <td className="px-2 py-1.5">
                          {door.unit_label}
                        </td>
                        <td className="px-2 py-1.5">
                          <StatusBadge
                            status={door.status}
                            label={tokenLabel(door.status)}
                            domain="door"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </WidgetCard>
        ))}
      </div>
    </details>
  );
}
