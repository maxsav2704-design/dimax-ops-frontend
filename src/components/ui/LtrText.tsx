"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type LtrTextProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function LtrText<T extends ElementType = "span">({
  as,
  children,
  className,
  style,
}: LtrTextProps<T>) {
  const Component = as || "span";

  return (
    <Component
      dir="ltr"
      className={cn("tabular-nums", className)}
      style={{ unicodeBidi: "isolate", ...style }}
    >
      {children}
    </Component>
  );
}
