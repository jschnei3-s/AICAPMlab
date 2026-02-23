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
    <aside className="flex w-56 flex-col border-r border-zinc-800 bg-zinc-900/30">
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        <Link href="/dashboard" className="font-semibold tracking-tight text-zinc-100">
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
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
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
