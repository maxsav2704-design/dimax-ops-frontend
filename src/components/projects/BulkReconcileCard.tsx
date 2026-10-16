"use client";

import { WidgetCard } from "@/components/dimax";
import { projectsMetricLabelClass } from "@/components/projects/project-form";
import { type ProjectListItem } from "@/components/projects/project-types";
import { LtrText } from "@/components/ui/LtrText";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { useCopy, useI18n } from "@/lib/i18n";

import type { BulkReconcileResponse } from "./import-types";

type BulkReconcileCardProps = {
  result: BulkReconcileResponse;
  projects: ProjectListItem[];
  tokenLabel: (value: string) => string;
};

// Projects → "Bulk reconcile result" card: per-project outcome of a bulk reconcile run (read-only). Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function BulkReconcileCard({
  result,
  projects,
  tokenLabel,
}: BulkReconcileCardProps) {
  const { t } = useI18n();

  return (
    <WidgetCard
      title={t("projects.bulkReconcileResult")}
      headerMeta={
        <>
          {t("projects.successCount")}:{" "}
          {result.successful_projects} |{" "}
          {t("projects.failedCount")}:{" "}
          {result.failed_projects} |{" "}
          {t("projects.skippedCount")}:{" "}
          {result.skipped_projects}
        </>
      }
    >
      <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
        {result.items.map((item) => {
          const projectName =
            projects.find((p) => p.id === item.project_id)
              ?.name || item.project_id;
          return (
            <article
              key={`${item.project_id}-${item.source_run_id || "none"}-mobile`}
              className="px-3.5 py-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-text">
                    {projectName}
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    <LtrText>
                      {item.source_run_id || item.project_id}
                    </LtrText>
                  </div>
                </div>
                <StatusBadge
                  status={item.status}
                  label={tokenLabel(item.status)}
                  domain="sync"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className={projectsMetricLabelClass}>
                    {t("projects.imported")}
                  </div>
                  <div className="mt-1 text-[15px] font-medium text-text tabular-nums">
                    {item.imported}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className={projectsMetricLabelClass}>
                    {t("projects.skippedCount")}
                  </div>
                  <div className="mt-1 text-[15px] font-medium text-text tabular-nums">
                    {item.skipped}
                  </div>
                </div>
              </div>
              {item.last_error ? (
                <div className="mt-3 rounded-lg border border-status-problem-border bg-status-problem-bg px-3 py-2 text-[12px] leading-5 text-status-problem-fg">
                  {item.last_error}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-auto rounded-lg border border-border bg-surface md:block">
        <table className="min-w-[760px] w-full text-[12px] leading-5">
          <thead className="bg-surface-subtle text-text-secondary">
            <tr>
              <th className="text-start px-2 py-2 font-medium">
                {t("common.project")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("common.status")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("projects.imported")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("projects.skippedCount")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("projects.errorLabel")}
              </th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => {
              const projectName =
                projects.find((p) => p.id === item.project_id)
                  ?.name || item.project_id;
              return (
                <tr
                  key={`${item.project_id}-${item.source_run_id || "none"}`}
                  className="row-hover border-t border-border"
                >
                  <td className="px-2 py-1.5">{projectName}</td>
                  <td className="px-2 py-1.5">
                    <StatusBadge
                      status={item.status}
                      label={tokenLabel(item.status)}
                      domain="sync"
                    />
                  </td>
                  <td className="px-2 py-1.5">{item.imported}</td>
                  <td className="px-2 py-1.5">{item.skipped}</td>
                  <td
                    className={cn(
                      "px-2 py-1.5",
                      item.last_error
                        ? "text-status-problem-fg"
                        : "text-text-secondary",
                    )}
                  >
                    {item.last_error || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}
