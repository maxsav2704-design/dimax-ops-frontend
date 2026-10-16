"use client";

import { useRef } from "react";
import { WidgetCard } from "@/components/dimax";
import { normalizeDraftPhone, projectsMetricLabelClass } from "@/components/projects/project-form";
import { LtrText } from "@/components/ui/LtrText";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, MapPinned, MessageCircle, PencilLine, Phone } from "lucide-react";
import { useCopy, useI18n } from "@/lib/i18n";

import type { ProjectDetailsResponse, ProjectListItem } from "./project-types";
import { copyTextToClipboard, formatReadablePhone } from "./shared";

type ProjectSettingsCardProps = {
  details: ProjectDetailsResponse | null;
  project: ProjectListItem;
  projectCode: string;
  canManage: boolean;
  onEdit: () => void;
  onActionHint: (message: string) => void;
  onActionHintChange: (hint: string | null) => void;
  onNotice: (message: string | null) => void;
};

// Projects → "Project settings" card: identity, address, developer contact and quick actions (call / WhatsApp / Waze / copy phone). Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function ProjectSettingsCard({
  details,
  project,
  projectCode,
  canManage,
  onEdit,
  onActionHint,
  onActionHintChange,
  onNotice,
}: ProjectSettingsCardProps) {
  const copy = useCopy();

  const quickActionCopyTimeoutRef = useRef<number | null>(null);
  const clearProjectPhoneCopyTimer = () => {
    if (quickActionCopyTimeoutRef.current != null) {
      window.clearTimeout(quickActionCopyTimeoutRef.current);
      quickActionCopyTimeoutRef.current = null;
    }
  };
  const copyProjectPhone = async (value: string | null | undefined) => {
    const normalized = normalizeDraftPhone(value || "");
    if (!normalized) {
      onActionHint(
        copy(
          "Add a primary phone to unlock direct calling.",
          "Добавьте основной телефон, чтобы включить прямой звонок.",
          "הוסף טלפון ראשי כדי לפתוח חיוג ישיר.",
        ),
      );
      return;
    }
    const copied = await copyTextToClipboard(normalized);
    if (copied) {
      onActionHintChange(null);
      onNotice(
        copy(
          "Phone number copied.",
          "Номер телефона скопирован.",
          "מספר הטלפון הועתק.",
        ),
      );
    }
  };
  const scheduleProjectPhoneCopy = (value: string | null | undefined) => {
    clearProjectPhoneCopyTimer();
    quickActionCopyTimeoutRef.current = window.setTimeout(() => {
      void copyProjectPhone(value);
      quickActionCopyTimeoutRef.current = null;
    }, 700);
  };

  return (
    <WidgetCard
      title={copy(
        "Project settings",
        "Настройки проекта",
        "הגדרות פרויקט",
      )}
      headerMeta={
        <LtrText as="span">
          {projectCode}
        </LtrText>
      }
    >
      <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-text">
            {details?.code
              ? `${details.code} - ${project.name}`
              : project.name}
          </h3>
          <p className="mt-2 text-[12px] leading-6 text-text-secondary">
            {details?.address ||
              copy(
                "Add the site address and developer contact to unlock Waze, WhatsApp and direct calling.",
                "Добавьте адрес объекта и контакт застройщика, чтобы включить Waze, WhatsApp и прямой звонок.",
                "הוסף כתובת אתר ואיש קשר של היזם כדי להפעיל Waze, WhatsApp וחיוג ישיר.",
              )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
            {details?.planned_start_date ? (
              <span className="metric-chip">
                {copy("Start", "Старт", "התחלה")}{" "}
                <LtrText>
                  {details.planned_start_date}
                </LtrText>
              </span>
            ) : null}
            {details?.planned_end_date ? (
              <span className="metric-chip">
                {copy("Finish", "Финиш", "סיום")}{" "}
                <LtrText>{details.planned_end_date}</LtrText>
              </span>
            ) : null}
            <span className="metric-chip">
              {copy("Contact", "Контакт", "איש קשר")}{" "}
              {details?.contact_name ||
                copy("missing", "не заполнен", "חסר")}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            disabled={!canManage}
            className="gap-2"
          >
            <PencilLine aria-hidden="true" className="h-4 w-4" />
            {copy(
              "Edit project",
              "Редактировать проект",
              "ערוך פרויקט",
            )}
          </Button>
          <div className="hidden md:flex md:flex-wrap md:gap-2">
            {details?.waze_deep_link ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <a
                  href={details.waze_deep_link}
                  target="_blank"
                  rel="noreferrer"
                  title={details.address || ""}
                >
                  <MapPinned
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                  Waze
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onActionHint(
                    copy(
                      "Add address in project settings to unlock Waze.",
                      "Добавьте адрес в настройках проекта, чтобы включить Waze.",
                      "הוסף כתובת בהגדרות הפרויקט כדי לפתוח את Waze.",
                    ),
                  )
                }
                className="gap-2 border-dashed border-border bg-surface-subtle text-text-secondary hover:bg-surface"
              >
                <MapPinned aria-hidden="true" className="h-4 w-4" />
                Waze
              </Button>
            )}
            {details?.whatsapp_deep_link ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <a
                  href={details.whatsapp_deep_link}
                  target="_blank"
                  rel="noreferrer"
                  title={[
                    details.contact_name,
                    details.developer_whatsapp ||
                      details.contact_phone,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                >
                  <MessageCircle
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                  WhatsApp
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onActionHint(
                    copy(
                      "Add a contact phone or WhatsApp number to unlock WhatsApp.",
                      "Добавьте телефон контакта или номер WhatsApp, чтобы включить WhatsApp.",
                      "הוסף טלפון איש קשר או מספר WhatsApp כדי לפתוח את WhatsApp.",
                    ),
                  )
                }
                className="gap-2 border-dashed border-border bg-surface-subtle text-text-secondary hover:bg-surface"
              >
                <MessageCircle
                  aria-hidden="true"
                  className="h-4 w-4"
                />
                WhatsApp
              </Button>
            )}
            {details?.call_deep_link ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <a
                  href={details.call_deep_link}
                  title={details.contact_phone || ""}
                >
                  <Phone aria-hidden="true" className="h-4 w-4" />
                  {copy("Call", "Позвонить", "התקשר")}
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onActionHint(
                    copy(
                      "Add a primary phone in project settings to unlock calling.",
                      "Добавьте основной телефон в настройках проекта, чтобы включить звонок.",
                      "הוסף טלפון ראשי בהגדרות הפרויקט כדי לפתוח חיוג.",
                    ),
                  )
                }
                className="gap-2 border-dashed border-border bg-surface-subtle text-text-secondary hover:bg-surface"
              >
                <Phone aria-hidden="true" className="h-4 w-4" />
                {copy("Call", "Позвонить", "התקשר")}
              </Button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="gap-2 md:hidden"
              >
                {copy("Actions", "Действия", "פעולות")}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 md:hidden"
            >
              {details?.waze_deep_link ? (
                <DropdownMenuItem asChild className="gap-2">
                  <a
                    href={details.waze_deep_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPinned className="h-4 w-4" />
                    Waze
                  </a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() =>
                    onActionHint(
                      copy(
                        "Add address in project settings to unlock Waze.",
                        "Добавьте адрес в настройках проекта, чтобы включить Waze.",
                        "הוסף כתובת בהגדרות הפרויקט כדי לפתוח את Waze.",
                      ),
                    )
                  }
                >
                  <MapPinned className="h-4 w-4" />
                  Waze
                </DropdownMenuItem>
              )}
              {details?.whatsapp_deep_link ? (
                <DropdownMenuItem asChild className="gap-2">
                  <a
                    href={details.whatsapp_deep_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() =>
                    onActionHint(
                      copy(
                        "Add a contact phone or WhatsApp number to unlock WhatsApp.",
                        "Добавьте телефон контакта или номер WhatsApp, чтобы включить WhatsApp.",
                        "הוסף טלפון איש קשר או מספר WhatsApp כדי לפתוח את WhatsApp.",
                      ),
                    )
                  }
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </DropdownMenuItem>
              )}
              {details?.call_deep_link ? (
                <DropdownMenuItem asChild className="gap-2">
                  <a href={details.call_deep_link}>
                    <Phone className="h-4 w-4" />
                    {copy("Call", "Позвонить", "התקשר")}
                  </a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() =>
                    onActionHint(
                      copy(
                        "Add a primary phone in project settings to unlock calling.",
                        "Добавьте основной телефон в настройках проекта, чтобы включить звонок.",
                        "הוסף טלפון ראשי בהגדרות הפרויקט כדי לפתוח חיוג.",
                      ),
                    )
                  }
                >
                  <Phone className="h-4 w-4" />
                  {copy("Call", "Позвонить", "התקשר")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {details?.contact_phone ? (
            <button
              type="button"
              title={copy(
                "Click or hold to copy the number",
                "Нажмите или удерживайте, чтобы скопировать номер",
                "לחץ או החזק כדי להעתיק את המספר",
              )}
              onClick={() =>
                void copyProjectPhone(details.contact_phone)
              }
              onContextMenu={(event) => {
                event.preventDefault();
                void copyProjectPhone(details.contact_phone);
              }}
              onPointerDown={() =>
                scheduleProjectPhoneCopy(
                  details.contact_phone,
                )
              }
              onPointerUp={clearProjectPhoneCopyTimer}
              onPointerLeave={clearProjectPhoneCopyTimer}
              className="hidden min-h-8 items-center rounded-full border border-border-strong bg-surface px-3 text-[12px] font-medium text-text transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 md:inline-flex"
            >
              <LtrText>
                {formatReadablePhone(details.contact_phone)}
              </LtrText>
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 text-[12px] text-text-secondary md:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
          <div className={projectsMetricLabelClass}>
            {copy("Developer", "Застройщик", "יזם")}
          </div>
          <div className="mt-1 truncate font-medium text-text">
            {details?.developer_company || "-"}
          </div>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
          <div className={projectsMetricLabelClass}>
            {copy("Contact", "Контакт", "איש קשר")}
          </div>
          <div className="mt-1 truncate font-medium text-text">
            {details?.contact_name || "-"}
          </div>
          <div className="mt-1 text-text-secondary">
            {details?.contact_phone ? (
              <LtrText>
                {formatReadablePhone(details.contact_phone)}
              </LtrText>
            ) : (
              "-"
            )}
          </div>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
          <div className={projectsMetricLabelClass}>WhatsApp</div>
          <div className="mt-1 font-medium text-text">
            {details?.developer_whatsapp ||
            details?.contact_phone ? (
              <LtrText>
                {formatReadablePhone(
                  details?.developer_whatsapp ||
                    details?.contact_phone,
                )}
              </LtrText>
            ) : (
              "-"
            )}
          </div>
          <div className="mt-1 truncate text-text-secondary">
            {details?.contact_email ? (
              <LtrText>{details.contact_email}</LtrText>
            ) : (
              "-"
            )}
          </div>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
          <div className={projectsMetricLabelClass}>
            {copy("Notes", "Заметки", "הערות")}
          </div>
          <div className="mt-1 line-clamp-3 break-words text-text-secondary">
            {details?.developer_notes || "-"}
          </div>
        </div>
      </div>
      </div>
    </WidgetCard>
  );
}
