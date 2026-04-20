export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

type Options = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  className?: string;
};

const base =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none transition-[transform,background-color,box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas focus-visible:ring-iris disabled:cursor-not-allowed disabled:opacity-50";

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] rounded-[8px]",
  md: "h-10 px-4 text-sm rounded-[10px]",
  lg: "h-12 px-6 text-[15px] rounded-[12px]",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ember text-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_8px_20px_-12px_rgba(232,90,69,0.6)] hover:bg-ember-deep hover:-translate-y-[1px] active:translate-y-0",
  secondary:
    "bg-transparent text-iris border border-iris/40 hover:border-iris hover:bg-iris-wash",
  ghost:
    "bg-transparent text-ink-soft hover:bg-surface-sunk hover:text-ink border border-transparent",
  danger:
    "bg-transparent text-clay border border-clay/40 hover:bg-clay hover:text-white",
  quiet:
    "bg-surface-sunk text-ink-soft border border-border hover:bg-surface hover:border-border-strong",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  full,
  className = "",
}: Options = {}): string {
  return [
    base,
    sizes[size],
    variants[variant],
    full ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
