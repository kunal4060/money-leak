import kpisData from "../public/data/kpis.json";
import leaksData from "../public/data/leaks.json";
import riskData from "../public/data/risk.json";
import segmentsData from "../public/data/segments.json";
import stockoutData from "../public/data/stockout_risk.json";
import campaignsData from "../public/data/campaigns.json";
import forecastData from "../public/data/forecast.json";
import methodologyData from "../public/data/methodology.json";

export interface Segment {
  category: string;
  region: string;
  channel: string;
  month: string;
}

export interface Leak {
  id: string;
  segment: Segment;
  metric: "margin_pct" | "return_rate";
  observed: number;
  expected: number;
  z: number;
  severity: "high" | "medium" | "low";
  period: string;
  evidence: string;
}

export interface Kpis {
  currency: string;
  period: { start: string; end: string };
  total_revenue: number;
  total_margin: number;
  margin_pct: number;
  total_transactions: number;
  completed: number;
  cancelled: number;
  returned: number;
  cancel_return_rate: number;
  stockout_product_count: number;
  avg_discount_pct: number;
  lost_revenue: number;
}

export interface CustomerSegment {
  id: string;
  name: string;
  size: number;
  avg_recency_days: number;
  avg_frequency: number;
  avg_monetary: number;
  return_rate: number;
  description: string;
}

export interface MonthPoint {
  month: string;
  quantity: number;
}

export interface CategoryForecast {
  category: string;
  history: MonthPoint[];
  forecast: MonthPoint[];
}

export interface StockoutProduct {
  product_id: string;
  category: string;
  stock_on_hand: number;
  reorder_threshold: number;
  risk_score: number;
  reason: string;
}

export const kpis: Kpis = kpisData as Kpis;
export const leaks: Leak[] = leaksData as Leak[];
export const riskMetrics = (riskData as any).metrics;
export const segments: CustomerSegment[] = (segmentsData as any).segments;
export const stockoutProducts: StockoutProduct[] = (stockoutData as any).products;
export const campaigns = campaignsData as any;
export const forecastCategories: CategoryForecast[] = (forecastData as any).categories;
export const methodology = methodologyData as any;

/* ---------- formatting helpers ---------- */

export function fmtUSD(n: number, digits = 0): string {
  const sign = n < 0 ? "−" : "";
  return (
    sign +
    "$" +
    Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  );
}

export function fmtPct(n: number, digits = 1): string {
  return `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}%`;
}

export function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

export function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[m - 1]} ${y}`;
}

export const leakById = (id: string): Leak | undefined => leaks.find((l) => l.id === id);

export const metricLabel: Record<Leak["metric"], string> = {
  margin_pct: "Margin %",
  return_rate: "Return rate",
};

/** Aggregate monthly totals across categories for the trend chart */
export interface TrendPoint {
  month: string;
  label: string;
  actual: number | null;
  forecast: number | null;
}

export function buildTrend(): TrendPoint[] {
  const map = new Map<string, { actual: number; forecast: number | null }>();
  for (const c of forecastCategories) {
    for (const h of c.history) {
      const cur = map.get(h.month) ?? { actual: 0, forecast: null };
      cur.actual += h.quantity;
      map.set(h.month, cur);
    }
    for (const f of c.forecast) {
      const cur = map.get(f.month) ?? { actual: 0, forecast: 0 };
      cur.forecast = (cur.forecast ?? 0) + f.quantity;
      map.set(f.month, cur);
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      month,
      label: fmtMonth(month),
      actual: v.actual > 0 ? v.actual : null,
      forecast: v.forecast,
    }));
}

/** Extract a product id + worst margin figure from the evidence string */
export function parseEvidenceProduct(evidence: string): { product: string | null; worstMargin: string | null; txns: string | null } {
  const product = evidence.match(/product (PR\d+)/)?.[1] ?? null;
  const worstMargin = evidence.match(/margin \$([\d,.-]+)/)?.[1] ?? null;
  const txns = evidence.match(/(\d+) txns in cell/)?.[1] ?? null;
  return { product, worstMargin, txns };
}

/** Extract the discount comparison "avg discount 10.0% vs category 8.3%" */
export function parseEvidenceDiscount(evidence: string): { cell: number | null; category: number | null } {
  const m = evidence.match(/avg discount ([\d.]+)% vs category ([\d.]+)%/);
  return m ? { cell: parseFloat(m[1]), category: parseFloat(m[2]) } : { cell: null, category: null };
}

/* ---------- Action-card derivation (Act page) ---------- */

export interface ActionCard {
  id: string;
  title: string;
  why: string;
  impactEstimate: string;
  effort: "Low" | "Medium" | "High";
}

export function buildActions(): ActionCard[] {
  const high = leaks.filter((l) => l.severity === "high");
  const lost = kpis.lost_revenue;
  return high.map((l) => {
    const { product } = parseEvidenceProduct(l.evidence);
    const seg = `${l.segment.category} · ${l.segment.region} · ${l.segment.channel}`;
    let title = "";
    let impactEstimate = "";
    let effort: ActionCard["effort"] = "Medium";
    if (l.metric === "margin_pct") {
      title = `Review discount policy & cost floor for ${l.segment.category} in ${l.segment.region} (${l.segment.channel})`;
      const gap = Math.abs(l.observed - l.expected);
      const monthlyShare = lost / 12;
      const est = Math.min(lost * 0.15, monthlyShare * (gap / 100));
      impactEstimate = `Recovering ~half the margin gap here ≈ ${fmtUSD(Math.max(est, 200), 0)} (estimate)`;
      effort = gap > 100 ? "High" : "Medium";
    } else {
      title = product
        ? `Investigate returns driver ${product} (${l.segment.category}, ${l.segment.region} via ${l.segment.channel})`
        : `Investigate returns driver (${l.segment.category}, ${l.segment.region} via ${l.segment.channel})`;
      const excessRate = Math.abs(l.observed - l.expected);
      const est = lost * (excessRate / 100) * 0.06;
      impactEstimate = `Closing the return-rate gap ≈ ${fmtUSD(Math.max(est, 150), 0)} (estimate)`;
      effort = excessRate > 33 ? "Medium" : "Low";
    }
    return { id: l.id, title, why: l.evidence, impactEstimate, effort };
  });
}

export const RISK_CAVEAT =
  "Model found no predictive signal in this synthetic dataset — for illustration only.";
export const FOOTER_LINE = "Built on synthetic DATATHON data — illustrative, not prescriptive.";
