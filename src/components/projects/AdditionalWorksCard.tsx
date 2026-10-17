"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KpiCard as DimaxKpiCard, WidgetCard } from "@/components/dimax";
import { CompanyPriceStatus } from "@/components/prices/CompanyPriceStatus";
import { projectsMetricLabelClass } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useCompanyPricingState } from "@/hooks/use-company-pricing-state";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { Plus } from "lucide-react";
import { useCopy, useI18n } from "@/lib/i18n";

import { emptyAdditionalWorkForm } from "./addon-form";
import type { AdditionalWorkFormState } from "./addon-form";
import type { AddonTypeItem, ProjectAddonPlanItem } from "./catalog-types";

type AdditionalWorksCardProps = {
  projectId: string | null;
  canManage: boolean;
  canViewRates: boolean;
  pricing: ReturnType<typeof useCompanyPricingState>;
  pricingReady: boolean;
  factoryPricing: boolean;
  factoryAddonRates: ReadonlyMap<string, string | number | null | undefined>;
  addonPlanRate: (item: ProjectAddonPlanItem) => string | number | null | undefined;
  addonPlanTotals: { rows: number; qty: number; client: number; installer: number; missingPrice: boolean };
  formatMoney: (value: string | number | null | undefined) => string;
  missingAddonPrice: string;
  referenceUnavailable: string;
  addonTypes: AddonTypeItem[];
  loadingAddonTypes: boolean;
  addonTypesReady: boolean;
  addonTypesError: boolean;
  plan: ProjectAddonPlanItem[];
  loadingPlan: boolean;
  onReloadPlan: (projectId: string) => Promise<void>;
  restrictedDetail: string;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onActionHint: (hint: string | null) => void;
  onSaved: (projectId: string) => Promise<void>;
};

// Projects → "Additional works" card with its add dialog: planned add-on rows, totals and the create form. Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function AdditionalWorksCard({
  projectId,
  canManage,
  canViewRates,
  pricing,
  pricingReady,
  factoryPricing,
  factoryAddonRates,
  addonPlanRate,
  addonPlanTotals,
  formatMoney,
  missingAddonPrice,
  referenceUnavailable,
  addonTypes,
  loadingAddonTypes,
  addonTypesReady,
  addonTypesError,
  plan,
  loadingPlan,
  onReloadPlan,
  restrictedDetail,
  onError,
  onNotice,
  onActionHint,
  onSaved,
}: AdditionalWorksCardProps) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const copy = useCopy();
  const [additionalWorkDialogOpen, setAdditionalWorkDialogOpen] =
    useState(false);
  const [additionalWorkForm, setAdditionalWorkForm] =
    useState<AdditionalWorkFormState>(emptyAdditionalWorkForm());
  const [additionalWorkSubmitting, setAdditionalWorkSubmitting] =
    useState(false);
  const selectedAddonType = useMemo(
    () =>
      addonTypes.find(
        (item) => item.id === additionalWorkForm.addon_type_id,
      ) || null,
    [addonTypes, additionalWorkForm.addon_type_id],
  );
  const openAdditionalWorkDialog = () => {
    if (!canManage || !pricingReady) return;
    if (!canViewRates) {
      onError(restrictedDetail);
      return;
    }
    setAdditionalWorkForm(emptyAdditionalWorkForm());
    onNotice(null);
    onActionHint(null);
    onError(null);
    setAdditionalWorkDialogOpen(true);
  };
  const handleAdditionalWorkSubmit = async () => {
    if (!canManage || !pricingReady) return;
    if (!projectId) {
      return;
    }
    if (!canViewRates) {
      onError(restrictedDetail);
      return;
    }
    const qtyPlanned = Number(additionalWorkForm.qty_planned.trim());
    const clientPrice = Number(additionalWorkForm.client_price.trim());
    const installerPrice = Number(additionalWorkForm.installer_price.trim());
    if (
      !additionalWorkForm.addon_type_id ||
      !additionalWorkForm.qty_planned.trim() ||
      !additionalWorkForm.client_price.trim() ||
      (!factoryPricing && !additionalWorkForm.installer_price.trim())
    ) {
      onError(
        copy(
          "Choose an add-on and fill qty + prices before saving.",
          "Выберите доп. работу и заполните количество и цены перед сохранением.",
          "בחר עבודת תוספת ומלא כמות ומחירים לפני השמירה.",
        ),
      );
      return;
    }
    if (
      !Number.isFinite(qtyPlanned) ||
      qtyPlanned <= 0 ||
      !Number.isFinite(clientPrice) ||
      clientPrice <= 0 ||
      (!factoryPricing && (!Number.isFinite(installerPrice) || installerPrice <= 0))
    ) {
      onError(
        copy(
          "Use positive numbers for planned qty and both prices.",
          "Используйте положительные числа для количества и обеих цен.",
          "השתמש במספרים חיוביים לכמות ולשני המחירים.",
        ),
      );
      return;
    }

    setAdditionalWorkSubmitting(true);
    onError(null);
    try {
      await apiFetch(
        `/api/v1/admin/projects/${projectId}/addons/plan`,
        {
          method: "POST",
          body: JSON.stringify({
            addon_type_id: additionalWorkForm.addon_type_id,
            qty_planned: additionalWorkForm.qty_planned.trim(),
            client_price: additionalWorkForm.client_price.trim(),
            ...(!factoryPricing ? { installer_price: additionalWorkForm.installer_price.trim() } : {}),
            notes: additionalWorkForm.notes.trim() || null,
          }),
        },
      );
      setAdditionalWorkDialogOpen(false);
      setAdditionalWorkForm(emptyAdditionalWorkForm());
      await onReloadPlan(projectId);
      await onSaved(projectId);
      if (typeof document !== "undefined") {
        window.setTimeout(() => {
          document
            .getElementById("project-additional-works")
            ?.scrollIntoView?.({
              behavior: "smooth",
              block: "start",
            });
        }, 0);
      }
      onNotice(
        copy(
          `${selectedAddonType?.name || "Additional work"} was added to the project plan.`,
          `${selectedAddonType?.name || "Доп. работа"} добавлена в план проекта.`,
          `${selectedAddonType?.name || "עבודה נוספת"} נוספה לתוכנית הפרויקט.`,
        ),
      );
    } catch (e) {
      onError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to save additional work plan.",
            "Не удалось сохранить план доп. работ.",
            "שמירת תוכנית עבודות נוספות נכשלה.",
          ),
        ),
      );
      pricing.refresh();
    } finally {
      setAdditionalWorkSubmitting(false);
    }
  };

  return (
    <>
      <WidgetCard
        id="project-additional-works"
        title={copy(
          "Additional Works",
          "Дополнительные работы",
          "עבודות נוספות",
        )}
        headerMeta={copy(
          "Commercial plan layer",
          "Коммерческий плановый слой",
          "שכבת תוכנית מסחרית",
        )}
      >
        <div className="space-y-4">
        <CompanyPriceStatus {...pricing} onOpen={() => router.push("/price-lists")} />
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-[15px] font-semibold leading-tight text-text">
              {copy(
                "Plan add-on work lines before installers start recording facts.",
                "Планируйте строки доп. работ до того, как монтажники начнут фиксировать факты.",
                "תכנן שורות עבודות נוספות לפני שהמתקינים מתחילים לרשום ביצוע בפועל.",
              )}
            </h3>
            <p className="mt-2 text-[12px] leading-6 text-text-secondary">
              {copy(
                "Plan the work, quantity and client price. Installer prices follow the current company pricing mode.",
                "Укажите работу, объём и цену клиента. Цена монтажника определяется действующим режимом цен компании.",
                "תכננו עבודה, כמות ומחיר לקוח. מחירי המתקין נקבעים לפי מצב התמחור של החברה.",
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
            <Button
              type="button"
              onClick={openAdditionalWorkDialog}
              className="gap-2"
              disabled={
                !canManage ||
                !pricingReady ||
                !addonTypesReady || addonTypes.length === 0
              }
            >
              <Plus className="h-4 w-4" />
              {copy(
                "Add additional work",
                "Добавить доп. работу",
                "הוסף עבודה נוספת",
              )}
            </Button>
            <div className="text-[11px] text-text-secondary">
              {loadingAddonTypes
                ? copy(
                    "Loading add-on types...",
                    "Загружаем типы доп. работ...",
                    "טוען סוגי עבודות נוספות...",
                  )
                : addonTypesError ? referenceUnavailable
                : addonTypes.length === 0
                  ? copy(
                      "No active add-on types yet.",
                      "Пока нет активных типов доп. работ.",
                      "עדיין אין סוגי עבודות נוספות פעילים.",
                    )
                  : copy(
                      "Installer facts can land on this plan later.",
                      "Позже монтажники смогут фиксировать факты по этому плану.",
                      "בהמשך מתקינים יוכלו לדווח ביצוע בפועל על התוכנית הזו.",
                    )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DimaxKpiCard
            className="min-h-[96px]"
            label={copy("Plan rows", "Строк плана", "שורות תוכנית")}
            value={addonPlanTotals.rows}
            barColor="blue"
          />
          <DimaxKpiCard
            className="min-h-[96px]"
            label={copy(
              "Planned qty",
              "Плановое кол-во",
              "כמות מתוכננת",
            )}
            value={addonPlanTotals.qty}
            barColor="green"
          />
          <DimaxKpiCard
            className="min-h-[96px]"
            label={copy("Client total", "Сумма клиента", 'סה"כ לקוח')}
            value={formatMoney(addonPlanTotals.client)}
            barColor="yellow"
          />
          <DimaxKpiCard
            className="min-h-[96px]"
            label={copy(
              "Installer total",
              "Сумма монтажника",
              'סה"כ מתקין',
            )}
            value={addonPlanTotals.missingPrice ? missingAddonPrice : formatMoney(addonPlanTotals.installer)}
            barColor="orange"
          />
        </div>

        <div className="mt-4 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
          {loadingPlan ? (
            <div className="px-3.5 py-4 text-[12px] text-text-secondary">
              {copy(
                "Loading additional works plan...",
                "Загружаем план доп. работ...",
                "טוען תוכנית עבודות נוספות...",
              )}
            </div>
          ) : plan.length === 0 ? (
            <div className="px-3.5 py-4 text-[12px] text-text-secondary">
              {copy(
                "No additional works planned yet.",
                "Пока нет запланированных доп. работ.",
                "עדיין אין עבודות נוספות מתוכננות.",
              )}
            </div>
          ) : (
            plan.map((item, index) => {
              const addon =
                addonTypes.find(
                  (row) => row.id === item.addon_type_id,
                ) || null;
              return (
                <article
                  key={
                    item.id || `${item.addon_type_id}-${index}`
                  }
                  className="px-3.5 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold leading-5 text-text">
                        {item.addon_name ||
                          addon?.name ||
                          item.addon_type_id}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                          {addon?.unit ||
                            copy(
                              "No unit",
                              "Без ед.",
                              "ללא יחידה",
                            )}
                        </span>
                        <span className="inline-flex rounded-full border border-status-ok-border bg-status-ok-bg px-2 py-1 text-[10.5px] font-semibold leading-none text-status-ok-fg">
                          {copy("Planned", "План", "מתוכנן")}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-end">
                      <div className={projectsMetricLabelClass}>
                        {copy("Qty", "Кол-во", "כמות")}
                      </div>
                      <div className="mt-1 text-[17px] font-medium leading-tight text-text tabular-nums">
                        {item.qty_planned}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className={projectsMetricLabelClass}>
                        {copy("Client", "Клиент", "לקוח")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                        {item.client_price == null || item.client_price === "" ? "\u2014" : formatMoney(Number(item.client_price))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className={projectsMetricLabelClass}>
                        {copy("Installer", "Монтажник", "מתקין")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                        {addonPlanRate(item) == null ? missingAddonPrice : formatMoney(Number(addonPlanRate(item)))}
                      </div>
                    </div>
                  </div>

                  {item.notes ? (
                    <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] leading-5 text-text-secondary">
                      {item.notes}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>

        <div className="mt-4 hidden overflow-auto rounded-lg border border-border bg-surface md:block">
          <table className="min-w-[720px] w-full text-[12px] leading-5">
            <thead className="bg-surface-subtle text-text-secondary">
              <tr>
                <th className="w-[28%] px-3 py-2.5 text-start font-medium">
                  {copy("Add-on", "Доп. работа", "עבודה נוספת")}
                </th>
                <th className="px-3 py-2.5 text-start font-medium">
                  {copy("Unit", "Ед.", "יחידה")}
                </th>
                <th className="px-3 py-2.5 text-end font-medium">
                  {copy("Qty planned", "План", "כמות")}
                </th>
                <th className="px-3 py-2.5 text-end font-medium">
                  {copy(
                    "Client price",
                    "Цена клиента",
                    "מחיר לקוח",
                  )}
                </th>
                <th className="px-3 py-2.5 text-end font-medium">
                  {copy(
                    "Installer price",
                    "Цена монтажника",
                    "מחיר מתקין",
                  )}
                </th>
                <th className="px-3 py-2.5 text-start font-medium">
                  {copy("Notes", "Примечание", "הערה")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingPlan ? (
                <tr>
                  <td
                    className="px-3 py-4 text-text-secondary"
                    colSpan={6}
                  >
                    {copy(
                      "Loading additional works plan...",
                      "Загружаем план доп. работ...",
                      "טוען תוכנית עבודות נוספות...",
                    )}
                  </td>
                </tr>
              ) : plan.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-4 text-text-secondary"
                    colSpan={6}
                  >
                    {copy(
                      "No additional works planned yet.",
                      "Пока нет запланированных доп. работ.",
                      "עדיין אין עבודות נוספות מתוכננות.",
                    )}
                  </td>
                </tr>
              ) : (
                plan.map((item, index) => {
                  const addon =
                    addonTypes.find(
                      (row) => row.id === item.addon_type_id,
                    ) || null;
                  return (
                    <tr
                      key={
                        item.id ||
                        `${item.addon_type_id}-${index}`
                      }
                      className="row-hover border-t border-border"
                    >
                      <td className="px-3 py-2.5 font-medium text-text">
                        {item.addon_name ||
                          addon?.name ||
                          item.addon_type_id}
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {addon?.unit || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {item.qty_planned}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {item.client_price == null || item.client_price === "" ? "\u2014" : formatMoney(Number(item.client_price))}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {addonPlanRate(item) == null ? missingAddonPrice : formatMoney(Number(addonPlanRate(item)))}
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {item.notes || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </div>
      </WidgetCard>
      <Dialog
        open={additionalWorkDialogOpen}
        onOpenChange={setAdditionalWorkDialogOpen}
      >
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle>
              {copy(
                "Add additional work",
                "Добавить доп. работу",
                "הוסף עבודה נוספת",
              )}
            </DialogTitle>
            <DialogDescription>
              {copy(
                "Create one planned add-on line for the selected project. Installers will later record facts against this plan.",
                "Создайте одну плановую строку доп. работ для выбранного проекта. Позже монтажники будут фиксировать факты по этому плану.",
                "צור שורת תוספת מתוכננת אחת עבור הפרויקט שנבחר. מתקינים ירשמו מאוחר יותר עובדות נגד תוכנית זו.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="additional-work-type">
                {copy("Add-on type", "Тип доп. работы", "סוג עבודה נוספת")}
              </Label>
              <select
                id="additional-work-type"
                value={additionalWorkForm.addon_type_id}
                onChange={(event) =>
                  setAdditionalWorkForm((prev) => ({
                    ...prev,
                    addon_type_id: event.target.value,
                  }))
                }
                className="control-input"
              >
                <option value="">
                  {copy(
                    "Choose add-on",
                    "Выберите доп. работу",
                    "בחר עבודה נוספת",
                  )}
                </option>
                {addonTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.unit ? `(${item.unit})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional-work-qty">
                {copy("Qty planned", "Плановое количество", "כמות מתוכננת")}
              </Label>
              <Input
                id="additional-work-qty"
                value={additionalWorkForm.qty_planned}
                onChange={(event) =>
                  setAdditionalWorkForm((prev) => ({
                    ...prev,
                    qty_planned: event.target.value,
                  }))
                }
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional-work-client-price">
                {copy("Client price", "Цена клиента", "מחיר לקוח")}
              </Label>
              <Input
                id="additional-work-client-price"
                value={additionalWorkForm.client_price}
                onChange={(event) =>
                  setAdditionalWorkForm((prev) => ({
                    ...prev,
                    client_price: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional-work-installer-price">
                {copy("Installer price", "Цена монтажника", "מחיר מתקין")}
              </Label>
              {factoryPricing ? <output id="additional-work-installer-price" className="block min-h-10 py-2 text-sm font-medium" aria-live="polite">
                {factoryAddonRates.has(additionalWorkForm.addon_type_id)
                  ? formatMoney(Number(factoryAddonRates.get(additionalWorkForm.addon_type_id))) : missingAddonPrice}
              </output> : <Input
                id="additional-work-installer-price"
                value={additionalWorkForm.installer_price}
                onChange={(event) =>
                  setAdditionalWorkForm((prev) => ({
                    ...prev,
                    installer_price: event.target.value,
                  }))
                }
                placeholder="0"
                disabled={!pricingReady}
              />}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="additional-work-notes">
                {copy("Notes", "Примечание", "הערה")}
              </Label>
              <Input
                id="additional-work-notes"
                value={additionalWorkForm.notes}
                onChange={(event) =>
                  setAdditionalWorkForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder={copy(
                  "Optional planning note",
                  "Необязательная заметка",
                  "הערת תכנון אופציונלית",
                )}
              />
            </div>
          </div>

          <div className="text-[12px] text-text-secondary">
            {selectedAddonType
              ? copy(
                  `Selected unit: ${selectedAddonType.unit || "-"}`,
                  `Выбранная единица: ${selectedAddonType.unit || "-"}`,
                  `יחידת המדידה שנבחרה: ${selectedAddonType.unit || "-"}`,
                )
              : copy(
                  "Select an add-on type to confirm unit and pricing row.",
                  "Выберите тип доп. работы, чтобы подтвердить единицу и ценовую строку.",
                  "בחר סוג עבודה נוספת כדי לאשר יחידה ושורת תמחור.",
                )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdditionalWorkDialogOpen(false)}
              disabled={additionalWorkSubmitting}
            >
              {copy("Cancel", "Отмена", "ביטול")}
            </Button>
            <Button
              onClick={() => void handleAdditionalWorkSubmit()}
              disabled={additionalWorkSubmitting || !pricingReady}
            >
              {additionalWorkSubmitting
                ? copy("Saving...", "Сохраняем...", "שומר...")
                : copy(
                    "Save additional work",
                    "Сохранить доп. работу",
                    "שמור עבודה נוספת",
                  )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
