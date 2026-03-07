import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  FileDown,
  ChevronRight,
  AppWindow,
  Eye,
} from "lucide-react";
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

/* ── underline input component ── */
function UInput({
  value,
  onChange,
  disabled,
  className = "",
  placeholder = "",
}: {
  value?: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      dir="rtl"
      className={`bg-transparent border-0 border-b border-foreground/20 outline-none text-[13px] text-foreground px-0.5 py-0.5 w-full focus:border-accent transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-foreground/15 ${className}`}
    />
  );
}

/* ── main page ── */
export default function JournalFormPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"app" | "document">("document");

  /* header fields */
  const [header, setHeader] = useState({
    contractor: "",
    project: "",
    address: "",
    building: "",
    date: "",
    installer: "",
  });

  /* footer fields */
  const [footer, setFooter] = useState({
    clientName: "",
    phone: "",
  });

  /* section locks */
  const [headerLocked, setHeaderLocked] = useState(false);
  const [tableLocked, setTableLocked] = useState(false);
  const [footerLocked, setFooterLocked] = useState(false);

  /* table rows */
  const [rows, setRows] = useState<RowData[]>(createEmptyRows());

  /* header completion state */
  const headerFields = [
    header.contractor,
    header.project,
    header.address,
    header.building,
    header.date,
    header.installer,
  ];
  const headerCircleState = computeCircleState(
    headerFields.map((f) => f.trim().length > 0)
  );

  /* footer completion state */
  const footerFields = [footer.clientName, footer.phone];
  const footerCircleState = computeCircleState(
    footerFields.map((f) => f.trim().length > 0)
  );

  const handleSave = () => {
    toast({ title: "Saved (mock)", description: "Draft saved successfully." });
  };

  const handleMarkReady = () => {
    toast({ title: "Marked as Ready", description: "Form status updated." });
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6">
        {/* ── top action bar ── */}
        <div className="flex items-center justify-between mb-5 max-w-[920px] mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/journal")}
              className="btn-premium w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center group/back"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground transition-all duration-200 group-hover/back:text-accent group-hover/back:-translate-x-0.5" strokeWidth={1.8} />
            </button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="text-[13px] text-muted-foreground hover:text-accent cursor-pointer transition-colors"
                    onClick={() => router.push("/journal")}
                  >
                    Journal
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="w-3.5 h-3.5" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[13px]" dir="rtl">
                    טופס אישור מסירה סופי - דלתות אש
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            {/* view toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-card mr-2">
              <button
                onClick={() => setViewMode("document")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
                  viewMode === "document"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="w-3 h-3" strokeWidth={1.8} />
                Document
              </button>
              <button
                onClick={() => setViewMode("app")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
                  viewMode === "app"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <AppWindow className="w-3 h-3" strokeWidth={1.8} />
                App
              </button>
            </div>

            <button
              onClick={handleSave}
              className="btn-premium h-8 px-3 rounded-lg border border-border bg-card text-[12px] font-medium text-foreground flex items-center gap-1.5 hover:text-accent"
            >
              <Save className="w-3.5 h-3.5" strokeWidth={1.8} />
              Save Draft
            </button>
            <button
              onClick={handleMarkReady}
              className="btn-premium h-8 px-3 rounded-lg border border-accent/30 bg-accent/5 text-[12px] font-medium text-accent flex items-center gap-1.5 hover:bg-accent/10"
            >
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.8} />
              Mark Ready
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  disabled
                  className="h-8 px-3 rounded-lg border border-border bg-card text-[12px] font-medium text-muted-foreground flex items-center gap-1.5 opacity-40 cursor-not-allowed"
                >
                  <FileDown className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Export PDF
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Backend integration pending</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── A4 paper ── */}
        <div
          className="mx-auto bg-white rounded shadow-[0_2px_20px_-4px_rgba(0,0,0,0.12)] overflow-hidden"
          style={{
            width: "210mm",
            maxWidth: "100%",
            minHeight: viewMode === "document" ? "297mm" : "auto",
            fontFamily: "'Heebo', 'Assistant', 'Segoe UI', sans-serif",
          }}
          dir="rtl"
        >
          {/* ─── HEADER BLOCK ─── */}
          <div className={`relative transition-opacity duration-300 ${headerLocked ? "opacity-40" : ""}`}>
            {/* master circle */}
            {viewMode === "app" && (
              <div className="absolute top-2 left-2 z-10">
                <MasterCircle
                  state={headerLocked ? "complete" : headerCircleState}
                  onClick={() => setHeaderLocked((l) => !l)}
                  size="md"
                />
              </div>
            )}

            {/* top header row */}
            <div className="flex items-start justify-between px-8 pt-6 pb-2">
              <div className="flex items-center gap-3">
                <div className="text-[11px] text-gray-500 leading-tight">
                  חטיבת<br />השירות
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold leading-tight text-center">רב<br/>בריח</span>
                </div>
              </div>
              <div className="text-center flex-1 mx-8">
                <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
                  טופס אישור מסירה סופי - דלתות אש
                </h1>
                <p className="text-[14px] text-gray-500 mt-1 font-medium">002110</p>
              </div>
              <div className="w-20" />
            </div>

            {/* fields grid */}
            <div className="px-8 pt-2 pb-4">
              <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                <div className="space-y-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap">שם הקבלן:</span>
                    <UInput value={header.contractor} onChange={(v) => setHeader((h) => ({ ...h, contractor: v }))} disabled={headerLocked} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap">שם הפרויקט:</span>
                    <UInput value={header.project} onChange={(v) => setHeader((h) => ({ ...h, project: v }))} disabled={headerLocked} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap">כתובת / מגרש:</span>
                    <UInput value={header.address} onChange={(v) => setHeader((h) => ({ ...h, address: v }))} disabled={headerLocked} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap">בניין:</span>
                    <UInput value={header.building} onChange={(v) => setHeader((h) => ({ ...h, building: v }))} disabled={headerLocked} />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap">תאריך:</span>
                    <UInput value={header.date} onChange={(v) => setHeader((h) => ({ ...h, date: v }))} disabled={headerLocked} placeholder="DD/MM/YYYY" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap">שם המתקין:</span>
                    <UInput value={header.installer} onChange={(v) => setHeader((h) => ({ ...h, installer: v }))} disabled={headerLocked} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── TABLE BLOCK ─── */}
          <div className={`relative px-8 py-3 transition-opacity duration-300 ${tableLocked ? "opacity-40" : ""}`}>
            {viewMode === "app" && (
              <div className="absolute top-1 left-2 z-10">
                <MasterCircle
                  state={tableLocked ? "complete" : "empty"}
                  onClick={() => setTableLocked((l) => !l)}
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

          {/* ─── FOOTER BLOCK ─── */}
          <div className={`relative px-8 pt-4 pb-6 transition-opacity duration-300 ${footerLocked ? "opacity-40" : ""}`}>
            {viewMode === "app" && (
              <div className="absolute top-2 left-2 z-10">
                <MasterCircle
                  state={footerLocked ? "complete" : footerCircleState}
                  onClick={() => setFooterLocked((l) => !l)}
                  size="md"
                />
              </div>
            )}

            <div className="border border-gray-300 p-4">
              <div className="flex items-baseline gap-8">
                <div className="flex items-baseline gap-2 flex-1">
                  <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap">שם הלקוח:</span>
                  <UInput value={footer.clientName} onChange={(v) => setFooter((f) => ({ ...f, clientName: v }))} disabled={footerLocked} />
                </div>
                <div className="flex items-baseline gap-2 flex-1">
                  <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap">טלפון:</span>
                  <UInput value={footer.phone} onChange={(v) => setFooter((f) => ({ ...f, phone: v }))} disabled={footerLocked} placeholder="+972-XX-XXX-XXXX" />
                </div>
                <div className="flex items-baseline gap-2 flex-1">
                  <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap">חתימת הלקוח:</span>
                  <div className="flex-1 h-[32px] border-b border-gray-300 relative">
                    {viewMode === "app" && !footerLocked && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-300 italic">
                        signature pad (coming soon)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-4 space-y-0.5">
              <p className="text-[9px] text-gray-400">
                רב בריח (08) תעשיות בע"מ ח.פ. 514160530
              </p>
              <p className="text-[9px] text-gray-400">
                חוצות היוצר 32 ת.ד. 3032, אשקלון 7878030 טלפון 100-800-800-1
              </p>
              <p className="text-[9px] text-gray-400">
                WWW.RAV-BARIACH.CO.IL
              </p>
            </div>
          </div>
        </div>

        <div className="h-12" />
      </div>
    </DashboardLayout>
  );
}
