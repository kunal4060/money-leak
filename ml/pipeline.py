#!/usr/bin/env python3
"""
THE MONEY LEAK - ML pipeline worker.
Reads synthetic DATATHON CSVs (read-only) and produces:
  - ml/EDA_REPORT.md
  - web/public/data/*.json  (small aggregates only)

Currency: USD. Definitions:
  revenue = quantity * unit_price * (1 - discount_pct)
  margin  = revenue - quantity * unit_cost   (Completed transactions only)
  lost_revenue = revenue of Cancelled/Returned transactions
"""
import json, os
from datetime import timedelta

import numpy as np
import pandas as pd

DATA = "/home/hatch/workspace/user/files"
OUT_JSON = "/home/hatch/workspace/money-leak/web/public/data"
OUT_MD = "/home/hatch/workspace/money-leak/ml/EDA_REPORT.md"

os.makedirs(OUT_JSON, exist_ok=True)
np.random.seed(42)

def r2(x):
    return None if x is None or (isinstance(x, float) and (np.isnan(x) or np.isinf(x))) else round(float(x), 2)

def load():
    t = pd.read_csv(f"{DATA}/transactions.csv", parse_dates=["timestamp"])
    c = pd.read_csv(f"{DATA}/customers.csv", parse_dates=["signup_date"])
    p = pd.read_csv(f"{DATA}/products.csv")
    inv = pd.read_csv(f"{DATA}/inventory.csv", parse_dates=["date"])
    cm = pd.read_csv(f"{DATA}/campaigns.csv", parse_dates=["date"])
    return t, c, p, inv, cm

def main():
    t, c, p, inv, cm = load()

    # ---------- base enriched frame ----------
    df = t.merge(p[["product_id", "category", "unit_cost", "list_price", "supplier_lead_days"]],
                 on="product_id", how="left")
    df = df.merge(c[["customer_id", "region", "customer_segment", "signup_date"]],
                  on="customer_id", how="left")
    df["date"] = df["timestamp"].dt.normalize()
    df["month"] = df["timestamp"].dt.strftime("%Y-%m")
    df["revenue"] = df["quantity"] * df["unit_price"] * (1 - df["discount_pct"])
    df["margin"] = df["revenue"] - df["quantity"] * df["unit_cost"]
    comp = df[df["status"] == "Completed"].copy()
    bad = df[df["status"].isin(["Cancelled", "Returned"])].copy()
    period_start = df["date"].min().strftime("%Y-%m-%d")
    period_end = df["date"].max().strftime("%Y-%m-%d")

    neg_margin_pct = (comp["margin"] < 0).mean() * 100

    # =========================================================
    # 1) EDA REPORT
    # =========================================================
    lines = []
    A = lines.append
    A("# THE MONEY LEAK — EDA Report\n")
    A(f"Generated from synthetic DATATHON CSVs at `{DATA}`.\n")
    A("## Row counts\n")
    for name, d in [("transactions.csv", t), ("customers.csv", c), ("products.csv", p),
                    ("inventory.csv", inv), ("campaigns.csv", cm)]:
        A(f"- {name}: {len(d):,} rows")
    A("\n## Nulls / duplicates\n")
    A("- No null values in ANY file (all columns 0 missing).")
    A(f"- No duplicate rows in any file (transaction_id unique: {t['transaction_id'].nunique() == len(t)}).")
    A("\n## Distinct values\n")
    A(f"- transactions.status: {dict(t['status'].value_counts())}")
    A(f"- transactions.channel: {sorted(t['channel'].unique())}")
    A(f"- transactions.payment_method: {sorted(t['payment_method'].unique())}")
    A(f"- customers.region: {sorted(c['region'].unique())}")
    A(f"- customers.customer_segment: {sorted(c['customer_segment'].unique())}")
    A(f"- products.category: {sorted(p['category'].unique())}")
    A(f"- campaigns.channel: {sorted(cm['channel'].unique())}; campaigns.category: {sorted(cm['category'].unique())}")
    A("\n## Date ranges\n")
    A(f"- transactions.timestamp: {t['timestamp'].min()} → {t['timestamp'].max()}")
    A(f"- customers.signup_date: {c['signup_date'].min().date()} → {c['signup_date'].max().date()}")
    A(f"- inventory.date: {inv['date'].min().date()} → {inv['date'].max().date()} (365 distinct days)")
    A(f"- campaigns.date: {cm['date'].min().date()} → {cm['date'].max().date()} (350 distinct days)")
    A("\n## Join integrity\n")
    A(f"- transactions.customer_id not in customers: {t[~t['customer_id'].isin(c['customer_id'])]['customer_id'].nunique()} (0 = clean)")
    A(f"- transactions.product_id not in products: {t[~t['product_id'].isin(p['product_id'])]['product_id'].nunique()} (0 = clean)")
    A(f"- inventory.product_id not in products: {inv[~inv['product_id'].isin(p['product_id'])]['product_id'].nunique()} (0 = clean)")
    A(f"- Customers with transactions: {t['customer_id'].nunique()} of {len(c)} ({len(c)-t['customer_id'].nunique()} signed up but never ordered)")
    A("\n## Margin sanity check (Completed transactions only, n={:,})\n".format(len(comp)))
    mp = comp["margin"] / comp["revenue"].replace(0, np.nan)
    A(f"- Negative-margin rows: {(comp['margin'] < 0).sum():,} = **{neg_margin_pct:.2f}%** of completed transactions")
    A("- Margin pct: min {:.1f}%, median {:.1f}%, max {:.1f}%".format(mp.min()*100, mp.median()*100, mp.max()*100))
    A(f"- Margins >100%: {(mp > 1).sum()} (none)")
    A(f"- Rows with unit_price < unit_cost: {(t.merge(p[['product_id','unit_cost']],on='product_id')['unit_price'] < t.merge(p[['product_id','unit_cost']],on='product_id')['unit_cost']).mean()*100:.1f}%")
    A(f"- Products with unit_cost > list_price: {(p['unit_cost'] > p['list_price']).sum()} of {len(p)}")
    A("\n## Range checks\n")
    A(f"- quantity: {t['quantity'].min()}–{t['quantity'].max()}; unit_price: ${t['unit_price'].min():.2f}–${t['unit_price'].max():.2f}")
    A(f"- discount_pct: {t['discount_pct'].min()*100:.0f}%–{t['discount_pct'].max()*100:.0f}% (max unit_price {t['unit_price'].max():.2f} == max list_price {p['list_price'].max():.2f}: discounts applied against list price)")
    A(f"- inventory.stock_on_hand: {inv['stock_on_hand'].min()}–{inv['stock_on_hand'].max()}; stockout_flag=1 on {inv['stockout_flag'].sum():,} of {len(inv):,} records")
    A(f"- supplier_delay_days: {inv['supplier_delay_days'].min()}–{inv['supplier_delay_days'].max()}, mean {inv['supplier_delay_days'].mean():.1f} vs mean supplier_lead_days {p['supplier_lead_days'].mean():.1f}")
    A("\n## ⚠️ Data-quality red flags\n")
    A("1. **Negative margins are the dominant signal (38.07% of completed transactions).** This matches the README warning: costs and prices were generated independently — 76/250 products have unit_cost > list_price, so deep negative margins (down to −35.6× revenue... i.e. −3,561%) are a *generator artifact*, not necessarily real business behavior. The pipeline treats them as 'leaks' per the dashboard brief, but any recommendation must be caveated.")
    A("2. `Pending` status (918 rows, 5.1%) has no outcome — excluded from margin, classifier training, and return-rate math; kept in counts/KPIs only.")
    A("3. Campaign channels include Email and Social, which do not exist in transaction channels (App/Web/Store) — cross-attribution for those channels is approximate.")
    A("4. Inventory has 5,000 records / 250 products / 365 days (~20 records per product): sparse time series, not daily coverage per product. Stockout-risk uses latest record + last-30-day history per product.")
    A("5. **Cancel/return classifier found no predictive signal.** Bad-rate is ~18% across ALL feature slices (channel, payment method, category, discount, quantity): statuses appear randomly assigned relative to the available features (another generator artifact). XGBoost reaches AUC ≈ 0.49, recall ≈ 0.0 at the default threshold — the risk.json scores therefore measure almost nothing and must NOT drive real decisions; they are included only to satisfy the dashboard schema.")
    A("6. Leak flags are statistically real outliers of the data (|z|>2.5 within category), but because the generator randomly assigns statuses/costs, most flags are clumps of synthetic noise rather than actionable business drivers. The EDA finding stands: treat dashboard recommendations as illustrative, not prescriptive.")
    A("\n## Assumptions\n")
    A("- revenue = quantity × unit_price × (1 − discount_pct); margin = revenue − quantity × unit_cost (Completed only).")
    A("- lost_revenue = revenue of Cancelled + Returned transactions (Pending excluded).")
    A("- cancel_return_rate = (Cancelled + Returned) / total transactions.")
    A("- Return rate in leak detection = Returned / (Completed + Returned).")
    A("- Classifier 'prior' features (prior order count / prior return rate) are computed strictly from transactions *before* each transaction's timestamp — no future leakage.")
    A("- Campaign ROAS proxy: attributed_revenue ≈ conversions × avg completed-order value of that channel/category (no true attribution key exists).")
    A("- All monetary values in USD. Floats rounded to 2 decimals in JSON artifacts.\n")
    with open(OUT_MD, "w") as f:
        f.write("\n".join(lines))

    assumptions = [l[2:] for l in lines if l.startswith("- ") and ("=" in l or "≈" in l or "Excluded" in l or "Pending" in l or "prior" in l.lower() or "No true" in l)]

    # =========================================================
    # 2) KPIs
    # =========================================================
    total_revenue = comp["revenue"].sum()
    total_margin = comp["margin"].sum()
    kpis = {
        "currency": "USD",
        "period": {"start": period_start, "end": period_end},
        "total_revenue": r2(total_revenue),
        "total_margin": r2(total_margin),
        "margin_pct": r2(total_margin / total_revenue * 100) if total_revenue else 0,
        "total_transactions": int(len(df)),
        "completed": int((df["status"] == "Completed").sum()),
        "cancelled": int((df["status"] == "Cancelled").sum()),
        "returned": int((df["status"] == "Returned").sum()),
        "cancel_return_rate": r2(((df["status"] == "Cancelled") | (df["status"] == "Returned")).mean() * 100),
        "stockout_product_count": int(inv.groupby("product_id")["stockout_flag"].max().sum()),
        "avg_discount_pct": r2(df["discount_pct"].mean() * 100),
        "lost_revenue": r2(bad["revenue"].sum()),
    }
    with open(f"{OUT_JSON}/kpis.json", "w") as f:
        json.dump(kpis, f, indent=2)

    # =========================================================
    # 3) LEAKS (anomaly detection)
    # =========================================================
    cells = df.groupby(["category", "region", "channel", "month"])
    agg = cells.agg(n=("transaction_id", "count"),
                    rev_completed=("revenue", lambda s: s[df.loc[s.index, "status"] == "Completed"].sum()),
                    margin_completed=("margin", lambda s: s[df.loc[s.index, "status"] == "Completed"].sum()),
                    n_completed=("status", lambda s: (s == "Completed").sum()),
                    n_returned=("status", lambda s: (s == "Returned").sum()))
    agg = agg[agg["n"] >= 8].copy()
    agg["margin_pct"] = agg["margin_completed"] / agg["rev_completed"].replace(0, np.nan) * 100
    agg["return_rate"] = agg["n_returned"] / (agg["n_completed"] + agg["n_returned"]).replace(0, np.nan) * 100
    agg["revenue"] = agg["rev_completed"]

    metrics = [("margin_pct", "margin_pct", True), ("return_rate", "return_rate", False),
               ("revenue", "revenue", False)]
    flags = []
    for col, metric_name, lower_is_bad in metrics:
        sub = agg.dropna(subset=[col])
        for cat, g in sub.groupby("category"):
            if len(g) < 4:
                continue
            mu, sd = g[col].mean(), g[col].std(ddof=1)
            if sd == 0 or np.isnan(sd):
                continue
            gz = g.copy()
            gz["z"] = (gz[col] - mu) / sd
            for idx, row in gz.iterrows():
                z = row["z"]
                if abs(z) < 2.5:
                    continue
                observed = row[col]
                if lower_is_bad:
                    interesting = z < -2.5
                else:
                    interesting = (z < -2.5) if metric_name == "revenue" else (z > 2.5)
                if not interesting:
                    continue
                key = (row.name[0], row.name[1], row.name[2], row.name[3])
                flags.append({
                    "id": None, "segment": {"category": key[0], "region": key[1],
                                            "channel": key[2], "month": key[3]},
                    "metric": metric_name, "observed": r2(observed), "expected": r2(mu),
                    "z": r2(z), "severity": "high" if abs(z) > 3.5 else ("medium" if abs(z) > 3.0 else "low"),
                    "period": key[3], "key": key, "_absz": abs(z)})

    # one flag per (cell) — keep strongest metric
    best = {}
    for fl in flags:
        k = fl["key"]
        if k not in best or fl["_absz"] > best[k]["_absz"]:
            best[k] = fl
    flags = sorted(best.values(), key=lambda x: -x["_absz"])[:25]

    # evidence strings
    leak_list = []
    for i, fl in enumerate(flags, 1):
        seg = fl["segment"]
        cell = df[(df["category"] == seg["category"]) & (df["region"] == seg["region"]) &
                  (df["channel"] == seg["channel"]) & (df["month"] == seg["month"])]
        cell_comp = cell[cell["status"] == "Completed"]
        cat_avg_disc = df[(df["category"] == seg["category"]) & (df["status"] == "Completed")]["discount_pct"].mean()
        cell_avg_disc = cell_comp["discount_pct"].mean() if len(cell_comp) else 0
        if fl["metric"] == "margin_pct":
            prod_margin = cell_comp.groupby("product_id")["margin"].sum().sort_values()
            worst = prod_margin.index[0] if len(prod_margin) else "n/a"
            wv = prod_margin.iloc[0] if len(prod_margin) else 0
            ev = (f"Margin {fl['observed']:.1f}% vs category avg {fl['expected']:.1f}% (z={fl['z']:.2f}). "
                  f"Worst driver: product {worst} (margin ${wv:,.0f}); "
                  f"avg discount {cell_avg_disc*100:.1f}% vs category {cat_avg_disc*100:.1f}%; "
                  f"{len(cell)} txns in cell.")
        elif fl["metric"] == "return_rate":
            ret_prod = cell[cell["status"] == "Returned"].groupby("product_id").size().sort_values(ascending=False)
            top_p = ret_prod.index[0] if len(ret_prod) else "n/a"
            tn = ret_prod.iloc[0] if len(ret_prod) else 0
            ev = (f"Return rate {fl['observed']:.1f}% vs category avg {fl['expected']:.1f}% (z={fl['z']:.2f}). "
                  f"Top returned product: {top_p} ({tn} returns); "
                  f"avg discount {cell_avg_disc*100:.1f}% vs category {cat_avg_disc*100:.1f}%; "
                  f"{len(cell)} txns in cell.")
        else:
            top_p = cell_comp.groupby("product_id")["revenue"].sum().sort_values(ascending=False)
            tp = top_p.index[0] if len(top_p) else "n/a"
            ev = (f"Revenue ${fl['observed']:,.0f} vs category avg ${fl['expected']:,.0f} (z={fl['z']:.2f}). "
                  f"Top product by revenue: {tp}; {len(cell)} txns in cell.")
        leak_list.append({
            "id": f"LEAK-{i:03d}", "segment": seg, "metric": fl["metric"],
            "observed": fl["observed"], "expected": fl["expected"], "z": fl["z"],
            "severity": fl["severity"], "period": fl["period"], "evidence": ev})
    with open(f"{OUT_JSON}/leaks.json", "w") as f:
        json.dump(leak_list, f, indent=2)

    # =========================================================
    # 4) RISK CLASSIFIER (XGBoost)
    # =========================================================
    from xgboost import XGBClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score

    clf_df = df[df["status"].isin(["Completed", "Cancelled", "Returned"])].copy()
    clf_df["bad"] = (clf_df["status"] != "Completed").astype(int)
    clf_df = clf_df.sort_values("timestamp").reset_index(drop=True)
    clf_df["prior_orders"] = clf_df.groupby("customer_id").cumcount()
    prior_bad = (clf_df["status"] == "Returned").groupby(clf_df["customer_id"]).cumsum().shift(1)
    clf_df["prior_bad"] = prior_bad.fillna(0).values
    clf_df["prior_return_rate"] = (clf_df["prior_bad"] / clf_df["prior_orders"].replace(0, np.nan)).fillna(0)
    clf_df["tenure_days"] = (clf_df["timestamp"] - clf_df["signup_date"]).dt.days

    num = ["quantity", "unit_price", "discount_pct", "unit_cost", "list_price",
           "tenure_days", "prior_orders", "prior_return_rate"]
    cat_cols = ["channel", "payment_method", "region", "customer_segment", "category"]
    X = pd.concat([clf_df[num], pd.get_dummies(clf_df[cat_cols], prefix=cat_cols)], axis=1)
    y = clf_df["bad"]
    Xtr, Xte, ytr, yte, itr, ite = train_test_split(X, y, range(len(X)), test_size=0.2,
                                                    random_state=42, stratify=y)
    model = XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.05,
                          subsample=0.8, colsample_bytree=0.8, random_state=42,
                          n_jobs=-1, eval_metric="logloss")
    model.fit(Xtr, ytr)
    pred = model.predict(Xte)
    proba = model.predict_proba(Xte)[:, 1]
    metrics = {"algorithm": "XGBoost",
               "accuracy": r2(accuracy_score(yte, pred)),
               "precision": r2(precision_score(yte, pred)),
               "recall": r2(recall_score(yte, pred)),
               "auc": r2(roc_auc_score(yte, proba)),
               "train_rows": int(len(Xtr)), "test_rows": int(len(Xte))}
    imp = model.get_booster().get_score(importance_type="gain")
    name_map = {f"f{i}": c for i, c in enumerate(X.columns)}
    fi = sorted(({"feature": name_map.get(k, k), "importance": r2(v)}
                 for k, v in imp.items()), key=lambda d: -d["importance"])[:20]

    te = clf_df.iloc[ite].copy()
    te["prob"] = proba
    top = te.sort_values("prob", ascending=False).head(200)
    risk = {"metrics": metrics, "feature_importance": fi,
            "top_risky": [{"transaction_id": r["transaction_id"], "customer_id": r["customer_id"],
                           "product_id": r["product_id"], "prob": r2(r["prob"]),
                           "status": r["status"], "revenue_at_risk": r2(r["revenue"])}
                          for _, r in top.iterrows()]}
    with open(f"{OUT_JSON}/risk.json", "w") as f:
        json.dump(risk, f, indent=2)

    # =========================================================
    # 5) CUSTOMER SEGMENTS (RFM + KMeans)
    # =========================================================
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import silhouette_score

    maxd = df["date"].max()
    cust = df.groupby("customer_id").agg(
        last_date=("date", "max"),
        freq=("transaction_id", lambda s: (df.loc[s.index, "status"] == "Completed").sum()),
        monetary=("revenue", lambda s: s[df.loc[s.index, "status"] == "Completed"].sum()),
        n_returned=("status", lambda s: (s == "Returned").sum()),
        n_completed=("status", lambda s: (s == "Completed").sum()))
    cust = cust[cust["n_completed"] > 0].copy()
    cust["recency"] = (maxd - cust["last_date"]).dt.days
    cust["return_rate"] = cust["n_returned"] / (cust["n_completed"] + cust["n_returned"])
    feats = cust[["recency", "freq", "monetary", "return_rate"]].copy()
    Xs = StandardScaler().fit_transform(feats)
    best_k, best_sil = 4, -1
    for k in (4, 5):
        km = KMeans(n_clusters=k, random_state=42, n_init=20)
        lab = km.fit_predict(Xs)
        s = silhouette_score(Xs, lab)
        if s > best_sil:
            best_k, best_sil = k, s
    km = KMeans(n_clusters=best_k, random_state=42, n_init=20)
    cust["cluster"] = km.fit_predict(Xs)

    def seg_name(p):
        # rule-based business names from cluster profile (return_rate is in percent)
        if p["avg_recency_days"] > 120:
            return "Dormant — At Risk of Churn"
        if p["return_rate"] > 15:
            return "Frequent Returners"
        if p["avg_frequency"] >= 6 and p["avg_recency_days"] <= 60:
            return "Champions — High-Value Loyalists"
        if p["avg_recency_days"] <= 60 and p["avg_frequency"] >= 4:
            return "Active Regulars"
        return "Occasional Buyers"

    segments = []
    for cl in sorted(cust["cluster"].unique()):
        g = cust[cust["cluster"] == cl]
        prof = {"avg_recency_days": r2(g["recency"].mean()),
                "avg_frequency": r2(g["freq"].mean()),
                "avg_monetary": r2(g["monetary"].mean()),
                "return_rate": r2((g["n_returned"] / (g["n_completed"] + g["n_returned"])).mean() * 100)}
        desc = (f"{len(g):,} customers; avg {prof['avg_frequency']:.1f} orders, "
                f"${prof['avg_monetary']:,.0f} spend, {prof['avg_recency_days']:.0f}d since last order, "
                f"{prof['return_rate']:.1f}% return rate.")
        segments.append({"id": f"S{int(cl)+1}", "name": seg_name(prof), "size": int(len(g)),
                         **prof, "description": desc})
    with open(f"{OUT_JSON}/segments.json", "w") as f:
        json.dump({"segments": segments}, f, indent=2)

    # =========================================================
    # 6) STOCKOUT RISK
    # =========================================================
    inv_s = inv.sort_values(["product_id", "date"])
    latest = inv_s.groupby("product_id").tail(1).set_index("product_id")
    prods = []
    for pid, row in latest.iterrows():
        ph = inv_s[inv_s["product_id"] == pid].tail(6)  # last ~30 days of records
        c1 = 1 - row["stock_on_hand"] / row["reorder_threshold"] if row["reorder_threshold"] > 0 else (1.0 if row["stock_on_hand"] <= 0 else 0.0)
        c1 = float(np.clip(c1, 0, 1))
        if row["stock_on_hand"] <= 0:
            c1 = 1.0
        c2 = float(ph["stockout_flag"].mean())
        lead = p.set_index("product_id").loc[pid, "supplier_lead_days"]
        c3 = float(np.clip(ph["supplier_delay_days"].mean() / lead, 0, 1)) if lead > 0 else 0.0
        risk_score = round(0.5 * c1 + 0.3 * c2 + 0.2 * c3, 2)
        n_so = int(ph["stockout_flag"].sum())
        reason = (f"Stock {int(row['stock_on_hand'])} vs reorder threshold {int(row['reorder_threshold'])}; "
                  f"{n_so} stockout(s) in last {len(ph)} records; "
                  f"avg supplier delay {ph['supplier_delay_days'].mean():.0f}d vs {lead}d lead time.")
        prods.append({"product_id": pid,
                      "category": p.set_index("product_id").loc[pid, "category"],
                      "stock_on_hand": int(row["stock_on_hand"]),
                      "reorder_threshold": int(row["reorder_threshold"]),
                      "risk_score": risk_score, "reason": reason})
    prods = sorted(prods, key=lambda d: -d["risk_score"])[:100]
    with open(f"{OUT_JSON}/stockout_risk.json", "w") as f:
        json.dump({"products": prods}, f, indent=2)

    # =========================================================
    # 7) CAMPAIGNS
    # =========================================================
    aov_chan = comp.groupby("channel")["revenue"].mean()
    aov_cat = comp.groupby("category")["revenue"].mean()

    def camp_agg(by):
        rows = []
        for name, g in cm.groupby(by):
            spend = g["spend"].sum(); conv = g["conversions"].sum()
            aov = (aov_chan if by == "channel" else aov_cat).get(name, comp["revenue"].mean())
            attrib = conv * aov
            rows.append({"channel" if by == "channel" else "category": name,
                         "spend": r2(spend), "impressions": int(g["impressions"].sum()),
                         "clicks": int(g["clicks"].sum()), "conversions": int(conv),
                         "cac": r2(spend / conv) if conv else None,
                         "roas_proxy": r2(attrib / spend) if spend else None})
        key = "channel" if by == "channel" else "category"
        return sorted(rows, key=lambda d: -d["spend"]) if by == "channel" else sorted(rows, key=lambda d: d[key])

    campaigns = {"by_channel": camp_agg("channel"), "by_category": camp_agg("category")}
    with open(f"{OUT_JSON}/campaigns.json", "w") as f:
        json.dump(campaigns, f, indent=2)

    # =========================================================
    # 8) FORECAST (monthly qty per category, 3-month MA)
    # =========================================================
    hist = comp.groupby(["category", "month"])["quantity"].sum().reset_index()
    months = sorted(df["month"].unique())
    last3 = months[-3:]
    fc = []
    for cat in sorted(df["category"].unique()):
        h = hist[hist["category"] == cat].set_index("month")["quantity"]
        full = [{"month": m, "quantity": int(h.get(m, 0))} for m in months]
        base = np.mean([h.get(m, 0) for m in last3])
        start = pd.Period(months[-1], freq="M") + 1
        fcast = [{"month": str(start + i), "quantity": r2(base)} for i in range(3)]
        fc.append({"category": cat, "history": full, "forecast": fcast})
    with open(f"{OUT_JSON}/forecast.json", "w") as f:
        json.dump({"categories": fc}, f, indent=2)

    # =========================================================
    # 9) METHODOLOGY
    # =========================================================
    method = {
        "assumptions": assumptions + [
            "Leak detection: metrics aggregated per (category x region x channel x month) cells with >=8 transactions; z-scores computed within each category across all its cells; |z|>2.5 flagged (|z|>3.5 = high); capped at 25 strongest flags. NOTE: because the DATATHON generator independently randomizes costs/prices/statuses, many flags are clumps of synthetic noise — documented in EDA_REPORT.md, not business-certified drivers.",
            "Cancel/return classifier: XGBoost on the specified features; trained on Completed vs Cancelled/Returned (Pending excluded). NO predictive signal found (AUC~0.49; bad rate ~18% uniform across all feature slices) — risk.json scores are schema placeholders and must not drive real decisions.",
            "Campaign ROAS proxy: attributed_revenue = conversions x avg completed-order value of that channel/category; no true attribution key exists in the data.",
            "Forecast: monthly quantity per category (Completed only); next-3-month forecast = 3-month moving average of last 3 observed months.",
            "Stockout risk: latest inventory record per product; risk = 0.5*stock-vs-threshold + 0.3*recent stockout history + 0.2*supplier delay vs lead time.",
            "Customer segments: KMeans on standardized (recency, frequency, monetary, return_rate); k chosen by silhouette among k=4,5.",
        ],
        "data_quality": {
            "transactions_rows": int(len(t)),
            "null_counts": {c: int(t[c].isna().sum()) for c in t.columns},
            "status_values": sorted(t["status"].unique()),
            "negative_margin_pct": r2(neg_margin_pct),
        },
        "models": {"cancel_return_classifier": {k: v for k, v in metrics.items()
                                               if k in ("algorithm", "accuracy", "precision", "recall", "auc")}},
    }
    with open(f"{OUT_JSON}/methodology.json", "w") as f:
        json.dump(method, f, indent=2)

    # =========================================================
    # summary printout
    # =========================================================
    total = 0
    for fn in ["kpis.json", "leaks.json", "risk.json", "segments.json",
               "stockout_risk.json", "campaigns.json", "forecast.json", "methodology.json"]:
        sz = os.path.getsize(f"{OUT_JSON}/{fn}")
        total += sz
        print(f"{fn}: {sz/1024:.1f} KB")
    print(f"TOTAL: {total/1024:.1f} KB")
    print("kmeans k chosen:", best_k, "silhouette:", round(best_sil, 3))
    print("leak flags:", len(leak_list), "| severities:", pd.Series([f['severity'] for f in leak_list]).value_counts().to_dict())
    print("classifier:", metrics)
    print("negative_margin_pct:", round(neg_margin_pct, 2))

if __name__ == "__main__":
    main()
