import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

export type PillButtonVariant =
  | "accent"
  | "link"
  | "secondary"
  | "destructive"
  | "ghost";

export type PillButtonSize = "sm" | "md" | "lg";

type PillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PillButtonVariant;
  size?: PillButtonSize;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  loading?: boolean;
};

const variantClassName: Record<PillButtonVariant, string> = {
  accent:
    "border-transparent bg-accent text-accent-text hover:bg-accent-hover active:bg-accent-press focus-visible:shadow-ring-accent",
  link:
    "border-transparent bg-link text-text-inverse hover:bg-link-hover active:bg-link-press focus-visible:shadow-ring-link",
  secondary:
    "border-border-strong bg-surface text-text hover:bg-surface-subtle focus-visible:shadow-ring-accent",
  destructive:
    "border-status-problem-border bg-surface text-status-problem-fg hover:bg-status-problem-bg focus-visible:shadow-ring-danger",
  ghost:
    "border-transparent bg-transparent text-text-secondary hover:bg-surface-subtle hover:text-text focus-visible:shadow-ring-accent",
};

const sizeClassName: Record<PillButtonSize, string> = {
  sm: "gap-1 px-3 py-1 text-12",
  md: "gap-1.5 px-4 py-1.5 text-13",
  lg: "gap-2 px-5 py-2 text-14",
};

function cx(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(" ");
}

export const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(
  function PillButton(
    {
      variant = "secondary",
      size = "md",
      iconStart,
      iconEnd,
      loading = false,
      disabled,
      className,
      children,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cx(
          "inline-flex items-center justify-center whitespace-nowrap rounded-pill border font-medium",
          "transition-colors duration-fast ease-standard focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          sizeClassName[size],
          variantClassName[variant],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 animate-spin rounded-pill border-[1.5px] border-current border-t-transparent"
          />
        ) : (
          iconStart ? <span aria-hidden="true">{iconStart}</span> : null
        )}
        {children}
        {iconEnd ? <span aria-hidden="true">{iconEnd}</span> : null}
      </button>
    );
  },
);
