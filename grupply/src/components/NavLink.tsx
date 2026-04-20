"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive =
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 px-2 py-2 text-[14px] transition-colors ${
        isActive
          ? "text-ink font-medium"
          : "text-muted hover:text-ink"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-[6px] w-[6px] rounded-full transition-all ${
          isActive
            ? "bg-ember scale-100"
            : "bg-transparent scale-50 group-hover:bg-border-strong"
        }`}
      />
      <span className={isActive ? "ink-underline" : ""}>{children}</span>
    </Link>
  );
}
