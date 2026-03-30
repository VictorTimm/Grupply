"use client";

import Link from "next/link";

import { NavLink } from "./NavLink";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/events/discover", label: "Discover Events" },
  { href: "/events/joined", label: "Joined Events" },
  { href: "/people/find", label: "Find People" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
] as const;

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:flex md:flex-col">
      <Link
        href="/dashboard"
        className="px-2 py-2 text-lg font-semibold tracking-tight"
      >
        Grupply
      </Link>
      <nav className="mt-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
