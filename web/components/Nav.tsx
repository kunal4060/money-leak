"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogoMark,
  IconOverview,
  IconDetect,
  IconAct,
  IconMethod,
  IconUpload,
} from "./icons";

const links = [
  { href: "/", label: "Overview", Icon: IconOverview },
  { href: "/detect", label: "Detect", Icon: IconDetect },
  { href: "/act", label: "Act", Icon: IconAct },
  { href: "/methodology", label: "Method", Icon: IconMethod },
  { href: "/upload", label: "Upload", Icon: IconUpload },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <span className="font-display text-[17px] font-bold tracking-tight text-ink">
            LeakGuard
            <span className="mt-0.5 block font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-fog">
              Revenue Intelligence
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Primary">
          {links.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 sm:px-3 ${
                  active
                    ? "bg-accent-soft text-accent-deep"
                    : "text-ink2 hover:bg-sagesoft hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
