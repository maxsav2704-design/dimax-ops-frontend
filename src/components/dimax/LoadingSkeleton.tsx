import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const loadingCopy = { en: "Loading", ru: "Загрузка", he: "טעינה" } as const;

type TableSkeletonProps = { rows?: number; columns?: number; className?: string; testId?: string };

// Placeholder rows with the same height as .data-table rows so the layout does
// not jump when data arrives.
export function TableSkeleton({ rows = 5, columns = 4, className, testId }: TableSkeletonProps) {
  const { locale } = useI18n();
  return (
    <div role="status" aria-busy="true" aria-label={loadingCopy[locale]} data-testid={testId} className={cn("w-full", className)}>
      <div className="flex gap-3 border-b border-border px-3 py-2">
        {Array.from({ length: columns }, (_, column) => (
          <Skeleton key={`h-${column}`} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex gap-3 border-b border-border px-3 py-3">
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={`${row}-${column}`} className={cn("h-3.5", column === 0 ? "flex-[2]" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

type CardSkeletonProps = { cards?: number; lines?: number; className?: string; testId?: string };

export function CardSkeleton({ cards = 3, lines = 2, className, testId }: CardSkeletonProps) {
  const { locale } = useI18n();
  return (
    <div role="status" aria-busy="true" aria-label={loadingCopy[locale]} data-testid={testId} className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: cards }, (_, card) => (
        <div key={card} className="rounded-lg border border-border bg-surface p-4">
          <Skeleton className="mb-3 h-3 w-1/3" />
          <Skeleton className="mb-2 h-6 w-1/2" />
          {Array.from({ length: lines }, (_, line) => (
            <Skeleton key={line} className={cn("mt-2 h-3", line % 2 ? "w-2/3" : "w-5/6")} />
          ))}
        </div>
      ))}
    </div>
  );
}
