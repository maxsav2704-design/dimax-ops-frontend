import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppWindow, ArrowLeft, CheckCircle2, ChevronRight, Eye, FileDown, Save } from "lucide-react";

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
import { MasterCircle, computeCircleState } from "@/components/journal/MasterCircle";
import InspectionTable, { createEmptyRows, type RowData } from "@/components/journal/InspectionTable";

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
      className={`w-full border-0 border-b border-foreground/16 bg-transparent px-0.5 py-1 text-[13px] text-foreground outline-none transition-colors duration-200 placeholder:text-foreground/25 focus:border-accent disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    />
  );
}

export default function JournalFormPage() {
  const router = useRouter();
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

  const headerCircleState = computeCircleState([
    header.contractor,
    header.project,
    header.address,
    header.building,
    header.date,
    header.installer,
  ].map((field) => field.trim().length > 0));

  const footerCircleState = computeCircleState([
    footer.clientName,
    footer.phone,
  ].map((field) => field.trim().length > 0));

  const handleSave = () => {
    toast({ title: "Черновик сохранён", description: "Форма успешно сохранена." });
  };

  const handleMarkReady = () => {
    toast({ title: "Форма готова", description: "Статус журнала обновлён." });
  };

  return (
    <DashboardLayout>
      <div className="page-shell page-stack motion-stagger">
        <div className="surface-panel panel-pad-sm mx-auto w-full max-w-[1120px]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => router.push("/journal")}
                className="btn-premium inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card/80 text-muted-foreground hover:text-accent"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <div className="min-w-0">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        className="cursor-pointer text-[13px] text-muted-foreground transition-colors hover:text-accent"
                        onClick={() => router.push("/journal")}
                      >
                        Журнал
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-[13px] font-medium text-foreground">
                        Финальная форма сдачи
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-card-foreground">
                  Финальная форма сдачи проекта
                </h1>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Собранный документ для передачи клиенту, проверки дверей и финального подтверждения монтажа.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card/70 p-1">
                <button
                  onClick={() => setViewMode("document")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                    viewMode === "document"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Документ
                </button>
                <button
                  onClick={() => setViewMode("app")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                    viewMode === "app"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AppWindow className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Приложение
                </button>
              </div>

              <button
                onClick={handleSave}
                className="btn-premium inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card/80 px-4 text-[13px] font-medium text-foreground hover:text-accent"
              >
                <Save className="h-4 w-4" strokeWidth={1.8} />
                Сохранить черновик
              </button>
              <button
                onClick={handleMarkReady}
                className="btn-premium inline-flex h-10 items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 text-[13px] font-medium text-accent hover:bg-accent/15"
              >
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
                Отметить готовой
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    disabled
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card/80 px-4 text-[13px] font-medium text-muted-foreground opacity-45"
                  >
                    <FileDown className="h-4 w-4" strokeWidth={1.8} />
                    Экспорт PDF
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Интеграция экспорта будет подключена на backend.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div
          className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-[1.6rem] border border-border/70 bg-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.28)]"
          style={{ width: "210mm", maxWidth: "100%", minHeight: viewMode === "document" ? "297mm" : "auto" }}
        >
          <div className={`relative border-b border-slate-200 px-8 py-7 transition-opacity duration-300 ${headerLocked ? "opacity-45" : ""}`}>
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
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  DIMAX Operations
                </div>
                <div className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-slate-900">
                  Финальная форма сдачи
                </div>
                <div className="mt-2 text-[13px] leading-6 text-slate-500">
                  Документ для проверки дверей, фиксации статуса и подтверждения передачи клиенту.
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Форма</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">JR-002110</div>
              </div>
            </div>

            <div className="mt-8 grid gap-x-10 gap-y-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="field-stack">
                  <label className="field-label text-slate-500">Подрядчик</label>
                  <UInput value={header.contractor} onChange={(value) => setHeader((prev) => ({ ...prev, contractor: value }))} disabled={headerLocked} />
                </div>
                <div className="field-stack">
                  <label className="field-label text-slate-500">Проект</label>
                  <UInput value={header.project} onChange={(value) => setHeader((prev) => ({ ...prev, project: value }))} disabled={headerLocked} />
                </div>
                <div className="field-stack">
                  <label className="field-label text-slate-500">Адрес / участок</label>
                  <UInput value={header.address} onChange={(value) => setHeader((prev) => ({ ...prev, address: value }))} disabled={headerLocked} />
                </div>
                <div className="field-stack">
                  <label className="field-label text-slate-500">Корпус / секция</label>
                  <UInput value={header.building} onChange={(value) => setHeader((prev) => ({ ...prev, building: value }))} disabled={headerLocked} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="field-stack">
                  <label className="field-label text-slate-500">Дата</label>
                  <UInput value={header.date} onChange={(value) => setHeader((prev) => ({ ...prev, date: value }))} disabled={headerLocked} placeholder="ДД.ММ.ГГГГ" />
                </div>
                <div className="field-stack">
                  <label className="field-label text-slate-500">Монтажник</label>
                  <UInput value={header.installer} onChange={(value) => setHeader((prev) => ({ ...prev, installer: value }))} disabled={headerLocked} />
                </div>
              </div>
            </div>
          </div>

          <div className={`relative border-b border-slate-200 px-8 py-6 transition-opacity duration-300 ${tableLocked ? "opacity-45" : ""}`}>
            {viewMode === "app" && (
              <div className="absolute left-4 top-4 z-10">
                <MasterCircle
                  state={tableLocked ? "complete" : "empty"}
                  onClick={() => setTableLocked((locked) => !locked)}
                  size="md"
                />
              </div>
            )}
            <InspectionTable rows={rows} onRowsChange={setRows} disabled={tableLocked} viewMode={viewMode} />
          </div>

          <div className={`relative px-8 py-7 transition-opacity duration-300 ${footerLocked ? "opacity-45" : ""}`}>
            {viewMode === "app" && (
              <div className="absolute left-4 top-4 z-10">
                <MasterCircle
                  state={footerLocked ? "complete" : footerCircleState}
                  onClick={() => setFooterLocked((locked) => !locked)}
                  size="md"
                />
              </div>
            )}

            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-5 py-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="field-stack">
                  <label className="field-label text-slate-500">Имя клиента</label>
                  <UInput value={footer.clientName} onChange={(value) => setFooter((prev) => ({ ...prev, clientName: value }))} disabled={footerLocked} />
                </div>
                <div className="field-stack">
                  <label className="field-label text-slate-500">Телефон</label>
                  <UInput value={footer.phone} onChange={(value) => setFooter((prev) => ({ ...prev, phone: value }))} disabled={footerLocked} placeholder="+972-XX-XXX-XXXX" />
                </div>
                <div className="field-stack">
                  <label className="field-label text-slate-500">Подпись клиента</label>
                  <div className="flex h-[38px] items-end border-b border-slate-300 text-[11px] text-slate-400">
                    {viewMode === "app" && !footerLocked ? "Подпись будет подключена позже" : ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-1 text-center text-[10px] leading-5 text-slate-400">
              <p>DIMAX Operations Suite · Финальная передача проекта</p>
              <p>Документ предназначен для фиксации факта монтажа, проверки и приёмки.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
