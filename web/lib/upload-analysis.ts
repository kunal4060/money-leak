/**
 * Client-side leak detection for the /upload page ("bring your own data").
 * Pure functions — no DOM, no React — so the math can be unit-tested.
 * Mirrors the Python pipeline's methodology (see ml/pipeline.py):
 *   cells = category × region × channel × month (≥8 transactions),
 *   z-scores per metric within each category, |z|>2.5 flagged (|z|>3.5 = high),
 *   capped at the 25 strongest flags.
 */

export type Row = Record<string, string | undefined>;

export interface UploadFlag {
  id: string;
  category: string;
  region: string;
  channel: string;
  period: string; // YYYY-MM
  metric: "margin_pct" | "return_rate";
  observed: number;
  expected: number;
  z: number;
  severity: "high" | "medium" | "low";
  n: number;
}

export interface UploadKpis {
  transactions: number;
  totalRevenue: number;
  marginPct: number | null;
  cancelReturnRate: number;
  flagCount: number;
  skippedRows: number;
}

export interface UploadResult {
  kpis: UploadKpis;
  flags: UploadFlag[];
}

export const REQUIRED_TXN_COLUMNS = [
  "transaction_id",
  "customer_id",
  "product_id",
  "timestamp",
  "quantity",
  "unit_price",
  "discount_pct",
  "status",
  "channel",
  "payment_method",
];

export const PRODUCT_COLUMNS = ["product_id", "category", "unit_cost", "list_price"];
export const CUSTOMER_COLUMNS = ["customer_id", "region"];

/** Columns from `required` that are absent in the parsed header. */
export function missingColumns(header: string[], required: string[]): string[] {
  const have = new Set(header.map((h) => (h || "").trim()));
  return required.filter((c) => !have.has(c));
}

const num = (v: string | undefined): number => {
  const n = parseFloat((v || "").trim());
  return Number.isFinite(n) ? n : 0;
};

type Status = "completed" | "cancelled" | "returned" | "other";
const normStatus = (s: string | undefined): Status => {
  const t = (s || "").trim().toLowerCase();
  if (t.startsWith("complet")) return "completed";
  if (t.startsWith("cancel")) return "cancelled";
  if (t.startsWith("return")) return "returned";
  return "other";
};

interface Cell {
  category: string;
  region: string;
  channel: string;
  period: string;
  n: number;
  revenue: number; // completed only
  margin: number; // completed only
  completed: number;
  returned: number;
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Sample standard deviation (ddof=1), matching pandas .std() default. */
const stdev = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
  return Math.sqrt(v);
};

export interface ProductInfo {
  category: string;
  unitCost: number;
}

export function analyzeTransactions(
  rows: Row[],
  products: Map<string, ProductInfo>,
  regions: Map<string, string>
): UploadResult {
  const cells = new Map<string, Cell>();
  let cancelled = 0;
  let returnedTotal = 0;
  let skippedRows = 0;

  for (const r of rows) {
    const txnId = (r.transaction_id || "").trim();
    const ts = (r.timestamp || "").trim();
    if (!txnId || !ts) {
      skippedRows++;
      continue;
    }
    const qty = num(r.quantity);
    const price = num(r.unit_price);
    const disc = num(r.discount_pct);
    const status = normStatus(r.status);
    const channel = (r.channel || "").trim() || "Unknown";
    const period = ts.slice(0, 7); // YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(period)) {
      skippedRows++;
      continue;
    }
    const prod = products.get((r.product_id || "").trim());
    const category = prod ? prod.category : "Unknown";
    const region = regions.get((r.customer_id || "").trim()) || "All";

    const key = [category, region, channel, period].join("|");
    let cell = cells.get(key);
    if (!cell) {
      cell = { category, region, channel, period, n: 0, revenue: 0, margin: 0, completed: 0, returned: 0 };
      cells.set(key, cell);
    }
    cell.n++;

    const revenue = qty * price * (1 - disc);
    if (status === "completed") {
      cell.completed++;
      cell.revenue += revenue;
      if (prod) cell.margin += revenue - qty * prod.unitCost;
    } else if (status === "returned") {
      cell.returned++;
      returnedTotal++;
    } else if (status === "cancelled") {
      cancelled++;
    }
  }

  const totalRevenue = [...cells.values()].reduce((a, c) => a + c.revenue, 0);
  const totalMargin = [...cells.values()].reduce((a, c) => a + c.margin, 0);
  const totalTxns = [...cells.values()].reduce((a, c) => a + c.n, 0);

  // Keep cells with ≥8 transactions and at least one usable metric.
  const usable = [...cells.values()].filter((c) => c.n >= 8);
  const withMargin = usable.filter((c) => c.revenue > 0);
  const withReturn = usable.filter((c) => c.completed + c.returned > 0);

  const marginOf = (c: Cell) => (c.margin / c.revenue) * 100;
  const returnOf = (c: Cell) => (c.returned / (c.completed + c.returned)) * 100;

  // Z-scores per metric within each category.
  const byCategory = new Map<string, Cell[]>();
  for (const c of usable) {
    const arr = byCategory.get(c.category) || [];
    arr.push(c);
    byCategory.set(c.category, arr);
  }

  const flags: UploadFlag[] = [];
  for (const [, group] of byCategory) {
    const gm = group.filter((c) => c.revenue > 0).map(marginOf);
    const gr = group.filter((c) => c.completed + c.returned > 0).map(returnOf);
    const mMean = gm.length ? mean(gm) : 0;
    const mStd = stdev(gm);
    const rMean = gr.length ? mean(gr) : 0;
    const rStd = stdev(gr);

    for (const c of group) {
      if (c.revenue > 0 && mStd > 0) {
        const z = (marginOf(c) - mMean) / mStd;
        if (Math.abs(z) > 2.5) {
          flags.push({
            id: "", category: c.category, region: c.region, channel: c.channel, period: c.period,
            metric: "margin_pct", observed: marginOf(c), expected: mMean, z,
            severity: Math.abs(z) > 3.5 ? "high" : Math.abs(z) > 3.0 ? "medium" : "low",
            n: c.n,
          });
        }
      }
      if (c.completed + c.returned > 0 && rStd > 0) {
        const z = (returnOf(c) - rMean) / rStd;
        if (Math.abs(z) > 2.5) {
          flags.push({
            id: "", category: c.category, region: c.region, channel: c.channel, period: c.period,
            metric: "return_rate", observed: returnOf(c), expected: rMean, z,
            severity: Math.abs(z) > 3.5 ? "high" : Math.abs(z) > 3.0 ? "medium" : "low",
            n: c.n,
          });
        }
      }
    }
  }

  flags.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  const top = flags.slice(0, 25);
  top.forEach((f, i) => {
    f.id = `UPL-${String(i + 1).padStart(3, "0")}`;
  });

  return {
    kpis: {
      transactions: totalTxns,
      totalRevenue,
      marginPct: totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : null,
      cancelReturnRate: totalTxns > 0 ? ((cancelled + returnedTotal) / totalTxns) * 100 : 0,
      flagCount: top.length,
      skippedRows,
    },
    flags: top,
  };
}

/** Build a lookup map from parsed product rows. */
export function buildProductMap(rows: Row[]): Map<string, ProductInfo> {
  const m = new Map<string, ProductInfo>();
  for (const r of rows) {
    const id = (r.product_id || "").trim();
    if (!id) continue;
    m.set(id, {
      category: (r.category || "").trim() || "Unknown",
      unitCost: num(r.unit_cost),
    });
  }
  return m;
}

/** Build a customer_id → region lookup from parsed customer rows. */
export function buildRegionMap(rows: Row[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) {
    const id = (r.customer_id || "").trim();
    if (!id) continue;
    m.set(id, (r.region || "").trim() || "All");
  }
  return m;
}
