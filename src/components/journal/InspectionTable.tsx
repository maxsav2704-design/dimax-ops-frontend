import { useI18n } from "@/lib/i18n";

import {
  MasterCircle,
  computeCircleState,
  type CircleState,
} from "./MasterCircle";

const CHECKABLE_INDICES = [2, 3, 4, 5, 6, 7, 8];
const isCheckable = (columnIndex: number) =>
  CHECKABLE_INDICES.includes(columnIndex);

const ROW_COUNT = 20;

const tableCols = (locale: string) =>
  locale === "ru"
    ? [
        "Этаж",
        "Зона",
        "Доводчик",
        "Замок",
        "Отверстия в коробке",
        "Вставка",
        "Адаптер закрытия",
        "Маркировка",
        "Задний упор",
        "Примечания",
      ]
    : locale === "he"
      ? [
          "קומה",
          "אזור",
          "מחזיר דלת",
          "מנעול",
          "חורים במשקוף",
          "הכנסה",
          "מתאם סגירה",
          "סימון",
          "מעצור אחורי",
          "הערות",
        ]
      : [
          "Floor",
          "Zone",
          "Door closer",
          "Lock",
          "Frame holes",
          "Insert",
          "Closing adapter",
          "Marking",
          "Rear stop",
          "Notes",
        ];

export interface RowData {
  id: number;
  values: string[];
}

function createEmptyRows(): RowData[] {
  const cols = tableCols("en");
  return Array.from({ length: ROW_COUNT }, (_, index) => ({
    id: index,
    values: cols.map(() => ""),
  }));
}

interface InspectionTableProps {
  rows: RowData[];
  onRowsChange: (rows: RowData[]) => void;
  disabled?: boolean;
  viewMode: "app" | "document";
}

export { createEmptyRows };

export default function InspectionTable({
  rows,
  onRowsChange,
  disabled = false,
  viewMode,
}: InspectionTableProps) {
  const { locale } = useI18n();
  const cols = tableCols(locale);
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;

  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    const nextRows = [...rows];
    const nextValues = [...nextRows[rowIndex].values];
    nextValues[columnIndex] = value;
    nextRows[rowIndex] = { ...nextRows[rowIndex], values: nextValues };
    onRowsChange(nextRows);
  };

  const toggleCheck = (rowIndex: number, columnIndex: number) => {
    if (disabled) return;
    updateCell(
      rowIndex,
      columnIndex,
      rows[rowIndex].values[columnIndex] === "V" ? "" : "V",
    );
  };

  const rowCircleState = (rowIndex: number): CircleState =>
    computeCircleState(
      CHECKABLE_INDICES.map(
        (columnIndex) => rows[rowIndex].values[columnIndex] === "V",
      ),
    );

  const toggleRow = (rowIndex: number) => {
    if (disabled) return;
    const allChecked = CHECKABLE_INDICES.every(
      (columnIndex) => rows[rowIndex].values[columnIndex] === "V",
    );
    const nextRows = [...rows];
    const nextValues = [...nextRows[rowIndex].values];
    CHECKABLE_INDICES.forEach((columnIndex) => {
      nextValues[columnIndex] = allChecked ? "" : "V";
    });
    nextRows[rowIndex] = { ...nextRows[rowIndex], values: nextValues };
    onRowsChange(nextRows);
  };

  const colCircleState = (columnIndex: number): CircleState =>
    computeCircleState(rows.map((row) => row.values[columnIndex] === "V"));

  const toggleCol = (columnIndex: number) => {
    if (disabled) return;
    const allChecked = rows.every((row) => row.values[columnIndex] === "V");
    const nextRows = rows.map((row) => {
      const nextValues = [...row.values];
      nextValues[columnIndex] = allChecked ? "" : "V";
      return { ...row, values: nextValues };
    });
    onRowsChange(nextRows);
  };

  const masterState = computeCircleState(
    rows.flatMap((row) =>
      CHECKABLE_INDICES.map((columnIndex) => row.values[columnIndex] === "V"),
    ),
  );

  const toggleAll = () => {
    if (disabled) return;
    const allChecked = masterState === "complete";
    const nextRows = rows.map((row) => {
      const nextValues = [...row.values];
      CHECKABLE_INDICES.forEach((columnIndex) => {
        nextValues[columnIndex] = allChecked ? "" : "V";
      });
      return { ...row, values: nextValues };
    });
    onRowsChange(nextRows);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-subtle px-3 py-2">
        <p className="flex-1 text-center text-[13px] font-semibold text-text">
          {copy(
            "Inspection checklist. Mark the items you have verified.",
            "Контрольный лист. Отмечайте проверенные позиции",
            "רשימת בדיקה. סמנו את הפריטים שכבר נבדקו.",
          )}
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

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              {cols.map((column, columnIndex) => (
                <th
                  key={column}
                  className="border border-border bg-surface-sunken px-1 py-2 text-center text-[11px] font-semibold text-text-secondary"
                >
                  <div className="flex flex-col items-center gap-1">
                    {viewMode === "app" && isCheckable(columnIndex) && (
                      <MasterCircle
                        state={colCircleState(columnIndex)}
                        onClick={() => toggleCol(columnIndex)}
                        disabled={disabled}
                        size="sm"
                      />
                    )}
                    <span>{column}</span>
                  </div>
                </th>
              ))}
              {viewMode === "app" && (
                <th className="w-8 border border-border bg-surface-sunken text-[9px] font-normal text-text-tertiary">
                  {copy("Row", "Стр.", "שורה")}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowState = rowCircleState(rowIndex);
              const rowGreyed = rowState === "complete";

              return (
                <tr
                  key={row.id}
                  className={`transition-opacity duration-150 ${rowGreyed && !disabled ? "opacity-45" : ""} ${disabled ? "opacity-30" : ""}`}
                >
                  {row.values.map((value, columnIndex) => (
                    <td
                      key={columnIndex}
                      className="border border-border p-0 align-middle"
                    >
                      {isCheckable(columnIndex) ? (
                        <button
                          type="button"
                          onClick={() => toggleCheck(rowIndex, columnIndex)}
                          disabled={disabled}
                          aria-label={copy(
                            "Toggle inspection cell",
                            "Переключить ячейку проверки",
                            "החלף תא בדיקה",
                          )}
                          className="flex h-[28px] w-full items-center justify-center bg-transparent transition-colors duration-100 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed"
                        >
                          {value === "V" && (
                            <span
                              className="select-none text-[14px] font-semibold text-text"
                              style={{
                                fontFamily:
                                  "'Segoe UI Symbol', 'Segoe UI', sans-serif",
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      ) : (
                        <input
                          value={value}
                          disabled={disabled}
                          onChange={(event) =>
                            updateCell(
                              rowIndex,
                              columnIndex,
                              event.target.value,
                            )
                          }
                          className="h-[28px] w-full border-0 bg-transparent px-1.5 text-center text-[11px] text-text outline-none transition-colors duration-150 focus-visible:bg-accent/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed"
                        />
                      )}
                    </td>
                  ))}
                  {viewMode === "app" && (
                    <td className="border border-border p-0 text-center align-middle">
                      <MasterCircle
                        state={rowState}
                        onClick={() => toggleRow(rowIndex)}
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
