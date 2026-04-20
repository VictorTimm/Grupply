type Options = {
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  className?: string;
};

const sizes = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-3.5 text-[14px]",
  lg: "h-12 px-4 text-[15px]",
};

export function inputClass({
  size = "md",
  invalid = false,
  className = "",
}: Options = {}): string {
  return [
    "block w-full bg-surface text-ink placeholder:text-mute-soft",
    "border-b border-border-strong rounded-none",
    "focus-visible:outline-none focus-visible:border-ink focus-visible:bg-surface",
    "transition-colors",
    sizes[size],
    invalid ? "border-clay focus-visible:border-clay" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function textareaClass({
  invalid = false,
  className = "",
}: Omit<Options, "size"> = {}): string {
  return [
    "block w-full bg-surface text-ink placeholder:text-mute-soft",
    "border border-border rounded-[10px] px-3.5 py-3 text-[14px] leading-relaxed",
    "focus-visible:outline-none focus-visible:border-ink",
    "transition-colors resize-y",
    invalid ? "border-clay focus-visible:border-clay" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function labelClass(className = ""): string {
  return `text-[11px] uppercase tracking-[0.14em] text-muted font-medium mb-1.5 block ${className}`;
}
