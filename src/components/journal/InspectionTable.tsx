import { MasterCircle, computeCircleState, type CircleState } from "./MasterCircle";

const TABLE_COLS = [
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
];

const CHECKABLE_INDICES = [2, 3, 4, 5, 6, 7, 8];
const isCheckable = (columnIndex: number) => CHECKABLE_INDICES.includes(columnIndex);

const ROW_COUNT = 20;

export interface RowData {
  id: number;
  values: string[];
}

function createEmptyRows(): RowData[] {
  return Array.from({ length: ROW_COUNT }, (_, index) => ({
    id: index,
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
  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    const nextRows = [...rows];
    const nextValues = [...nextRows[rowIndex].values];
    nextValues[columnIndex] = value;
    nextRows[rowIndex] = { ...nextRows[rowIndex], values: nextValues };
    onRowsChange(nextRows);
  };

  const toggleCheck = (rowIndex: number, columnIndex: number) => {
    if (disabled) return;
    updateCell(rowIndex, columnIndex, rows[rowIndex].values[columnIndex] === "V" ? "" : "V");
  };

  const rowCircleState = (rowIndex: number): CircleState =>
    computeCircleState(CHECKABLE_INDICES.map((columnIndex) => rows[rowIndex].values[columnIndex] === "V"));

  const toggleRow = (rowIndex: number) => {
    if (disabled) return;
    const allChecked = CHECKABLE_INDICES.every((columnIndex) => rows[rowIndex].values[columnIndex] === "V");
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
    rows.flatMap((row) => CHECKABLE_INDICES.map((columnIndex) => row.values[columnIndex] === "V"))
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
    <div className="overflow-hidden rounded-[1.1rem] border border-gray-300 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-50 px-3 py-2">
        <p className="flex-1 text-center text-[13px] font-semibold text-gray-700">
          Контрольный лист. Отмечайте проверенные позиции
        </p>
        {viewMode === "app" && (
          <MasterCircle state={masterState} onClick={toggleAll} disabled={disabled} size="md" />
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              {TABLE_COLS.map((column, columnIndex) => (
                <th
                  key={column}
                  className="border border-gray-300 bg-gray-100 px-1 py-2 text-center text-[11px] font-semibold text-gray-600"
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
                <th className="w-8 border border-gray-300 bg-gray-100 text-[9px] font-normal text-gray-400">
                  Стр.
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
                    <td key={columnIndex} className="border border-gray-300 p-0 align-middle">
                      {isCheckable(columnIndex) ? (
                        <button
                          type="button"
                          onClick={() => toggleCheck(rowIndex, columnIndex)}
                          disabled={disabled}
                          className="flex h-[28px] w-full items-center justify-center bg-transparent transition-colors duration-100 hover:bg-blue-50/40 disabled:cursor-not-allowed"
                        >
                          {value === "V" && (
                            <span
                              className="select-none text-[14px] font-semibold text-gray-800"
                              style={{ fontFamily: "'Segoe UI Symbol', 'Segoe UI', sans-serif" }}
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      ) : (
                        <input
                          value={value}
                          disabled={disabled}
                          onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                          className="h-[28px] w-full border-0 bg-transparent px-1.5 text-center text-[11px] text-gray-800 outline-none transition-colors duration-150 focus:bg-blue-50/40 disabled:cursor-not-allowed"
                        />
                      )}
                    </td>
                  ))}
                  {viewMode === "app" && (
                    <td className="border border-gray-300 p-0 text-center align-middle">
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
