import type { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  size?: "md" | "lg" | "xl";
  align?: "left" | "center";
  className?: string;
};

const sizes = {
  md: "text-2xl md:text-[26px]",
  lg: "text-[30px] md:text-[36px]",
  xl: "text-[40px] md:text-[52px] leading-[1.05]",
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  size = "md",
  align = "left",
  className = "",
}: SectionHeadingProps) {
  return (
    <div
      className={`flex items-end justify-between gap-6 ${align === "center" ? "text-center" : ""} ${className}`}
    >
      <div className="flex flex-col gap-1.5">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2
          className={`font-display font-medium text-ink tracking-tight ${sizes[size]}`}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="text-muted text-[15px] max-w-xl">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 pb-1">{action}</div> : null}
    </div>
  );
}
