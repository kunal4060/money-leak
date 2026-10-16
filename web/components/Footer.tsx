import { FOOTER_LINE } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-1.5 px-4 py-5 font-mono text-[11px] tracking-wide text-fog sm:flex-row sm:items-center sm:px-6">
        <span>{FOOTER_LINE}</span>
        <span>LeakGuard — Revenue Intelligence · 2025-01 → 2025-12</span>
      </div>
    </footer>
  );
}
