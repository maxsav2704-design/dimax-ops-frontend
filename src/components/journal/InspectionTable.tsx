import { MasterCircle, computeCircleState, type CircleState } from "./MasterCircle";

const TABLE_COLS = [
  "קומה",
  "מיקום",
  "מחזיר שמן",
  "טריקה",
  "ניקובים במשקוף",
  "אינסרט",
  "מתאם סגירה",
  "תו תקן",
  "עוקץ אחורי",
  "הערות",
];

// Columns 2–8 are V-check (inspection checkmarks), 0,1,9 are text
const CHECKABLE_INDICES = [2, 3, 4, 5, 6, 7, 8];
const isCheckable = (ci: number) => CHECKABLE_INDICES.includes(ci);

const ROW_COUNT = 20;

export interface RowData {
  id: number;
  values: string[]; // "" or "V" for checkable, free text for text cols
}

function createEmptyRows(): RowData[] {
  return Array.from({ length: ROW_COUNT }, (_, i) => ({
    id: i,
    values: TABLE_COLS.map(() => ""),
  }));
}

interface InspectionTableProps {
  rows: RowData[];
  onRowsChange: (rows: RowData[]) => void;
  disabled?: boolean;
  viewMode: "app" | "document";
}

export { createEmptyRows, TABLE_COLS };

export default function InspectionTable({
  rows,
  onRowsChange,
  disabled = false,
  viewMode,
}: InspectionTableProps) {
  const updateCell = (ri: number, ci: number, val: string) => {
    const next = [...rows];
    const newValues = [...next[ri].values];
    newValues[ci] = val;
    next[ri] = { ...next[ri], values: newValues };
    onRowsChange(next);
  };

  const toggleCheck = (ri: number, ci: number) => {
    if (disabled) return;
    updateCell(ri, ci, rows[ri].values[ci] === "V" ? "" : "V");
  };

  // Per-row circle: state of all checkable cells in that row
  const rowCircleState = (ri: number): CircleState =>
    computeCircleState(CHECKABLE_INDICES.map((ci) => rows[ri].values[ci] === "V"));

  const toggleRow = (ri: number) => {
    if (disabled) return;
    const allChecked = CHECKABLE_INDICES.every((ci) => rows[ri].values[ci] === "V");
    const next = [...rows];
    const newValues = [...next[ri].values];
    CHECKABLE_INDICES.forEach((ci) => {
      newValues[ci] = allChecked ? "" : "V";
    });
    next[ri] = { ...next[ri], values: newValues };
    onRowsChange(next);
  };

  // Per-column circle: state of all cells in that column
  const colCircleState = (ci: number): CircleState =>
    computeCircleState(rows.map((r) => r.values[ci] === "V"));

  const toggleCol = (ci: number) => {
    if (disabled) return;
    const allChecked = rows.every((r) => r.values[ci] === "V");
    const next = rows.map((r) => {
      const newValues = [...r.values];
      newValues[ci] = allChecked ? "" : "V";
      return { ...r, values: newValues };
    });
    onRowsChange(next);
  };

  // Master circle: all checkable cells
  const allChecks = rows.flatMap((r) =>
    CHECKABLE_INDICES.map((ci) => r.values[ci] === "V")
  );
  const masterState = computeCircleState(allChecks);

  const toggleAll = () => {
    if (disabled) return;
    const allChecked = masterState === "complete";
    const next = rows.map((r) => {
      const newValues = [...r.values];
      CHECKABLE_INDICES.forEach((ci) => {
        newValues[ci] = allChecked ? "" : "V";
      });
      return { ...r, values: newValues };
    });
    onRowsChange(next);
  };

  return (
    <div className="border border-gray-300 bg-gray-50">
      {/* table title + master circle */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-300">
        <p className="text-[13px] font-semibold text-gray-700 flex-1 text-center">
          נושאים לבדיקה (יש לסמן ב-V)
        </p>
        {viewMode === "app" && (
          <MasterCircle
            state={masterState}
            onClick={toggleAll}
            disabled={disabled}
            size="md"
          />
        )}
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              {TABLE_COLS.map((col, ci) => (
                <th
                  key={col}
                  className="text-[11px] font-semibold text-gray-600 py-2 px-1 border border-gray-300 bg-gray-100 text-center whitespace-nowrap"
                >
                  <div className="flex flex-col items-center gap-1">
                    {viewMode === "app" && isCheckable(ci) && (
                      <MasterCircle
                        state={colCircleState(ci)}
                        onClick={() => toggleCol(ci)}
                        disabled={disabled}
                        size="sm"
                      />
                    )}
                    <span>{col}</span>
                  </div>
                </th>
              ))}
              {viewMode === "app" && (
                <th className="w-7 border border-gray-300 bg-gray-100 text-[9px] text-gray-400 font-normal">
                  שורה
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const rState = rowCircleState(ri);
              const rowGreyed = rState === "complete";
              return (
                <tr
                  key={row.id}
                  className={`transition-opacity duration-150 ${rowGreyed && !disabled ? "opacity-40" : ""} ${disabled ? "opacity-30" : ""}`}
                >
                  {row.values.map((val, ci) => (
                    <td key={ci} className="border border-gray-300 p-0">
                      {isCheckable(ci) ? (
                        <button
                          type="button"
                          onClick={() => toggleCheck(ri, ci)}
                          disabled={disabled}
                          className="w-full h-[26px] flex items-center justify-center bg-transparent hover:bg-blue-50/30 transition-colors duration-100 disabled:cursor-not-allowed"
                        >
                          {val === "V" && (
                            <span className="text-[14px] text-gray-800 font-medium select-none" style={{ fontFamily: "'Segoe Script', 'Comic Sans MS', cursive" }}>
                              ✓
                            </span>
                          )}
                        </button>
                      ) : (
                        <input
                          value={val}
                          disabled={disabled}
                          onChange={(e) => updateCell(ri, ci, e.target.value)}
                          dir="rtl"
                          className="w-full h-[26px] bg-transparent border-0 outline-none text-[11px] text-gray-800 px-1.5 text-center focus:bg-blue-50/40 transition-colors duration-150 disabled:cursor-not-allowed"
                        />
                      )}
                    </td>
                  ))}
                  {viewMode === "app" && (
                    <td className="border border-gray-300 p-0 text-center">
                      <MasterCircle
                        state={rState}
                        onClick={() => toggleRow(ri)}
                        disabled={disabled}
                        size="sm"
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
