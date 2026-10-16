"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import SeverityBadge from "@/components/SeverityBadge";
import {
  analyzeTransactions,
  buildProductMap,
  buildRegionMap,
  missingColumns,
  REQUIRED_TXN_COLUMNS,
  PRODUCT_COLUMNS,
  CUSTOMER_COLUMNS,
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
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
        over
          ? "border-emerald-500 bg-emerald-50"
          : file
            ? "border-emerald-300 bg-emerald-50/50"
            : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-slate-50"
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
      <div className="text-2xl">{file ? "✅" : "📄"}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <div className="mt-0.5 text-xs text-slate-500">{hint}</div>
      {file ? (
        <div className="tnum mt-2 truncate text-xs font-semibold text-emerald-700">{file.name}</div>
      ) : (
        <div className="mt-2 text-xs text-slate-400">Drop a CSV here or click to browse</div>
      )}
    </div>
  );
}

function KpiCard({ kicker, value, sub, delay = 0 }: { kicker: string; value: string; sub?: string; delay?: number }) {
  return (
    <div className="card card-hover animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="kicker">{kicker}</div>
      <div className="tnum mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[26px]">
        {value}
      </div>
      {sub && <div className="tnum mt-1 text-xs text-slate-500">{sub}</div>}
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

  const pick = (setter: (f: File | null) => void) => (f: File) => {
    setter(f);
    setError(null);
    setResult(null);
  };

  const analyze = async () => {
    setError(null);
    setResult(null);
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
    } catch (e) {
      setError(`Could not parse the CSV files: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          ⤴ Upload — bring your own data
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Upload your company&apos;s CSVs and run the same leak-detection analysis on them.
        </p>
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <span aria-hidden className="text-lg">🔒</span>
          <p className="text-sm leading-relaxed text-emerald-900">
            <strong>Your data never leaves your device</strong> — analysis runs entirely in this
            browser. Nothing is uploaded to any server.
          </p>
        </div>
      </div>

      {/* Step 1 — templates */}
      <div className="card animate-fade-up" style={{ animationDelay: "60ms" }}>
        <h2 className="text-sm font-bold text-slate-900">Step 1 — grab a template</h2>
        <p className="mt-1 text-xs text-slate-500">
          Not sure about the format? Download a template CSV and fill in your own rows.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => downloadTemplate(t)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-all hover:border-emerald-400 hover:text-emerald-700"
            >
              ⬇ {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — dropzones */}
      <div className="card animate-fade-up" style={{ animationDelay: "120ms" }}>
        <h2 className="text-sm font-bold text-slate-900">Step 2 — drop your CSVs</h2>
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
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Without products.csv, categories show as “Unknown” and margin is skipped. Without
          customers.csv, all customers are grouped under region “All”.
        </p>
      </div>

      {/* Step 3 — analyze */}
      <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
        <button
          onClick={analyze}
          disabled={analyzing || !txnFile}
          className="w-full rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-extrabold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-10"
        >
          {analyzing ? "Analyzing…" : "🔍 Analyze my data"}
        </button>
        {error && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            ⚠️ {error}
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
            <KpiCard kicker="Cancel + return rate" value={fmtPct1(result.kpis.cancelReturnRate)} sub="of all transactions" delay={80} />
            <KpiCard kicker="Leak flags" value={fmtInt(result.kpis.flagCount)} sub="|z| > 2.5 within category" delay={160} />
          </div>

          <div className="card animate-fade-up overflow-hidden p-0">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Detected leak flags</h2>
              <p className="mt-0.5 text-xs text-slate-500">
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
                    <tr className="border-b border-slate-200 bg-slate-50/95 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-semibold">ID</th>
                      <th className="px-4 py-3 font-semibold">Segment</th>
                      <th className="px-4 py-3 font-semibold">Metric</th>
                      <th className="px-4 py-3 font-semibold">Observed vs expected</th>
                      <th className="px-4 py-3 font-semibold">|z|</th>
                      <th className="px-4 py-3 font-semibold">Severity</th>
                      <th className="px-4 py-3 font-semibold">Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.flags.map((f) => (
                      <tr key={f.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-emerald-50/50">
                        <td className="tnum px-4 py-3 font-bold text-slate-900">{f.id}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {f.category} · {f.region} · {f.channel}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{metricName[f.metric]}</td>
                        <td className="tnum whitespace-nowrap px-4 py-3">
                          <span className={f.metric === "margin_pct" && f.observed < 0 ? "font-bold text-red-600" : "font-bold text-slate-900"}>
                            {fmtPct1(f.observed)}
                          </span>
                          <span className="text-slate-400"> vs </span>
                          <span className="text-slate-500">{fmtPct1(f.expected)}</span>
                        </td>
                        <td className="tnum px-4 py-3 font-semibold text-slate-800">
                          {Math.abs(f.z).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <SeverityBadge severity={f.severity} />
                        </td>
                        <td className="tnum px-4 py-3 text-slate-600">{fmtPeriod(f.period)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-12 text-center">
                <div className="text-2xl">✅</div>
                <div className="mt-2 text-sm font-semibold text-slate-700">No anomalies detected</div>
                <div className="mt-1 text-sm text-slate-500">
                  No cell deviated enough (|z| &gt; 2.5) from its category to raise a flag.
                </div>
              </div>
            )}
            <p className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-400">
              Demo analysis — runs 100% in your browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
