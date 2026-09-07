import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

export type FabButtonSize = "sm" | "md" | "lg";

type FabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: FabButtonSize;
  icon?: ReactNode;
  "aria-label": string;
};

const sizeClassName: Record<FabButtonSize, string> = {
  sm: "h-6 w-6 text-base",
  md: "h-7 w-7 text-lg",
  lg: "h-11 w-11 text-xl",
};

function cx(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(" ");
}

export const FabButton = forwardRef<HTMLButtonElement, FabButtonProps>(
  function FabButton(
    { size = "md", icon = "+", className, disabled, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cx(
          sizeClassName[size],
          "inline-flex items-center justify-center rounded-pill bg-accent font-medium leading-none text-accent-text",
          "transition-colors duration-fast ease-standard hover:bg-accent-hover active:bg-accent-press",
          "focus-visible:outline-none focus-visible:shadow-ring-accent disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {icon}
      </button>
    );
  },
);
