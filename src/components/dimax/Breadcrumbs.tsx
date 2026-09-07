import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = HTMLAttributes<HTMLElement> & {
  items: BreadcrumbItem[];
  separator?: string;
};

export function Breadcrumbs({
  items,
  separator = "#",
  className,
  ...props
}: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("text-11 font-medium uppercase tracking-wider", className)}
      {...props}
    >
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              className="flex min-w-0 items-center gap-2"
            >
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="truncate text-link transition-colors duration-fast hover:text-link-hover hover:underline"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn("truncate", isLast ? "text-text" : "text-link")}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="text-text-tertiary">
                  {separator}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
