import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "feature" | "row" | "quiet" | "panel";
type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  as?: "div" | "article" | "section" | "aside";
  children: ReactNode;
};

const variants: Record<CardVariant, string> = {
  feature:
    "bg-surface border border-border rounded-[16px] p-7 md:p-9 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-lift)] transition-shadow",
  row: "bg-surface border border-border rounded-[10px] p-5",
  quiet: "bg-transparent p-0",
  panel: "bg-surface-sunk border border-border rounded-[14px] p-6",
};

export function Card({
  variant = "feature",
  as = "div",
  className = "",
  children,
  ...rest
}: CardProps) {
  const Tag = as as "div";
  return (
    <Tag {...rest} className={`${variants[variant]} ${className}`}>
      {children}
    </Tag>
  );
}
