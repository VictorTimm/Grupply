"use client";

import { useEffect, useState } from "react";

const sections = [
  { id: "account", label: "Account" },
  { id: "organization", label: "Organization" },
  { id: "notifications", label: "Notifications" },
  { id: "danger", label: "Danger zone" },
];

export function SettingsNav() {
  const [active, setActive] = useState("account");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) setActive(s.id);
          });
        },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <nav className="sticky top-24 hidden flex-col gap-1 self-start md:flex">
      <span className="eyebrow mb-2">Settings</span>
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`group flex items-center gap-3 py-1.5 text-[14px] transition-colors ${
            active === s.id
              ? "text-ink font-medium"
              : "text-muted hover:text-ink"
          }`}
        >
          <span
            aria-hidden
            className={`inline-block h-[6px] w-[6px] rounded-full transition-all ${
              active === s.id ? "bg-ember" : "bg-transparent group-hover:bg-border-strong"
            }`}
          />
          {s.label}
        </a>
      ))}
    </nav>
  );
}
