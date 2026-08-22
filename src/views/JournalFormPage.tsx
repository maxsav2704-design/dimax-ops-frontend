import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppWindow,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileDown,
  Save,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "@/hooks/use-toast";
import {
  MasterCircle,
  computeCircleState,
} from "@/components/journal/MasterCircle";
import InspectionTable, {
  createEmptyRows,
  type RowData,
} from "@/components/journal/InspectionTable";
import { useI18n } from "@/lib/i18n";

function UInput({
  value,
  onChange,
  disabled,
  className = "",
  placeholder = "",
}: {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full border-0 border-b border-foreground/16 bg-transparent px-0.5 py-1 text-[13px] text-text outline-none transition-colors duration-200 placeholder:text-text/25 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    />
  );
}

export default function JournalFormPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
  const [viewMode, setViewMode] = useState<"app" | "document">("document");

  const [header, setHeader] = useState({
    contractor: "",
    project: "",
    address: "",
    building: "",
    date: "",
    installer: "",
  });

  const [footer, setFooter] = useState({
    clientName: "",
    phone: "",
  });

  const [headerLocked, setHeaderLocked] = useState(false);
  const [tableLocked, setTableLocked] = useState(false);
  const [footerLocked, setFooterLocked] = useState(false);
  const [rows, setRows] = useState<RowData[]>(createEmptyRows());

  const headerCircleState = computeCircleState(
    [
      header.contractor,
      header.project,
      header.address,
      header.building,
      header.date,
      header.installer,
    ].map((field) => field.trim().length > 0),
  );

  const footerCircleState = computeCircleState(
    [footer.clientName, footer.phone].map((field) => field.trim().length > 0),
  );

  const handleSave = () => {
    toast({
      title: copy("Draft saved", "Черновик сохранён", "טיוטה נשמרה"),
      description: copy(
        "The form was saved successfully.",
        "Форма успешно сохранена.",
        "הטופס נשמר בהצלחה.",
      ),
    });
  };

  const handleMarkReady = () => {
    toast({
      title: copy("Form is ready", "Форма готова", "הטופס מוכן"),
      description: copy(
        "Journal status updated.",
        "Статус журнала обновлён.",
        "סטטוס היומן עודכן.",
      ),
    });
  };

  return (
    <DashboardLayout>
      <div className="page-shell page-stack motion-stagger">
        <div className="mx-auto w-full max-w-[1120px] rounded-lg border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/journal")}
                aria-label={copy(
                  "Back to journal",
                  "Назад к журналу",
                  "חזרה ליומן",
                )}
                className="btn-premium inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:text-accent"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <div className="min-w-0">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        className="cursor-pointer text-[13px] text-text-secondary transition-colors hover:text-accent"
                        onClick={() => router.push("/journal")}
                      >
                        {copy("Journal", "Журнал", "יומן")}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-[13px] font-medium text-text">
                        {copy(
                          "Final handoff form",
                          "Финальная форма сдачи",
                          "טופס מסירה סופי",
                        )}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <h1 className="mt-2 text-xl font-semibold text-text">
                  {copy(
                    "Final project handoff form",
                    "Финальная форма сдачи проекта",
                    "טופס מסירה סופי של הפרויקט",
                  )}
                </h1>
                <p className="mt-1 text-[13px] leading-6 text-text-secondary">
                  {copy(
                    "A compiled document for client handoff, door verification, and final installation confirmation.",
                    "Собранный документ для передачи клиенту, проверки дверей и финального подтверждения монтажа.",
                    "מסמך מרוכז למסירה ללקוח, בדיקת דלתות ואישור סופי של ההתקנה.",
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-sunken p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("document")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors duration-200 ${
                    viewMode === "document"
                      ? "bg-accent text-accent-foreground"
                      : "text-text-secondary hover:text-text"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {copy("Document", "Документ", "מסמך")}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("app")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors duration-200 ${
                    viewMode === "app"
                      ? "bg-accent text-accent-foreground"
                      : "text-text-secondary hover:text-text"
                  }`}
                >
                  <AppWindow className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {copy("App", "Приложение", "אפליקציה")}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="btn-premium inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-[13px] font-medium text-text hover:text-accent"
              >
                <Save className="h-4 w-4" strokeWidth={1.8} />
                {copy("Save draft", "Сохранить черновик", "שמור טיוטה")}
              </button>
              <button
                type="button"
                onClick={handleMarkReady}
                className="btn-premium inline-flex h-10 items-center gap-2 rounded-lg border border-transparent bg-accent px-4 text-[13px] font-medium text-accent-foreground hover:bg-[var(--dmx-accent-hover)]"
              >
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
                {copy("Mark ready", "Отметить готовой", "סמן כמוכן")}
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-[13px] font-medium text-text-secondary opacity-45"
                  >
                    <FileDown className="h-4 w-4" strokeWidth={1.8} />
                    {copy("Export PDF", "Экспорт PDF", "ייצוא PDF")}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {copy(
                      "Export integration will be connected on the backend.",
                      "Экспортная интеграция будет подключена на бэкенде.",
                      "שילוב הייצוא יהיה מחובר בקצה העורפי.",
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div
          className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-lg border border-border bg-surface"
          style={{
            width: "210mm",
            maxWidth: "100%",
            minHeight: viewMode === "document" ? "297mm" : "auto",
          }}
        >
          <div
            className={`relative border-b border-border px-8 py-7 transition-opacity duration-300 ${headerLocked ? "opacity-45" : ""}`}
          >
            {viewMode === "app" && (
              <div className="absolute left-4 top-4 z-10">
                <MasterCircle
                  state={headerLocked ? "complete" : headerCircleState}
                  onClick={() => setHeaderLocked((locked) => !locked)}
                  size="md"
                />
              </div>
            )}

            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-[11px] font-semibold uppercase text-text-secondary">
                  DIMAX Operations
                </div>
                <div className="mt-2 text-[28px] font-semibold leading-none text-text">
                  {copy(
                    "Final handoff form",
                    "Финальная форма сдачи",
                    "טופס מסירה סופי",
                  )}
                </div>
                <div className="mt-2 text-[13px] leading-6 text-text-secondary">
                  {copy(
                    "A document for door inspection, status capture, and customer handoff confirmation.",
                    "Документ для проверки дверей, фиксации статуса и подтверждения передачи клиенту.",
                    "מסמך לבדיקת דלתות, לקיבוע סטטוס ולאישור המסירה ללקוח.",
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface-subtle px-4 py-3 text-end">
                <div className="text-[11px] font-semibold uppercase text-text-secondary">
                  {copy("Form", "Форма", "טופס")}
                </div>
                <div className="mt-1 text-lg font-semibold text-text">
                  JR-002110
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-x-10 gap-y-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="field-stack">
                  <label className="field-label text-text-secondary">
                    {copy("Contractor", "Подрядчик", "קבלן")}
                  </label>
                  <UInput
                    value={header.contractor}
                    onChange={(value) =>
                      setHeader((prev) => ({ ...prev, contractor: value }))
                    }
                    disabled={headerLocked}
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label text-text-secondary">
                    {copy("Project", "Проект", "פרויקט")}
                  </label>
                  <UInput
                    value={header.project}
                    onChange={(value) =>
                      setHeader((prev) => ({ ...prev, project: value }))
                    }
                    disabled={headerLocked}
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label text-text-secondary">
                    {copy("Address / site", "Адрес / участок", "כתובת / אתר")}
                  </label>
                  <UInput
                    value={header.address}
                    onChange={(value) =>
                      setHeader((prev) => ({ ...prev, address: value }))
                    }
                    disabled={headerLocked}
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label text-text-secondary">
                    {copy(
                      "Building / section",
                      "Корпус / секция",
                      "בניין / אגף",
                    )}
                  </label>
                  <UInput
                    value={header.building}
                    onChange={(value) =>
                      setHeader((prev) => ({ ...prev, building: value }))
                    }
                    disabled={headerLocked}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="field-stack">
                  <label className="field-label text-text-secondary">
                    {copy("Date", "Дата", "תאריך")}
                  </label>
                  <UInput
                    value={header.date}
                    onChange={(value) =>
                      setHeader((prev) => ({ ...prev, date: value }))
                    }
                    disabled={headerLocked}
                    placeholder={copy("DD.MM.YYYY", "ДД.ММ.ГГГГ", "DD.MM.YYYY")}
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label text-text-secondary">
                    {copy("Installer", "Монтажник", "מתקין")}
                  </label>
                  <UInput
                    value={header.installer}
                    onChange={(value) =>
                      setHeader((prev) => ({ ...prev, installer: value }))
                    }
                    disabled={headerLocked}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`relative border-b border-border px-8 py-6 transition-opacity duration-300 ${tableLocked ? "opacity-45" : ""}`}
          >
            {viewMode === "app" && (
              <div className="absolute left-4 top-4 z-10">
                <MasterCircle
                  state={tableLocked ? "complete" : "empty"}
                  onClick={() => setTableLocked((locked) => !locked)}
                  size="md"
                />
              </div>
            )}
            <InspectionTable
              rows={rows}
              onRowsChange={setRows}
              disabled={tableLocked}
              viewMode={viewMode}
            />
          </div>

          <div
            className={`relative px-8 py-7 transition-opacity duration-300 ${footerLocked ? "opacity-45" : ""}`}
          >
            {viewMode === "app" && (
              <div className="absolute left-4 top-4 z-10">
                <MasterCircle
                  state={footerLocked ? "complete" : footerCircleState}
                  onClick={() => setFooterLocked((locked) => !locked)}
                  size="md"
                />
              </div>
            )}

            <div className="rounded-lg border border-border bg-surface-subtle px-5 py-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="field-stack">
                  <label className="field-label text-text-secondary">
                    {copy("Client name", "Имя клиента", "שם הלקוח")}
                  </label>
                  <UInput
                    value={footer.clientName}
                    onChange={(value) =>
                      setFooter((prev) => ({ ...prev, clientName: value }))
                    }
                    disabled={footerLocked}
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label text-text-secondary">
                    {copy("Phone", "Телефон", "טלפון")}
                  </label>
                  <UInput
                    value={footer.phone}
                    onChange={(value) =>
                      setFooter((prev) => ({ ...prev, phone: value }))
                    }
                    disabled={footerLocked}
                    placeholder="+972-XX-XXX-XXXX"
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label text-text-secondary">
                    {copy("Client signature", "Подпись клиента", "חתימת הלקוח")}
                  </label>
                  <div className="flex h-[38px] items-end border-b border-border-strong text-[11px] text-text-tertiary">
                    {viewMode === "app" && !footerLocked
                      ? copy(
                          "Signature support will be connected later",
                          "Подпись будет подключена позже",
                          "תמיכה בחתימה תחובר בהמשך",
                        )
                      : ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-1 text-center text-[10px] leading-5 text-text-tertiary">
              <p>
                {copy(
                  "DIMAX Operations Suite · Final project handoff",
                  "DIMAX Operations Suite · Финальная передача проекта",
                  "DIMAX Operations Suite · מסירת פרויקט סופית",
                )}
              </p>
              <p>
                {copy(
                  "The document records installation completion, inspection, and acceptance.",
                  "Документ предназначен для фиксации факта монтажа, проверки и приёмки.",
                  "המסמך נועד לתעד את סיום ההתקנה, הבדיקה והקבלה.",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
