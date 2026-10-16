import { FOOTER_LINE } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6">
        <span className="font-medium">{FOOTER_LINE}</span>
        <span className="text-slate-400">
          THE MONEY LEAK — Revenue Intelligence · period 2025-01 → 2025-12
        </span>
      </div>
    </footer>
  );
}
