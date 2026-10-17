import type { ReactNode } from "react";
import { X } from "lucide-react";

import { useCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// E5 drill with memory: the filter a tile applied is visible in the toolbar and
// removable in one click.

type FilterChipProps = {
  children: ReactNode;
  onRemove: () => void;
  className?: string;
  testId?: string;
};

export function FilterChip({ children, onRemove, className, testId }: FilterChipProps) {
  const copy = useCopy();
  return (
    <span className={cn("filter-chip", className)} data-testid={testId}>
      <span className="truncate">{children}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={copy("Remove filter", "Снять фильтр", "הסרת סינון")}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent/40"
      >
        <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
      </button>
    </span>
  );
}
