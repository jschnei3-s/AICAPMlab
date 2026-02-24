"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Upload data", href: "/dashboard/upload" },
  { label: "Stress tests", href: "/dashboard/stress" },
  { label: "10-K analysis", href: "/dashboard/analysis" },
  { label: "Reports", href: "/dashboard/reports" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-[var(--border)] bg-[var(--surface)]/80">
      <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
        <Link
          href="/dashboard"
          className="font-semibold tracking-tight text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
        >
          CM AI Lab
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {nav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-elevated)]/80 hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
