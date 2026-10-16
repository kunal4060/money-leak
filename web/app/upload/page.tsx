"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import SeverityBadge from "@/components/SeverityBadge";
import {
  IconDoc,
  IconCheck,
  IconLock,
  IconAlert,
  IconSpark,
  IconDownload,
  IconSearch,
} from "@/components/icons";
import {
  analyzeTransactions,
  buildProductMap,
  buildRegionMap,
  forecastDemand,
  missingColumns,
  REQUIRED_TXN_COLUMNS,
  PRODUCT_COLUMNS,
  CUSTOMER_COLUMNS,
  type DemandForecast,
  type Row,
  type UploadResult,
} from "@/lib/upload-analysis";

/* ---------- tiny local formatters (do not touch shared data files) ---------- */
const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtPct1 = (n: number) => `${n.toFixed(1)}%`;
const fmtInt = (n: number) => n.toLocaleString("en-US");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtPeriod = (p: string) => {
  const m = /^(\d{4})-(\d{2})$/.exec(p);
  if (!m) return p;
  return `${MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`;
};
const metricName: Record<string, string> = { margin_pct: "Margin %", return_rate: "Return rate" };

/* ---------- CSV templates (generated in-browser, no backend) ---------- */
const TEMPLATES: { name: string; header: string[]; rows: string[][] }[] = [
  {
    name: "transactions.csv",
    header: REQUIRED_TXN_COLUMNS,
    rows: [
      ["TX000001", "CU00001", "PR0001", "2025-01-15 10:30:00", "2", "99.99", "0.10", "Completed", "App", "Card"],
      ["TX000002", "CU00002", "PR0002", "2025-01-16 14:05:00", "1", "249.50", "0.00", "Returned", "Web", "UPI"],
    ],
  },
  {
    name: "products.csv",
    header: PRODUCT_COLUMNS,
    rows: [
      ["PR0001", "Electronics", "55.00", "99.99"],
      ["PR0002", "Fashion", "120.00", "249.50"],
    ],
  },
  {
    name: "customers.csv",
    header: CUSTOMER_COLUMNS,
    rows: [
      ["CU00001", "North"],
      ["CU00002", "South"],
    ],
  },
];

function downloadTemplate(t: (typeof TEMPLATES)[number]) {
  const csv = [t.header.join(","), ...t.rows.map((r) => r.join(","))].join("\n") + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = t.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseFile(file: File): Promise<{ header: string[]; rows: Row[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve({ header: res.meta.fields || [], rows: res.data as Row[] }),
      error: (err: Error) => reject(err),
    });
  });
}

/* ---------- dropzone ---------- */
function Dropzone({
  label,
  required,
  hint,
  file,
  onFile,
}: {
  label: string;
  required: boolean;
  hint: string;
  file: File | null;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Upload ${label}`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-colors duration-150 ${
        over
          ? "border-accent bg-accent-soft"
          : file
            ? "border-accent/50 bg-accent-soft/50"
            : "border-line bg-paper hover:border-linedark hover:bg-page"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <div className={`mx-auto w-fit ${file ? "text-accent-deep" : "text-fog"}`}>
        {file ? <IconCheck className="h-7 w-7" /> : <IconDoc className="h-7 w-7" />}
      </div>
      <div className="mt-2 font-mono text-[13px] font-semibold text-ink">
        {label} {required && <span className="text-brick">*</span>}
      </div>
      <div className="mt-0.5 text-xs text-fog">{hint}</div>
      {file ? (
        <div className="tnum mt-2 truncate font-mono text-xs font-medium text-accent-deep">
          {file.name}
        </div>
      ) : (
        <div className="mt-2 text-xs text-fog">Drop a CSV here or click to browse</div>
      )}
    </div>
  );
}

function KpiCard({ kicker, value, sub }: { kicker: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="kicker">{kicker}</div>
      <div className="tnum mt-2.5 font-display text-[26px] font-bold tracking-tight text-ink">
        {value}
      </div>
      {sub && <div className="tnum mt-1.5 text-xs text-fog">{sub}</div>}
    </div>
  );
}

function SummaryBody({ text }: { text: string }) {
  const blocks: { type: "ul" | "p"; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const isBullet = /^([-*•]|\d+[.)])\s+/.test(line);
    const clean = line.replace(/^([-*•]|\d+[.)])\s+/, "");
    const last = blocks[blocks.length - 1];
    if (isBullet && last && last.type === "ul") last.lines.push(clean);
    else if (isBullet) blocks.push({ type: "ul", lines: [clean] });
    else if (last && last.type === "p") last.lines.push(line);
    else blocks.push({ type: "p", lines: [line] });
  }
  return (
    <div className="space-y-2 text-sm leading-relaxed text-ink2">
      {blocks.map((b, i) =>
        b.type === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.lines.map((l, j) => (
              <li key={j}>{l}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.lines.join(" ")}</p>
        )
      )}
    </div>
  );
}

export default function UploadPage() {
  const [txnFile, setTxnFile] = useState<File | null>(null);
  const [prodFile, setProdFile] = useState<File | null>(null);
  const [custFile, setCustFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [forecast, setForecast] = useState<DemandForecast[] | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const pick = (setter: (f: File | null) => void) => (f: File) => {
    setter(f);
    setError(null);
    setResult(null);
    setForecast(null);
    setAiSummary(null);
    setAiError(null);
  };

  const analyze = async () => {
    setError(null);
    setResult(null);
    setForecast(null);
    setAiSummary(null);
    setAiError(null);
    if (!txnFile) {
      setError("Please upload transactions.csv first — it is required.");
      return;
    }
    setAnalyzing(true);
    try {
      const txn = await parseFile(txnFile);
      const missing = missingColumns(txn.header, REQUIRED_TXN_COLUMNS);
      if (missing.length > 0) {
        setError(`transactions.csv is missing required columns: ${missing.join(", ")}`);
        return;
      }
      if (txn.rows.length === 0) {
        setError("transactions.csv has no data rows — nothing to analyze.");
        return;
      }

      let products = new Map();
      if (prodFile) {
        const p = await parseFile(prodFile);
        const pm = missingColumns(p.header, ["product_id"]);
        if (pm.length > 0) {
          setError(`products.csv is missing required columns: ${pm.join(", ")}`);
          return;
        }
        products = buildProductMap(p.rows);
      }

      let regions = new Map();
      if (custFile) {
        const c = await parseFile(custFile);
        const cm = missingColumns(c.header, ["customer_id"]);
        if (cm.length > 0) {
          setError(`customers.csv is missing required columns: ${cm.join(", ")}`);
          return;
        }
        regions = buildRegionMap(c.rows);
      }

      setResult(analyzeTransactions(txn.rows, products, regions));
      setForecast(forecastDemand(txn.rows, products));
    } catch (e) {
      setError(`Could not parse the CSV files: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const getAiSummary = async () => {
    if (!result || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiSummary(null);
    try {
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flags: result.flags, kpis: result.kpis }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiError(data?.error || `AI request failed (HTTP ${res.status})`);
        return;
      }
      setAiSummary(typeof data.summary === "string" ? data.summary : "No summary returned.");
    } catch (e) {
      setAiError(
        `Could not reach the AI service: ${e instanceof Error ? e.message : "unknown error"}`
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-rise">
        <div className="micro-label">Bring your own data</div>
        <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Upload — bring your own data
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink2">
          Upload your company&apos;s CSVs and run the same leak-detection analysis on them.
        </p>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-accent/25 bg-accent-soft p-4">
          <IconLock className="mt-0.5 h-5 w-5 shrink-0 text-accent-deep" aria-hidden />
          <p className="text-sm leading-relaxed text-accent-deep">
            <strong>Your CSV files never leave your device</strong> — parsing and analysis run
            entirely in this browser, and raw files are never uploaded to any server. Only if you
            click <strong>AI Summary</strong> are the derived flags and KPI numbers sent to our
            serverless endpoint and on to Gemini for the summary.
          </p>
        </div>
      </div>

      {/* Step 1 — templates */}
      <div className="card">
        <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">
          <span className="mr-2 font-mono text-xs font-medium text-fog">01</span>
          Grab a template
        </h2>
        <p className="mt-1 text-xs text-fog">
          Not sure about the format? Download a template CSV and fill in your own rows.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => downloadTemplate(t)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-line bg-paper px-3.5 py-2 font-mono text-xs font-medium text-ink2 transition-colors duration-150 hover:border-accent/50 hover:text-accent-deep"
            >
              <IconDownload className="h-3.5 w-3.5" />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — dropzones */}
      <div className="card">
        <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">
          <span className="mr-2 font-mono text-xs font-medium text-fog">02</span>
          Drop your CSVs
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Dropzone
            label="transactions.csv"
            required
            hint="Required · one row per order"
            file={txnFile}
            onFile={pick(setTxnFile)}
          />
          <Dropzone
            label="products.csv"
            required={false}
            hint="Optional · category + unit cost"
            file={prodFile}
            onFile={pick(setProdFile)}
          />
          <Dropzone
            label="customers.csv"
            required={false}
            hint="Optional · customer region"
            file={custFile}
            onFile={pick(setCustFile)}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-fog">
          Without products.csv, categories show as “Unknown” and margin is skipped. Without
          customers.csv, all customers are grouped under region “All”.
        </p>
      </div>

      {/* Step 3 — analyze */}
      <div>
        <button
          onClick={analyze}
          disabled={analyzing || !txnFile}
          className="btn-primary w-full sm:w-auto sm:px-8"
        >
          <IconSearch className="h-4 w-4" />
          {analyzing ? "Analyzing…" : "Analyze my data"}
        </button>
        {error && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-brick/25 bg-brick-soft p-4 text-sm font-medium text-brick-deep">
            <IconAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard kicker="Revenue analyzed" value={fmtUSD(result.kpis.totalRevenue)} sub={`${fmtInt(result.kpis.transactions)} transactions`} />
            <KpiCard
              kicker="Margin"
              value={result.kpis.marginPct === null ? "n/a" : fmtPct1(result.kpis.marginPct)}
              sub="completed orders"
            />
            <KpiCard kicker="Cancel + return rate" value={fmtPct1(result.kpis.cancelReturnRate)} sub="of all transactions" />
            <KpiCard kicker="Leak flags" value={fmtInt(result.kpis.flagCount)} sub="|z| > 2.5 within category" />
          </div>

          <div className="card overflow-hidden p-0">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-base font-bold tracking-tight text-ink">
                Detected leak flags
              </h2>
              <p className="mt-0.5 text-xs text-fog">
                Same methodology as the demo: cells of category × region × channel × month (≥8
                transactions), z-scores within category.
                {result.kpis.skippedRows > 0 &&
                  ` ${fmtInt(result.kpis.skippedRows)} rows were skipped (missing id or timestamp).`}
              </p>
            </div>
            {result.flags.length > 0 ? (
              <div className="scroll-x overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-page/60 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Segment</th>
                      <th className="px-4 py-3 font-medium">Metric</th>
                      <th className="px-4 py-3 font-medium">Observed vs expected</th>
                      <th className="px-4 py-3 font-medium">|z|</th>
                      <th className="px-4 py-3 font-medium">Severity</th>
                      <th className="px-4 py-3 font-medium">Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.flags.map((f) => (
                      <tr key={f.id} className="border-b border-line/70 transition-colors last:border-0 hover:bg-accent-soft/40">
                        <td className="tnum px-4 py-3.5 font-mono text-[13px] font-semibold text-ink">{f.id}</td>
                        <td className="px-4 py-3.5 text-ink2">
                          {f.category} · {f.region} · {f.channel}
                        </td>
                        <td className="px-4 py-3.5 text-ink2">{metricName[f.metric]}</td>
                        <td className="tnum whitespace-nowrap px-4 py-3.5">
                          <span className={f.metric === "margin_pct" && f.observed < 0 ? "font-semibold text-brick-deep" : "font-semibold text-ink"}>
                            {fmtPct1(f.observed)}
                          </span>
                          <span className="text-fog"> vs </span>
                          <span className="text-ink2">{fmtPct1(f.expected)}</span>
                        </td>
                        <td className="tnum px-4 py-3.5 font-mono text-[13px] font-medium text-ink">
                          {Math.abs(f.z).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5">
                          <SeverityBadge severity={f.severity} />
                        </td>
                        <td className="tnum px-4 py-3.5 text-ink2">{fmtPeriod(f.period)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-12 text-center">
                <IconCheck className="mx-auto h-6 w-6 text-accent" />
                <div className="mt-2 text-sm font-semibold text-ink">No anomalies detected</div>
                <div className="mt-1 text-sm text-ink2">
                  No cell deviated enough (|z| &gt; 2.5) from its category to raise a flag.
                </div>
              </div>
            )}
            <p className="border-t border-line/60 px-5 py-3 text-center font-mono text-[11px] text-fog">
              Demo analysis — runs 100% in your browser.
            </p>
          </div>

          {forecast && forecast.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-display text-base font-bold tracking-tight text-ink">
                  Demand forecast
                </h2>
                <p className="mt-0.5 text-xs text-fog">
                  Next-3-month forecast per category = 3-month moving average of completed
                  quantity.
                </p>
              </div>
              <div className="scroll-x overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-page/60 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Last-3-mo avg</th>
                      <th className="px-4 py-3 font-medium">M+1</th>
                      <th className="px-4 py-3 font-medium">M+2</th>
                      <th className="px-4 py-3 font-medium">M+3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.map((f) => (
                      <tr
                        key={f.category}
                        className="border-b border-line/70 transition-colors last:border-0 hover:bg-accent-soft/40"
                      >
                        <td className="px-4 py-3.5 font-semibold text-ink">{f.category}</td>
                        <td className="tnum px-4 py-3.5 text-ink2">
                          {fmtInt(Math.round(f.last3Avg))}
                        </td>
                        <td className="tnum px-4 py-3.5 font-semibold text-accent-deep">
                          {fmtInt(Math.round(f.m1))}
                        </td>
                        <td className="tnum px-4 py-3.5 font-semibold text-accent-deep">
                          {fmtInt(Math.round(f.m2))}
                        </td>
                        <td className="tnum px-4 py-3.5 font-semibold text-accent-deep">
                          {fmtInt(Math.round(f.m3))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-line/60 px-5 py-3 text-center font-mono text-[11px] text-fog">
                Forecast = 3-month moving average · completed orders only.
              </p>
            </div>
          )}

          {/* AI summary */}
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-ink">
                  <IconSpark className="h-4 w-4 text-accent-deep" />
                  AI Summary
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-fog">
                  Let Gemini read your flags and write an executive summary. Requires the site
                  owner to configure <span className="font-mono">GEMINI_API_KEY</span>.
                </p>
              </div>
              <button onClick={getAiSummary} disabled={aiLoading} className="btn-primary">
                <IconSpark className="h-4 w-4" />
                {aiLoading ? "Thinking…" : "Generate AI summary"}
              </button>
            </div>
            {aiError && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-brick/25 bg-brick-soft p-3.5 text-sm font-medium text-brick-deep">
                <IconAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span>{aiError}</span>
              </div>
            )}
            {aiSummary && (
              <div className="mt-3 rounded-xl border border-line bg-page p-4">
                <SummaryBody text={aiSummary} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
