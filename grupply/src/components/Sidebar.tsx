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
    <aside className="hidden w-64 shrink-0 rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:bg-zinc-950 dark:shadow-none md:flex md:flex-col md:border md:border-zinc-200/80 dark:md:border-zinc-800">
      <Link
        href="/dashboard"
        className="px-2 py-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
      >
        Grupply
      </Link>
      <nav className="mt-6 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
