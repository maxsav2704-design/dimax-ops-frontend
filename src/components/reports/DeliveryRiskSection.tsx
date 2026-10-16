"use client";

import { useRouter } from "next/navigation";
import type { UseQueryResult } from "@tanstack/react-query";
import { Mail, MessageSquare } from "lucide-react";

import { buildOperationsHref, compactMap, formatDateTime, reportsPanelClass, useReportsText } from "./shared";
import type { AuditCatalogChangesResponse, DeliveryStatsResponse, OutboxListResponse, OutboxRetryAuditListResponse, OutboxSummaryResponse, ReportsOpsPreset, WebhookSignalListResponse } from "./types";

type DeliveryRiskSectionProps = {
  deliveryQuery: UseQueryResult<DeliveryStatsResponse>;
  outboxSummaryQuery: UseQueryResult<OutboxSummaryResponse>;
  failedItems: OutboxListResponse["items"];
  webhookSignalsQuery: UseQueryResult<WebhookSignalListResponse>;
  retryAuditsQuery: UseQueryResult<OutboxRetryAuditListResponse>;
  auditCatalogsQuery: UseQueryResult<AuditCatalogChangesResponse>;
  issueAuditQuery: UseQueryResult<AuditCatalogChangesResponse>;
  activeOpsPreset: ReportsOpsPreset | null;
  scopedOutboxId: string | null;
  scopedDeliveryChannel: string | null;
  scopedWebhookProvider: string | null;
};

// Reports → "Delivery risk" cards: delivery stats, outbox summary, the scoped delivery/webhook/retry view and audit summaries. Markup moved verbatim from ReportsPage (section split).
export function DeliveryRiskSection({ deliveryQuery, outboxSummaryQuery, failedItems, webhookSignalsQuery, retryAuditsQuery, auditCatalogsQuery, issueAuditQuery, activeOpsPreset, scopedOutboxId, scopedDeliveryChannel, scopedWebhookProvider }: DeliveryRiskSectionProps) {
  const router = useRouter();
  const { t, copy } = useReportsText();
  const delivery = deliveryQuery.data;
  const outboxSummary = outboxSummaryQuery.data;
  const webhookSignalItems = webhookSignalsQuery.data?.items || [];
  const scopedWebhookSignals = webhookSignalItems.filter(
    (item) =>
      !scopedWebhookProvider ||
      item.provider.toLowerCase() === scopedWebhookProvider,
  );
  const retryAuditItems = retryAuditsQuery.data?.items || [];
  const scopedRetryAuditItems = retryAuditItems.filter(
    (item) => !scopedOutboxId || item.outbox_id === scopedOutboxId,
  );
  const auditSummary = auditCatalogsQuery.data?.summary;
  const issueAuditSummary = issueAuditQuery.data?.summary;

  return (
    <div id="reports-delivery-risk" className="grid gap-3 md:grid-cols-4">
      <div className={reportsPanelClass("p-4")}>
        <div className="text-[11px] uppercase text-text-secondary mb-2">
          {copy("Delivery", "Доставка", "משלוח")}
        </div>
        {deliveryQuery.isLoading ? (
          <div className="text-[13px] text-text-secondary">
            {copy("Loading…", "Загрузка…", "טוען…")}
          </div>
        ) : (
          <div className="space-y-1 text-[13px]">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-link" />
              <span>{copy("WA pending:", "WhatsApp, ожидают:", "WhatsApp, ממתינות:")} {delivery?.whatsapp_pending ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span>{copy("WA delivered:", "WhatsApp, доставлено:", "WhatsApp, נמסרו:")} {delivery?.whatsapp_delivered ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-status-problem-fg" />
              <span>{copy("WA failed:", "WhatsApp, ошибки:", "WhatsApp, נכשלו:")} {delivery?.whatsapp_failed ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-500" />
              <span>{copy("Email sent:", "Письмо отправлено:", "אימייל נשלח:")} {delivery?.email_sent ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-status-problem-fg" />
              <span>{copy("Email failed:", "Ошибки эл. почты:", "שגיאות דוא״ל:")} {delivery?.email_failed ?? 0}</span>
            </div>
          </div>
        )}
      </div>

      <div className={reportsPanelClass("p-4")}>
        <div className="text-[11px] uppercase text-text-secondary mb-2">
          {copy("Outbox Queue", "Очередь исходящих сообщений", "תור תיבת דואר יוצא")}
        </div>
        {outboxSummaryQuery.isLoading ? (
          <div className="text-[13px] text-text-secondary">
            {copy("Loading…", "Загрузка…", "טוען…")}
          </div>
        ) : (
          <div className="space-y-1 text-[13px]">
            <div>{copy("Total:", "Итого:", "סך הכל:")} {outboxSummary?.total ?? 0}</div>
            <div>{copy("Failed total:", "Всего неудачно:", "סך הכל נכשל:")} {outboxSummary?.failed_total ?? 0}</div>
            <div>
              {copy("Pending overdue &gt;15m:", "Ожидается просрочка >15 мин:", "בהמתנה באיחור >15 מ':")}{" "}
              {outboxSummary?.pending_overdue_15m ?? 0}
            </div>
            <div className="text-text-secondary">
              {copy("Channels:", "Каналы:", "ערוצים:")} {compactMap(outboxSummary?.by_channel)}
            </div>
            <div className="text-text-secondary">
              {copy("Status:", "Статус:", "סטטוס:")} {compactMap(outboxSummary?.by_status)}
            </div>
          </div>
        )}
      </div>

      <div
        id="reports-delivery-scope"
        className={reportsPanelClass("p-4 md:col-span-2")}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase text-text-secondary mb-2">
              {copy("Delivery Scope", "Фильтр отправки", "מסנן שליחה")}
            </div>
            <div className="space-y-1 text-[13px]">
              <div>
                {copy("Channel:", "Канал:", "ערוץ:")}{" "}
                <span className="font-medium text-text">
                  {scopedDeliveryChannel || "all channels"}
                </span>
              </div>
              <div>
                {copy("Webhook provider:", "Провайдер вебхука:", "ספק Webhook:")}{" "}
                <span className="font-medium text-text">
                  {scopedWebhookProvider || "all providers"}
                </span>
              </div>
              {scopedOutboxId ? (
                <div>
                  {copy("Outbox:", "Исходящие:", "תיבת דואר יוצא:")}{" "}
                  <span className="font-medium text-text">
                    {scopedOutboxId}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          {(scopedDeliveryChannel || scopedWebhookProvider) && (
            <button
              onClick={() => {
                const params = new URLSearchParams();
                params.set("focus", "delivery");
                params.set(
                  "ops_preset",
                  activeOpsPreset || "delivery-risk",
                );
                if (scopedOutboxId) {
                  params.set("outbox_id", scopedOutboxId);
                }
                router.push(`/reports?${params.toString()}`);
              }}
              className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
            >
              {copy("Clear delivery scope", "Сбросить фильтр отправки", "נקה מסנן שליחה")}
            </button>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface-subtle p-3">
            <div className="text-[11px] uppercase text-text-secondary">
              {t("reports.failedOutboxLane")}
            </div>
            <div className="mt-2 text-[13px] text-text">
              {t("reports.failedMessagesInCurrentScope").replace(
                "{count}",
                String(failedItems.length),
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  router.push(
                    buildOperationsHref({
                      actionable: true,
                      deliveryChannel: scopedDeliveryChannel || undefined,
                      webhookProvider: scopedWebhookProvider || undefined,
                    }),
                  )
                }
                className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
              >
                {t("reports.openScopedOps")}
              </button>
              {scopedOutboxId ? (
                <button
                  onClick={() =>
                    router.push(
                      buildOperationsHref({
                        actionable: true,
                        deliveryChannel: scopedDeliveryChannel || undefined,
                        webhookProvider: scopedWebhookProvider || undefined,
                      }),
                    )
                  }
                  className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                >
                  {t("reports.continueRecovery")}
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-subtle p-3">
            <div className="text-[11px] uppercase text-text-secondary">
              {t("reports.webhookLane")}
            </div>
            {webhookSignalsQuery.isLoading ? (
              <div className="mt-2 text-[13px] text-text-secondary">
                {t("reports.loadingWebhookScope")}
              </div>
            ) : scopedWebhookSignals.length === 0 ? (
              <div className="mt-2 text-[13px] text-text-secondary">
                {t("reports.noWebhookSignalsCurrentScope")}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {scopedWebhookSignals.slice(0, 3).map((item) => (
                  <div key={item.id} className="text-[13px]">
                    <div className="font-medium text-text">
                      {item.provider} | {item.result}
                    </div>
                    <div className="text-text-secondary">
                      {item.event_type}
                      {item.status ? ` | status ${item.status}` : ""}
                      {item.error ? ` | ${item.error}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-surface-subtle p-3 md:col-span-2">
            <div className="text-[11px] uppercase text-text-secondary">
              {t("reports.recoveryTrail")}
            </div>
            {retryAuditsQuery.isLoading ? (
              <div className="mt-2 text-[13px] text-text-secondary">
                {t("reports.loadingRetryAuditTrail")}
              </div>
            ) : scopedRetryAuditItems.length === 0 ? (
              <div className="mt-2 text-[13px] text-text-secondary">
                {scopedOutboxId
                  ? t("reports.noRecoveryActionsForOutbox")
                  : t("reports.noDeliveryRecoveryActionsYet")}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {scopedRetryAuditItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-[13px]"
                  >
                    <div className="font-medium text-text">
                      {copy("Outbox", "Исходящие", "תיבת דואר יוצא")} {item.outbox_id}
                    </div>
                    <div className="text-text-secondary">
                      {formatDateTime(item.created_at)} {copy("| actor", "| пользователь", "| משתמש")}{" "}
                      {item.actor_user_id}
                    </div>
                    <div className="text-text-secondary">
                      {item.before_status || "unknown"} {"->"}{" "}
                      {item.after_status || "unknown"}
                      {item.before_delivery_status ||
                      item.after_delivery_status
                        ? ` | delivery ${item.before_delivery_status || "unknown"} -> ${item.after_delivery_status || "unknown"}`
                        : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          router.push(
                            buildOperationsHref({
                              actionable: true,
                              deliveryChannel:
                                scopedDeliveryChannel || undefined,
                              webhookProvider:
                                scopedWebhookProvider || undefined,
                            }),
                          )
                        }
                        className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                      >
                        {t("reports.openRecoveryLane")}
                      </button>
                      <button
                        onClick={() =>
                          router.push(
                            buildOperationsHref({
                              actionable: true,
                              deliveryChannel:
                                scopedDeliveryChannel || undefined,
                              webhookProvider:
                                scopedWebhookProvider || undefined,
                            }),
                          )
                        }
                        className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                      >
                        {t("reports.continueInOps")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={reportsPanelClass("p-4")}>
        <div className="text-[11px] uppercase text-text-secondary mb-2">
          {t("reports.catalogAudit")}
        </div>
        {auditCatalogsQuery.isLoading ? (
          <div className="text-[13px] text-text-secondary">
            {t("reports.loading")}
          </div>
        ) : (
          <div className="space-y-1 text-[13px]">
            <div>
              {t("reports.totalChanges")}: {auditSummary?.total ?? 0}
            </div>
            <div className="text-text-secondary">
              {t("reports.entities")}: {compactMap(auditSummary?.by_entity)}
            </div>
            <div className="text-text-secondary">
              {t("reports.actions")}: {compactMap(auditSummary?.by_action)}
            </div>
          </div>
        )}
      </div>

      <div className={reportsPanelClass("p-4")}>
        <div className="text-[11px] uppercase text-text-secondary mb-2">
          {t("reports.issueAudit")}
        </div>
        {issueAuditQuery.isLoading ? (
          <div className="text-[13px] text-text-secondary">
            {t("reports.loading")}
          </div>
        ) : (
          <div className="space-y-1 text-[13px]">
            <div>
              {t("reports.totalChanges")}: {issueAuditSummary?.total ?? 0}
            </div>
            <div className="text-text-secondary">
              {t("reports.entities")}:{" "}
              {compactMap(issueAuditSummary?.by_entity)}
            </div>
            <div className="text-text-secondary">
              {t("reports.actions")}:{" "}
              {compactMap(issueAuditSummary?.by_action)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
