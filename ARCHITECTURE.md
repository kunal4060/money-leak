# THE MONEY LEAK — Architecture

## Data-flow diagram

```
  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
  │ transactions  │   │ customers     │   │ products      │
  │  (18k rows)   │   │  (3k rows)    │   │  (250 rows)   │
  └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
          │                   │                   │
          ▼                   ▼                   ▼
  ┌────────────────────────────────────────────────────────┐
  │                SYNTHETIC DATATHON CSVs                 │
  │              (~/workspace/user/files, read-only)       │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │              ml/pipeline.py (run locally)              │
  │  EDA & data-quality report → ml/EDA_REPORT.md          │
  │  KPI aggregates  ·  leak outlier detection (|z|>2.5)   │
  │  cancel/return XGBoost  ·  RFM/KMeans segments        │
  │  stockout-risk scoring  ·  campaign ROAS  ·  forecast │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼  8 JSON artifacts
  ┌────────────────────────────────────────────────────────┐
  │        web/public/data/*.json  (static files)           │
  │  kpis · leaks · risk · segments · stockout_risk        │
  │  campaigns · forecast · methodology                    │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼  read at render time
  ┌────────────────────────────────────────────────────────┐
  │   Next.js 14 + TypeScript + Tailwind + recharts        │
  │   lib/data.ts (static loaders, no fetch to a backend)  │
  │   routes: / (Overview) · /detect · /explain/[id]       │
  │           /act · /methodology                          │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼  npm run build → static output
  ┌────────────────────────────────────────────────────────┐
  │                       Vercel                           │
  └────────────────────────────────────────────────────────┘
```

The contract between `ml/` and `web/` is the JSON schema below. The pipeline
author and the dashboard author only need to agree on these files; everything else
is an implementation detail of either side.

## Why precomputed JSON instead of a live backend

1. **Vercel has no Python runtime for this app.** The deploy target serves static
   content; there is nothing to host a pandas/scikit-learn service on.
2. **The dataset is small and static.** 18,000 transactions fit comfortably in
   memory and never change — re-running the pipeline is a deliberate,
   human-triggered step (`python3 ml/pipeline.py`), not a scheduled job.
3. **Instant loads.** Every page reads small JSON files (aggregates only, floats
   rounded to 2 decimals). No query latency, no cold starts, no database cost.

Downside accepted: the dashboard is only as fresh as the last pipeline run, and
nothing can be re-queried interactively. For a decision-support demo on frozen
synthetic data, that trade is correct.

## JSON schema contract

All files live in `web/public/data/`. Types: `int`, `float` (2-decimal rounded),
`str`, arrays `[ ]`, objects `{ }`. All money is USD.

### `kpis.json` — object
`currency` (str), `period` {`start`, `end`}, `total_revenue`, `total_margin`,
`margin_pct`, `total_transactions`, `completed`, `cancelled`, `returned`,
`cancel_return_rate`, `stockout_product_count`, `avg_discount_pct`, `lost_revenue`.

### `leaks.json` — array of 25 leak objects
Each: `id` ("LEAK-001"…"LEAK-025"), `segment`
{`category`, `region`, `channel`, `month`}, `metric` (e.g. "margin_pct"),
`observed`, `expected`, `z` (z-score vs category), `severity`
("high"|"medium"|"low": 12/7/6), `period`, `evidence` (one human-readable
sentence: driver product, discount drift, transaction count).

### `risk.json` — object
`metrics` {`algorithm` ("XGBoost"), `accuracy`, `precision`, `recall`, `auc`
(≈0.49 — no signal), `train_rows`, `test_rows`}, `feature_importance` (20
entries), `top_risky` (200 scored transaction rows). **Contract note:** scores
must be presented with the no-signal caveat; they exist for schema completeness,
not decision-making.

### `segments.json` — object {`segments`: array of 4}
Each: `id` (S1–S4), `name`, `size`, `avg_recency_days`, `avg_frequency`,
`avg_monetary`, `return_rate`, `description`. Produced by RFM + KMeans:
Champions (910), Frequent Returners (574), Active Regulars (1081), Dormant (406).

### `stockout_risk.json` — object {`products`: array of 100, sorted desc}
Each: `product_id`, `category`, `stock_on_hand`, `reorder_threshold`,
`risk_score` (0–1), `reason` (one human-readable sentence). Rule: latest record
+ last-30-day history per product (inventory series is sparse, not daily).

### `campaigns.json` — object
`by_channel` (5: App/Email/Social/Store/Web), `by_category` (6). Each entry:
`channel|category`, `spend`, `impressions`, `clicks`, `conversions`, `cac`,
`roas_proxy` (conversions × avg order value — no true attribution key exists).

### `forecast.json` — object {`categories`: array of 6}
Each: `category`, `history` (12 monthly {`month`, `quantity`}),
`forecast` (3 monthly {`month`, `quantity`}) for 2026-01…2026-03.

### `methodology.json` — object
`assumptions` (19), `data_quality` (`transactions_rows`, `null_counts`,
`status_values`, `negative_margin_pct` = 38.07), `models`
(`cancel_return_classifier` metrics). Rendered verbatim on /methodology —
the pipeline, not the UI, owns this text.

## Design decisions — the honesty requirements

These are load-bearing product requirements, not copy choices:

1. **Non-actionable findings stay visible.** The cancel/return classifier (AUC
   ≈ 0.49, recall ≈ 0.0) is shown *with its caveat* on the Detect/Explain pages,
   not hidden. Showing a model card that admits failure is the point of a
   decision-support tool.
2. **Every estimate is labeled an estimate.** Campaign ROAS is `roas_proxy`
   (attributed revenue ≈ conversions × avg completed-order value — no true
   attribution key). Stockout risk uses a sparse inventory series. The field
   names and UI say "proxy"/"risk", never "actual".
3. **Synthetic-data footer.** Every page carries a footer stating the dataset is
   synthetic DATATHON data and recommendations are illustrative, not
   prescriptive — because ~38% negative margins are a generator artifact.
4. **Pending orders are excluded from outcome math.** `Pending` (918 rows) is
   counted in KPIs but never trained on, margin-calculated, or return-rated.
5. **Methodology is generated, not hand-written.** `/methodology` renders
   `methodology.json`, which `pipeline.py` writes from the same run that produced
   the numbers — the assumptions can never drift from the artifacts.

## File layout tree

```
money-leak/
├── README.md
├── ARCHITECTURE.md
├── ml/
│   ├── pipeline.py        # full pipeline: EDA + 8 JSONs + EDA_REPORT.md
│   └── EDA_REPORT.md      # generated: row counts, nulls, margin sanity,
│                          #   data-quality red flags, assumptions
└── web/
    ├── package.json       # next 14.2.18 · react 18.3.1 · recharts 2.15.3
    ├── next.config.mjs
    ├── tailwind.config.ts / tsconfig.json / postcss.config.mjs
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   └── page.tsx       # / (Overview) — /detect, /explain/[id], /act,
    │                      #   /methodology to be added (web worker in progress)
    ├── components/        # Nav, Footer, SegmentDonut, TrendChart, SeverityBadge
    ├── lib/
    │   └── data.ts        # static JSON loaders
    └── public/
        └── data/          # the 8 JSON artifacts (pipeline output; do not edit by hand)
```

Repository: https://github.com/kunal4060/money-leak
