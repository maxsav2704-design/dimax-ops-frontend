"use client";

import { WidgetCard } from "@/components/dimax";
import { projectsMetricLabelClass } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { useCopy, useI18n } from "@/lib/i18n";

import type { LatestImportReviewResponse } from "./import-types";

type BulkImportReviewCardProps = {
  result: LatestImportReviewResponse;
  tokenLabel: (value: string) => string;
  onRetryRun: (runId: string, projectId?: string) => Promise<void>;
  onOpenRun: (projectId: string, runId: string) => void;
  onSelectProject: (projectId: string) => void;
};

// Projects → "Bulk import review" card: latest import run per selected project with retry/open actions. Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function BulkImportReviewCard({
  result,
  tokenLabel,
  onRetryRun,
  onOpenRun,
  onSelectProject,
}: BulkImportReviewCardProps) {
  const { t } = useI18n();

  return (
    <WidgetCard
      title={t("projects.bulkImportReview")}
      headerMeta={
        <>
          {t("projects.reviewable")}:{" "}
          {result.reviewable_projects} |{" "}
          {t("projects.failedPartial")}:{" "}
          {result.failed_or_partial_projects} |{" "}
          {t("projects.skippedCount")}:{" "}
          {result.skipped_projects}
        </>
      }
    >
      <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
        {result.items.map((item) => (
          <article
            key={`${item.project_id}-${item.source_run_id || "none"}-mobile`}
            className="px-3.5 py-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-text">
                  {item.project_name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                    {t("common.mode")}: {item.mode || "-"}
                  </span>
                  {item.source_filename ? (
                    <span className="inline-flex max-w-full rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                      <span className="truncate">
                        {item.source_filename}
                      </span>
                    </span>
                  ) : null}
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
                  {t("projects.rows")}
                </div>
                <div className="mt-1 text-[15px] font-medium text-text tabular-nums">
                  {item.parsed_rows} / {item.prepared_rows}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                <div className={projectsMetricLabelClass}>
                  {t("projects.actions")}
                </div>
                <div className="mt-1 text-[12px] font-medium text-text">
                  {item.source_run_id
                    ? t("projects.openRun")
                    : "-"}
                </div>
              </div>
            </div>

            {item.last_error ? (
              <div className="mt-3 rounded-lg border border-status-problem-border bg-status-problem-bg px-3 py-2 text-[12px] leading-5 text-status-problem-fg">
                {item.last_error}
              </div>
            ) : null}

            {item.source_run_id ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onOpenRun(
                      item.project_id,
                      item.source_run_id!,
                    )
                  }
                  className="h-8 px-2.5 text-[11px]"
                >
                  {t("projects.openRun")}
                </Button>
                {item.retry_available ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSelectProject(item.project_id);
                      void onRetryRun(
                        item.source_run_id!,
                        item.project_id,
                      );
                    }}
                    className="h-8 px-2.5 text-[11px]"
                  >
                    {t("projects.retryNow")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
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
                {t("common.mode")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("projects.rows")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("projects.file")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("projects.errorLabel")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("projects.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr
                key={`${item.project_id}-${item.source_run_id || "none"}`}
                className="row-hover border-t border-border"
              >
                <td className="px-2 py-1.5">
                  {item.project_name}
                </td>
                <td className="px-2 py-1.5">
                  <StatusBadge
                    status={item.status}
                    label={tokenLabel(item.status)}
                    domain="sync"
                  />
                </td>
                <td className="px-2 py-1.5">
                  {item.mode || "-"}
                </td>
                <td className="px-2 py-1.5">
                  {item.parsed_rows} / {item.prepared_rows}
                </td>
                <td
                  className="px-2 py-1.5 max-w-[220px] truncate"
                  title={item.source_filename || "-"}
                >
                  {item.source_filename || "-"}
                </td>
                <td
                  className={cn(
                    "px-2 py-1.5",
                    item.last_error
                      ? "text-status-problem-fg"
                      : "text-text-secondary",
                  )}
                  title={item.last_error || ""}
                >
                  {item.last_error || "-"}
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    {item.source_run_id ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onOpenRun(
                            item.project_id,
                            item.source_run_id!,
                          )
                        }
                        className="h-7 px-2 text-[11px]"
                      >
                        {t("projects.openRun")}
                      </Button>
                    ) : null}
                    {item.retry_available &&
                    item.source_run_id ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectProject(item.project_id);
                          void onRetryRun(
                            item.source_run_id!,
                            item.project_id,
                          );
                        }}
                        className="h-7 px-2 text-[11px]"
                      >
                        {t("projects.retryNow")}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}
