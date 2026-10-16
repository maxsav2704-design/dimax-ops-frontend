"use client";

import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { cn } from "@/lib/utils";
import { MapPinned, MessageCircle, Phone } from "lucide-react";
import { useCopy, useI18n } from "@/lib/i18n";

import {
  ProjectAddressSuggestion, ProjectAddressSuggestionsResponse, ProjectFormFieldErrors, ProjectFormState, ProjectLifecycleStatus, buildDraftMapPreviewUrl, buildDraftProjectAddress, buildDraftWazeLink, buildDraftWhatsappLink, buildProjectAddressSuggestions, buildProjectFieldErrorCopy, emptyProjectForm, formatProjectPhoneInput, normalizeDraftPhone, projectsMetricLabelClass,
} from "./project-form";

type ProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Form values at open time; the page remounts the dialog (key) on every open. */
  initialForm: ProjectFormState;
  /** Selected project for the edit mode PATCH. */
  projectId: string | null;
  canManage: boolean;
  tokenLabel: (value: string) => string;
  /** After a successful POST: reload and select the new project (page keeps notices). */
  onCreated: (projectId: string) => Promise<void>;
  /** After a successful PATCH: reload the list and details. */
  onUpdated: (projectId: string) => Promise<void>;
};

// Projects → create/edit project dialog. Markup, form state, address lookup and
// submit moved verbatim from ProjectsPage (monolith split, Projects step 1); the
// page's success side effects became the onCreated/onUpdated callbacks.
export function ProjectDialog({
  open,
  onOpenChange,
  mode,
  initialForm,
  projectId,
  canManage,
  tokenLabel,
  onCreated,
  onUpdated,
}: ProjectDialogProps) {
  const { locale } = useI18n();
  const copy = useCopy();
  const [form, setForm] = useState<ProjectFormState>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<ProjectFormFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<
    ProjectAddressSuggestion[]
  >([]);
  const [loadingAddressSuggestions, setLoadingAddressSuggestions] =
    useState(false);

  const payload = {
    code: form.code.trim() || null,
    name: form.name.trim(),
    planned_start_date: form.planned_start_date || null,
    planned_end_date: form.planned_end_date || null,
    lifecycle_status: form.lifecycle_status,
    address: form.address.trim(),
    address_street: form.address_street.trim() || null,
    address_building: form.address_building.trim() || null,
    address_city: form.address_city.trim() || null,
    address_entrance: form.address_entrance.trim() || null,
    address_lat: form.address_lat.trim()
      ? Number(form.address_lat)
      : null,
    address_lng: form.address_lng.trim()
      ? Number(form.address_lng)
      : null,
    address_waze_url: form.address_waze_url.trim() || null,
    developer_company: form.developer_company.trim() || null,
    contact_name: form.contact_name.trim() || null,
    contact_phone: form.contact_phone.trim() || null,
    developer_phone_alt: form.developer_phone_alt.trim() || null,
    developer_whatsapp: form.developer_whatsapp.trim() || null,
    contact_email: form.contact_email.trim() || null,
    developer_notes: form.developer_notes.trim() || null,
  };
  const draftWazeLink = buildDraftWazeLink(form);
  const draftWhatsappLink = buildDraftWhatsappLink(form, locale);
  const draftCallLink = normalizeDraftPhone(form.contact_phone)
    ? `tel:${normalizeDraftPhone(form.contact_phone)}`
    : null;
  const applySuggestion = (
    suggestion: ProjectAddressSuggestion,
  ) => {
    setForm((prev) => ({
      ...prev,
      address: suggestion.label,
      address_street: suggestion.street,
      address_building: suggestion.building,
      address_city: suggestion.city,
      address_entrance: suggestion.entrance,
      address_lat: suggestion.lat,
      address_lng: suggestion.lng,
    }));
    setFieldErrors((prev) => {
      if (!prev.address_waze_url) {
        return prev;
      }
      const next = { ...prev };
      delete next.address_waze_url;
      return next;
    });
  };
  const updateField = <K extends keyof ProjectFormState>(
    field: K,
    value: ProjectFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field in fieldErrors) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof ProjectFormFieldErrors];
        return next;
      });
    }
  };
  useEffect(() => {
    if (!open) {
      setAddressSuggestions([]);
      setLoadingAddressSuggestions(false);
      return;
    }

    const query = form.address.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setLoadingAddressSuggestions(false);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoadingAddressSuggestions(true);
      try {
        const response = await apiFetch<ProjectAddressSuggestionsResponse>(
          `/api/v1/admin/projects/address-suggestions?q=${encodeURIComponent(query)}&limit=5`,
        );
        if (active) {
          setAddressSuggestions(response.items || []);
        }
      } catch {
        if (active) {
          setAddressSuggestions(buildProjectAddressSuggestions(query));
        }
      } finally {
        if (active) {
          setLoadingAddressSuggestions(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [open, form.address]);
  const handleSubmit = async () => {
    if (!canManage) return;
    if (!form.name.trim()) {
      setSubmitError(
        copy(
          "Project name is required.",
          "Название проекта обязательно.",
          "שם הפרויקט הוא שדה חובה.",
        ),
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      if (mode === "create") {
        const response = await apiFetch<{ id: string }>(
          "/api/v1/admin/projects",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
        await onCreated(response.id);
        onOpenChange(false);
        setForm(emptyProjectForm());
        return;
      }

      if (!projectId) {
        return;
      }
      await apiFetch(`/api/v1/admin/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await onUpdated(projectId);
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ApiError) {
        const fieldFromMeta =
          typeof e.meta?.field === "string" ? e.meta.field : null;
        const apiField = (e.field || fieldFromMeta) as
          | keyof ProjectFormFieldErrors
          | undefined;
        if (
          e.code === "INVALID_PHONE" &&
          apiField &&
          apiField in emptyProjectForm()
        ) {
          setFieldErrors((prev) => ({
            ...prev,
            [apiField]: buildProjectFieldErrorCopy(apiField, locale),
          }));
        }
        if (e.code === "INVALID_WAZE_URL") {
          setFieldErrors((prev) => ({
            ...prev,
            address_waze_url: buildProjectFieldErrorCopy(
              "address_waze_url",
              locale,
            ),
          }));
        }
      }
      setSubmitError(
        readableApiError(
          e,
          locale,
          copy(
            "Unable to save project settings.",
            "Не удалось сохранить настройки проекта.",
            "לא ניתן לשמור את הגדרות הפרויקט.",
          ),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[920px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? copy("Create project", "Создать проект", "צור פרויקט")
              : copy("Edit project", "Редактировать проект", "ערוך פרויקט")}
          </DialogTitle>
          <DialogDescription>
            {copy(
              "Keep one structured project record: core data, site address and developer contact for fast field actions.",
              "Держите одну структурированную карточку проекта: основная информация, адрес объекта и контакт застройщика для быстрых полевых действий.",
              "שמור כרטיס פרויקט אחד ומסודר: נתוני בסיס, כתובת האתר ואיש קשר של היזם לפעולות מהירות בשטח.",
            )}
          </DialogDescription>
        </DialogHeader>

        <Accordion
          type="multiple"
          defaultValue={["main", "address", "contact"]}
          className="w-full"
        >
          <AccordionItem value="main">
            <AccordionTrigger className="text-start">
              {copy("Main information", "Основная информация", "מידע בסיסי")}
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-form-code">
                    {copy("Project code", "Код проекта", "קוד פרויקט")}
                  </Label>
                  <Input
                    id="project-form-code"
                    value={form.code}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        code: event.target.value,
                      }))
                    }
                    placeholder="PRJ-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-name">
                    {copy("Project name", "Название проекта", "שם הפרויקט")}
                  </Label>
                  <Input
                    id="project-form-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder={copy(
                      "Ashdod Tower A",
                      "Ашдод Тауэр A",
                      "מגדל אשדוד A",
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-start">
                    {copy(
                      "Planned start",
                      "Плановая дата начала",
                      "תאריך התחלה מתוכנן",
                    )}
                  </Label>
                  <Input
                    id="project-form-start"
                    type="date"
                    value={form.planned_start_date}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        planned_start_date: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-end">
                    {copy(
                      "Planned finish",
                      "Плановая дата завершения",
                      "תאריך סיום מתוכנן",
                    )}
                  </Label>
                  <Input
                    id="project-form-end"
                    type="date"
                    value={form.planned_end_date}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        planned_end_date: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="project-form-lifecycle">
                    {copy("Lifecycle status", "Статус объекта", "סטטוס הפרויקט")}
                  </Label>
                  <Select
                    value={form.lifecycle_status}
                    onValueChange={(value) =>
                      updateField(
                        "lifecycle_status",
                        value as ProjectLifecycleStatus,
                      )
                    }
                  >
                    <SelectTrigger id="project-form-lifecycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {([
                        "PLANNED",
                        "ACTIVE",
                        "ON_HOLD",
                        "COMPLETED",
                        "CANCELLED",
                      ] as ProjectLifecycleStatus[]).map((status) => (
                        <SelectItem key={status} value={status}>
                          {tokenLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="address">
            <AccordionTrigger className="text-start">
              {copy("Site address", "Адрес объекта", "כתובת האתר")}
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="project-form-address-search">
                    {copy(
                      "Address search / fallback",
                      "Поиск адреса / запасное поле",
                      "חיפוש כתובת / שדה חלופי",
                    )}
                  </Label>
                  <Input
                    id="project-form-address-search"
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    placeholder={copy(
                      "Street, building, city",
                      "Улица, дом, город",
                      "רחוב, בניין, עיר",
                    )}
                  />
                  {loadingAddressSuggestions ||
                  addressSuggestions.length > 0 ? (
                    <div className="rounded-lg border border-border bg-surface-subtle p-3">
                      <div className={projectsMetricLabelClass}>
                        {loadingAddressSuggestions
                          ? copy(
                              "Searching address",
                              "Ищем адрес",
                              "מחפש כתובת",
                            )
                          : copy(
                              "Address suggestions",
                              "Подсказки адреса",
                              "הצעות כתובת",
                            )}
                      </div>
                      {addressSuggestions.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {addressSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.key}
                              type="button"
                              onClick={() =>
                                applySuggestion(suggestion)
                              }
                              className="inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-3 text-start text-[12px] font-medium text-text transition-colors hover:bg-surface"
                            >
                              {suggestion.label}
                            </button>
                          ))}
                        </div>
                      ) : loadingAddressSuggestions ? (
                        <div className="mt-3 text-sm text-text-secondary">
                          {copy(
                            "Checking geocoder suggestions…",
                            "Проверяем подсказки геокодера…",
                            "בודק הצעות ממנוע הכתובות…",
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-text-secondary">
                          {copy(
                            "No suggestions found yet. Continue typing or fill the fields manually.",
                            "Подсказки пока не найдены. Продолжайте ввод или заполните поля вручную.",
                            "עדיין לא נמצאו הצעות. המשך להקליד או מלא את השדות ידנית.",
                          )}
                        </div>
                      )}
                      <div className="mt-2 text-xs leading-5 text-text-secondary">
                        {copy(
                          "Choose a suggestion to autofill street, building, city and entrance. Coordinates arrive with the selected suggestion when available.",
                          "Выберите подсказку, чтобы автозаполнить улицу, дом, город и подъезд. Координаты приходят вместе с выбранной подсказкой, если они определены.",
                          "בחר הצעה כדי למלא אוטומטית רחוב, בניין, עיר וכניסה. קואורדינטות מגיעות יחד עם ההצעה שנבחרה כאשר הן זמינות.",
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-street">
                    {copy("Street", "Улица", "רחוב")}
                  </Label>
                  <Input
                    id="project-form-street"
                    value={form.address_street}
                    onChange={(event) =>
                      updateField(
                        "address_street",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-building">
                    {copy("Building", "Дом", "בניין")}
                  </Label>
                  <Input
                    id="project-form-building"
                    value={form.address_building}
                    onChange={(event) =>
                      updateField(
                        "address_building",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-city">
                    {copy("City", "Город", "עיר")}
                  </Label>
                  <Input
                    id="project-form-city"
                    value={form.address_city}
                    onChange={(event) =>
                      updateField(
                        "address_city",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-entrance">
                    {copy("Entrance", "Подъезд / вход", "כניסה")}
                  </Label>
                  <Input
                    id="project-form-entrance"
                    value={form.address_entrance}
                    onChange={(event) =>
                      updateField(
                        "address_entrance",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-lat">{copy("Latitude", "Широта", "קו רוחב")}</Label>
                  <Input
                    id="project-form-lat"
                    value={form.address_lat}
                    onChange={(event) =>
                      updateField(
                        "address_lat",
                        event.target.value,
                      )
                    }
                    placeholder="31.2456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-lng">{copy("Longitude", "Долгота", "קו אורך")}</Label>
                  <Input
                    id="project-form-lng"
                    value={form.address_lng}
                    onChange={(event) =>
                      updateField(
                        "address_lng",
                        event.target.value,
                      )
                    }
                    placeholder="34.7912345"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="project-form-waze">
                    {copy(
                      "Waze URL override",
                      "Ссылка Waze вручную",
                      "קישור Waze ידני",
                    )}
                  </Label>
                  <Input
                    id="project-form-waze"
                    value={form.address_waze_url}
                    onChange={(event) =>
                      updateField(
                        "address_waze_url",
                        event.target.value,
                      )
                    }
                    placeholder="https://www.waze.com/ul?..."
                  />
                  {fieldErrors.address_waze_url ? (
                    <div className="text-xs text-destructive">
                      {fieldErrors.address_waze_url}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-wrap content-start items-start gap-2">
                  <a
                    href={draftWazeLink || undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!draftWazeLink}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-medium transition-colors",
                      draftWazeLink
                        ? "border-border-strong bg-surface text-text hover:bg-surface-subtle"
                        : "cursor-not-allowed border-dashed border-border bg-surface-subtle text-text-secondary",
                    )}
                  >
                    <MapPinned className="h-4 w-4" aria-hidden="true" />
                    {copy("Test Waze", "Проверить Waze", "בדוק Waze")}
                  </a>
                  <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
                    {buildDraftProjectAddress(form) ||
                      copy(
                        "No address yet",
                        "Адрес пока не заполнен",
                        "הכתובת עדיין לא מולאה",
                      )}
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-border bg-surface text-sm">
                  {buildDraftMapPreviewUrl(form) ? (
                    <div className="border-b border-border bg-surface-subtle p-2">
                      <iframe
                        title={copy(
                          "Map preview",
                          "Предпросмотр карты",
                          "תצוגה מקדימה של המפה",
                        )}
                        src={
                          buildDraftMapPreviewUrl(form) || undefined
                        }
                        className="h-36 w-full rounded-lg border border-border bg-surface"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : null}
                  <div className="px-4 py-4">
                    <div className={projectsMetricLabelClass}>
                      {copy(
                        "Route preview",
                        "Предпросмотр маршрута",
                        "תצוגת מסלול",
                      )}
                    </div>
                    <div className="mt-3 font-medium text-text">
                      {buildDraftProjectAddress(form) ||
                        copy(
                          "Awaiting address",
                          "Ждём адрес",
                          "ממתין לכתובת",
                        )}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-text-secondary">
                      {form.address_lat.trim() &&
                      form.address_lng.trim()
                        ? `${copy("Coordinates", "Координаты", "קואורדינטות")}: ${form.address_lat}, ${form.address_lng}`
                        : copy(
                            "No coordinates yet. Choose an address suggestion or fill them manually.",
                            "Координаты пока не заполнены. Выберите подсказку адреса или заполните их вручную.",
                            "עדיין אין קואורדינטות. בחר הצעת כתובת או מלא ידנית.",
                          )}
                    </div>
                    <div className="mt-3 text-xs text-text-secondary">
                      {draftWazeLink
                        ? copy(
                            "Waze link is ready for a quick field check.",
                            "Ссылка Waze готова для быстрой полевой проверки.",
                            "קישור Waze מוכן לבדיקה מהירה בשטח.",
                          )
                        : copy(
                            "Fill address data to unlock navigation.",
                            "Заполните адрес, чтобы включить навигацию.",
                            "מלא נתוני כתובת כדי לפתוח ניווט.",
                          )}
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="contact">
            <AccordionTrigger className="text-start">
              {copy(
                "Developer contact",
                "Контакты застройщика",
                "אנשי קשר של היזם",
              )}
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-form-dev-company">
                    {copy(
                      "Developer company",
                      "Компания застройщика",
                      "חברת יזם",
                    )}
                  </Label>
                  <Input
                    id="project-form-dev-company"
                    value={form.developer_company}
                    onChange={(event) =>
                      updateField(
                        "developer_company",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-contact-name">
                    {copy("Contact name", "Имя ответственного", "שם איש קשר")}
                  </Label>
                  <Input
                    id="project-form-contact-name"
                    value={form.contact_name}
                    onChange={(event) =>
                      updateField(
                        "contact_name",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-phone">
                    {copy("Primary phone", "Основной телефон", "טלפון ראשי")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-10 items-center rounded-lg border border-border bg-surface-subtle px-3 text-xs font-medium text-text-secondary">
                      +972
                    </div>
                    <Input
                      id="project-form-phone"
                      value={form.contact_phone}
                      onChange={(event) =>
                        updateField(
                          "contact_phone",
                          formatProjectPhoneInput(event.target.value),
                        )
                      }
                      placeholder="+972501234567"
                    />
                  </div>
                  {fieldErrors.contact_phone ? (
                    <div className="text-xs text-destructive">
                      {fieldErrors.contact_phone}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-phone-alt">
                    {copy("Alt phone", "Доп. телефон", "טלפון נוסף")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-10 items-center rounded-lg border border-border bg-surface-subtle px-3 text-xs font-medium text-text-secondary">
                      +972
                    </div>
                    <Input
                      id="project-form-phone-alt"
                      value={form.developer_phone_alt}
                      onChange={(event) =>
                        updateField(
                          "developer_phone_alt",
                          formatProjectPhoneInput(event.target.value),
                        )
                      }
                      placeholder="+972501234568"
                    />
                  </div>
                  {fieldErrors.developer_phone_alt ? (
                    <div className="text-xs text-destructive">
                      {fieldErrors.developer_phone_alt}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-whatsapp">WhatsApp</Label>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-10 items-center rounded-lg border border-border bg-surface-subtle px-3 text-xs font-medium text-text-secondary">
                      +972
                    </div>
                    <Input
                      id="project-form-whatsapp"
                      value={form.developer_whatsapp}
                      onChange={(event) =>
                        updateField(
                          "developer_whatsapp",
                          formatProjectPhoneInput(event.target.value),
                        )
                      }
                      placeholder="+972501234569"
                    />
                  </div>
                  {fieldErrors.developer_whatsapp ? (
                    <div className="text-xs text-destructive">
                      {fieldErrors.developer_whatsapp}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-form-email">{copy("Email", "Эл. почта", "דוא״ל")}</Label>
                  <Input
                    id="project-form-email"
                    type="email"
                    value={form.contact_email}
                    onChange={(event) =>
                      updateField(
                        "contact_email",
                        event.target.value,
                      )
                    }
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="project-form-notes">
                    {copy("Notes", "Заметки", "הערות")}
                  </Label>
                  <textarea
                    id="project-form-notes"
                    value={form.developer_notes}
                    onChange={(event) =>
                      updateField(
                        "developer_notes",
                        event.target.value,
                      )
                    }
                    className="control-textarea min-h-[110px] w-full"
                    placeholder={copy(
                      "Access rules, gate, working hours, site notes",
                      "Пропуск, ворота, режим работы, заметки по объекту",
                      "כללי כניסה, שער, שעות עבודה, הערות אתר",
                    )}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap content-start items-start gap-2">
                <a
                  href={draftWhatsappLink || undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!draftWhatsappLink}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-medium transition-colors",
                    draftWhatsappLink
                      ? "border-border-strong bg-surface text-text hover:bg-surface-subtle"
                      : "cursor-not-allowed border-dashed border-border bg-surface-subtle text-text-secondary",
                  )}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {copy(
                    "Test WhatsApp",
                    "Проверить WhatsApp",
                    "בדוק WhatsApp",
                  )}
                </a>
                <a
                  href={draftCallLink || undefined}
                  aria-disabled={!draftCallLink}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-medium transition-colors",
                    draftCallLink
                      ? "border-border-strong bg-surface text-text hover:bg-surface-subtle"
                      : "cursor-not-allowed border-dashed border-border bg-surface-subtle text-text-secondary",
                  )}
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {copy("Test call", "Проверить звонок", "בדוק שיחה")}
                </a>
                {!form.contact_name.trim() &&
                !form.contact_phone.trim() &&
                !form.developer_whatsapp.trim() ? (
                  <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-xs text-status-warning-fg">
                    {copy(
                      "Add contacts to unlock quick field actions.",
                      "Добавьте контакты, чтобы включить быстрые полевые действия.",
                      "הוסף אנשי קשר כדי להפעיל פעולות שטח מהירות.",
                    )}
                  </div>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {submitError && (
          <div role="alert" className="rounded-lg border border-status-problem-border bg-status-problem-bg px-3 py-2 text-sm text-status-problem-fg">
            {submitError}
          </div>
        )}
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
            disabled={submitting}
          >
            {submitting
              ? copy("Saving...", "Сохраняем...", "שומר...")
              : mode === "create"
                ? copy("Create project", "Создать проект", "צור פרויקט")
                : copy("Save changes", "Сохранить изменения", "שמור שינויים")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
