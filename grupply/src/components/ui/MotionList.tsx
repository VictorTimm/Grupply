"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type MotionListProps = {
  as?: "div" | "ul" | "ol";
  stagger?: number;
  delay?: number;
  className?: string;
  children: ReactNode;
};

export function MotionList({
  as = "div",
  stagger = 0.045,
  delay = 0.02,
  className,
  children,
}: MotionListProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Tag = as as "div";
    return <Tag className={className}>{children}</Tag>;
  }

  const Comp = motion[as];

  return (
    <Comp
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
      className={className}
    >
      {children}
    </Comp>
  );
}

type MotionItemProps = {
  as?: "div" | "li" | "article";
  className?: string;
  children: ReactNode;
};

export function MotionItem({
  as = "div",
  className,
  children,
}: MotionItemProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Tag = as as "div";
    return (
      <Tag className={className}>
        {children}
      </Tag>
    );
  }

  const Comp = motion[as];

  return (
    <Comp
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] },
        },
      }}
      className={className}
    >
      {children}
    </Comp>
  );
}

// Keep ReactNode/HTMLAttributes imports referenced to avoid unused warnings in future extensions.
export type _MotionInternal = HTMLAttributes<HTMLDivElement>;
