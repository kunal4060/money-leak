/**
 * Lightweight skeleton shown while client charts hydrate
 * (static export prerenders instantly, so this only flashes on first paint).
 */
export default function ChartSkeleton({ label = "Loading chart…" }: { label?: string }) {
  return (
    <div className="flex h-72 w-full flex-col justify-end gap-2 p-2" aria-label={label} role="status">
      <div className="flex flex-1 items-end gap-2">
        {[42, 68, 55, 80, 62, 74, 58, 88, 70, 64, 78, 52].map((h, i) => (
          <div key={i} className="skeleton flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
