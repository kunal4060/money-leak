# THE MONEY LEAK

**Detect revenue and margin leaks. Explain the drivers with evidence. Recommend the actions.**

A business decision-support dashboard for a fictional online retailer. It flags where
money is being lost (negative-margin sales, cancellations, returns, stockouts), backs
each flag with data evidence (what drove it, how far off baseline it is), and turns it
into recommended actions. Nothing is hidden when the data has nothing to say — most
notably, the cancellation/return classifier found *no predictive signal*, and the
dashboard says so.

**Detect → Explain → Act** is the product spine: every leak is *detected* by
statistical outlier rules (|z| > 2.5 within category) over 25 flagged cells,
*explained* by a human-readable evidence trail (worst product, discount drift, sample
size), and turned into *actions* — stockout-risk watchlists, segment plays, campaign
ROAS checks — on the Act page.

## Repo layout

```
money-leak/
├── README.md          # this file
├── ARCHITECTURE.md    # data flow, JSON contract, design decisions
├── ml/
│   ├── pipeline.py    # EDA + analytics pipeline → JSON artifacts (run locally)
│   └── EDA_REPORT.md  # generated data-quality report
└── web/               # Next.js 14 + TypeScript + Tailwind + recharts dashboard
    ├── app/           # routes: Overview, /detect, /explain/[id], /act, /methodology
    ├── components/    # charts, badges, layout
    ├── lib/data.ts    # static JSON loaders
    └── public/data/   # 8 JSON artifacts consumed by the dashboard (no backend)
```

`ml/` and `web/` have one author each; this root README and `ARCHITECTURE.md`
document the contract between them.

## Run the ML pipeline

```bash
python3 ml/pipeline.py
```

Reads the (synthetic, read-only) CSVs in `~/workspace/user/files/`, regenerates
`ml/EDA_REPORT.md` and the 8 JSON artifacts in `web/public/data/`.

Requirements: `pandas`, `scikit-learn`, `xgboost`, `matplotlib`.

## Run the dashboard

```bash
cd web
npm install
npm run dev      # local development
npm run build    # production build → static output, deployable to Vercel
```

The dashboard reads the precomputed JSONs in `web/public/data/` at render time —
there is no live backend (see ARCHITECTURE.md for why).

## Data contract (the 8 JSONs)

| File | Contents (one line) |
|---|---|
| `kpis.json` | Headline business numbers: revenue, margin, cancel/return rate, lost revenue |
| `leaks.json` | The 25 leak flags: id, cell segment, metric, observed vs expected, z-score, severity, evidence |
| `risk.json` | Cancel/return classifier metrics, feature importance, 200 scored rows |
| `segments.json` | 4 customer segments (RFM + KMeans): sizes, recency/frequency/monetary, return rates |
| `stockout_risk.json` | Top 100 products by stockout risk: on-hand stock, reorder threshold, risk score, reason |
| `campaigns.json` | Campaign spend/revenue/CAC/ROAS-proxy by channel and by category |
| `forecast.json` | 3-month demand forecast per category from 12 months of history |
| `methodology.json` | Every assumption, data-quality stat, and model caveat — feeds the /methodology page |

Full field-level schema: `ARCHITECTURE.md`.

## Key findings snapshot

- **Scale:** 18,000 transactions · 3,000 customers · 250 products · 2025 full year
- **Revenue:** $7.30M · **Margin:** 26.97% · **Cancel/return rate:** 17.33%
- **Lost revenue (cancelled + returned):** $1.62M
- **Leak flags:** 25 (12 high · 7 medium · 6 low), e.g. Electronics/Central/Store in
  2025-04 ran −223.0% margin vs a 28.4% category baseline (z = −9.73), driven by
  product PR0163
- **Cancel/return classifier:** XGBoost AUC ≈ **0.49** — no predictive signal. Recall
  ≈ 0 at the default threshold. Documented as non-actionable (see Caveats)
- **Segments:** Champions (910) · Frequent Returners (574, **30.6% return rate**) ·
  Active Regulars (1,081) · Dormant (406, ~172 days since last order)
- **Top stockout risk:** PR0166 (Beauty) — 4 units on hand vs reorder threshold 34,
  risk score 0.69; 237 products had a stockout in the year

## Assumptions & caveats

- **The dataset is synthetic (DATATHON).** Costs, prices, and statuses were generated
  independently of each other.
- **~38% of completed transactions have negative margins** (76 of 250 products have
  `unit_cost > list_price`). This is a generator artifact, not necessarily real
  business behavior. Leak flags are statistically real outliers, but recommendations
  are **illustrative, not prescriptive**.
- **The cancel/return classifier found no signal** (AUC ≈ 0.49, recall ≈ 0.0).
  `risk.json` scores are included only for schema completeness and **must not drive
  real decisions** — the dashboard says this on-screen and in methodology.json.
- `Pending` orders (918, 5.1%) have no outcome: excluded from margin, classifier
  training, and return-rate math; kept in counts/KPIs only.
- Campaign channels (Email, Social) don't exist in transaction channels
  (App/Web/Store), so cross-channel ROAS attribution is approximate.
- Inventory is sparse (~20 records/product over 365 days); stockout risk uses the
  latest record + last-30-day history.
- All monetary values in USD; floats rounded to 2 decimals in the JSON artifacts.

## Tech stack

| Layer | Tech |
|---|---|
| Analytics pipeline | Python 3 · pandas · scikit-learn · XGBoost · matplotlib |
| Dashboard | Next.js 14 · TypeScript · Tailwind CSS · recharts |
| Data | Precomputed static JSON (no backend, no database) |
| Deploy target | Vercel (static build) |

Repository: https://github.com/kunal4060/money-leak
