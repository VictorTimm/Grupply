import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonClass";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  children: ReactNode;
};

export function Button({
  variant,
  size,
  full,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={buttonClass({ variant, size, full, className })}
    >
      {children}
    </button>
  );
}
