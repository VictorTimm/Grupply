import type { HTMLAttributes, ReactNode } from "react";

type EyebrowProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "muted" | "ember" | "iris";
  children: ReactNode;
};

const tones = {
  muted: "text-muted",
  ember: "text-ember-deep",
  iris: "text-iris-deep",
};

export function Eyebrow({
  tone = "muted",
  className = "",
  children,
  ...rest
}: EyebrowProps) {
  return (
    <span
      {...rest}
      className={`eyebrow ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
