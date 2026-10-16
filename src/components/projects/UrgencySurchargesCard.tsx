"use client";

import { useMemo, useState } from "react";
import { MetricRow, WidgetCard } from "@/components/dimax";
import { projectsMetricLabelClass } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanyPricingState } from "@/hooks/use-company-pricing-state";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { Plus } from "lucide-react";
import { useCopy, useI18n } from "@/lib/i18n";

import { emptyUrgencySurchargeForm } from "./urgency-form";
import type { UrgencySurchargeFormState, UrgencySurchargeItem } from "./urgency-form";

type UrgencySurchargesCardProps = {
  projectId: string | null;
  canManage: boolean;
  canViewRates: boolean;
  pricing: ReturnType<typeof useCompanyPricingState>;
  formatMoney: (value: string | number | null | undefined) => string;
  surcharges: UrgencySurchargeItem[];
  loading: boolean;
  onReload: (projectId: string) => Promise<void>;
  restrictedDetail: string;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onActionHint: (hint: string | null) => void;
  onSaved: (projectId: string, orderNumber: string | null) => Promise<void>;
};

// Projects → "Urgency surcharge" card with its add dialog: list, totals and the create form. Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function UrgencySurchargesCard({
  projectId,
  canManage,
  canViewRates,
  pricing,
  formatMoney,
  surcharges,
  loading,
  onReload,
  restrictedDetail,
  onError,
  onNotice,
  onActionHint,
  onSaved,
}: UrgencySurchargesCardProps) {
  const { locale, t } = useI18n();
  const copy = useCopy();
  const [urgencyDialogOpen, setUrgencyDialogOpen] = useState(false);
  const [urgencyForm, setUrgencyForm] = useState<UrgencySurchargeFormState>(
    emptyUrgencySurchargeForm(),
  );
  const [urgencySubmitting, setUrgencySubmitting] = useState(false);
  const urgencyTotals = useMemo(() => {
    return surcharges.reduce(
      (acc, item) => {
        acc.rows += 1;
        acc.client += Number(item.client_amount) || 0;
        acc.installer += Number(item.installer_amount) || 0;
        if (item.scope === "ORDER_NUMBER") {
          acc.orderScoped += 1;
        }
        return acc;
      },
      { rows: 0, client: 0, installer: 0, orderScoped: 0 },
    );
  }, [surcharges]);
  const openUrgencyDialog = () => {
    if (!canManage || !pricing.legacyWritable) return;
    if (!canViewRates) {
      onError(restrictedDetail);
      return;
    }
    setUrgencyForm(emptyUrgencySurchargeForm());
    onNotice(null);
    onActionHint(null);
    onError(null);
    setUrgencyDialogOpen(true);
  };
  const handleUrgencySubmit = async () => {
    if (!canManage || !pricing.legacyWritable) return;
    if (!projectId) {
      return;
    }
    if (!canViewRates) {
      onError(restrictedDetail);
      return;
    }
    const clientAmount = Number(urgencyForm.client_amount.trim());
    const installerAmount = Number(urgencyForm.installer_amount.trim());
    if (
      !urgencyForm.reason.trim() ||
      !urgencyForm.client_amount.trim() ||
      !urgencyForm.installer_amount.trim() ||
      (urgencyForm.scope === "ORDER_NUMBER" && !urgencyForm.order_number.trim())
    ) {
      onError(
        copy(
          "Fill reason and both surcharge amounts. Order-scoped surcharge also needs an order number.",
          "Укажите причину и обе суммы доплаты. Надбавке в рамках заказа также требуется номер заказа.",
          "מלא את הסיבה ואת שני סכומי ההיטל. תוספת בהיקף הזמנה צריכה גם מספר הזמנה.",
        ),
      );
      return;
    }
    if (
      !Number.isFinite(clientAmount) ||
      clientAmount <= 0 ||
      !Number.isFinite(installerAmount) ||
      installerAmount <= 0
    ) {
      onError(
        copy(
          "Use positive amounts for both surcharge values.",
          "Используйте положительные суммы для обеих надбавок.",
          "השתמש בסכומים חיוביים לשתי תוספות הדחיפות.",
        ),
      );
      return;
    }

    setUrgencySubmitting(true);
    onError(null);
    try {
      await apiFetch(
        `/api/v1/admin/projects/${projectId}/urgency-surcharges`,
        {
          method: "POST",
          body: JSON.stringify({
            scope: urgencyForm.scope,
            order_number:
              urgencyForm.scope === "ORDER_NUMBER"
                ? urgencyForm.order_number.trim()
                : null,
            reason: urgencyForm.reason.trim(),
            client_amount: urgencyForm.client_amount.trim(),
            installer_amount: urgencyForm.installer_amount.trim(),
            effective_date: urgencyForm.effective_date || null,
            notes: urgencyForm.notes.trim() || null,
          }),
        },
      );
      setUrgencyDialogOpen(false);
      setUrgencyForm(emptyUrgencySurchargeForm());
      await onReload(projectId);
      await onSaved(
        projectId,
        urgencyForm.scope === "ORDER_NUMBER" && urgencyForm.order_number.trim()
          ? urgencyForm.order_number.trim()
          : null,
      );
      if (
        urgencyForm.scope === "ORDER_NUMBER" &&
        urgencyForm.order_number.trim()
      ) {
        if (typeof document !== "undefined") {
          window.setTimeout(() => {
            document.getElementById("project-door-matrix")?.scrollIntoView?.({
              behavior: "smooth",
              block: "start",
            });
          }, 0);
        }
      } else if (typeof document !== "undefined") {
        window.setTimeout(() => {
          document
            .getElementById("project-urgency-surcharge")
            ?.scrollIntoView?.({
              behavior: "smooth",
              block: "start",
            });
        }, 0);
      }
      onNotice(
        copy(
          urgencyForm.scope === "ORDER_NUMBER" &&
            urgencyForm.order_number.trim()
            ? `Urgency surcharge for order ${urgencyForm.order_number.trim()} was saved. The project matrix is now filtered to that order.`
            : "Project-level urgency surcharge was saved.",
          urgencyForm.scope === "ORDER_NUMBER" &&
            urgencyForm.order_number.trim()
            ? `Срочная надбавка для заказа ${urgencyForm.order_number.trim()} сохранена. Матрица проекта уже отфильтрована по этому заказу.`
            : "Срочная надбавка уровня проекта сохранена.",
          urgencyForm.scope === "ORDER_NUMBER" &&
            urgencyForm.order_number.trim()
            ? `תוספת הדחיפות להזמנה ${urgencyForm.order_number.trim()} נשמרה. מטריצת הפרויקט כבר מסוננת להזמנה הזו.`
            : "תוספת דחיפות ברמת הפרויקט נשמרה.",
        ),
      );
    } catch (e) {
      onError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to save urgency surcharge.",
            "Не удалось сохранить плату за срочность.",
            "חיסכון של תוספת דחיפות נכשלה.",
          ),
        ),
      );
      pricing.refresh();
    } finally {
      setUrgencySubmitting(false);
    }
  };

  return (
    <>
      <WidgetCard
        id="project-urgency-surcharge"
        title={copy(
          "Urgency Surcharge",
          "Срочная надбавка",
          "תוספת דחיפות",
        )}
        headerMeta={copy(
          "Separate auditable uplift layer",
          "Отдельный аудируемый слой надбавок",
          "שכבת תוספת נפרדת לביקורת",
        )}
      >
        <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-[15px] font-semibold leading-tight text-text">
              {copy(
                "Historical manual surcharges",
                "История ручных надбавок",
                "היסטוריית תוספות ידניות",
              )}
            </h3>
            <p className="mt-2 text-[12px] leading-6 text-text-secondary">
              {copy(
                "With factory pricing, urgency work requires an additional-work type and a confirmed price. Historical surcharge rows are not confirmed earnings.",
                "При заводском прайсе срочная работа оформляется как допработа с подтверждённой ценой. Исторические надбавки не являются подтверждёнными начислениями.",
                "בתמחור מפעל, עבודה דחופה מחייבת סוג עבודה נוספת ומחיר מאושר. תוספות היסטוריות אינן שכר מאושר.",
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
            <Button
              type="button"
              onClick={openUrgencyDialog}
              disabled={!canManage || !pricing.legacyWritable}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {copy(
                "Add urgency surcharge",
                "Добавить срочную надбавку",
                "הוסף תוספת דחיפות",
              )}
            </Button>
            <div className="text-[11px] text-text-secondary">
              {copy(
                "Keep surcharge visible and auditable as a separate plan layer.",
                "Держите надбавки видимыми и проверяемыми на отдельном уровне плана.",
                "שמור על תוספת גלויה וניתנת לביקורת כשכבת תוכנית נפרדת.",
              )}
            </div>
          </div>
        </div>

        <div className="-mx-4 border-y border-border-subtle bg-surface">
          <MetricRow
            label={copy("Rows", "Строки", "שורות")}
            value={urgencyTotals.rows}
            barColor="yellow"
            withSeparator={false}
          />
          <MetricRow
            label={copy("Order-scoped", "По заказу", "לפי הזמנה")}
            value={urgencyTotals.orderScoped}
            barColor="blue"
          />
          <MetricRow
            label={copy(
              "Client uplift",
              "Надбавка клиента",
              "תוספת לקוח",
            )}
            value={formatMoney(urgencyTotals.client)}
            barColor="green"
          />
          <MetricRow
            label={copy(
              "Installer uplift",
              "Надбавка монтажника",
              "תוספת מתקין",
            )}
            value={formatMoney(urgencyTotals.installer)}
            barColor="orange"
          />
        </div>

        <div className="mt-4 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
          {loading ? (
            <div className="px-3.5 py-4 text-[12px] text-text-secondary">
              {copy(
                "Loading urgency surcharge plan...",
                "Загружаем план срочной надбавки...",
                "טוען תוכנית תוספת דחיפות...",
              )}
            </div>
          ) : surcharges.length === 0 ? (
            <div className="px-3.5 py-4 text-[12px] text-text-secondary">
              {copy(
                "No urgency surcharge rows yet.",
                "Пока нет строк срочной надбавки.",
                "עדיין אין שורות תוספת דחיפות.",
              )}
            </div>
          ) : (
            surcharges.map((item, index) => (
              <article
                key={
                  item.id ||
                  `${item.scope}-${item.order_number || "project"}-${index}`
                }
                className="px-3.5 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex rounded-full border border-status-warning-border bg-status-warning-bg px-2 py-1 text-[10.5px] font-semibold leading-none text-status-warning-fg">
                        {item.scope === "ORDER_NUMBER"
                          ? copy("Order", "Заказ", "הזמנה")
                          : copy("Project", "Проект", "פרויקט")}
                      </span>
                      {item.order_number ? (
                        <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                          {item.order_number}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 break-words text-[13px] font-semibold leading-5 text-text">
                      {item.reason}
                    </div>
                  </div>
                  <div className="shrink-0 text-end">
                    <div className={projectsMetricLabelClass}>
                      {copy("Client", "Клиент", "לקוח")}
                    </div>
                    <div className="mt-1 text-[17px] font-medium leading-tight text-text tabular-nums">
                      {formatMoney(
                        Number(item.client_amount) || 0,
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className={projectsMetricLabelClass}>
                      {copy("Installer", "Монтажник", "מתקין")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                      {formatMoney(
                        Number(item.installer_amount) || 0,
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className={projectsMetricLabelClass}>
                      {copy("Effective", "Дата", "תאריך")}
                    </div>
                    <div
                      className="mt-1 truncate text-[12px] text-text-secondary tabular-nums"
                      dir="ltr"
                    >
                      {item.effective_date || "-"}
                    </div>
                  </div>
                </div>

                {item.notes ? (
                  <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] leading-5 text-text-secondary">
                    {item.notes}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>

        <div className="mt-4 hidden overflow-auto rounded-lg border border-border bg-surface md:block">
          <table className="min-w-[760px] w-full text-[12px] leading-5">
            <thead className="bg-surface-subtle text-text-secondary">
              <tr>
                <th className="px-3 py-2.5 text-start font-medium">
                  {copy("Scope", "Объём работ", "היקף עבודה")}
                </th>
                <th className="px-3 py-2.5 text-start font-medium">
                  {copy("Order", "Заказ", "הזמנה")}
                </th>
                <th className="w-[30%] px-3 py-2.5 text-start font-medium">
                  {copy("Reason", "Причина", "סיבה")}
                </th>
                <th className="px-3 py-2.5 text-end font-medium">
                  {copy("Client", "Клиент", "לקוח")}
                </th>
                <th className="px-3 py-2.5 text-end font-medium">
                  {copy("Installer", "Монтажник", "מתקין")}
                </th>
                <th className="px-3 py-2.5 text-start font-medium">
                  {copy("Effective", "Дата", "תאריך")}
                </th>
                <th className="px-3 py-2.5 text-start font-medium">
                  {copy("Notes", "Примечание", "הערה")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    className="px-3 py-4 text-text-secondary"
                    colSpan={7}
                  >
                    {copy(
                      "Loading urgency surcharge plan...",
                      "Загружаем план срочной надбавки...",
                      "טוען תוכנית תוספת דחיפות...",
                    )}
                  </td>
                </tr>
              ) : surcharges.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-4 text-text-secondary"
                    colSpan={7}
                  >
                    {copy(
                      "No urgency surcharge rows yet.",
                      "Пока нет строк срочной надбавки.",
                      "עדיין אין שורות תוספת דחיפות.",
                    )}
                  </td>
                </tr>
              ) : (
                surcharges.map((item, index) => (
                  <tr
                    key={
                      item.id ||
                      `${item.scope}-${item.order_number || "project"}-${index}`
                    }
                    className="row-hover border-t border-border"
                  >
                    <td className="px-3 py-2.5">
                      {item.scope === "ORDER_NUMBER"
                        ? copy("Order", "Заказ", "הזמנה")
                        : copy("Project", "Проект", "פרויקט")}
                    </td>
                    <td className="px-3 py-2.5">
                      {item.order_number || "-"}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-text">
                      {item.reason}
                    </td>
                    <td className="px-3 py-2.5 text-end tabular-nums">
                      {formatMoney(
                        Number(item.client_amount) || 0,
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-end tabular-nums">
                      {formatMoney(
                        Number(item.installer_amount) || 0,
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {item.effective_date || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      {item.notes || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </WidgetCard>
      <Dialog open={urgencyDialogOpen} onOpenChange={setUrgencyDialogOpen}>
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle>
              {copy(
                "Add urgency surcharge",
                "Добавить срочную надбавку",
                "הוסף תוספת דחיפות",
              )}
            </DialogTitle>
            <DialogDescription>
              {copy(
                "Record one approved urgency uplift row for this project or for a specific order number.",
                "Зафиксируйте одну утверждённую строку срочной надбавки для проекта или конкретного номера заказа.",
                "רשום שורת תוספת דחיפות מאושרת אחת לפרויקט או למספר הזמנה מסוים.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="urgency-scope">
                {copy("Scope", "Объём работ", "היקף עבודה")}
              </Label>
              <select
                id="urgency-scope"
                value={urgencyForm.scope}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    scope:
                      event.target.value === "ORDER_NUMBER"
                        ? "ORDER_NUMBER"
                        : "PROJECT",
                    order_number:
                      event.target.value === "ORDER_NUMBER"
                        ? prev.order_number
                        : "",
                  }))
                }
                className="control-input"
              >
                <option value="PROJECT">
                  {copy("Project", "Проект", "פרויקט")}
                </option>
                <option value="ORDER_NUMBER">
                  {copy("Order number", "Номер заказа", "מספר הזמנה")}
                </option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-order">
                {copy("Order number", "Номер заказа", "מספר הזמנה")}
              </Label>
              <Input
                id="urgency-order"
                value={urgencyForm.order_number}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    order_number: event.target.value,
                  }))
                }
                disabled={urgencyForm.scope !== "ORDER_NUMBER"}
                placeholder="AZ-5001"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="urgency-reason">
                {copy("Reason", "Причина", "סיבה")}
              </Label>
              <Input
                id="urgency-reason"
                value={urgencyForm.reason}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
                placeholder={copy(
                  "Late-night urgent install",
                  "Срочный ночной монтаж",
                  "התקנה דחופה בלילה",
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-client">
                {copy("Client amount", "Сумма клиента", "סכום לקוח")}
              </Label>
              <Input
                id="urgency-client"
                value={urgencyForm.client_amount}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    client_amount: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-installer">
                {copy("Installer amount", "Сумма монтажника", "סכום מתקין")}
              </Label>
              <Input
                id="urgency-installer"
                value={urgencyForm.installer_amount}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    installer_amount: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-effective">
                {copy("Effective date", "Дата действия", "תאריך תחולה")}
              </Label>
              <Input
                id="urgency-effective"
                type="date"
                value={urgencyForm.effective_date}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    effective_date: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-notes">
                {copy("Notes", "Примечание", "הערה")}
              </Label>
              <Input
                id="urgency-notes"
                value={urgencyForm.notes}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder={copy(
                  "Approval note",
                  "Комментарий по согласованию",
                  "הערת אישור",
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUrgencyDialogOpen(false)}
              disabled={urgencySubmitting}
            >
              {copy("Cancel", "Отмена", "ביטול")}
            </Button>
            <Button
              onClick={() => void handleUrgencySubmit()}
              disabled={urgencySubmitting || !pricing.legacyWritable}
            >
              {urgencySubmitting
                ? copy("Saving...", "Сохраняем...", "שומר...")
                : copy("Save surcharge", "Сохранить надбавку", "שמור תוספת")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
