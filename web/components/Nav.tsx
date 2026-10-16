"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview", icon: "▦" },
  { href: "/detect", label: "Detect", icon: "🔍" },
  { href: "/act", label: "Act", icon: "🎯" },
  { href: "/methodology", label: "Method", icon: "🧾" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-lg font-black text-slate-900 shadow-[0_0_18px_rgba(16,185,129,0.45)]">
            $
          </span>
          <span className="text-sm font-extrabold tracking-[0.18em] text-white sm:text-base">
            THE MONEY LEAK
            <span className="mt-0.5 block text-[10px] font-medium tracking-[0.08em] text-slate-400">
              REVENUE INTELLIGENCE
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-label={l.label}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-emerald-500/15 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)]"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="mr-1.5" aria-hidden>
                  {l.icon}
                </span>
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
