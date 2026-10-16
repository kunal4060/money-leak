"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LogoMark,
  IconOverview,
  IconDetect,
  IconAct,
  IconMethod,
  IconUpload,
  IconMenu,
  IconClose,
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
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // close the mobile menu on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // close on Escape / outside tap
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onTap = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onTap);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onTap);
    };
  }, [open ]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="LeakGuard home">
          <LogoMark className="h-8 w-8" />
          <span className="font-display text-[17px] font-bold tracking-tight text-ink">
            LeakGuard
            <span className="mt-0.5 block font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-fog">
              Revenue Intelligence
            </span>
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="hidden items-center gap-0.5 sm:flex sm:gap-1" aria-label="Primary">
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
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* mobile hamburger */}
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-ink transition-colors duration-150 hover:bg-sagesoft sm:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
        </button>
      </div>

      {/* mobile menu panel */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-line bg-paper sm:hidden"
        >
          <ul className="mx-auto max-w-6xl space-y-0.5 px-4 py-3">
            {links.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[48px] items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors duration-150 ${
                      active
                        ? "bg-accent-soft text-accent-deep"
                        : "text-ink2 hover:bg-sagesoft hover:text-ink"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
