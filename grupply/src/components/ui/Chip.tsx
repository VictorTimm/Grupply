import type { HTMLAttributes, ReactNode } from "react";

type ChipTone =
  | "neutral"
  | "iris"
  | "ember"
  | "sage"
  | "clay"
  | "outline"
  | "ghost";

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: ChipTone;
  size?: "sm" | "md";
  children: ReactNode;
};

const tones: Record<ChipTone, string> = {
  neutral: "bg-surface-sunk text-ink-soft border border-border",
  iris: "bg-iris-wash text-iris-deep border border-iris/20",
  ember: "bg-ember-wash text-ember-deep border border-ember/30",
  sage: "bg-sage/10 text-sage border border-sage/25",
  clay: "bg-clay/10 text-clay border border-clay/25",
  outline: "bg-transparent text-ink-soft border border-border",
  ghost: "bg-transparent text-muted border border-transparent",
};

const sizes = {
  sm: "text-[11px] px-2 py-[2px] rounded-[4px] tracking-wide",
  md: "text-xs px-2.5 py-1 rounded-full",
};

export function Chip({
  tone = "neutral",
  size = "md",
  className = "",
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap font-medium ${tones[tone]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
