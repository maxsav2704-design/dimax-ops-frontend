"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useCopy, useI18n } from "@/lib/i18n";

import { emptyManualDoorForm } from "./manual-door-form";
import type { ManualDoorFormState } from "./manual-door-form";
import type { InstallerListItem, LibraryProductItem } from "./catalog-types";

type ManualDoorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialForm: ManualDoorFormState;
  projectId: string | null;
  canManage: boolean;
  libraryReady: boolean;
  installersReady: boolean;
  products: LibraryProductItem[];
  installers: InstallerListItem[];
  existingDoorMarkings: ReadonlySet<string>;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onDuplicate: (doorCode: string) => void;
  onCreated: (projectId: string, doorCode: string) => Promise<void>;
};

// Projects → "Add door manually" dialog: product/installer pickers, door code and unit, create request. Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function ManualDoorDialog({
  open,
  onOpenChange,
  initialForm,
  projectId,
  canManage,
  libraryReady,
  installersReady,
  products,
  installers,
  existingDoorMarkings,
  onError,
  onNotice,
  onDuplicate,
  onCreated,
}: ManualDoorDialogProps) {
  const { locale } = useI18n();
  const copy = useCopy();

  const [form, setForm] = useState<ManualDoorFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const selectedLibraryProduct = useMemo(
    () =>
      products.find(
        (item) => item.id === form.product_id,
      ) || null,
    [products, form.product_id],
  );
  useEffect(() => {
    if (!selectedLibraryProduct) {
      return;
    }
    setForm((prev) => {
      if (prev.install_type.trim()) {
        return prev;
      }
      return {
        ...prev,
        install_type: selectedLibraryProduct.install_type || "",
      };
    });
  }, [selectedLibraryProduct]);
  const handleSubmit = async () => {
    if (!canManage || !libraryReady ||
      (form.assigned_installer_id && !installersReady)) return;
    if (!projectId) {
      return;
    }
    const normalizedDoorCode = form.door_code.trim();
    if (
      !form.product_id ||
      !normalizedDoorCode ||
      !form.unit.trim()
    ) {
      onError(
        copy(
          "Choose a product and fill door code + unit before saving.",
          "Выберите продукт и введите код двери + блок перед сохранением.",
          "בחרו מוצר ומלאו קוד דלת + יחידה לפני השמירה.",
        ),
      );
      return;
    }
    if (existingDoorMarkings.has(normalizedDoorCode.toLowerCase())) {
      onError(
        copy(
          `Door code ${normalizedDoorCode} already exists in this project. Review the matrix before creating another door.`,
          `Код двери ${normalizedDoorCode} уже есть в этом проекте. Проверьте матрицу перед созданием новой двери.`,
          `קוד הדלת ${normalizedDoorCode} כבר קיים בפרויקט הזה. בדוק את המטריצה לפני יצירת דלת נוספת.`,
        ),
      );
      onDuplicate(normalizedDoorCode);
      return;
    }

    setSubmitting(true);
    onError(null);
    try {
      await apiFetch(`/api/v1/admin/projects/${projectId}/doors`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          door_code: normalizedDoorCode,
          unit: form.unit.trim(),
          floor: form.floor.trim() || null,
          location_code: form.location_code.trim() || null,
          order_number: form.order_number.trim() || null,
          install_type:
            form.install_type.trim() ||
            selectedLibraryProduct?.install_type ||
            null,
          assigned_installer_id: form.assigned_installer_id || null,
          planned_install_date: form.planned_install_date || null,
        }),
      });
      onOpenChange(false);
      setForm(emptyManualDoorForm());
      await onCreated(projectId, normalizedDoorCode);
      if (typeof document !== "undefined") {
        window.setTimeout(() => {
          document.getElementById("project-door-matrix")?.scrollIntoView?.({
            behavior: "smooth",
            block: "start",
          });
        }, 0);
      }
      onNotice(
        copy(
          `Door ${normalizedDoorCode} was added. The project matrix is now filtered to that door.`,
          `Дверь ${normalizedDoorCode} добавлена. Матрица проекта уже отфильтрована по этой двери.`,
          `הדלת ${normalizedDoorCode} נוספה. מטריצת הפרויקט כבר מסוננת לדלת הזו.`,
        ),
      );
    } catch (e) {
      onError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to create door.",
            "Не удалось создать дверь.",
            "יצירת הדלת נכשלה.",
          ),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-[840px]">
        <DialogHeader>
          <DialogTitle>
            {copy(
              "Add door manually",
              "Добавить дверь вручную",
              "הוסף דלת ידנית",
            )}
          </DialogTitle>
          <DialogDescription>
            {copy(
              "Create one operational door row directly in the selected project using a product from Library.",
              "Создайте один ряд эксплуатационных дверей непосредственно в выбранном проекте с помощью продукта из справочник.",
              "צור רשומת דלת תפעולית ישירות בפרויקט הנבחר בעזרת מוצר מהספרייה.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="manual-door-product">
              {copy("Library product", "Библиотечный продукт", "מוצר ספרייה")}
            </Label>
            <select
              id="manual-door-product"
              value={form.product_id}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  product_id: event.target.value,
                  install_type:
                    products.find(
                      (item) => item.id === event.target.value,
                    )?.install_type || prev.install_type,
                }))
              }
              className="control-input"
            >
              <option value="">
                {copy("Choose a product", "Выберите продукт", "בחר מוצר")}
              </option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} -{" "}
                  {locale === "he"
                    ? item.name_he || item.name_ru
                    : item.name_ru || item.name_he}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-door-code">
              {copy("Door code", "Код двери", "קוד דלת")}
            </Label>
            <Input
              id="manual-door-code"
              value={form.door_code}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  door_code: event.target.value,
                }))
              }
              placeholder={copy("D-1201", "D-1201", "D-1201")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-door-unit">
              {copy("Unit / apartment", "Единица/квартира", "יחידה/דירה")}
            </Label>
            <Input
              id="manual-door-unit"
              value={form.unit}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  unit: event.target.value,
                }))
              }
              placeholder={copy("12-04", "12-04", "12-04")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-door-floor">
              {copy("Floor", "Этаж", "קומה")}
            </Label>
            <Input
              id="manual-door-floor"
              value={form.floor}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  floor: event.target.value,
                }))
              }
              placeholder={copy("12", "12", "12")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-door-location">
              {copy("Location code", "Код локации", "קוד מיקום")}
            </Label>
            <Input
              id="manual-door-location"
              value={form.location_code}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  location_code: event.target.value,
                }))
              }
              placeholder={copy("dira", "dira", "dira")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-door-order">
              {copy("Order number", "Номер заказа", "מספר הזמנה")}
            </Label>
            <Input
              id="manual-door-order"
              value={form.order_number}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  order_number: event.target.value,
                }))
              }
              placeholder={copy("AZ-5001", "AZ-5001", "AZ-5001")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-door-install-type">
              {copy("Install type", "Тип монтажа", "סוג התקנה")}
            </Label>
            <Input
              id="manual-door-install-type"
              value={form.install_type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  install_type: event.target.value,
                }))
              }
              placeholder={copy("service", "service", "service")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-door-installer">
              {copy(
                "Assigned installer",
                "Назначенный монтажник",
                "מתקין משויך",
              )}
            </Label>
            <select
              id="manual-door-installer"
              disabled={!installersReady}
              value={form.assigned_installer_id}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  assigned_installer_id: event.target.value,
                }))
              }
              className="control-input"
            >
              <option value="">
                {copy(
                  "Leave unassigned",
                  "Оставить без назначения",
                  "השאר ללא שיוך",
                )}
              </option>
              {installers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                  {item.email ? ` - ${item.email}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-door-date">
              {copy(
                "Planned install date",
                "Плановая дата монтажа",
                "תאריך התקנה מתוכנן",
              )}
            </Label>
            <Input
              id="manual-door-date"
              type="date"
              value={form.planned_install_date}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  planned_install_date: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <label className="checkbox-row mt-3">
          <input
            type="checkbox"
            checked={form.is_critical}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                is_critical: event.target.checked,
              }))
            }
          />
          {copy(
            "Mark as critical door",
            "Отметить как критичную дверь",
            "סמן כדלת קריטית",
          )}
        </label>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {copy("Cancel", "Отмена", "ביטול")}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting || !libraryReady ||
              Boolean(form.assigned_installer_id && !installersReady)}
          >
            {submitting
              ? copy("Saving...", "Сохраняем...", "שומר...")
              : copy("Create door", "Создать дверь", "צור דלת")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
